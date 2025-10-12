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
 * Generates a unique code that doesn't exist in database
 * @param {string} codeType - 'host' or 'guest'
 * @returns {Promise<string>} - Unique 6-character code
 */
const generateUniqueCode = async (codeType) => {
  let code;
  let isUnique = false;
  const column = codeType === 'host' ? 'host_code' : 'guest_code';

  // Keep generating until we find a unique code
  while (!isUnique) {
    code = generateCode();
    const result = await query(
      `SELECT id FROM events WHERE ${column} = $1`,
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
         Automatically adds creator as host in user_event_memberships table.
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
    const guestCode = await generateUniqueCode('guest');

    // =============================================================================
    // Create event and membership in a transaction
    // =============================================================================
    const result = await withTransaction(async (client) => {
      const userId = req.user.id; // User is authenticated

      // Insert new event
      const eventResult = await client.query(
        `INSERT INTO events (name, host_code, guest_code, user_id, bank_account_number, bank_sort_code, bank_account_name, created_at, updated_at)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, name, guest_code, bank_account_number, bank_sort_code, bank_account_name, created_at`,
        [event_name.trim(), guestCode, userId, bank_account_number || null, bank_sort_code || null, bank_account_name || null]
      );

      const newEvent = eventResult.rows[0];

      // Create host membership for creator
      await client.query(
        `INSERT INTO user_event_memberships (event_id, role, user_id, app_user_id, joined_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [newEvent.id, 'host', userId.toString(), userId]
      );

      return newEvent;
    });

    console.log(`✓ Event created successfully (ID: ${result.id})`);

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      event: {
        id: result.id,
        name: result.name,
        guest_code: result.guest_code,
        bank_account_number: result.bank_account_number,
        bank_sort_code: result.bank_sort_code,
        bank_account_name: result.bank_account_name,
        created_at: result.created_at
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
         Creates a guest membership record.
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

    // =============================================================================
    // Find event by guest code
    // =============================================================================
    const eventResult = await query(
      `SELECT id, name, guest_code, bank_account_number, bank_sort_code, bank_account_name, created_at
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
    // Check if user is already a member
    // =============================================================================
    const membershipCheck = await query(
      `SELECT id, role FROM user_event_memberships
       WHERE app_user_id = $1 AND event_id = $2`,
      [userId, event.id]
    );

    if (membershipCheck.rows.length > 0) {
      // User is already a member, return event details
      return res.status(200).json({
        return_code: 'SUCCESS',
        event: {
          id: event.id,
          name: event.name,
          guest_code: event.guest_code,
          bank_account_number: event.bank_account_number,
          bank_sort_code: event.bank_sort_code,
          bank_account_name: event.bank_account_name,
          role: membershipCheck.rows[0].role,
          created_at: event.created_at
        },
        message: 'Already a member of this event'
      });
    }

    // =============================================================================
    // Create new membership as guest
    // =============================================================================
    await query(
      `INSERT INTO user_event_memberships (event_id, role, user_id, app_user_id, joined_at)
       VALUES ($1, 'guest', $2, $3, NOW())`,
      [event.id, userId.toString(), userId]
    );

    // =============================================================================
    // Return success response
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
        role: 'guest',
        created_at: event.created_at
      },
      message: 'Joined event successfully'
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
    // Query user's events with membership details
    // =============================================================================
    const result = await query(
      `SELECT e.id, e.name, e.guest_code, e.bank_account_number, e.bank_sort_code, e.bank_account_name, e.created_at,
              m.role, m.joined_at
       FROM events e
       INNER JOIN user_event_memberships m ON e.id = m.event_id
       WHERE m.app_user_id = $1
       ORDER BY m.joined_at DESC`,
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
    // Verify user is host of the event
    // =============================================================================
    const membershipCheck = await query(
      `SELECT role FROM user_event_memberships
       WHERE app_user_id = $1 AND event_id = $2`,
      [userId, event_id]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(200).json({
        return_code: 'EVENT_NOT_FOUND',
        message: 'Event not found or you are not a member'
      });
    }

    if (membershipCheck.rows[0].role !== 'host') {
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
    const membershipCheck = await query(
      `SELECT id, role FROM user_event_memberships
       WHERE app_user_id = $1 AND event_id = $2`,
      [userId, event_id]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(200).json({
        return_code: 'NOT_A_MEMBER',
        message: 'You are not a member of this event'
      });
    }

    // =============================================================================
    // Prevent hosts from leaving (they should delete the event instead)
    // =============================================================================
    if (membershipCheck.rows[0].role === 'host') {
      return res.status(200).json({
        return_code: 'HOST_CANNOT_LEAVE',
        message: 'Hosts cannot leave their own events. Delete the event instead.'
      });
    }

    // =============================================================================
    // Remove the user's membership
    // =============================================================================
    await query(
      `DELETE FROM user_event_memberships
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

module.exports = router;
