/*
=======================================================================================================================================
API Route: get_event_bill
=======================================================================================================================================
Method: GET
Purpose: Retrieves the final bill summary for an event, showing each guest’s selections and totals.
=======================================================================================================================================
Request Parameters:
- event_id: 789                       // integer, required — unique ID of the event

Success Response:
{
  "return_code": "SUCCESS",
  "bill": [
    {
      "user_id": 123,                 // integer, guest ID
      "name": "Andreas",              // string, guest's name
      "items": [
        {
          "item_name": "Garlic Bread",// string, selected item name
          "quantity": 1,              // integer, quantity
          "price_at_time": 4.50       // number, price recorded at selection
        },
        {
          "item_name": "Pasta Carbonara",
          "quantity": 1,
          "price_at_time": 10.95
        }
      ],
      "total": 15.45                  // number, total amount owed by this guest
    },
    {
      "user_id": 456,
      "name": "Sophie",
      "items": [],
      "total": 0.00
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

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /get_event_bill/:event_id
router.get('/:event_id', verifyToken, async (req, res) => {
  const event_id = req.params.event_id;

  if (!event_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // Get all guests in the event
    const guestsRes = await db.query(
      `SELECT g.user_id, u.name, g.role
       FROM guest g
       JOIN app_user u ON g.user_id = u.id
       WHERE g.event_id = $1`,
      [event_id]
    );

    const bill = [];

    for (const guest of guestsRes.rows) {
      const { user_id, name, role } = guest;

      // Get all order items for the guest
      const ordersRes = await db.query(
        `SELECT 
           oi.quantity,
           oi.price_at_time,
           COALESCE(m.item_name, oi.custom_item_name) AS item
         FROM order_item oi
         LEFT JOIN menu m ON oi.menu_id = m.id
         WHERE oi.event_id = $1 AND oi.guest_id = $2`,
        [event_id, user_id]
      );

      const items = ordersRes.rows.map(row => ({
        item: row.item,
        quantity: row.quantity,
        price: parseFloat(row.price_at_time),
        subtotal: parseFloat((row.quantity * row.price_at_time).toFixed(2))
      }));

      const total = items.reduce((sum, i) => sum + i.subtotal, 0);

      bill.push({
        user_id,
        name,
        role,
        items,
        total: parseFloat(total.toFixed(2))
      });
    }

    res.json({
      return_code: "SUCCESS",
      bill
    });

  } catch (err) {
    console.error('Get bill total error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
