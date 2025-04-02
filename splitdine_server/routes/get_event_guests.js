/*
=======================================================================================================================================
API Route: get_event_guests
=======================================================================================================================================
Method: GET
Purpose: Retrieves the list of guests for a specific event, including their roles and locked status.
=======================================================================================================================================
Request Parameters:
- event_id: 9                          // integer, required — internal event ID

Success Response:
{
  "return_code": "SUCCESS",
  "guests": [
    {
      "user_id": 4,
      "name": "Andreas",
      "email": "user@example.com",
      "role": "organiser",
      "locked": false
    },
    {
      "user_id": 2,
      "name": "Jane Smith",
      "email": "jane.smith@email.com",
      "role": "guest",
      "locked": false
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

// GET /get_event_guests/:event_id
router.get('/:event_id', verifyToken, async (req, res) => {
  const event_id = req.params.event_id;

  if (!event_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    const result = await db.query(
      `SELECT 
         g.user_id,
         u.name,
         u.email,
         g.role,
         g.locked
       FROM guest g
       JOIN app_user u ON g.user_id = u.id
       WHERE g.event_id = $1`,
      [event_id]
    );

    res.json({
      return_code: "SUCCESS",
      guests: result.rows
    });

  } catch (err) {
    console.error('Get event guests error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;

