/*
=======================================================================================================================================
Events Routes
=======================================================================================================================================
Purpose: Handles all event-related operations including creation, joining, and retrieval.
         Events are the core entity in SplitDine - each represents a dining occasion.
=======================================================================================================================================
*/

const express = require('express');
const crypto = require('crypto');
const { query } = require('../database');
const { withTransaction } = require('../utils/transaction');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// =============================================================================
// Helper function to generate unique event codes
// =============================================================================
/**
 * Generates a random 6-character alphanumeric code
 * @returns {string} - 6-character uppercase code
 */
const generateCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Generates a unique guest code that doesn't exist in database
 * @returns {Promise<string>} - Unique 6-character code
 */
const generateUniqueCode = async () => {
  let code;
  let isUnique = false;

  // Keep generating until we find a unique code
  while (!isUnique) {
    code = generateCode();
    const result = await query(
      `SELECT id FROM events WHERE guest_code = $1`,
      [code]
    );
    isUnique = result.rows.length === 0;
  }

  return code;
};

/*
=======================================================================================================================================
API Route: create_event
=======================================================================================================================================
Method: POST
Purpose: Creates a new dining event with unique guest code.
         Automatically adds creator as a host guest entry in guests table.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_name": "Pizza Express - Oct 11",               // string, required - name of event
  "bank_account_number": "12345678",                    // string, optional
  "bank_sort_code": "04-00-03",                         // string, optional
  "bank_account_name": "John Doe"                       // string, optional
}

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 123,                                           // integer, event ID
    "name": "Pizza Express - Oct 11",                    // string, event name
    "guest_code": "XYZ789",                              // string, code for guest access
    "created_at": "2025-10-11T10:00:00.000Z"            // string, ISO timestamp
  },
  "message": "Event created successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/create', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { event_name, bank_account_number, bank_sort_code, bank_account_name } = req.body;

    // Check if all required fields are present
    if (!event_name) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'event_name is required'
      });
    }

    // Validate event name length
    if (event_name.trim().length === 0) {
      return res.status(200).json({
        return_code: 'INVALID_EVENT_NAME',
        message: 'Event name cannot be empty'
      });
    }

    // =============================================================================
    // Generate unique guest code
    // =============================================================================
    const guestCode = await generateUniqueCode();

    // =============================================================================
    // Create event
    // =============================================================================
    const userId = req.user.id; // User is authenticated

    const result = await query(
      `INSERT INTO events (name, guest_code, user_id, bank_account_number, bank_sort_code, bank_account_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, name, guest_code, bank_account_number, bank_sort_code, bank_account_name, allow_guest_editing, created_at`,
      [event_name.trim(), guestCode, userId, bank_account_number || null, bank_sort_code || null, bank_account_name || null]
    );

    const newEvent = result.rows[0];

    console.log(`✓ Event created successfully (ID: ${newEvent.id})`);

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      event: {
        id: newEvent.id,
        name: newEvent.name,
        guest_code: newEvent.guest_code,
        bank_account_number: newEvent.bank_account_number,
        bank_sort_code: newEvent.bank_sort_code,
        bank_account_name: newEvent.bank_account_name,
        allow_guest_editing: newEvent.allow_guest_editing,
        created_at: newEvent.created_at,
        role: 'host'
      },
      message: 'Event created successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in create_event route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while creating event'
    });
  }
});

/*
=======================================================================================================================================
API Route: join_event
=======================================================================================================================================
Method: POST
Purpose: Allows an authenticated user to join an existing event using a guest code.
         Does NOT create a guest entry - user must claim/create a guest profile separately.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "code": "ABC123"                                       // string, required - guest code
}

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 123,                                           // integer, event ID
    "name": "Pizza Express - Oct 11",                    // string, event name
    "guest_code": "XYZ789",                              // string
    "role": "guest",                                     // string, 'guest'
    "created_at": "2025-10-11T10:00:00.000Z"            // string, ISO timestamp
  },
  "message": "Joined event successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"EVENT_NOT_FOUND"
"ALREADY_MEMBER"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/join', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { code } = req.body;

    if (!code) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'code is required'
      });
    }

    const upperCode = code.trim().toUpperCase();
    const userId = req.user.id; // User is authenticated

    // Fetch user's name from database
    const userResult = await query('SELECT name FROM app_user WHERE id = $1', [userId]);
    const userName = userResult.rows[0].name;

    // =============================================================================
    // Find event by guest code
    // =============================================================================
    const eventResult = await query(
      `SELECT id, name, guest_code, bank_account_number, bank_sort_code, bank_account_name, allow_guest_editing, allow_guest_notes_edit, host_contact_info, created_at
       FROM events
       WHERE guest_code = $1`,
      [upperCode]
    );

    if (eventResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'EVENT_NOT_FOUND',
        message: 'No event found with that code'
      });
    }

    const event = eventResult.rows[0];

    // =============================================================================
    // Check if user is the event creator (automatic host)
    // =============================================================================
    const isCreator = await query(
      `SELECT id FROM events WHERE id = $1 AND user_id = $2`,
      [event.id, userId]
    );

    // =============================================================================
    // Check if user already has a guest profile in this event
    // =============================================================================
    const guestCheck = await query(
      `SELECT id, co_host FROM guests
       WHERE app_user_id = $1 AND event_id = $2`,
      [userId, event.id]
    );

    const hasClaimedProfile = guestCheck.rows.length > 0;
    const role = isCreator.rows.length > 0 ? 'host' : (hasClaimedProfile && guestCheck.rows[0].co_host ? 'host' : 'guest');

    // =============================================================================
    // Create placeholder guest entry if user is not creator and hasn't claimed yet
    // This allows them to pass membership checks and view the guest list for claiming
    // =============================================================================
    if (isCreator.rows.length === 0 && !hasClaimedProfile) {
      await query(
        `INSERT INTO guests (event_id, name, amount, deposit, notes, paid, app_user_id, co_host, created_at, updated_at)
         VALUES ($1, '', 0.00, 0.00, NULL, false, $2, false, NOW(), NOW())`,
        [event.id, userId]
      );
      console.log(`✓ Created placeholder guest entry for user ${userId} in event ${event.id}`);
    }

    // =============================================================================
    // Return event details with validation success
    // User will claim or create a guest profile via the frontend flow
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      event: {
        id: event.id,
        name: event.name,
        guest_code: event.guest_code,
        bank_account_number: event.bank_account_number,
        bank_sort_code: event.bank_sort_code,
        bank_account_name: event.bank_account_name,
        allow_guest_editing: event.allow_guest_editing,
        allow_guest_notes_edit: event.allow_guest_notes_edit,
        host_contact_info: event.host_contact_info,
        role: role,
        created_at: event.created_at
      },
      message: hasClaimedProfile ? 'Already a member of this event' : 'Code validated successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in join_event route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while joining event'
    });
  }
});

/*
=======================================================================================================================================
API Route: get_my_events
=======================================================================================================================================
Method: POST
Purpose: Retrieves all events that the authenticated user is a member of, sorted by most recently joined.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{}

Success Response:
{
  "return_code": "SUCCESS",
  "events": [
    {
      "id": 123,                                         // integer, event ID
      "name": "Pizza Express - Oct 11",                  // string, event name
      "guest_code": "XYZ789",                            // string
      "role": "host",                                    // string, user's role
      "joined_at": "2025-10-11T10:00:00.000Z",          // string, when user joined
      "created_at": "2025-10-11T09:00:00.000Z"          // string, when event was created
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/get_my_events', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // User is authenticated

    // =============================================================================
    // Query user's events - both created and joined
    // =============================================================================
    const result = await query(
      `SELECT e.id, e.name, e.guest_code, e.bank_account_number, e.bank_sort_code, e.bank_account_name, e.allow_guest_editing, e.allow_guest_notes_edit, e.host_contact_info, e.created_at,
              CASE
                WHEN e.user_id = $1 THEN 'host'
                WHEN g.co_host = true THEN 'host'
                ELSE 'guest'
              END as role,
              COALESCE(g.created_at, e.created_at) as joined_at
       FROM events e
       LEFT JOIN guests g ON e.id = g.event_id AND g.app_user_id = $1
       WHERE e.user_id = $1 OR g.app_user_id = $1
       ORDER BY COALESCE(g.created_at, e.created_at) DESC`,
      [userId]
    );

    // =============================================================================
    // Format response
    // =============================================================================
    const events = result.rows.map(event => ({
      id: event.id,
      name: event.name,
      guest_code: event.guest_code,
      bank_account_number: event.bank_account_number,
      bank_sort_code: event.bank_sort_code,
      bank_account_name: event.bank_account_name,
      allow_guest_editing: event.allow_guest_editing,
      allow_guest_notes_edit: event.allow_guest_notes_edit,
      host_contact_info: event.host_contact_info,
      role: event.role,
      joined_at: event.joined_at,
      created_at: event.created_at
    }));

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      events: events
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in get_my_events route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while retrieving events'
    });
  }
});

/*
=======================================================================================================================================
API Route: update_bank_details
=======================================================================================================================================
Method: POST
Purpose: Updates bank details for an existing event. Only the host can update bank details.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_id": 123,                                        // integer, required
  "bank_account_number": "12345678",                      // string, optional
  "bank_sort_code": "04-00-03",                           // string, optional
  "bank_account_name": "John Doe"                         // string, optional
}

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 123,
    "bank_account_number": "12345678",
    "bank_sort_code": "04-00-03",
    "bank_account_name": "John Doe"
  },
  "message": "Bank details updated successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"EVENT_NOT_FOUND"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/update_bank_details', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { event_id, bank_account_number, bank_sort_code, bank_account_name } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!event_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'event_id is required'
      });
    }

    // =============================================================================
    // Verify user is host of the event (either creator or delegated host)
    // =============================================================================
    const hostCheck = await query(
      `SELECT e.id
       FROM events e
       LEFT JOIN guests g ON e.id = g.event_id AND g.app_user_id = $1 AND g.co_host = true
       WHERE e.id = $2 AND (e.user_id = $1 OR g.id IS NOT NULL)`,
      [userId, event_id]
    );

    if (hostCheck.rows.length === 0) {
      return res.status(200).json({
        return_code: 'UNAUTHORIZED',
        message: 'Only the host can update bank details'
      });
    }

    // =============================================================================
    // Update bank details
    // =============================================================================
    const updateResult = await query(
      `UPDATE events
       SET bank_account_number = $1,
           bank_sort_code = $2,
           bank_account_name = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, bank_account_number, bank_sort_code, bank_account_name`,
      [bank_account_number || null, bank_sort_code || null, bank_account_name || null, event_id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
    }

    console.log(`✓ Bank details updated for event ${event_id}`);

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      event: {
        id: updateResult.rows[0].id,
        bank_account_number: updateResult.rows[0].bank_account_number,
        bank_sort_code: updateResult.rows[0].bank_sort_code,
        bank_account_name: updateResult.rows[0].bank_account_name
      },
      message: 'Bank details updated successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in update_bank_details route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while updating bank details'
    });
  }
});

/*
=======================================================================================================================================
API Route: update_event_settings
=======================================================================================================================================
Method: POST
Purpose: Updates basic event settings including name, bank details, and guest editing permission.
         Only the host can update event settings.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_id": 123,                                        // integer, required
  "event_name": "New Event Name",                         // string, optional
  "bank_account_number": "12345678",                      // string, optional
  "bank_sort_code": "04-00-03",                           // string, optional
  "bank_account_name": "John Doe",                        // string, optional
  "allow_guest_editing": true                             // boolean, optional
}

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 123,
    "name": "New Event Name",
    "bank_account_number": "12345678",
    "bank_sort_code": "04-00-03",
    "bank_account_name": "John Doe",
    "allow_guest_editing": true
  },
  "message": "Event settings updated successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_EVENT_NAME"
"EVENT_NOT_FOUND"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/update_event_settings', verifyToken, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { event_id, event_name, bank_account_number, bank_sort_code, bank_account_name, allow_guest_editing, allow_guest_notes_edit, host_contact_info } = req.body;
    const userId = req.user.id; // User is authenticated

    if (!event_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'event_id is required'
      });
    }

    // =============================================================================
    // Verify user is host of the event (either creator or delegated host)
    // =============================================================================
    const hostCheck = await query(
      `SELECT e.id
       FROM events e
       LEFT JOIN guests g ON e.id = g.event_id AND g.app_user_id = $1 AND g.co_host = true
       WHERE e.id = $2 AND (e.user_id = $1 OR g.id IS NOT NULL)`,
      [userId, event_id]
    );

    if (hostCheck.rows.length === 0) {
      return res.status(200).json({
        return_code: 'UNAUTHORIZED',
        message: 'Only the host can update event settings'
      });
    }

    // =============================================================================
    // Validate event name if provided
    // =============================================================================
    if (event_name !== undefined) {
      if (typeof event_name !== 'string' || event_name.trim().length === 0) {
        return res.status(200).json({
          return_code: 'INVALID_EVENT_NAME',
          message: 'Event name cannot be empty'
        });
      }
    }

    // =============================================================================
    // Build dynamic update query
    // =============================================================================
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (event_name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(event_name.trim());
      paramCount++;
    }

    if (bank_account_number !== undefined) {
      updates.push(`bank_account_number = $${paramCount}`);
      values.push(bank_account_number || null);
      paramCount++;
    }

    if (bank_sort_code !== undefined) {
      updates.push(`bank_sort_code = $${paramCount}`);
      values.push(bank_sort_code || null);
      paramCount++;
    }

    if (bank_account_name !== undefined) {
      updates.push(`bank_account_name = $${paramCount}`);
      values.push(bank_account_name || null);
      paramCount++;
    }

    if (allow_guest_editing !== undefined) {
      updates.push(`allow_guest_editing = $${paramCount}`);
      values.push(allow_guest_editing);
      paramCount++;
    }

    if (allow_guest_notes_edit !== undefined) {
      updates.push(`allow_guest_notes_edit = $${paramCount}`);
      values.push(allow_guest_notes_edit);
      paramCount++;
    }

    if (host_contact_info !== undefined) {
      updates.push(`host_contact_info = $${paramCount}`);
      values.push(host_contact_info || null);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'No fields to update'
      });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = NOW()`);

    // Add event_id as final parameter
    values.push(event_id);

    // =============================================================================
    // Execute update query
    // =============================================================================
    const updateQuery = `
      UPDATE events
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, name, bank_account_number, bank_sort_code, bank_account_name, allow_guest_editing, allow_guest_notes_edit, host_contact_info
    `;

    const updateResult = await query(updateQuery, values);

    if (updateResult.rows.length === 0) {
      return res.status(200).json({
        return_code: 'EVENT_NOT_FOUND',
        message: 'Event not found'
      });
    }

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      event: {
        id: updateResult.rows[0].id,
        name: updateResult.rows[0].name,
        bank_account_number: updateResult.rows[0].bank_account_number,
        bank_sort_code: updateResult.rows[0].bank_sort_code,
        bank_account_name: updateResult.rows[0].bank_account_name,
        allow_guest_editing: updateResult.rows[0].allow_guest_editing,
        allow_guest_notes_edit: updateResult.rows[0].allow_guest_notes_edit,
        host_contact_info: updateResult.rows[0].host_contact_info
      },
      message: 'Event settings updated successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in update_event_settings route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while updating event settings'
    });
  }
});

/*
=======================================================================================================================================
API Route: leave_event
=======================================================================================================================================
Method: POST
Purpose: Allows a guest to leave an event, removing their membership.
         Hosts cannot leave their own events (they must delete the event instead).
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_id": 123                                        // integer, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Left event successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"NOT_A_MEMBER"
"HOST_CANNOT_LEAVE"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/leave_event', verifyToken, async (req, res) => {
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
    const guestCheck = await query(
      `SELECT id, co_host FROM guests
       WHERE app_user_id = $1 AND event_id = $2`,
      [userId, event_id]
    );

    if (guestCheck.rows.length === 0) {
      return res.status(200).json({
        return_code: 'NOT_A_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Prevent co-hosts from leaving (they should be removed by the event owner)
    // =============================================================================
    if (guestCheck.rows[0].co_host) {
      return res.status(200).json({
        return_code: 'HOST_CANNOT_LEAVE',
        message: 'Hosts cannot leave their own events. Delete the event instead.'
      });
    }

    // =============================================================================
    // Remove the user's guest entry
    // =============================================================================
    await query(
      `DELETE FROM guests
       WHERE app_user_id = $1 AND event_id = $2`,
      [userId, event_id]
    );

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      message: 'Left event successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in leave_event route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while leaving event'
    });
  }
});

/*
=======================================================================================================================================
API Route: delete_event
=======================================================================================================================================
Method: POST
Purpose: Archives and deletes an event and all associated data (guests, items).
         Data is first copied to archive tables for analytics, then permanently deleted.
         Only the host can delete an event.
         Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "event_id": 123                                        // integer, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Event deleted successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"EVENT_NOT_FOUND"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/delete_event', verifyToken, async (req, res) => {
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
    // Verify user is host of the event (either creator or delegated host)
    // =============================================================================
    const hostCheck = await query(
      `SELECT e.id
       FROM events e
       LEFT JOIN guests g ON e.id = g.event_id AND g.app_user_id = $1 AND g.co_host = true
       WHERE e.id = $2 AND (e.user_id = $1 OR g.id IS NOT NULL)`,
      [userId, event_id]
    );

    if (hostCheck.rows.length === 0) {
      return res.status(200).json({
        return_code: 'UNAUTHORIZED',
        message: 'Only the host can delete an event'
      });
    }

    // =============================================================================
    // Archive event and all associated data, then delete
    // =============================================================================
    await withTransaction(async (client) => {
      // Archive all guest items first
      await client.query(
        `INSERT INTO zarchive_guest_items
         (id, guest_id, note, created_at, price, event_id, archived_at, archived_by)
         SELECT id, guest_id, note, created_at, price, event_id, CURRENT_TIMESTAMP, $2
         FROM guest_items
         WHERE event_id = $1`,
        [event_id, userId]
      );

      // Archive all guests
      await client.query(
        `INSERT INTO zarchive_guests
         (id, event_id, name, amount, deposit, notes, paid, created_at, updated_at, app_user_id, co_host, archived_at, archived_by)
         SELECT id, event_id, name, amount, deposit, notes, paid, created_at, updated_at, app_user_id, co_host, CURRENT_TIMESTAMP, $2
         FROM guests
         WHERE event_id = $1`,
        [event_id, userId]
      );

      // Archive the event
      await client.query(
        `INSERT INTO zarchive_events
         (id, name, guest_code, created_at, updated_at, user_id, bank_account_number, bank_sort_code, bank_account_name, payment_method, allow_guest_editing, allow_guest_notes_edit, host_contact_info, archived_at, archived_by)
         SELECT id, name, guest_code, created_at, updated_at, user_id, bank_account_number, bank_sort_code, bank_account_name, payment_method, allow_guest_editing, allow_guest_notes_edit, host_contact_info, CURRENT_TIMESTAMP, $2
         FROM events
         WHERE id = $1`,
        [event_id, userId]
      );

      // Delete guest_items, guests, then event (in order due to foreign keys)
      await client.query(
        `DELETE FROM guest_items WHERE event_id = $1`,
        [event_id]
      );

      await client.query(
        `DELETE FROM guests WHERE event_id = $1`,
        [event_id]
      );

      await client.query(
        `DELETE FROM events WHERE id = $1`,
        [event_id]
      );
    });

    console.log(`✓ Event ${event_id} archived and deleted successfully`);

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      message: 'Event deleted successfully'
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in delete_event route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while deleting event'
    });
  }
});

module.exports = router;
