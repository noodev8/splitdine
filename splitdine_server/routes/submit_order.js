/*
=======================================================================================================================================
API Route: submit_order
=======================================================================================================================================
Method: POST
Purpose: Submits or updates a guest’s selected items for a specific event.
=======================================================================================================================================
Request Payload:
{
  "user_id": 123,                     // integer, optional — used only when submitting on behalf of someone else
  "event_id": 789,                    // integer, required — ID of the event
  "items": [
    {
      "menu_id": 501,                // integer, optional if using custom name
      "custom_item_name": null,     // string, optional if menu_id is provided
      "quantity": 2,                // integer, number of units
      "price_at_time": 4.50         // number, per-item price entered
    },
    {
      "menu_id": null,
      "custom_item_name": "Extra Cheese",
      "quantity": 1,
      "price_at_time": 1.00
    }
  ]
}

Success Response:
{
  "return_code": "SUCCESS",
  "total_amount": 10.00                // number, total submitted amount
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"UNAUTHORISED_ACTION"
"MISSING_FIELDS"
"EVENT_NOT_FOUND"
"INVALID_ITEM"
"INVALID_MENU_ITEM"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// POST /submit_order
router.post('/', verifyToken, async (req, res) => {
  const user_id_from_token = req.user.user_id;
  const { event_id, user_id, items } = req.body;

  const target_user_id = user_id || user_id_from_token; // fallback to token if not provided

  // Basic validation
  if (!event_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // Check user permissions if submitting for someone else
    if (target_user_id !== user_id_from_token) {
      const permissionCheck = await db.query(
        `SELECT role FROM guest WHERE event_id = $1 AND user_id = $2`,
        [event_id, user_id_from_token]
      );

      if (
        permissionCheck.rows.length === 0 ||
        !['organiser', 'co-host'].includes(permissionCheck.rows[0].role)
      ) {
        return res.status(403).json({
          return_code: "UNAUTHORISED_ACTION"
        });
      }
    }

    // Delete existing orders for this guest in this event
    await db.query(
      `DELETE FROM order_item WHERE event_id = $1 AND guest_id = $2`,
      [event_id, target_user_id]
    );

    // Fetch restaurant_id for this event
    const eventRes = await db.query(
      `SELECT restaurant_id FROM event WHERE id = $1`,
      [event_id]
    );
    if (eventRes.rows.length === 0) {
      return res.status(404).json({
        return_code: "EVENT_NOT_FOUND"
      });
    }
    const restaurant_id = eventRes.rows[0].restaurant_id;

    // Insert new order items
    let total_amount = 0;
    for (const item of items) {
      const { menu_id, custom_item_name, quantity, price_at_time } = item;

      if ((!menu_id && !custom_item_name) || quantity == null || price_at_time == null) {
        return res.status(400).json({
          return_code: "INVALID_ITEM"
        });
      }

      // If menu_id is provided, validate it belongs to the restaurant
      if (menu_id) {
        const menuCheck = await db.query(
          `SELECT id FROM menu WHERE id = $1 AND restaurant_id = $2`,
          [menu_id, restaurant_id]
        );
        if (menuCheck.rows.length === 0) {
          return res.status(400).json({
            return_code: "INVALID_MENU_ITEM"
          });
        }
      }

      // If menu_id is present, null out custom name
      const finalCustomName = menu_id ? null : custom_item_name;

      await db.query(
        `INSERT INTO order_item (event_id, guest_id, menu_id, custom_item_name, quantity, price_at_time, locked)
         VALUES ($1, $2, $3, $4, $5, $6, false)`,
        [event_id, target_user_id, menu_id || null, finalCustomName, quantity, price_at_time]
      );

      total_amount += quantity * price_at_time;
    }

    res.status(201).json({
      return_code: "SUCCESS",
      total_amount: parseFloat(total_amount.toFixed(2))
    });

  } catch (err) {
    console.error('Submit order error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;






