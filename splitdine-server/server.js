/*
=======================================================================================================================================
SplitDine Express Server
=======================================================================================================================================
Purpose: Main entry point for the SplitDine API server.
         Configures Express middleware, routes, and database connection.
         Implements security best practices and error handling.
=======================================================================================================================================
*/

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config/config');
const { apiLoggerMiddleware } = require('./utils/apiLogger');
const { closePool } = require('./database');

// =============================================================================
// Initialize Express Application
// =============================================================================
const app = express();

// =============================================================================
// Trust Proxy Configuration
// =============================================================================
// Enable trust proxy since we're behind Nginx reverse proxy
// Only trust localhost since Nginx is on the same server
// This allows Express to correctly identify client IPs from X-Forwarded-For header
app.set('trust proxy', 'loopback');

// =============================================================================
// Security Middleware
// =============================================================================
// Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// =============================================================================
// CORS Configuration
// =============================================================================
// Allow requests from frontend application
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = config.frontend.getAllowedOrigins();

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'], // Allow GET for health check, OPTIONS for preflight
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// =============================================================================
// Rate Limiting
// =============================================================================
// Limit repeated requests to public APIs
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased for testing)
  message: {
    return_code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Validate that trust proxy is configured correctly
  validate: { trustProxy: false }
});

app.use('/api/', limiter);

// =============================================================================
// Body Parser Middleware
// =============================================================================
// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =============================================================================
// API Logger Middleware
// =============================================================================
// Automatically log all API responses
app.use(apiLoggerMiddleware);

// =============================================================================
// Health Check Endpoint
// =============================================================================
// Simple endpoint to check if server is running
app.get('/health', (req, res) => {
  res.status(200).json({
    return_code: 'SUCCESS',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.server.env
  });
});

// =============================================================================
// API Routes
// =============================================================================
// Import and mount route modules
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

// Guest management routes
const guestRoutes = require('./routes/guests');
app.use('/api/guests', guestRoutes);

// =============================================================================
// 404 Handler
// =============================================================================
// Handle requests to undefined routes
app.use((req, res) => {
  res.status(200).json({
    return_code: 'ROUTE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.url}`,
    availableEndpoints: [
      '/health',
      '/api/*'
    ]
  });
});

// =============================================================================
// Global Error Handler
// =============================================================================
// Catch any errors that occur in the application
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);

  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(200).json({
      return_code: 'CORS_ERROR',
      message: 'This origin is not allowed to access the API'
    });
  }

  // Generic error response
  res.status(200).json({
    return_code: 'SERVER_ERROR',
    message: config.server.isDevelopment ? err.message : 'An unexpected error occurred',
    ...(config.server.isDevelopment && { stack: err.stack })
  });
});

// =============================================================================
// Graceful Shutdown Handler
// =============================================================================
// Handle shutdown signals to close connections gracefully
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close database pool
    await closePool();

    console.log('✓ All connections closed. Shutting down...');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// Start Server
// =============================================================================
const PORT = config.server.port;
const HOST = '0.0.0.0'; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}`;
  const networkInfo = config.server.isProduction
    ? '\n✓ Listening on all network interfaces (0.0.0.0)\n✓ Accessible via your VPS public IP/domain on port ' + PORT
    : '\n✓ Local development server';

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SplitDine API Server                        ║
╚════════════════════════════════════════════════════════════════╝

✓ Server running on port: ${PORT}
✓ Environment: ${config.server.env}
✓ Frontend URL: ${config.frontend.url}
✓ Database: ${config.database.database}
✓ API logging: ${config.api.logEnabled ? 'Enabled' : 'Disabled'}${networkInfo}

Local URL: ${localUrl}
Health check: ${localUrl}/health

Press CTRL+C to stop the server
  `);
});

module.exports = app;
