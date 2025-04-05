/*
=======================================================================================================================================
API Route: add_order_item
=======================================================================================================================================
Method: POST
Purpose: Adds a new menu item to a guest’s order for a specific event.
=======================================================================================================================================
Request Payload:
{
  "user_id": 123,                     // integer, optional — defaults to token user
  "event_id": 789,                    // integer, required — event ID
  "menu_id": 501,                     // integer, optional if using custom item
  "custom_item_name": "Extra Cheese", // string, optional if menu_id provided
  "quantity": 1,                      // integer, required
  "price_at_time": 1.50               // number, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Item added successfully.",
  "item_id": 321                     // integer, order_item ID
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORISED_ACTION"
"MISSING_FIELDS"
"INVALID_MENU_ITEM"
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
  const { user_id, event_id, menu_id, custom_item_name, quantity, price_at_time } = req.body;
  const target_user_id = user_id || user_id_from_token;

  // Basic validation
  if (!event_id || !quantity || !price_at_time) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS",
      message: "Required fields missing."
    });
  }

  // Validate quantity is positive
  if (quantity <= 0) {
    return res.status(400).json({
      return_code: "INVALID_QUANTITY",
      message: "Quantity must be greater than zero."
    });
  }

  // Validate price is non-negative
  if (price_at_time < 0) {
    return res.status(400).json({
      return_code: "INVALID_PRICE",
      message: "Price cannot be negative."
    });
  }

  try {
    // Check permissions if acting on behalf of someone else
    if (target_user_id !== user_id_from_token) {
      const permissionCheck = await db.query(
        `SELECT role FROM guest WHERE event_id = $1 AND user_id = $2`,
        [event_id, user_id_from_token]
      );

      const role = permissionCheck.rows[0]?.role;
      if (!['organiser', 'co-host'].includes(role)) {
        return res.status(403).json({
          return_code: "UNAUTHORISED_ACTION",
          message: "You are not allowed to add items for another guest."
        });
      }
    }

    let item_name = '';
    let item_id = null;

    // If menu_id is provided, validate it belongs to the event's restaurant
    if (menu_id) {
      const menuCheck = await db.query(
        `SELECT m.id, m.item_name
         FROM menu m
         JOIN event e ON m.restaurant_id = e.restaurant_id
         WHERE m.id = $1 AND e.id = $2`,
        [menu_id, event_id]
      );

      if (menuCheck.rows.length === 0) {
        return res.status(400).json({
          return_code: "INVALID_MENU_ITEM",
          message: "Menu item does not belong to this event's restaurant."
        });
      }
      
      // Store the item name for use in the insert query
      item_name = menuCheck.rows[0].item_name;
    } else if (custom_item_name) {
      item_name = custom_item_name;
    } else {
      return res.status(400).json({
        return_code: "MISSING_FIELDS",
        message: "Either menu_id or custom_item_name must be provided."
      });
    }

    // Check if the item already exists for this guest in this event
    const existingItemCheck = await db.query(
      `SELECT id, quantity 
       FROM order_item 
       WHERE event_id = $1 
       AND guest_id = $2 
       AND (
         (menu_id = $3 AND $3 IS NOT NULL) 
         OR (
           LOWER(TRIM(custom_item_name)) = LOWER(TRIM($4)) 
           AND ($3 IS NULL OR menu_id IS NULL)
         )
       )`,
      [event_id, target_user_id, menu_id, item_name]
    );

    if (existingItemCheck.rows.length > 0) {
      // Item exists, update quantity
      const existingItem = existingItemCheck.rows[0];
      const newQuantity = existingItem.quantity + quantity;
      
      const update = await db.query(
        `UPDATE order_item 
         SET quantity = $1, price_at_time = $2
         WHERE id = $3
         RETURNING id`,
        [newQuantity, price_at_time, existingItem.id]
      );

      res.status(200).json({
        return_code: "SUCCESS",
        message: "Item quantity updated successfully.",
        item_id: update.rows[0].id
      });
    } else {
      // Item doesn't exist, insert new row
      const insert = await db.query(
        `INSERT INTO order_item (event_id, guest_id, menu_id, custom_item_name, quantity, price_at_time, locked)
         VALUES ($1, $2, $3, $4, $5, $6, false)
         RETURNING id`,
        [event_id, target_user_id, menu_id, item_name, quantity, price_at_time]
      );

      res.status(201).json({
        return_code: "SUCCESS",
        message: "Item added successfully.",
        item_id: insert.rows[0].id
      });
    }
  } catch (err) {
    console.error('Add order item error:', err);
    
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
