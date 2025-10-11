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
// Optional Authentication Middleware
// =============================================================================
/**
 * Middleware that attempts to verify JWT token if present
 * Unlike verifyToken, this doesn't fail if no token - just adds req.user if valid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    // No token provided - continue as anonymous
    return next();
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Invalid format - continue as anonymous
    return next();
  }

  const token = parts[1];
  const jwt = require('jsonwebtoken');
  const config = require('../config/config');

  try {
    // Verify token and attach user to request
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
  } catch (error) {
    // Invalid/expired token - continue as anonymous
    console.log('Invalid token provided, continuing as anonymous');
  }

  next();
};

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
Purpose: Creates a new dining event with unique host and guest codes.
         Automatically adds creator as host in user_event_memberships table.
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",  // string, required - anonymous user ID
  "event_name": "Pizza Express - Oct 11"                 // string, required - name of event
}

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 123,                                           // integer, event ID
    "name": "Pizza Express - Oct 11",                    // string, event name
    "host_code": "ABC123",                               // string, code for host access
    "guest_code": "XYZ789",                              // string, code for guest access
    "created_at": "2025-10-11T10:00:00.000Z"            // string, ISO timestamp
  },
  "message": "Event created successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/create', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id, event_name } = req.body;

    // Check if all required fields are present
    if (!session_id || !event_name) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id and event_name are required'
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
    // Generate unique codes for host and guest access
    // =============================================================================
    const hostCode = await generateUniqueCode('host');
    const guestCode = await generateUniqueCode('guest');

    console.log(`→ Creating event: "${event_name}" (Host: ${hostCode}, Guest: ${guestCode})`);

    // =============================================================================
    // Create event and membership in a transaction
    // =============================================================================
    // Using transaction to ensure both event and membership are created atomically
    const result = await withTransaction(async (client) => {
      // Determine if user is authenticated
      const userId = req.user ? req.user.id : null;

      // Insert new event (link to user_id if authenticated)
      const eventResult = await client.query(
        `INSERT INTO events (name, host_code, guest_code, user_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING id, name, host_code, guest_code, created_at`,
        [event_name.trim(), hostCode, guestCode, userId]
      );

      const newEvent = eventResult.rows[0];

      // Create host membership for creator (use app_user_id if authenticated)
      await client.query(
        `INSERT INTO user_event_memberships (user_id, event_id, role, app_user_id, joined_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [session_id, newEvent.id, 'host', userId]
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
        host_code: result.host_code,
        guest_code: result.guest_code,
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
Purpose: Allows a user to join an existing event using either host or guest code.
         Creates a membership record with appropriate role.
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",  // string, required
  "code": "ABC123"                                       // string, required - host or guest code
}

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 123,                                           // integer, event ID
    "name": "Pizza Express - Oct 11",                    // string, event name
    "host_code": "ABC123",                               // string (only if joined as host)
    "guest_code": "XYZ789",                              // string
    "role": "host",                                      // string, 'host' or 'guest'
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
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/join', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id, code } = req.body;

    if (!session_id || !code) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id and code are required'
      });
    }

    const upperCode = code.trim().toUpperCase();

    // =============================================================================
    // Find event by code (check both host and guest codes)
    // =============================================================================
    const eventResult = await query(
      `SELECT id, name, host_code, guest_code, created_at,
              CASE
                WHEN host_code = $1 THEN 'host'
                WHEN guest_code = $1 THEN 'guest'
              END as role
       FROM events
       WHERE host_code = $1 OR guest_code = $1`,
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
       WHERE user_id = $1 AND event_id = $2`,
      [session_id, event.id]
    );

    if (membershipCheck.rows.length > 0) {
      // User is already a member, return event details
      return res.status(200).json({
        return_code: 'SUCCESS',
        event: {
          id: event.id,
          name: event.name,
          host_code: membershipCheck.rows[0].role === 'host' ? event.host_code : undefined,
          guest_code: event.guest_code,
          role: membershipCheck.rows[0].role,
          created_at: event.created_at
        },
        message: 'Already a member of this event'
      });
    }

    // =============================================================================
    // Create new membership
    // =============================================================================
    const userId = req.user ? req.user.id : null;

    await query(
      `INSERT INTO user_event_memberships (user_id, event_id, role, app_user_id, joined_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [session_id, event.id, event.role, userId]
    );

    console.log(`✓ User ${session_id} joined event ${event.id} as ${event.role}`);

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      event: {
        id: event.id,
        name: event.name,
        host_code: event.role === 'host' ? event.host_code : undefined,
        guest_code: event.guest_code,
        role: event.role,
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
Purpose: Retrieves all events that a user is a member of, sorted by most recently joined.
=======================================================================================================================================
Request Payload:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000"  // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "events": [
    {
      "id": 123,                                         // integer, event ID
      "name": "Pizza Express - Oct 11",                  // string, event name
      "host_code": "ABC123",                             // string (only if user is host)
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
"MISSING_FIELDS"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/get_my_events', optionalAuth, async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'session_id is required'
      });
    }

    // =============================================================================
    // Query user's events with membership details
    // =============================================================================
    // If authenticated, filter by app_user_id to get events across all devices
    // If anonymous, filter by session_id (device-specific)
    const userId = req.user ? req.user.id : null;

    const result = userId
      ? await query(
          `SELECT e.id, e.name, e.host_code, e.guest_code, e.created_at,
                  m.role, m.joined_at
           FROM events e
           INNER JOIN user_event_memberships m ON e.id = m.event_id
           WHERE m.app_user_id = $1
           ORDER BY m.joined_at DESC`,
          [userId]
        )
      : await query(
          `SELECT e.id, e.name, e.host_code, e.guest_code, e.created_at,
                  m.role, m.joined_at
           FROM events e
           INNER JOIN user_event_memberships m ON e.id = m.event_id
           WHERE m.user_id = $1 AND m.app_user_id IS NULL
           ORDER BY m.joined_at DESC`,
          [session_id]
        );

    // =============================================================================
    // Format response (hide host_code from guests)
    // =============================================================================
    const events = result.rows.map(event => ({
      id: event.id,
      name: event.name,
      host_code: event.role === 'host' ? event.host_code : undefined,
      guest_code: event.guest_code,
      role: event.role,
      joined_at: event.joined_at,
      created_at: event.created_at
    }));

    console.log(`✓ Retrieved ${events.length} events for user ${session_id}`);

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

module.exports = router;
