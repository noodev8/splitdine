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
const crypto = require('crypto');
const { query } = require('../database');
const { generateToken } = require('../middleware/auth');
const { logApiCall } = require('../utils/apiLogger');
const { Resend } = require('resend');

const router = express.Router();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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
  const startTime = Date.now();
  let responseData = null;

  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { email, password } = req.body;

    // Check if all required fields are present
    if (!email || !password) {
      responseData = {
        return_code: 'MISSING_FIELDS',
        message: 'Email and password are required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Query user from database (app_user table)
    // =============================================================================
    const result = await query(
      'SELECT id, email, password_hash, name FROM app_user WHERE email = $1',
      [email.toLowerCase()]
    );

    // Check if user exists
    if (result.rows.length === 0) {
      responseData = {
        return_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    const user = result.rows[0];

    // =============================================================================
    // Verify password
    // =============================================================================
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      responseData = {
        return_code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Generate JWT token
    // =============================================================================
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name
    });

    // =============================================================================
    // Return success response
    // =============================================================================
    responseData = {
      return_code: 'SUCCESS',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };

    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in login route:', error);
    responseData = {
      return_code: 'SERVER_ERROR',
      message: 'An error occurred during login'
    };
    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);
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
  const startTime = Date.now();
  let responseData = null;

  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { name, email, password, session_id } = req.body;

    // Check if all required fields are present
    if (!name || !email || !password) {
      responseData = {
        return_code: 'MISSING_FIELDS',
        message: 'Name, email, and password are required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      responseData = {
        return_code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Check if email already exists (app_user table)
    // =============================================================================
    const existingUser = await query(
      'SELECT id FROM app_user WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      responseData = {
        return_code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Hash password
    // =============================================================================
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // =============================================================================
    // Insert new user into database (app_user table)
    // =============================================================================
    const result = await query(
      `INSERT INTO app_user (name, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id, name, email`,
      [name, email.toLowerCase(), password_hash]
    );

    const newUser = result.rows[0];

    // =============================================================================
    // Link existing anonymous memberships to new user account
    // =============================================================================
    if (session_id) {
      await query(
        `UPDATE user_event_memberships
         SET app_user_id = $1
         WHERE user_id = $2 AND app_user_id IS NULL`,
        [newUser.id, session_id]
      );
    }

    // =============================================================================
    // Generate JWT token
    // =============================================================================
    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    });

    // =============================================================================
    // Return success response
    // =============================================================================
    responseData = {
      return_code: 'SUCCESS',
      message: 'User registered successfully',
      token: token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    };

    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);

  } catch (error) {
    // =============================================================================
    // Handle unexpected errors
    // =============================================================================
    console.error('❌ Error in register route:', error);
    responseData = {
      return_code: 'SERVER_ERROR',
      message: 'An error occurred during registration'
    };
    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);
  }
});

