/*
=======================================================================================================================================
API Route: remove_order_item
=======================================================================================================================================
Method: POST
Purpose: Removes an item from a guest’s order.
=======================================================================================================================================
Request Payload:
{
  "order_item_id": 321              // integer, required — ID of the order item to remove
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Item removed successfully."
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"ITEM_NOT_FOUND"
"ITEM_LOCKED"
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
  const { order_item_id } = req.body;

  if (!order_item_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS",
      message: "order_item_id is required."
    });
  }

  try {
    // Check item exists and status
    const itemCheck = await db.query(
      `SELECT oi.event_id, oi.guest_id, oi.locked, g.role
       FROM order_item oi
       JOIN guest g ON oi.event_id = g.event_id AND oi.guest_id = g.user_id
       WHERE oi.id = $1`,
      [order_item_id]
    );

    const item = itemCheck.rows[0];

    if (!item) {
      return res.status(404).json({
        return_code: "ITEM_NOT_FOUND",
        message: "Order item not found."
      });
    }

    if (item.locked) {
      return res.status(403).json({
        return_code: "ITEM_LOCKED",
        message: "Order item is locked and cannot be removed."
      });
    }

    // Permission check
    if (item.guest_id !== user_id_from_token) {
      if (!['organiser', 'co-host'].includes(item.role)) {
        return res.status(403).json({
          return_code: "UNAUTHORISED_ACTION",
          message: "You do not have permission to remove this item."
        });
      }
    }

    // Delete the item
    await db.query(`DELETE FROM order_item WHERE id = $1`, [order_item_id]);

    res.json({
      return_code: "SUCCESS",
      message: "Item removed successfully."
    });

  } catch (err) {
    console.error('Remove order item error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Server error."
    });
  }
});

module.exports = router;
