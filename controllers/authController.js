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

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    // Include family_id and role in the JWT payload
    const token = jwt.sign(
      { id: user.id, username: user.username, family_id: user.family_id, role: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (error) {
    console.error("Error in login:", error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin-only account creation for family members with error handling
exports.createAccount = async (req, res) => {
  const { username, password, family_id, role } = req.body;
  const { role: requesterRole } = req.user;

  // Only allow admin users to create accounts
  if (requesterRole !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create accounts' });
  }

  try {
    // Validate input data
    if (!username || !password || !family_id) {
      return res.status(400).json({ message: 'Username, password, and family_id are required' });
    }

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const hashedPassword = await bcrypt.hash(password, 12); // Use higher salt rounds for hashing
    const user = await User.create(username, hashedPassword, family_id, role || 'user');
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error("Error in createAccount:", error.message);
    res.status(500).json({ error: 'Error creating user', details: error.message });
  }
};

// Apply login limiter middleware
exports.loginLimiter = loginLimiter;