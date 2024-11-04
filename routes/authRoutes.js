const express = require('express');
const path = require('path');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Login route
router.post('/login', authController.login);

// Home route (protected)
router.get('/home', verifyToken, (req, res, next) => {
  const homePath = path.join(__dirname, '..', 'views', 'home.html');
  res.sendFile(homePath, (err) => {
    if (err) {
      console.error("Error sending home file:", err.message);
      next(new Error('Failed to load home page'));
    }
  });
});

module.exports = router;