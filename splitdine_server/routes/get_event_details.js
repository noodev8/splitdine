/*
=======================================================================================================================================
API Route: get_event_details
=======================================================================================================================================
Method: GET
Purpose: Retrieves full details of a specific event, including restaurant info, date, and lock status.
=======================================================================================================================================
Request Parameters:
- event_id: 456                       // integer, required — unique ID of the event

Success Response:
{
  "return_code": "SUCCESS",
  "event": {
    "id": 456,                          // integer, unique event ID
    "public_event_code": "1234",        // string, public code for joining
    "restaurant": {
      "id": 789,                        // integer, restaurant ID
      "name": "The Zen Den",            // string, restaurant name
      "address": "123 Main St",         // string, restaurant address
      "city": "Edinburgh",              // string, restaurant city
      "postcode": "EH2 3JP"             // string, restaurant postcode
    },
    "event_date": "2025-04-01T18:30:00", // string, ISO format
    "created_by": 123,                   // integer, organiser user ID
    "locked": false,                     // boolean, event lock status
    "total_amount": 0.00                 // number, optional initial total
  }
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

// GET /get_event_details/:event_id
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
        e.id AS id,
        e.public_event_code,
        e.event_date,
        e.locked,
        e.created_by,
        r.id AS restaurant_id,
        r.name,
        r.address,
        r.city,
        r.postcode
      FROM event e
      JOIN restaurant r ON e.restaurant_id = r.id
      WHERE e.id = $1`,
      [event_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        return_code: "EVENT_NOT_FOUND"
      });
    }

    const row = result.rows[0];

    res.json({
      return_code: "SUCCESS",
      event: {
        id: row.id,
        public_event_code: row.public_event_code,
        event_date: row.event_date,
        locked: row.locked,
        created_by: row.created_by,
        restaurant: {
          id: row.restaurant_id,
          name: row.name,
          address: row.address,
          city: row.city,
          postcode: row.postcode
        }
      }
    });

  } catch (err) {
    console.error('Get event details error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;