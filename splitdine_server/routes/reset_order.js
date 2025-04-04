/*
=======================================================================================================================================
API Route: reset_order
=======================================================================================================================================
Method: POST
Purpose: Removes all items from a guest’s order, allowing a fresh start.
=======================================================================================================================================
Request Payload:
{
  "user_id": 123,                    // integer, optional — defaults to token user
  "event_id": 789                    // integer, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Order reset successfully."
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

router.post('/', verifyToken, async (req, res) => {
  const user_id_from_token = req.user.user_id;
  const { user_id, event_id } = req.body;
  const target_user_id = user_id || user_id_from_token;

  if (!event_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS",
      message: "event_id is required."
    });
  }

  try {
    // Check permission if acting on behalf of someone else
    if (target_user_id !== user_id_from_token) {
      const permissionCheck = await db.query(
        `SELECT role FROM guest WHERE event_id = $1 AND user_id = $2`,
        [event_id, user_id_from_token]
      );

      const role = permissionCheck.rows[0]?.role;
      if (!['organiser', 'co-host'].includes(role)) {
        return res.status(403).json({
          return_code: "UNAUTHORISED_ACTION",
          message: "You do not have permission to reset orders for this user."
        });
      }
    }

    // Perform the reset (delete all order items for this user in the event)
    await db.query(
      `DELETE FROM order_item WHERE event_id = $1 AND guest_id = $2`,
      [event_id, target_user_id]
    );

    res.json({
      return_code: "SUCCESS",
      message: "Order reset successfully."
    });

  } catch (err) {
    console.error('Reset order error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Server error."
    });
  }
});

module.exports = router;
