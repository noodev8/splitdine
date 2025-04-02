/*
=======================================================================================================================================
API Route: search_restaurant
=======================================================================================================================================
Method: GET
Purpose: Searches for restaurants using free-text input for name and location (town, city, or postcode). Returns matching results.
=======================================================================================================================================
Request Parameters:
- businessName: "Pizza Express"       // string, optional — partial or full business name
- location: "London"                  // string, optional — can be city, town, or postcode

Success Response:
{
  "return_code": "SUCCESS",
  "restaurants": [
    {
      "id": 101,
      "name": "Pizza Express",
      "address": "12 King Street",
      "city": "London",
      "postcode": "EC1A 1BB",
      "rating": 4,
      "phone": "020 1234 5678",
      "website": "https://pizzaexpress.com"
    },
    ...
  ]
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_PARAMS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /search_restaurant?businessName=...&location=...
router.get("/", async (req, res) => {
  const { businessName, location } = req.query;

  // 🔍 Validate inputs
  if (!businessName || businessName.length < 2 || !location || location.length < 2) {
    return res.status(400).json({
      return_code: "MISSING_PARAMS",
      restaurants: []
    });
  }

  try {
    // 📦 Query restaurants
    const sql = `
      SELECT 
          id, 
          name, 
          address, 
          city,
          postcode,
          rating,
          phone,
          website
      FROM restaurant
      WHERE lower(name) LIKE '%' || lower($1) || '%'
        AND (
              lower(address) LIKE '%' || lower($2) || '%'
              OR lower(postcode) LIKE '%' || lower($2) || '%'
              OR lower(city) LIKE '%' || lower($2) || '%'
            )
      LIMIT 5;
    `;

    const { rows } = await pool.query(sql, [businessName, location]);

    // ✅ Respond with structured format
    return res.json({
      return_code: "SUCCESS",
      restaurants: rows
    });
  } catch (error) {
    console.error("Error searching restaurants:", error);
    return res.status(500).json({
      return_code: "SERVER_ERROR",
      restaurants: []
    });
  }
});

module.exports = router;
