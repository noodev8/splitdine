/*
=======================================================================================================================================
Guests Routes
=======================================================================================================================================
Purpose: Handles all guest-related operations including adding, updating, deleting guests and their items.
         Guests represent participants in a dining event.
         All routes require authentication.
=======================================================================================================================================
*/

const express = require('express');
const { query } = require('../database');
const { withTransaction } = require('../utils/transaction');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// =============================================================================
// Helper function to check event membership
// =============================================================================
/**
 * Checks if authenticated user is a member of an event (either creator or guest)
 */
const checkMembership = async (userId, event_id) => {
  const result = await query(
    `SELECT e.id
     FROM events e
     LEFT JOIN guests g ON e.id = g.event_id AND g.app_user_id = $1
     WHERE e.id = $2 AND (e.user_id = $1 OR g.id IS NOT NULL)`,
    [userId, event_id]
  );
  return result.rows.length > 0;
};

/*
=======================================================================================================================================
API Route: get_guests
=======================================================================================================================================
Method: POST
Purpose: Retrieves all guests for a specific event, including their items.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_id": 123                                        // integer, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "guests": [
    {
      "id": 1,                                           // integer, guest ID
      "event_id": 123,                                   // integer, event ID
      "name": "John Doe",                                // string, guest name
      "amount": 25.50,                                   // number, total bill amount
      "deposit": 10.00,                                  // number, deposit paid
      "notes": "Vegetarian option",                      // string, guest notes
      "paid": false,                                     // boolean, payment status
      "items": [                                         // array, guest items
        {
          "id": 1,                                       // integer, item ID
          "note": "Starter",                             // string, item note
          "price": 12.50                                 // number, optional, item price
        }
      ]
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_MEMBER"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/get_guests', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { event_id } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!event_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'event_id is required'
      });
    }

    // =============================================================================
    // Verify user is a member of the event
    // =============================================================================
    const isMember = await checkMembership(userId, event_id);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Get all guests for the event
    // =============================================================================
    const guestsResult = await query(
      `SELECT id, event_id, name, amount, deposit, notes, paid, app_user_id, created_at, updated_at
       FROM guests
       WHERE event_id = $1
       ORDER BY created_at ASC`,
      [event_id]
    );

    // =============================================================================
    // Get items for each guest
    // =============================================================================
    const guests = await Promise.all(
      guestsResult.rows.map(async (guest) => {
        const itemsResult = await query(
          `SELECT id, note, price
           FROM guest_items
           WHERE guest_id = $1
           ORDER BY created_at ASC`,
          [guest.id]
        );

        return {
          id: guest.id,
          event_id: guest.event_id,
          name: guest.name,
          amount: parseFloat(guest.amount),
          deposit: parseFloat(guest.deposit),
          notes: guest.notes || '',
          paid: guest.paid,
          app_user_id: guest.app_user_id,
          items: itemsResult.rows.map(item => ({
            id: item.id,
            note: item.note,
            price: item.price ? parseFloat(item.price) : null
          }))
        };
      })
    );

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      guests: guests
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in get_guests route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while retrieving guests'
    });
  }
});

/*
=======================================================================================================================================
API Route: add_guest
=======================================================================================================================================
Method: POST
Purpose: Adds a new guest to an event. Only event members can add guests.
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",  // string, required
  "event_id": 123,                                       // integer, required
  "name": "John Doe",                                    // string, required
  "amount": 25.50,                                       // number, optional, default 0
  "deposit": 10.00                                       // number, optional, default 0
}

Success Response:
{
  "return_code": "SUCCESS",
  "guest": {
    "id": 1,
    "event_id": 123,
    "name": "John Doe",
    "amount": 25.50,
    "deposit": 10.00,
    "notes": "",
    "paid": false,
    "items": []
  },
  "message": "Guest added successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_MEMBER"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/add_guest', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { event_id, name, amount = 0, deposit = 0 } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!event_id || !name) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'event_id and name are required'
      });
    }

    // Validate name
    if (name.trim().length === 0) {
      return res.status(200).json({
        return_code: 'INVALID_NAME',
        message: 'Guest name cannot be empty'
      });
    }

    // =============================================================================
    // Verify user is a member of the event
    // =============================================================================
    const isMember = await checkMembership(userId, event_id);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Create guest
    // =============================================================================
    const result = await query(
      `INSERT INTO guests (event_id, name, amount, deposit, notes, paid, created_at, updated_at)
       VALUES ($1, $2, $3, $4, '', false, NOW(), NOW())
       RETURNING id, event_id, name, amount, deposit, notes, paid`,
      [event_id, name.trim(), amount, deposit]
    );

    const newGuest = result.rows[0];

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      guest: {
        id: newGuest.id,
        event_id: newGuest.event_id,
        name: newGuest.name,
        amount: parseFloat(newGuest.amount),
        deposit: parseFloat(newGuest.deposit),
        notes: newGuest.notes || '',
        paid: newGuest.paid,
        items: []
      },
      message: 'Guest added successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in add_guest route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while adding guest'
    });
  }
});

/*
=======================================================================================================================================
API Route: update_guest
=======================================================================================================================================
Method: POST
Purpose: Updates guest details (name, amount, deposit, notes, paid status).
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",  // string, required
  "guest_id": 1,                                         // integer, required
  "name": "John Doe",                                    // string, optional
  "amount": 25.50,                                       // number, optional
  "deposit": 10.00,                                      // number, optional
  "notes": "Vegetarian option",                          // string, optional
  "paid": false                                          // boolean, optional
}

Success Response:
{
  "return_code": "SUCCESS",
  "guest": {
    "id": 1,
    "event_id": 123,
    "name": "John Doe",
    "amount": 25.50,
    "deposit": 10.00,
    "notes": "Vegetarian option",
    "paid": false
  },
  "message": "Guest updated successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"GUEST_NOT_FOUND"
"NOT_MEMBER"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/update_guest', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { guest_id, name, amount, deposit, notes, paid } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!guest_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'guest_id is required'
      });
    }

    // =============================================================================
    // Get guest, event settings, and verify permissions
    // =============================================================================
    const guestResult = await query(
      `SELECT g.id, g.event_id, g.name, g.amount, g.deposit, g.notes, g.paid, g.app_user_id,
              e.user_id as event_creator_id, e.allow_guest_editing,
              COALESCE(host_guest.co_host, false) as is_co_host
       FROM guests g
       JOIN events e ON g.event_id = e.id
       LEFT JOIN guests host_guest ON e.id = host_guest.event_id AND host_guest.app_user_id = $2 AND host_guest.co_host = true
       WHERE g.id = $1`,
      [guest_id, userId]
    );

    if (guestResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'GUEST_NOT_FOUND',
        message: 'Guest not found'
      });
    }

    const guest = guestResult.rows[0];

    // Verify user is a member of the event
    const isMember = await checkMembership(userId, guest.event_id);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Check if user has permission to edit this guest
    // User can edit if: (1) they are host, OR (2) they are editing their own guest AND allow_guest_editing is true
    // =============================================================================
    const isHost = guest.event_creator_id === userId || guest.is_co_host;
    const isEditingOwnGuest = guest.app_user_id === userId;
    const canEdit = isHost || (isEditingOwnGuest && guest.allow_guest_editing);

    if (!canEdit) {
      return res.status(200).json({
        return_code: 'UNAUTHORIZED',
        message: 'You do not have permission to edit this guest'
      });
    }

    // =============================================================================
    // Build update query dynamically based on provided fields
    // =============================================================================
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name.trim());
      paramCount++;
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramCount}`);
      values.push(amount);
      paramCount++;
    }
    if (deposit !== undefined) {
      updates.push(`deposit = $${paramCount}`);
      values.push(deposit);
      paramCount++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }
    if (paid !== undefined) {
      updates.push(`paid = $${paramCount}`);
      values.push(paid);
      paramCount++;
    }

    // Always update updated_at
    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      // Only updated_at would be updated, nothing to do
      return res.status(200).json({
        return_code: 'SUCCESS',
        guest: {
          id: guest.id,
          event_id: guest.event_id,
          name: guest.name,
          amount: parseFloat(guest.amount),
          deposit: parseFloat(guest.deposit),
          notes: guest.notes || '',
          paid: guest.paid
        },
        message: 'No changes made'
      });
    }

    // Add guest_id as final parameter
    values.push(guest_id);

    // =============================================================================
    // Update guest
    // =============================================================================
    const updateQuery = `
      UPDATE guests
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, event_id, name, amount, deposit, notes, paid
    `;

    const result = await query(updateQuery, values);
    const updatedGuest = result.rows[0];

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      guest: {
        id: updatedGuest.id,
        event_id: updatedGuest.event_id,
        name: updatedGuest.name,
        amount: parseFloat(updatedGuest.amount),
        deposit: parseFloat(updatedGuest.deposit),
        notes: updatedGuest.notes || '',
        paid: updatedGuest.paid
      },
      message: 'Guest updated successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in update_guest route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while updating guest'
    });
  }
});

/*
=======================================================================================================================================
API Route: delete_guest
=======================================================================================================================================
Method: POST
Purpose: Deletes a guest and all associated items from an event.
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",  // string, required
  "guest_id": 1                                          // integer, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Guest deleted successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"GUEST_NOT_FOUND"
"NOT_MEMBER"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/delete_guest', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { guest_id } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!guest_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'guest_id is required'
      });
    }

    // =============================================================================
    // Get guest and verify event membership
    // =============================================================================
    const guestResult = await query(
      `SELECT event_id FROM guests WHERE id = $1`,
      [guest_id]
    );

    if (guestResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'GUEST_NOT_FOUND',
        message: 'Guest not found'
      });
    }

    const eventId = guestResult.rows[0].event_id;

    // Verify user is a member of the event
    const isMember = await checkMembership(userId, eventId);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Delete guest and all associated items in a transaction
    // =============================================================================
    await withTransaction(async (client) => {
      // Delete all guest items first (foreign key constraint)
      await client.query(
        `DELETE FROM guest_items WHERE guest_id = $1`,
        [guest_id]
      );

      // Delete the guest
      await client.query(
        `DELETE FROM guests WHERE id = $1`,
        [guest_id]
      );
    });

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      message: 'Guest deleted successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in delete_guest route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while deleting guest'
    });
  }
});

/*
=======================================================================================================================================
API Route: add_item
=======================================================================================================================================
Method: POST
Purpose: Adds an item to a guest (e.g., "Starter", "Main course").
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",  // string, required
  "guest_id": 1,                                         // integer, required
  "note": "Starter - Soup",                              // string, required
  "price": 12.50                                         // number, optional, item price
}

Success Response:
{
  "return_code": "SUCCESS",
  "item": {
    "id": 1,
    "note": "Starter - Soup",
    "price": 12.50
  },
  "message": "Item added successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"GUEST_NOT_FOUND"
"NOT_MEMBER"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/add_item', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { guest_id, note, price } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!guest_id || !note) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'guest_id and note are required'
      });
    }

    // Validate note
    if (note.trim().length === 0) {
      return res.status(200).json({
        return_code: 'INVALID_NOTE',
        message: 'Item note cannot be empty'
      });
    }

    // =============================================================================
    // Get guest, event settings, and verify permissions
    // =============================================================================
    const guestResult = await query(
      `SELECT g.event_id, g.app_user_id,
              e.user_id as event_creator_id, e.allow_guest_editing,
              COALESCE(host_guest.co_host, false) as is_co_host
       FROM guests g
       JOIN events e ON g.event_id = e.id
       LEFT JOIN guests host_guest ON e.id = host_guest.event_id AND host_guest.app_user_id = $2 AND host_guest.co_host = true
       WHERE g.id = $1`,
      [guest_id, userId]
    );

    if (guestResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'GUEST_NOT_FOUND',
        message: 'Guest not found'
      });
    }

    const guest = guestResult.rows[0];
    const eventId = guest.event_id;

    // Verify user is a member of the event
    const isMember = await checkMembership(userId, eventId);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Check if user has permission to add items to this guest
    // User can edit if: (1) they are host, OR (2) they are editing their own guest AND allow_guest_editing is true
    // =============================================================================
    const isHost = guest.event_creator_id === userId || guest.is_co_host;
    const isEditingOwnGuest = guest.app_user_id === userId;
    const canEdit = isHost || (isEditingOwnGuest && guest.allow_guest_editing);

    if (!canEdit) {
      return res.status(200).json({
        return_code: 'UNAUTHORIZED',
        message: 'You do not have permission to add items to this guest'
      });
    }

    // =============================================================================
    // Add item to guest
    // =============================================================================
    const result = await query(
      `INSERT INTO guest_items (guest_id, event_id, note, price, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, note, price`,
      [guest_id, eventId, note.trim(), price !== undefined ? price : null]
    );

    const newItem = result.rows[0];

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      item: {
        id: newItem.id,
        note: newItem.note,
        price: newItem.price ? parseFloat(newItem.price) : null
      },
      message: 'Item added successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in add_item route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while adding item'
    });
  }
});

/*
=======================================================================================================================================
API Route: delete_item
=======================================================================================================================================
Method: POST
Purpose: Deletes an item from a guest.
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",  // string, required
  "item_id": 1                                           // integer, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Item deleted successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"ITEM_NOT_FOUND"
"NOT_MEMBER"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/delete_item', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { item_id } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!item_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'item_id is required'
      });
    }

    // =============================================================================
    // Get item, guest, event settings, and verify permissions
    // =============================================================================
    const itemResult = await query(
      `SELECT gi.id, gi.guest_id, g.event_id, g.app_user_id,
              e.user_id as event_creator_id, e.allow_guest_editing,
              COALESCE(host_guest.co_host, false) as is_co_host
       FROM guest_items gi
       JOIN guests g ON gi.guest_id = g.id
       JOIN events e ON g.event_id = e.id
       LEFT JOIN guests host_guest ON e.id = host_guest.event_id AND host_guest.app_user_id = $2 AND host_guest.co_host = true
       WHERE gi.id = $1`,
      [item_id, userId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'ITEM_NOT_FOUND',
        message: 'Item not found'
      });
    }

    const item = itemResult.rows[0];

    // Verify user is a member of the event
    const isMember = await checkMembership(userId, item.event_id);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Check if user has permission to delete items from this guest
    // User can edit if: (1) they are host, OR (2) they are editing their own guest AND allow_guest_editing is true
    // =============================================================================
    const isHost = item.event_creator_id === userId || item.is_co_host;
    const isEditingOwnGuest = item.app_user_id === userId;
    const canEdit = isHost || (isEditingOwnGuest && item.allow_guest_editing);

    if (!canEdit) {
      return res.status(200).json({
        return_code: 'UNAUTHORIZED',
        message: 'You do not have permission to delete items from this guest'
      });
    }

    // =============================================================================
    // Delete item
    // =============================================================================
    await query(
      `DELETE FROM guest_items WHERE id = $1`,
      [item_id]
    );

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      message: 'Item deleted successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in delete_item route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while deleting item'
    });
  }
});

/*
=======================================================================================================================================
API Route: claim_guest
=======================================================================================================================================
Method: POST
Purpose: Allows an authenticated user to claim an unclaimed guest profile by linking their app_user_id.
         User can only claim one guest per event. Guest must be unclaimed (app_user_id IS NULL).
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_id": 123,                                       // integer, required
  "guest_id": 456                                        // integer, required - guest to claim
}

Success Response:
{
  "return_code": "SUCCESS",
  "guest": {
    "id": 456,
    "event_id": 123,
    "name": "John Doe",
    "amount": 25.50,
    "deposit": 10.00,
    "notes": "",
    "paid": false
  },
  "message": "Guest claimed successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"GUEST_NOT_FOUND"
"GUEST_ALREADY_CLAIMED"
"USER_ALREADY_CLAIMED"
"NOT_MEMBER"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/claim_guest', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { event_id, guest_id } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!event_id || !guest_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'event_id and guest_id are required'
      });
    }

    // =============================================================================
    // Verify user is a member of the event
    // =============================================================================
    const isMember = await checkMembership(userId, event_id);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Check if guest exists and is unclaimed
    // =============================================================================
    const guestResult = await query(
      `SELECT id, event_id, name, amount, deposit, notes, paid, app_user_id
       FROM guests
       WHERE id = $1 AND event_id = $2`,
      [guest_id, event_id]
    );

    if (guestResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'GUEST_NOT_FOUND',
        message: 'Guest not found'
      });
    }

    const guest = guestResult.rows[0];

    // Check if guest is already claimed
    if (guest.app_user_id !== null) {
      return res.status(200).json({
        return_code: 'GUEST_ALREADY_CLAIMED',
        message: 'This guest has already been claimed by another user'
      });
    }

    // =============================================================================
    // Check if user has a placeholder or already claimed guest in this event
    // =============================================================================
    const existingClaimResult = await query(
      `SELECT id, name FROM guests
       WHERE event_id = $1 AND app_user_id = $2`,
      [event_id, userId]
    );

    if (existingClaimResult.rows.length > 0) {
      const existingGuest = existingClaimResult.rows[0];

      // If they have a placeholder (empty name), delete it so they can claim the new guest
      if (existingGuest.name === '') {
        await query(`DELETE FROM guests WHERE id = $1`, [existingGuest.id]);
        console.log(`✓ Deleted placeholder guest ${existingGuest.id} for user ${userId}`);
      } else {
        // They already have a real claimed guest
        return res.status(200).json({
          return_code: 'USER_ALREADY_CLAIMED',
          message: 'You have already claimed a guest in this event'
        });
      }
    }

    // =============================================================================
    // Claim the guest by setting app_user_id
    // =============================================================================
    const updateResult = await query(
      `UPDATE guests
       SET app_user_id = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, event_id, name, amount, deposit, notes, paid`,
      [userId, guest_id]
    );

    const claimedGuest = updateResult.rows[0];

    console.log(`✓ User ${userId} claimed guest ${guest_id} in event ${event_id}`);

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      guest: {
        id: claimedGuest.id,
        event_id: claimedGuest.event_id,
        name: claimedGuest.name,
        amount: parseFloat(claimedGuest.amount),
        deposit: parseFloat(claimedGuest.deposit),
        notes: claimedGuest.notes || '',
        paid: claimedGuest.paid
      },
      message: 'Guest claimed successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in claim_guest route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while claiming guest'
    });
  }
});

/*
=======================================================================================================================================
API Route: unclaim_guest
=======================================================================================================================================
Method: POST
Purpose: Allows an authenticated user to unclaim their currently claimed guest in an event.
         Sets app_user_id back to NULL so guest can be claimed by someone else.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_id": 123                                        // integer, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Guest unclaimed successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NO_CLAIMED_GUEST"
"NOT_MEMBER"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/unclaim_guest', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { event_id } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!event_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'event_id is required'
      });
    }

    // =============================================================================
    // Verify user is a member of the event
    // =============================================================================
    const isMember = await checkMembership(userId, event_id);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Find user's claimed guest in this event
    // =============================================================================
    const claimedGuestResult = await query(
      `SELECT id FROM guests
       WHERE event_id = $1 AND app_user_id = $2`,
      [event_id, userId]
    );

    if (claimedGuestResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'NO_CLAIMED_GUEST',
        message: 'You have not claimed a guest in this event'
      });
    }

    const guestId = claimedGuestResult.rows[0].id;

    // =============================================================================
    // Unclaim the guest by setting app_user_id to NULL
    // =============================================================================
    await query(
      `UPDATE guests
       SET app_user_id = NULL, updated_at = NOW()
       WHERE id = $1`,
      [guestId]
    );

    console.log(`✓ User ${userId} unclaimed guest ${guestId} in event ${event_id}`);

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      message: 'Guest unclaimed successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in unclaim_guest route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while unclaiming guest'
    });
  }
});

/*
=======================================================================================================================================
API Route: get_my_claimed_guest
=======================================================================================================================================
Method: POST
Purpose: Retrieves the guest that the authenticated user has claimed in a specific event.
         Returns null if user has not claimed a guest.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_id": 123                                        // integer, required
}

Success Response (with claimed guest):
{
  "return_code": "SUCCESS",
  "guest": {
    "id": 456,
    "event_id": 123,
    "name": "John Doe",
    "amount": 25.50,
    "deposit": 10.00,
    "notes": "",
    "paid": false
  }
}

Success Response (no claimed guest):
{
  "return_code": "SUCCESS",
  "guest": null
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_MEMBER"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/get_my_claimed_guest', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { event_id } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!event_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'event_id is required'
      });
    }

    // =============================================================================
    // Verify user is a member of the event
    // =============================================================================
    const isMember = await checkMembership(userId, event_id);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Find user's claimed guest in this event
    // =============================================================================
    const guestResult = await query(
      `SELECT id, event_id, name, amount, deposit, notes, paid
       FROM guests
       WHERE event_id = $1 AND app_user_id = $2`,
      [event_id, userId]
    );

    // =============================================================================
    // Return success response
    // =============================================================================
    if (guestResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'SUCCESS',
        guest: null
      });
    }

    const guest = guestResult.rows[0];
    return res.status(200).json({
      return_code: 'SUCCESS',
      guest: {
        id: guest.id,
        event_id: guest.event_id,
        name: guest.name,
        amount: parseFloat(guest.amount),
        deposit: parseFloat(guest.deposit),
        notes: guest.notes || '',
        paid: guest.paid
      }
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in get_my_claimed_guest route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while retrieving claimed guest'
    });
  }
});

module.exports = router;
