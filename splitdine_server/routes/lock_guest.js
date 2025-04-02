/*
=======================================================================================================================================
API Route: lock_guest
=======================================================================================================================================
Method: POST
Purpose: Locks or unlocks a guest’s ability to make changes to their selections in a specific event.
=======================================================================================================================================
Request Payload:
{
  "event_id": 789,                     // integer, required — ID of the event
  "guest_id": 12,                      // integer, required — ID of the guest record in the event
  "locked": true                       // boolean, true to lock, false to unlock
}

Success Response:
{
  "return_code": "SUCCESS"
  "message": Guest ${locked ? 'locked' : 'unlocked'} successfully.
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"UNAUTHORISED_ACTION"
"GUEST_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// POST /lock_guest
router.post('/', verifyToken, async (req, res) => {
  const { event_id, guest_id, locked } = req.body;
  const user_id = req.user.user_id;

  if (!event_id || !guest_id || typeof locked !== 'boolean') {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // Permission check
    const roleCheck = await db.query(
      `SELECT role FROM guest WHERE event_id = $1 AND user_id = $2`,
      [event_id, user_id]
    );

    const role = roleCheck.rows[0]?.role;
    if (!['organiser', 'co-host'].includes(role)) {
      return res.status(403).json({
        return_code: "UNAUTHORISED_ACTION"
      });
    }

    // Confirm guest exists for this event
    const guestCheck = await db.query(
      `SELECT id FROM guest WHERE user_id = $1 AND event_id = $2`,
      [guest_id, event_id]
    );

    if (guestCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "GUEST_NOT_FOUND"
      });
    }

    // Lock or unlock all order_items for this guest
    await db.query(
      `UPDATE order_item SET locked = $1 WHERE event_id = $2 AND guest_id = $3`,
      [locked, event_id, guest_id]
    );

    // (Optional) also lock guest row
    await db.query(
      `UPDATE guest SET locked = $1 WHERE event_id = $2 AND user_id = $3`,
      [locked, event_id, guest_id]
    );

    res.json({
      return_code: "SUCCESS",
      message: `Guest ${locked ? 'locked' : 'unlocked'} successfully.`
    });

  } catch (err) {
    console.error('Lock guest error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
