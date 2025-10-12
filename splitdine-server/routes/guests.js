/*
=======================================================================================================================================
Guests Routes
=======================================================================================================================================
Purpose: Handles all guest-related operations including adding, updating, deleting guests and their items.
         Guests represent participants in a dining event.
=======================================================================================================================================
*/

const express = require('express');
const { query } = require('../database');
const { withTransaction } = require('../utils/transaction');

const router = express.Router();

// =============================================================================
// Optional Authentication Middleware
// =============================================================================
/**
 * Middleware that attempts to verify JWT token if present
 * Unlike verifyToken, this doesn't fail if no token - just adds req.user if valid
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return next();
  }

  const token = parts[1];
  const jwt = require('jsonwebtoken');
  const config = require('../config/config');

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
  } catch (error) {
    // Invalid/expired token - continue as anonymous
  }

  next();
};

// =============================================================================
// Helper function to check event membership
// =============================================================================
/**
 * Checks if user is a member of an event
 * For authenticated users: checks by app_user_id
 * For anonymous users: checks by session_id (user_id) with app_user_id IS NULL
 */
const checkMembership = async (session_id, event_id, userId) => {
  if (userId) {
    // Authenticated user - check by app_user_id
    const result = await query(
      `SELECT id FROM user_event_memberships
       WHERE app_user_id = $1 AND event_id = $2`,
      [userId, event_id]
    );
    return result.rows.length > 0;
  } else {
    // Anonymous user - check by session_id
    const result = await query(
      `SELECT id FROM user_event_memberships
       WHERE user_id = $1 AND event_id = $2 AND app_user_id IS NULL`,
      [session_id, event_id]
    );
    return result.rows.length > 0;
  }
};

/*
=======================================================================================================================================
API Route: get_guests
=======================================================================================================================================
Method: POST
Purpose: Retrieves all guests for a specific event, including their items.
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",  // string, required
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
          "note": "Starter"                              // string, item note
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
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/get_guests', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id, event_id } = req.body;

    if (!session_id || !event_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id and event_id are required'
      });
    }

    // =============================================================================
    // Verify user is a member of the event
    // =============================================================================
    const userId = req.user ? req.user.id : null;
    const isMember = await checkMembership(session_id, event_id, userId);

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
      `SELECT id, event_id, name, amount, deposit, notes, paid, created_at, updated_at
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
          `SELECT id, note
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
          items: itemsResult.rows
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
router.post('/add_guest', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id, event_id, name, amount = 0, deposit = 0 } = req.body;

    if (!session_id || !event_id || !name) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id, event_id, and name are required'
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
    const userId = req.user ? req.user.id : null;
    const isMember = await checkMembership(session_id, event_id, userId);

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
router.post('/update_guest', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id, guest_id, name, amount, deposit, notes, paid } = req.body;

    if (!session_id || !guest_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id and guest_id are required'
      });
    }

    // =============================================================================
    // Get guest and verify event membership
    // =============================================================================
    const guestResult = await query(
      `SELECT g.id, g.event_id, g.name, g.amount, g.deposit, g.notes, g.paid
       FROM guests g
       WHERE g.id = $1`,
      [guest_id]
    );

    if (guestResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'GUEST_NOT_FOUND',
        message: 'Guest not found'
      });
    }

    const guest = guestResult.rows[0];

    // Verify user is a member of the event
    const userId = req.user ? req.user.id : null;
    const isMember = await checkMembership(session_id, guest.event_id, userId);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
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
router.post('/delete_guest', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id, guest_id } = req.body;

    if (!session_id || !guest_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id and guest_id are required'
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
    const userId = req.user ? req.user.id : null;
    const isMember = await checkMembership(session_id, eventId, userId);

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
  "note": "Starter - Soup"                               // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "item": {
    "id": 1,
    "note": "Starter - Soup"
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
router.post('/add_item', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id, guest_id, note } = req.body;

    if (!session_id || !guest_id || !note) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id, guest_id, and note are required'
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
    const userId = req.user ? req.user.id : null;
    const isMember = await checkMembership(session_id, eventId, userId);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Add item to guest
    // =============================================================================
    const result = await query(
      `INSERT INTO guest_items (guest_id, note, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, note`,
      [guest_id, note.trim()]
    );

    const newItem = result.rows[0];

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      item: {
        id: newItem.id,
        note: newItem.note
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
router.post('/delete_item', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id, item_id } = req.body;

    if (!session_id || !item_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id and item_id are required'
      });
    }

    // =============================================================================
    // Get item, guest, and verify event membership
    // =============================================================================
    const itemResult = await query(
      `SELECT gi.id, gi.guest_id, g.event_id
       FROM guest_items gi
       JOIN guests g ON gi.guest_id = g.id
       WHERE gi.id = $1`,
      [item_id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'ITEM_NOT_FOUND',
        message: 'Item not found'
      });
    }

    const item = itemResult.rows[0];

    // Verify user is a member of the event
    const userId = req.user ? req.user.id : null;
    const isMember = await checkMembership(session_id, item.event_id, userId);

    if (!isMember) {
      return res.status(200).json({
        return_code: 'NOT_MEMBER',
        message: 'You are not a member of this event'
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

module.exports = router;
