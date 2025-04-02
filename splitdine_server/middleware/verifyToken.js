const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expecting "Bearer <token>"

  if (!token) {
    return res.status(401).json({
      return_code: "UNAUTHORIZED"
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        return_code: "TOKEN_EXPIRED"
      });
    }

    req.user = decoded; // e.g. { user_id, email }
    next();
  });
}

module.exports = verifyToken;
