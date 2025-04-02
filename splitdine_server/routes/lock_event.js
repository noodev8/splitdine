/*
=======================================================================================================================================
API Route: lock_event
=======================================================================================================================================
Method: POST
Purpose: Locks or unlocks the entire event, preventing all guests from making further changes.
=======================================================================================================================================
Request Payload:
{
  "event_id": 789,                     // integer, required — ID of the event
  "locked": true                       // boolean, true to lock the event, false to unlock
}

Success Response:
{
  "return_code": "SUCCESS"
  "message": Event ${locked ? 'locked' : 'unlocked'} successfully.`
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"UNAUTHORISED_ACTION"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// POST /lock_event
router.post('/', verifyToken, async (req, res) => {
  const { event_id, locked } = req.body;
  const user_id = req.user.user_id;

  if (!event_id || typeof locked !== 'boolean') {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // Verify role
    const roleCheck = await db.query(
      `SELECT role FROM guest WHERE event_id = $1 AND user_id = $2`,
      [event_id, user_id]
    );

    const role = roleCheck.rows[0]?.role;
    if (role !== 'organiser') {
      return res.status(403).json({
        return_code: "UNAUTHORISED_ACTION"
      });
    }

    // Update the event lock status
    await db.query(
      `UPDATE event SET locked = $1 WHERE id = $2`,
      [locked, event_id]
    );

    res.json({
      return_code: "SUCCESS",
      message: `Event ${locked ? 'locked' : 'unlocked'} successfully.`
    });

  } catch (err) {
    console.error('Lock event error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
