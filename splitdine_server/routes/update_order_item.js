/*
=======================================================================================================================================
API Route: update_order_item
=======================================================================================================================================
Method: POST
Purpose: Updates quantity or price of an existing order item.
=======================================================================================================================================
Request Payload:
{
  "order_item_id": 321,              // integer, required — ID of the order item to update
  "quantity": 2,                     // integer, optional — new quantity
  "price_at_time": 1.75              // number, optional — new price
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Item updated successfully."
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"ITEM_NOT_FOUND"
"ITEM_LOCKED"
"UNAUTHORISED_ACTION"
"INVALID_QUANTITY"
"INVALID_PRICE"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

router.post('/', verifyToken, async (req, res) => {
  const user_id_from_token = req.user.user_id;
  const { order_item_id, quantity, price_at_time } = req.body;

  if (!order_item_id || (!quantity && quantity !== 0 && !price_at_time)) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS",
      message: "order_item_id and at least one field (quantity or price_at_time) are required."
    });
  }

  // Validate quantity is positive if provided
  if (quantity !== undefined && quantity <= 0) {
    return res.status(400).json({
      return_code: "INVALID_QUANTITY",
      message: "Quantity must be greater than zero."
    });
  }

  // Validate price is non-negative if provided
  if (price_at_time !== undefined && price_at_time < 0) {
    return res.status(400).json({
      return_code: "INVALID_PRICE",
      message: "Price cannot be negative."
    });
  }

  try {
    // Fetch the order item to check ownership and status
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
        message: "Order item is locked and cannot be updated."
      });
    }

    // Check permissions
    if (item.guest_id !== user_id_from_token) {
      if (!['organiser', 'co-host'].includes(item.role)) {
        return res.status(403).json({
          return_code: "UNAUTHORISED_ACTION",
          message: "You do not have permission to update this item."
        });
      }
    }

    // Build dynamic SET clause
    const fields = [];
    const values = [order_item_id];
    let paramIndex = 2;

    if (quantity !== undefined) {
      fields.push(`quantity = $${paramIndex++}`);
      values.push(quantity);
    }

    if (price_at_time !== undefined) {
      fields.push(`price_at_time = $${paramIndex++}`);
      values.push(price_at_time);
    }

    await db.query(
      `UPDATE order_item SET ${fields.join(', ')} WHERE id = $1`,
      values
    );

    res.json({
      return_code: "SUCCESS",
      message: "Item updated successfully."
    });

  } catch (err) {
    console.error('Update order item error:', err);
    
    // Handle specific database constraint errors
    if (err.code === '23514' && err.detail?.includes('order_item_quantity_check')) {
      return res.status(400).json({
        return_code: "INVALID_QUANTITY",
        message: "Quantity must be greater than zero."
      });
    }
    
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Server error."
    });
  }
});

module.exports = router;
