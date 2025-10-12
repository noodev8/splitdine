/*
=======================================================================================================================================
Configuration Module
=======================================================================================================================================
Purpose: Centralizes all configuration settings for the application.
         Manages environment-specific settings for development and production.
         Provides easy access to database, JWT, and API settings throughout the application.
=======================================================================================================================================
*/

require('dotenv').config();

const config = {
  // =============================================================================
  // Server Configuration
  // =============================================================================
  server: {
    port: process.env.PORT || 3001,
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production'
  },

  // =============================================================================
  // Database Configuration
  // =============================================================================
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'splitdine_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_MAX_CONNECTIONS) || 20, // Maximum pool connections
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Timeout after 2 seconds
  },

  // =============================================================================
  // JWT Configuration
  // =============================================================================
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // =============================================================================
  // Frontend URL (for CORS configuration)
  // =============================================================================
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    // Get all allowed origins for CORS
    getAllowedOrigins() {
      return [this.url];
    }
  },

  // =============================================================================
  // API Configuration
  // =============================================================================
  api: {
    logEnabled: process.env.API_LOG_ENABLED === 'true' || true
  }
};

module.exports = config;