/*
=======================================================================================================================================
API Route: update_profile
=======================================================================================================================================
Method: POST
Purpose: Updates user profile information (name and/or email). Requires authentication.
=======================================================================================================================================
Request Payload:
{
  "name": "New Name",              // string, optional - new name
  "email": "newemail@example.com"  // string, optional - new email
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Profile updated successfully",
  "user": {
    "id": 123,
    "name": "New Name",
    "email": "newemail@example.com"
  }
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"EMAIL_ALREADY_EXISTS"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/update_profile', async (req, res) => {
  const startTime = Date.now();
  let responseData = null;

  try {
    // =============================================================================
    // Verify authentication
    // =============================================================================
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      responseData = {
        return_code: 'UNAUTHORIZED',
        message: 'Authentication required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const config = require('../config/config');

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      responseData = {
        return_code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { name, email } = req.body;

    if (!name && !email) {
      responseData = {
        return_code: 'MISSING_FIELDS',
        message: 'At least one field (name or email) is required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Check if new email already exists (if email is being updated)
    // =============================================================================
    if (email && email.toLowerCase() !== decoded.email.toLowerCase()) {
      const existingUser = await query(
        'SELECT id FROM app_user WHERE email = $1 AND id != $2',
        [email.toLowerCase(), decoded.id]
      );

      if (existingUser.rows.length > 0) {
        responseData = {
          return_code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists'
        };
        logApiCall(req, res, responseData, startTime);
        return res.status(200).json(responseData);
      }
    }

    // =============================================================================
    // Build update query dynamically based on provided fields
    // =============================================================================
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (email) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email.toLowerCase());
    }

    updates.push(`updated_at = NOW()`);
    values.push(decoded.id); // for WHERE clause

    // =============================================================================
    // Update user profile
    // =============================================================================
    const result = await query(
      `UPDATE app_user
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, email`,
      values
    );

    const updatedUser = result.rows[0];

    // =============================================================================
    // Generate new token with updated info
    // =============================================================================
    const newToken = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name
    });

    // =============================================================================
    // Return success response
    // =============================================================================
    responseData = {
      return_code: 'SUCCESS',
      message: 'Profile updated successfully',
      token: newToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email
      }
    };

    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error in update_profile route:', error);
    responseData = {
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while updating profile'
    };
    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);
  }
});

/*
=======================================================================================================================================
API Route: change_password
=======================================================================================================================================
Method: POST
Purpose: Changes user's password. Requires current password for verification.
=======================================================================================================================================
Request Payload:
{
  "current_password": "oldpassword123",  // string, required
  "new_password": "newpassword123"       // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Password changed successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_CURRENT_PASSWORD"
"WEAK_PASSWORD"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/change_password', async (req, res) => {
  const startTime = Date.now();
  let responseData = null;

  try {
    // =============================================================================
    // Verify authentication
    // =============================================================================
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      responseData = {
        return_code: 'UNAUTHORIZED',
        message: 'Authentication required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const config = require('../config/config');

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      responseData = {
        return_code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      responseData = {
        return_code: 'MISSING_FIELDS',
        message: 'Current password and new password are required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // Validate new password strength
    if (new_password.length < 8) {
      responseData = {
        return_code: 'WEAK_PASSWORD',
        message: 'New password must be at least 8 characters long'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Verify current password
    // =============================================================================
    const userResult = await query(
      'SELECT id, password_hash FROM app_user WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      responseData = {
        return_code: 'UNAUTHORIZED',
        message: 'User not found'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    const user = userResult.rows[0];
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);

    if (!isCurrentPasswordValid) {
      responseData = {
        return_code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Hash new password and update
    // =============================================================================
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    await query(
      `UPDATE app_user
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, decoded.id]
    );

    // =============================================================================
    // Return success response
    // =============================================================================
    responseData = {
      return_code: 'SUCCESS',
      message: 'Password changed successfully'
    };

    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error in change_password route:', error);
    responseData = {
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while changing password'
    };
    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);
  }
});

/*
=======================================================================================================================================
API Route: delete_account
=======================================================================================================================================
Method: POST
Purpose: Permanently deletes user account and all associated data. Requires password confirmation.
=======================================================================================================================================
Request Payload:
{
  "password": "userpassword123"  // string, required - for confirmation
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Account deleted successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_PASSWORD"
"UNAUTHORIZED"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/delete_account', async (req, res) => {
  const startTime = Date.now();
  let responseData = null;

  try {
    // =============================================================================
    // Verify authentication
    // =============================================================================
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      responseData = {
        return_code: 'UNAUTHORIZED',
        message: 'Authentication required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const config = require('../config/config');

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (error) {
      responseData = {
        return_code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { password } = req.body;

    if (!password) {
      responseData = {
        return_code: 'MISSING_FIELDS',
        message: 'Password is required to delete account'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Verify password
    // =============================================================================
    const userResult = await query(
      'SELECT id, password_hash FROM app_user WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      responseData = {
        return_code: 'UNAUTHORIZED',
        message: 'User not found'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    const user = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      responseData = {
        return_code: 'INVALID_PASSWORD',
        message: 'Password is incorrect'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Delete account and associated data
    // =============================================================================
    // Manual cleanup of all related records (in correct order to avoid foreign key issues)

    // Step 1: Get all events owned by this user
    const userEvents = await query(
      'SELECT id FROM events WHERE user_id = $1',
      [decoded.id]
    );

    // Step 2: For each event, delete all related data
    for (const event of userEvents.rows) {
      // Delete guest_items for all guests in this event
      await query(
        `DELETE FROM guest_items
         WHERE guest_id IN (SELECT id FROM guests WHERE event_id = $1)`,
        [event.id]
      );

      // Delete guests for this event
      await query(
        'DELETE FROM guests WHERE event_id = $1',
        [event.id]
      );

      // Delete user_event_memberships for this event (all users)
      await query(
        'DELETE FROM user_event_memberships WHERE event_id = $1',
        [event.id]
      );
    }

    // Step 3: Delete the events owned by this user
    await query(
      'DELETE FROM events WHERE user_id = $1',
      [decoded.id]
    );

    // Step 4: Delete user_event_memberships where this user is a member (but not owner)
    await query(
      'DELETE FROM user_event_memberships WHERE app_user_id = $1',
      [decoded.id]
    );

    // Step 5: Finally, delete the user account
    await query(
      'DELETE FROM app_user WHERE id = $1',
      [decoded.id]
    );

    // =============================================================================
    // Return success response
    // =============================================================================
    responseData = {
      return_code: 'SUCCESS',
      message: 'Account deleted successfully'
    };

    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error in delete_account route:', error);
    responseData = {
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while deleting account'
    };
    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);
  }
});

/*
=======================================================================================================================================
API Route: forgot_password
=======================================================================================================================================
Method: POST
Purpose: Sends a password reset email to the user with a unique token link.
=======================================================================================================================================
Request Payload:
{
  "email": "user@example.com"  // string, required
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Password reset email sent"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"USER_NOT_FOUND"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/forgot_password', async (req, res) => {
  const startTime = Date.now();
  let responseData = null;

  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { email } = req.body;

    if (!email) {
      responseData = {
        return_code: 'MISSING_FIELDS',
        message: 'Email is required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Check if user exists
    // =============================================================================
    const userResult = await query(
      'SELECT id, email, name FROM app_user WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success even if user doesn't exist (security best practice)
    // This prevents email enumeration attacks
    if (userResult.rows.length === 0) {
      responseData = {
        return_code: 'SUCCESS',
        message: 'If an account with that email exists, a password reset link has been sent'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    const user = userResult.rows[0];

    // =============================================================================
    // Generate secure random token
    // =============================================================================
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // =============================================================================
    // Store token in app_user table
    // =============================================================================
    await query(
      `UPDATE app_user
       SET reset_token = $1, reset_token_expires = $2, updated_at = NOW()
       WHERE id = $3`,
      [resetToken, expiresAt, user.id]
    );

    // =============================================================================
    // Send password reset email via Resend
    // =============================================================================
    const config = require('../config/config');
    const resetLink = `${config.frontend.emailUrl}/reset-password?token=${resetToken}`;

    try {
      await resend.emails.send({
        from: `${process.env.EMAIL_NAME} <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: 'Reset Your Password - SplitDine',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
                <h1 style="color: #1e293b; margin-top: 0;">Reset Your Password</h1>
                <p style="font-size: 16px; margin-bottom: 20px;">Hi ${user.name},</p>
                <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset your password for your SplitDine account. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
                </div>
                <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 14px; color: #2563eb; word-break: break-all; margin-bottom: 20px;">${resetLink}</p>
                <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">This link will expire in 1 hour.</p>
                <p style="font-size: 14px; color: #64748b; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">© ${new Date().getFullYear()} SplitDine. All rights reserved.</p>
            </body>
          </html>
        `
      });
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
      // Don't fail the request if email fails, but log it
    }

    // =============================================================================
    // Return success response
    // =============================================================================
    responseData = {
      return_code: 'SUCCESS',
      message: 'If an account with that email exists, a password reset link has been sent'
    };

    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error in forgot_password route:', error);
    responseData = {
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while processing your request'
    };
    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);
  }
});

/*
=======================================================================================================================================
API Route: reset_password
=======================================================================================================================================
Method: POST
Purpose: Resets user password using a valid reset token.
=======================================================================================================================================
Request Payload:
{
  "token": "abc123def456...",      // string, required - reset token from email
  "new_password": "newpassword123" // string, required - new password
}

Success Response:
{
  "return_code": "SUCCESS",
  "message": "Password reset successfully"
}
=======================================================================================================================================
Return Codes:
"SUCCESS"
"MISSING_FIELDS"
"INVALID_TOKEN"
"TOKEN_EXPIRED"
"WEAK_PASSWORD"
"SERVER_ERROR"
=======================================================================================================================================
*/
router.post('/reset_password', async (req, res) => {
  const startTime = Date.now();
  let responseData = null;

  try {
    // =============================================================================
    // Extract and validate request data
    // =============================================================================
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      responseData = {
        return_code: 'MISSING_FIELDS',
        message: 'Token and new password are required'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // Validate password strength
    if (new_password.length < 8) {
      responseData = {
        return_code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters long'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Verify token and check expiration
    // =============================================================================
    const tokenResult = await query(
      `SELECT id, reset_token, reset_token_expires FROM app_user
       WHERE reset_token = $1`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      responseData = {
        return_code: 'INVALID_TOKEN',
        message: 'Invalid or expired reset token'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    const user = tokenResult.rows[0];

    // Check if token has expired
    if (!user.reset_token_expires || new Date() > new Date(user.reset_token_expires)) {
      responseData = {
        return_code: 'TOKEN_EXPIRED',
        message: 'This reset link has expired. Please request a new one.'
      };
      logApiCall(req, res, responseData, startTime);
      return res.status(200).json(responseData);
    }

    // =============================================================================
    // Hash new password and update user (clear reset token fields)
    // =============================================================================
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    await query(
      `UPDATE app_user
       SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    // =============================================================================
    // Return success response
    // =============================================================================
    responseData = {
      return_code: 'SUCCESS',
      message: 'Password reset successfully. You can now log in with your new password.'
    };

    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error in reset_password route:', error);
    responseData = {
      return_code: 'SERVER_ERROR',
      message: 'An error occurred while resetting password'
    };
    logApiCall(req, res, responseData, startTime);
    return res.status(200).json(responseData);
  }
});

module.exports = router;
