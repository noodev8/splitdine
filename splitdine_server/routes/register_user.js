/*
=======================================================================================================================================
API Route: register_user
=======================================================================================================================================
Method: POST
Purpose: Creates a new user in the system. Hashes the password and stores user data securely.
=======================================================================================================================================
Request Payload:
{
  "name": "Andreas",                  // string, required
  "email": "user@example.com",        // string, required
  "password": "securepassword123",    // string, required
  "phone": "07700900001"              // string, optional
}

Success Response:
{
  "return_code": "SUCCESS",
  "user": {
    "id": 123,                         // integer, unique user ID
    "name": "Andreas",                 // string, user’s name
    "email": "user@example.com",       // string, user’s email
    "account_level": "standard"        // string, default user level
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"EMAIL_EXISTS"
"SERVER_ERROR"
=======================================================================================================================================
*/

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      return_code: "MISSING_FIELDS"
    });
  }

  try {
    const existing = await db.query('SELECT id FROM app_user WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({
        return_code: "EMAIL_EXISTS"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO app_user (name, email, password, phone, account_level, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, name, email, account_level`,
      [name, email, hashedPassword, phone || null, 'standard']
    );

    const user = result.rows[0];

    const token = jwt.sign(
        { user_id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );

    res.status(201).json({
      return_code: "SUCCESS",
      token,
      user
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      return_code: "SERVER_ERROR"
    });
  }
});

module.exports = router;
