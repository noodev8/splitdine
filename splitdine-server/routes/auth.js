/*
=======================================================================================================================================
Authentication Routes
=======================================================================================================================================
Purpose: Handles user authentication operations including login and registration.
         Demonstrates the standard route pattern for SplitDine API.
=======================================================================================================================================
*/

const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../database');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

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
  "return_code": "SUCCESS",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // string, JWT token for auth
  "user": {
    "id": 123,                         // integer, unique user ID
    "name": "Andreas",                 // string, user's name
    "email": "user@example.com"        // string, user's email
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
router.post('/login', async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { email, password } = req.body;

    // Check if all required fields are present
    if (!email || !password) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'Email and password are required'
      });
    }

    // =============================================================================
    // Query user from database
    // =============================================================================
    // Note: This is an example. Adjust table/column names based on your schema
    // The actual user table will be created when you implement user management
    const result = await query(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Check if user exists
    if (result.rows.length === 0) {
      return res.status(200).json({
        return_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    const user = result.rows[0];

    // =============================================================================
    // Verify password
    // =============================================================================
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(200).json({
        return_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // =============================================================================
    // Generate JWT token
    // =============================================================================
    const token = generateToken({
      id: user.id,
      email: user.email
    });

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in login route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred during login'
    });
  }
});

/*
=======================================================================================================================================
API Route: register_user
=======================================================================================================================================
Method: POST
Purpose: Creates a new user account with email and password.
=======================================================================================================================================
Request Payload:
{
  "name": "Andreas",                   // string, required
  "email": "user@example.com",         // string, required
  "password": "securepassword123"      // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "User registered successfully",
  "user": {
    "id": 123,                         // integer, unique user ID
    "name": "Andreas",                 // string, user's name
    "email": "user@example.com"        // string, user's email
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"EMAIL_ALREADY_EXISTS"
"WEAK_PASSWORD"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/register', async (req, res) => {
  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { name, email, password } = req.body;

    // Check if all required fields are present
    if (!name || !email || !password) {
      return res.status(200).json({
        return_code: 'MISSING_FIELDS',
        message: 'Name, email, and password are required'
      });
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(200).json({
        return_code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long'
      });
    }

    // =============================================================================
    // Check if email already exists
    // =============================================================================
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(200).json({
        return_code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists'
      });
    }

    // =============================================================================
    // Hash password
    // =============================================================================
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // =============================================================================
    // Insert new user into database
    // =============================================================================
    const result = await query(
      `INSERT INTO users (name, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, email`,
      [name, email.toLowerCase(), password_hash]
    );

    const newUser = result.rows[0];

    // =============================================================================
    // Return success response
    // =============================================================================
    return res.status(200).json({
      return_code: 'SUCCESS',
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in register route:', error);
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'An error occurred during registration'
    });
  }
});

module.exports = router;
