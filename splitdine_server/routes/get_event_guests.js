/*
=======================================================================================================================================
API Route: get_event_guests
=======================================================================================================================================
Method: POST
Purpose: Retrieves the list of guests for a specific event, including their roles, locked status, and total submitted amount.
=======================================================================================================================================
Request Payload:
{
  "event_id": 18                        // integer, required — internal event ID
}

Success Response:
{
  "return_code": "SUCCESS",
  "guests": [
    {
      "user_id": 4,
      "name": "Andreas",
      "email": "user@example.com",
      "role": "organiser",
      "locked": false,
      "total_amount": 15.45            // number, total bill from order_items
    },
    {
      "user_id": 2,
      "name": "Jane Smith",
      "email": "jane.smith@email.com",
      "role": "guest",
      "locked": false,
      "total_amount": 0.00
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

router.post('/', verifyToken, async (req, res) => {
  const { event_id } = req.body;

  if (!event_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS",
      message: "event_id is required."
    });
  }

  try {
    const result = await db.query(
      `SELECT 
         g.user_id,
         u.name,
         u.email,
         g.role,
         g.locked,
         COALESCE(SUM(oi.quantity * oi.price_at_time), 0) AS total_amount
       FROM guest g
       JOIN app_user u ON g.user_id = u.id
       LEFT JOIN order_item oi ON oi.guest_id = g.user_id AND oi.event_id = g.event_id
       WHERE g.event_id = $1
       GROUP BY g.user_id, u.name, u.email, g.role, g.locked
       ORDER BY g.role DESC, u.name ASC`,
      [event_id]
    );

    res.json({
      return_code: "SUCCESS",
      guests: result.rows.map(row => ({
        user_id: row.user_id,
        name: row.name,
        email: row.email,
        role: row.role,
        locked: row.locked,
        total_amount: parseFloat(row.total_amount)
      }))
    });

  } catch (err) {
    console.error('Get event guests error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR",
      message: "Server error"
    });
  }
});

module.exports = router;
