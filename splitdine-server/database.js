/*
=======================================================================================================================================
Database Connection Pool
=======================================================================================================================================
Purpose: Manages PostgreSQL database connections using a connection pool.
         Provides a single, reusable pool instance for all database operations.
         Implements proper error handling and connection lifecycle management.
=======================================================================================================================================
*/

const { Pool } = require('pg');
const config = require('./config/config');

// =============================================================================
// Create PostgreSQL connection pool
// =============================================================================
// Using a pool instead of individual connections improves performance
// by reusing connections rather than creating new ones for each query
const pool = new Pool(config.database);

// =============================================================================
// Pool Event Handlers
// =============================================================================

// Log when a new client is connected to the pool
pool.on('connect', () => {
  console.log('✓ New client connected to the database pool');
});

// Log errors that occur on idle clients
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle database client:', err);
  process.exit(-1);
});

// =============================================================================
// Query Helper Function
// =============================================================================
/**
 * Execute a database query using the connection pool
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters for parameterized queries
 * @returns {Promise} - Query result
 */
const query = (text, params) => {
  const start = Date.now();
  return pool.query(text, params)
    .then(res => {
      const duration = Date.now() - start;
      if (config.server.isDevelopment) {
        console.log('Executed query', { text, duration, rows: res.rowCount });
      }
      return res;
    })
    .catch(err => {
      console.error('Database query error:', err);
      throw err;
    });
};

// =============================================================================
// Get Client for Transaction
// =============================================================================
/**
 * Get a client from the pool for transaction operations
 * Must be released manually after use
 * @returns {Promise} - Database client
 */
const getClient = () => {
  return pool.connect();
};

// =============================================================================
// Graceful Shutdown
// =============================================================================
/**
 * Gracefully close all database connections
 * Should be called when shutting down the server
 */
const closePool = async () => {
  try {
    await pool.end();
    console.log('✓ Database pool has been closed');
  } catch (err) {
    console.error('❌ Error closing database pool:', err);
    throw err;
  }
};

// =============================================================================
// Export pool and helper functions
// =============================================================================
module.exports = {
  query,        // For simple queries
  getClient,    // For transactions
  pool,         // Direct pool access if needed
  closePool     // For graceful shutdown
};
