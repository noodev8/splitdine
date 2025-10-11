/*
=======================================================================================================================================
JWT Authentication Middleware
=======================================================================================================================================
Purpose: Verifies JWT tokens for protected API routes.
         Extracts user information from valid tokens and attaches to request object.
         Returns standardized error responses for invalid/missing tokens.
=======================================================================================================================================
*/

const jwt = require('jsonwebtoken');
const config = require('../config/config');

// =============================================================================
// Verify Token Middleware
// =============================================================================
/**
 * Middleware to verify JWT token from Authorization header
 * Adds decoded user data to req.user if token is valid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyToken = (req, res, next) => {
  try {
    // =============================================================================
    // Extract token from Authorization header
    // =============================================================================
    // Expected format: "Bearer <token>"
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      return res.status(200).json({
        return_code: 'NO_TOKEN_PROVIDED',
        message: 'Authorization header is missing'
      });
    }

    // Split "Bearer <token>" and get the token part
    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(200).json({
        return_code: 'INVALID_TOKEN_FORMAT',
        message: 'Authorization header must be in format: Bearer <token>'
      });
    }

    const token = tokenParts[1];

    // =============================================================================
    // Verify and decode the JWT token
    // =============================================================================
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        // Token is invalid or expired
        console.error('❌ JWT verification failed:', err.message);

        if (err.name === 'TokenExpiredError') {
          return res.status(200).json({
            return_code: 'TOKEN_EXPIRED',
            message: 'Your session has expired. Please login again.'
          });
        }

        return res.status(200).json({
          return_code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        });
      }

      // =============================================================================
      // Attach decoded user data to request object
      // =============================================================================
      // This makes user data available to all subsequent middleware and route handlers
      req.user = decoded;

      console.log(`✓ Token verified for user ID: ${decoded.id}`);

      // Proceed to next middleware/route handler
      next();
    });

  } catch (error) {
    console.error('❌ Error in verifyToken middleware:', error);
    return res.status(200).json({
      return_code: 'AUTH_ERROR',
      message: 'Authentication error occurred'
    });
  }
};

// =============================================================================
// Generate JWT Token Helper
// =============================================================================
/**
 * Generates a JWT token for a user
 * @param {Object} userData - User data to encode in token
 * @returns {string} - JWT token
 *
 * Usage Example:
 * const token = generateToken({ id: user.id, email: user.email });
 */
const generateToken = (userData) => {
  return jwt.sign(
    userData,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = {
  verifyToken,    // Middleware for protecting routes
  generateToken   // Helper for creating tokens
};
