/*
=======================================================================================================================================
API Route: lock_order_item
=======================================================================================================================================
Method: POST
Purpose: Locks or unlocks a specific menu item selection for an event (used by organiser/co-host).
=======================================================================================================================================
Request Payload:
{
  "event_id": 789,                     // integer, required — ID of the event
  "order_item_id": 321,                // integer, required — ID of the selected order item
  "locked": true                       // boolean, true to lock, false to unlock
}

Success Response:
{
  "return_code": "SUCCESS"
  "message": Order item ${locked ? 'locked' : 'unlocked'} successfully.
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"UNAUTHORISED_ACTION"
"ITEM_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// POST /lock_order_item
router.post('/', verifyToken, async (req, res) => {
  const { event_id, order_item_id, locked } = req.body;
  const user_id = req.user.user_id;

  if (!event_id || !order_item_id || typeof locked !== 'boolean') {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // Check if user has permission to lock items
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

    // Confirm the item belongs to the event
    const itemCheck = await db.query(
      `SELECT id FROM order_item WHERE id = $1 AND event_id = $2`,
      [order_item_id, event_id]
    );

    if (itemCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "ITEM_NOT_FOUND"
      });
    }

    // Update lock status
    await db.query(
      `UPDATE order_item SET locked = $1 WHERE id = $2`,
      [locked, order_item_id]
    );

    res.json({
      return_code: "SUCCESS",
      message: `Order item ${locked ? 'locked' : 'unlocked'} successfully.`
    });

  } catch (err) {
    console.error('Lock order item error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;

