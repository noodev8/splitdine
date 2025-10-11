# SplitDine API Server

Express.js API server for the SplitDine application.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection details
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL_DEV` - Development frontend URL
- `FRONTEND_URL_PROD` - Production frontend URL

### 3. Set Up Database

Run the database schema from `/docs/DB-Schema.sql`:

```bash
psql -U your_username -d splitdine_db -f ../docs/DB-Schema.sql
```

### 4. Start the Server

Development mode with auto-restart:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Project Structure

```
splitdine-server/
├── config/
│   └── config.js          # Configuration management
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── routes/
│   └── auth.js            # Example authentication routes
├── utils/
│   ├── apiLogger.js       # API logging utility
│   └── transaction.js     # Database transaction wrapper
├── database.js            # PostgreSQL connection pool
├── server.js              # Main server entry point
├── .env.example           # Environment variables template
└── package.json
```

## API Rules

All API routes follow these standards:

1. **Method**: Always use POST
2. **Response Format**: Always return HTTP 200 with a `return_code` field
3. **Logging**: All API calls are automatically logged via `apiLogger.js`
4. **Authentication**: Protected routes use JWT via `verifyToken` middleware
5. **Database**: Use connection pool from `database.js` and transactions via `transaction.js`

## Creating New Routes

Follow the pattern in `routes/auth.js`:

1. Add detailed file header with API documentation
2. Use `express.Router()`
3. Always return `return_code` in responses
4. Handle all errors with try/catch
5. Use parameterized queries to prevent SQL injection
6. Import and use authentication middleware for protected routes

Example:

```javascript
const express = require('express');
const { query } = require('../database');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.post('/protected-route', verifyToken, async (req, res) => {
  try {
    // Access authenticated user via req.user
    const userId = req.user.id;

    // Your route logic here

    return res.status(200).json({
      return_code: 'SUCCESS',
      data: { /* your data */ }
    });
  } catch (error) {
    return res.status(200).json({
      return_code: 'SERVER_ERROR',
      message: 'Error message'
    });
  }
});

module.exports = router;
```

## Testing with Postman

1. Import API endpoints into Postman
2. For protected routes, add Authorization header:
   ```
   Authorization: Bearer <your_jwt_token>
   ```
3. All requests should be POST with JSON body

## Health Check

Test if server is running:
```
GET http://localhost:3001/health
```

## Available Endpoints

- `GET /health` - Server health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

More endpoints will be added as development continues.
