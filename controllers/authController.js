const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const rateLimit = require('express-rate-limit'); // For rate limiting

// Rate limiter for login endpoint (5 requests per minute per IP)
const loginLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 login requests per `window` (here, per minute)
  message: { message: 'Too many login attempts, please try again later' }
});

// Login controller with enhanced error handling
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findByUsername(username);

    //console.log("In login, password:", password);
    //console.log("In login, user.password:", user.password);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    // Include family_id and role in the JWT payload
    const token = jwt.sign(
      { id: user.id, username: user.username, family_id: user.family_id, roles: user.roles }, // Use `roles` here
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error("Error in login:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};


// Apply login limiter middleware
exports.loginLimiter = loginLimiter;