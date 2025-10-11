/*
=======================================================================================================================================
API Logger Utility
=======================================================================================================================================
Purpose: Logs all API requests with relevant details for debugging and monitoring.
         Captures request method, endpoint, body, response, and timing information.
         Can be extended to log to database or external logging services.
=======================================================================================================================================
*/

const config = require('../config/config');

// =============================================================================
// Log API Call
// =============================================================================
/**
 * Logs details about an API call
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} responseData - Data being sent in response
 * @param {number} startTime - Timestamp when request started (Date.now())
 */
const logApiCall = (req, res, responseData, startTime) => {
  // Only log if API logging is enabled
  if (!config.api.logEnabled) {
    return;
  }

  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();

  // =============================================================================
  // Prepare log data
  // =============================================================================
  const logData = {
    timestamp,
    method: req.method,
    endpoint: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || null, // From JWT token if authenticated
    requestBody: req.body,
    returnCode: responseData?.return_code || 'UNKNOWN',
    statusCode: res.statusCode,
    duration: `${duration}ms`
  };

  // =============================================================================
  // Console output formatting
  // =============================================================================
  const returnCodeEmoji = responseData?.return_code === 'SUCCESS' ? '✓' : '❌';
  const colorCode = responseData?.return_code === 'SUCCESS' ? '\x1b[32m' : '\x1b[31m';
  const resetCode = '\x1b[0m';

  console.log(`
${colorCode}========================================${resetCode}
${returnCodeEmoji} API Call Log - ${timestamp}
${colorCode}========================================${resetCode}
Method:      ${logData.method}
Endpoint:    ${logData.endpoint}
User ID:     ${logData.userId || 'N/A'}
Return Code: ${logData.returnCode}
Duration:    ${logData.duration}
IP:          ${logData.ip}
${colorCode}========================================${resetCode}
  `);

  // =============================================================================
  // TODO: Extend this to log to database or external service
  // =============================================================================
  // Example: Save to database
  // await query('INSERT INTO api_logs (timestamp, method, endpoint, ...) VALUES ($1, $2, $3, ...)', [values]);

  // Example: Send to external logging service
  // await sendToLoggingService(logData);
};

// =============================================================================
// Express Middleware for Automatic Logging
// =============================================================================
/**
 * Express middleware to automatically log all API responses
 * Intercepts the response and logs it before sending to client
 */
const apiLoggerMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Store original res.json function
  const originalJson = res.json;

  // Override res.json to capture response data
  res.json = function (data) {
    // Log the API call with response data
    logApiCall(req, res, data, startTime);

    // Call the original res.json with the data
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  logApiCall,
  apiLoggerMiddleware
};
