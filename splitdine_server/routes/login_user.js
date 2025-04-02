/*
=======================================================================================================================================
API Route: login_user
=======================================================================================================================================
Method: POST
Purpose: Authenticates a user using their email and password. Returns a token and basic user details upon success.
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com",         // string, required
  "password": "securepassword123"      // string, required
}

Success Response:
{
  "return_code": "SUCCESS"
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // string, JWT token for auth
  "user": {
    "id": 123,                         // integer, unique user ID
    "name": "Andreas",                 // string, user’s name
    "email": "user@example.com",       // string, user’s email
    "account_level": "standard"        // string, e.g. 'standard', 'premium', 'admin'
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_CREDENTIALS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db');

// POST /login_user
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    // Look up user in the DB
    const result = await db.query('SELECT * FROM app_user WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        return_code: "INVALID_CREDENTIALS"
      });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        return_code: "INVALID_CREDENTIALS"
      });
    }

    // Create token
    const token = jwt.sign(
      { user_id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    // Success response
    res.json({
      return_code: "SUCCESS",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        account_level: user.account_level
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
