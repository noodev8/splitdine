/*
=======================================================================================================================================
API Route: get_event_menu
=======================================================================================================================================
Method: GET
Purpose: Returns the menu for an event along with any item selections already made by guests.
=======================================================================================================================================
Request Parameters:
- event_id: 789                       // integer, required — unique ID of the event

Success Response:
{
  "return_code": "SUCCESS"
  "menu": [
    {
      "menu_id": 501,                 // integer, menu item ID
      "item_name": "Garlic Bread",    // string, name of the item
      "price": 4.50,                  // number, base menu price
      "selections": [
        {
          "user_id": 123,             // integer, guest who selected it
          "quantity": 1,              // integer, quantity selected
          "price_at_time": 4.50,      // number, price recorded at selection
          "locked": false             // boolean, whether this selection is locked
        }
      ]
    },
    {
      "menu_id": 502,
      "item_name": "Pasta Carbonara",
      "price": 10.95,
      "selections": []
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"EVENT_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /get_event_menu/:event_id
router.get('/:event_id', verifyToken, async (req, res) => {
  const event_id = req.params.event_id;

  if (!event_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // Step 1: Get the restaurant for this event
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

    // Step 2: Get the full menu for that restaurant
    const menuRes = await db.query(
      `SELECT id AS menu_id, item_name, price
       FROM menu
       WHERE restaurant_id = $1`,
      [restaurant_id]
    );

    const menu = [];

    // Step 3: For each item, get any selections from order_item
    for (const item of menuRes.rows) {
      const { menu_id, item_name, price } = item;

      const selectionsRes = await db.query(
        `SELECT 
           guest_id AS user_id,
           quantity,
           price_at_time,
           locked
         FROM order_item
         WHERE event_id = $1 AND menu_id = $2`,
        [event_id, menu_id]
      );

      menu.push({
        menu_id,
        item_name,
        price: parseFloat(price),
        selections: selectionsRes.rows.map(s => ({
          ...s,
          price_at_time: parseFloat(s.price_at_time)
        }))
      });
    }

    res.json({
      return_code: "SUCCESS",
      menu
    });

  } catch (err) {
    console.error('Get event menu error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
