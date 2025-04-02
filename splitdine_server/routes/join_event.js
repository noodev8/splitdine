/*
=======================================================================================================================================
API Route: join_event
=======================================================================================================================================
Method: POST
Purpose: Adds a logged-in user to an existing event using a public 4-digit event code. Authenticated via JWT.
=======================================================================================================================================
Request Payload:
{
  "public_event_code": "4988"          // string, required — public-facing event code
}

Success Response:
{
  "return_code": "SUCCESS",
  "guest_id": 12                       // integer, unique ID for this guest in the event
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"EVENT_NOT_FOUND"
"ALREADY_JOINED"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// POST /join_event
router.post('/', verifyToken, async (req, res) => {
  const { public_event_code } = req.body;
  const user_id = req.user.user_id;

  // Basic validation
  if (!public_event_code) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // Look up the event_id from the public code (and ensure it's still open)
    const eventRes = await db.query(
      'SELECT id FROM event WHERE public_event_code = $1 AND locked = false',
      [public_event_code]
    );

    if (eventRes.rows.length === 0) {
      return res.status(404).json({
        return_code: "EVENT_NOT_FOUND"
      });
    }

    const event_id = eventRes.rows[0].id;

    // Check if user is already a guest (prevent duplicates)
    const guestCheck = await db.query(
      'SELECT id FROM guest WHERE event_id = $1 AND user_id = $2',
      [event_id, user_id]
    );

    if (guestCheck.rows.length > 0) {
      return res.status(409).json({
        return_code: "ALREADY_JOINED"
      });
    }

    // Insert guest
    const insertRes = await db.query(
      `INSERT INTO guest (event_id, user_id, role, locked)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [event_id, user_id, 'guest', false]
    );

    const guest_id = insertRes.rows[0].id;

    res.status(201).json({
      return_code: "SUCCESS",
      guest_id
    });

  } catch (err) {
    console.error('Join event error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
