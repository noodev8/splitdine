/*
=======================================================================================================================================
API Route: create_event
=======================================================================================================================================
Method: POST
Purpose: Creates a new event linked to a restaurant, with a scheduled date and the organiser’s user ID. Returns a new event_id.
=======================================================================================================================================
Request Payload:
{
  "restaurant_id": 101,               // integer, required — restaurant for the event
  "event_date": "2025-04-01T18:30:00" // string, required — ISO date/time format
}

Success Response:
{
  "return_code": "SUCCESS",
  "event_id": 456                      // integer, newly generated ID for the event
  "public_event_code": "3242"	       // varchar(10), newly generated public event code
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"RESTAURANT_NOT_FOUND"
"EVENT_ALREADY_EXISTS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

function generateEventCode() {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit string
}

// POST /create_event
router.post('/', verifyToken, async (req, res) => {
  const { restaurant_id, event_date } = req.body;
  const user_id = req.user.user_id;

  // Basic validation
  if (!restaurant_id || !event_date || !user_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // 1. Check restaurant exists
    const restaurantCheck = await db.query(
      `SELECT id FROM restaurant WHERE id = $1`,
      [restaurant_id]
    );
    if (restaurantCheck.rows.length === 0) {
      return res.status(404).json({
        return_code: "RESTAURANT_NOT_FOUND"
      });
    }

    // 2. Check for existing unlocked event by same user at same restaurant
    const duplicateCheck = await db.query(
      `SELECT id FROM event 
       WHERE restaurant_id = $1 AND created_by = $2 AND locked = false`,
      [restaurant_id, user_id]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        return_code: "EVENT_ALREADY_EXISTS"
      });
    }

    // 3. Insert event
    const result = await db.query(
      `INSERT INTO event (restaurant_id, created_by, event_date, total_amount, locked)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [restaurant_id, user_id, event_date, 0.00, false]
    );
    const event_id = result.rows[0].id;

    // 4. Generate unique public event code
    let public_event_code;
    let exists = true;
    while (exists) {
      public_event_code = generateEventCode();
      const check = await db.query(
        'SELECT id FROM event WHERE public_event_code = $1 AND locked = false',
        [public_event_code]
      );
      exists = check.rows.length > 0;
    }

    await db.query(
      'UPDATE event SET public_event_code = $1 WHERE id = $2',
      [public_event_code, event_id]
    );

    // 5. Add organiser as guest
    await db.query(
      `INSERT INTO guest (event_id, user_id, role, locked)
       VALUES ($1, $2, $3, $4)`,
      [event_id, user_id, 'organiser', false]
    );

    res.status(201).json({
      return_code: "SUCCESS",
      event_id,
      public_event_code
    });

  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
