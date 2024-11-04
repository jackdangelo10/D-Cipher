const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  //console.log("authHeader: ", authHeader);

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

    //console.log("Decoded: ", decoded);
    //console.log("Token: ", token);

    if (!decoded.id) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }

    //console.log("attach decoded to req.user");
    req.user = decoded; // Attach decoded payload to req.user
    //console.log("req.user: ", req.user);
    next();
  });
};