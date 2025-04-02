/*
=======================================================================================================================================
API Route: get_guest_order
=======================================================================================================================================
Method: POST
Purpose: Retrieves a single guest’s selected menu and custom items for a specific event.
=======================================================================================================================================
Request Payload:
{
  "event_id": 789,                    // integer, required — unique ID of the event
  "user_id": 123                      // integer, optional — guest ID (defaults to current user)
}

Success Response:
{
  "return_code": "SUCCESS",
  "items": [
    {
      "menu_id": 501,
      "item_name": "Garlic Naan",
      "quantity": 2,
      "price_at_time": 3.99,
      "locked": false
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"UNAUTHORISED_ACTION"
"EVENT_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

router.post('/', verifyToken, async (req, res) => {
  const { event_id, user_id } = req.body;
  const current_user_id = req.user.user_id;
  const target_user_id = user_id || current_user_id;

  if (!event_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS",
      message: "event_id is required."
    });
  }

  try {
    if (parseInt(target_user_id) !== current_user_id) {
      const permissionCheck = await db.query(
        `SELECT role FROM guest WHERE event_id = $1 AND user_id = $2`,
        [event_id, current_user_id]
      );
      const role = permissionCheck.rows[0]?.role;
      if (!['organiser', 'co-host'].includes(role)) {
        return res.status(403).json({
          return_code: "UNAUTHORISED_ACTION",
          message: "You are not allowed to fetch another guest’s order."
        });
      }
    }

    const results = await db.query(
      `SELECT 
         oi.menu_id,
         COALESCE(m.item_name, oi.custom_item_name) AS item_name,
         oi.quantity,
         oi.price_at_time,
         oi.locked
       FROM order_item oi
       LEFT JOIN menu m ON oi.menu_id = m.id
       WHERE oi.event_id = $1 AND oi.guest_id = $2`,
      [event_id, target_user_id]
    );

    res.json({
      return_code: "SUCCESS",
      items: results.rows.map(row => ({
        menu_id: row.menu_id,
        item_name: row.item_name,
        quantity: row.quantity,
        price_at_time: parseFloat(row.price_at_time),
        locked: row.locked
      }))
    });

  } catch (err) {
    console.error('Get guest order error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Server error."
    });
  }
});

module.exports = router;
