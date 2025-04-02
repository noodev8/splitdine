/*
=======================================================================================================================================
API Route: get_menu
=======================================================================================================================================
Method: GET
Purpose: Retrieves the menu items for a specific restaurant by restaurant_id.
=======================================================================================================================================
Request Parameters:
- restaurant_id: 101                  // integer, required — unique ID of the restaurant

Success Response:
{
  return_code: "SUCCESS",
  "menu": [
    {
      "menu_id": 501,                 // integer, unique menu item ID
      "item_name": "Margherita Pizza",// string, name of the menu item
      "description": "Classic tomato and mozzarella", // string, optional
      "price": 9.95,                  // number, price of the item
      "category": "Pizza"             // string, optional (e.g., 'Starter', 'Main', etc.)
    },
    {
      "menu_id": 502,
      "item_name": "Garlic Bread",
      "description": "With rosemary and sea salt",
      "price": 4.50,
      "category": "Side"
    }
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"SHORT_SEARCH_TERM"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET /get_menu/:restaurant_id?term=searchTerm
router.get('/:restaurant_id', verifyToken, async (req, res) => {
  const restaurant_id = req.params.restaurant_id;
  const term = req.query.term;

  if (!restaurant_id) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  // If no term or term too short, return empty list
  if (!term || term.trim().length < 3) {
    return res.status(400).json({
      return_code: "SHORT_SEARCH_TERM"
    });
  }

  try {
    const result = await db.query(
      `SELECT id, item_name, description, price, category
       FROM (
         SELECT *, similarity(item_name, $2) AS sim_score
         FROM menu
         WHERE restaurant_id = $1
           AND (
             similarity(item_name, $2) > 0.1
             OR item_name ILIKE '%' || $2 || '%'
           )
       ) AS results
       ORDER BY sim_score DESC NULLS LAST, item_name
       LIMIT 10`,
      [restaurant_id, term.trim()]
    );

    res.json({
      return_code: "SUCCESS",
      menu: result.rows
    });

  } catch (err) {
    console.error('Get menu error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
