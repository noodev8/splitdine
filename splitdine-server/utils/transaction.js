/*
=======================================================================================================================================
Transaction Wrapper Utility
=======================================================================================================================================
Purpose: Provides a wrapper for database transactions to ensure atomic operations.
         Automatically handles BEGIN, COMMIT, and ROLLBACK operations.
         Ensures proper cleanup of database clients.
=======================================================================================================================================
*/

const { getClient } = require('../database');

// =============================================================================
// Transaction Wrapper
// =============================================================================
/**
 * Executes multiple database operations as a single atomic transaction
 * @param {Function} callback - Async function containing transaction operations
 * @returns {Promise} - Result from the callback function
 *
 * Usage Example:
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO table1 VALUES ($1)', [value1]);
 *   await client.query('UPDATE table2 SET field = $1', [value2]);
 *   return { success: true };
 * });
 */
const withTransaction = async (callback) => {
  // Get a client from the pool
  const client = await getClient();

  try {
    // =============================================================================
    // BEGIN Transaction
    // =============================================================================
    await client.query('BEGIN');
    console.log('→ Transaction started');

    // =============================================================================
    // Execute callback with all database operations
    // =============================================================================
    const result = await callback(client);

    // =============================================================================
    // COMMIT Transaction
    // =============================================================================
    await client.query('COMMIT');
    console.log('✓ Transaction committed successfully');

    return result;

  } catch (error) {
    // =============================================================================
    // ROLLBACK on error
    // =============================================================================
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back due to error:', error.message);
    throw error;

  } finally {
    // =============================================================================
    // Always release the client back to the pool
    // =============================================================================
    client.release();
    console.log('→ Client released back to pool');
  }
};

module.exports = {
  withTransaction
};
