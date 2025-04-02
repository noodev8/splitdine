/*
=======================================================================================================================================
API Route: get_user_events
=======================================================================================================================================
Method: GET
Purpose: Retrieves a list of events the user is associated with, including both upcoming and past events.
=======================================================================================================================================
Request Parameters:
- user_id: 123                         // integer, required (path or query parameter depending on implementation)

Success Response:
{
  "return_code": "SUCCESS",
  "events": [
    {
      "id": 456,                      // integer, unique ID of the event
      "restaurant_name": "The Zen Den", // string, name of the restaurant
      "event_date": "2025-03-28T19:00:00", // string, ISO 8601 date format
      "total_amount": 128.50,         // number, total bill for the event
      "user_role": "guest",           // string, user's role in the event ('organiser', 'co-host', 'guest')
      "locked": false                 // boolean, whether the event is locked or still editable
    },
    {
      "id": 789,
      "restaurant_name": "La Piazza",
      "event_date": "2025-02-15T20:30:00",
      "total_amount": 94.00,
      "user_role": "organiser",
      "locked": true
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /get_user_events
router.get('/', verifyToken, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await db.query(
      `SELECT 
         e.id AS id,
         r.name AS restaurant_name,
         e.event_date,
         e.total_amount,
         g.role AS user_role,
         e.locked
       FROM guest g
       JOIN event e ON g.event_id = e.id
       JOIN restaurant r ON e.restaurant_id = r.id
       WHERE g.user_id = $1
       ORDER BY e.event_date DESC`,
      [user_id]
    );

    res.json({
      return_code: "SUCCESS",
      events: result.rows
    });

  } catch (err) {
    console.error('Get user events error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
