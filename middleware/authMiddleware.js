const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token not provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Authentication failed';
      return res.status(401).json({ message });
    }

    if (!decoded.id) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }

    req.user = decoded; // Attach decoded payload to req.user
    next();
  });
};