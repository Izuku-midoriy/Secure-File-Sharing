// Routes for user authentication and management
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../utils/auth');
const { strictLimiter } = require('../utils/rateLimiters');

// Register user
router.post('/register', userController.register);

// Login user with strict rate limiting to prevent brute force
router.post('/login', strictLimiter, userController.login);

// Get user profile (requires authentication)
router.get('/profile', authenticateToken, userController.getProfile);

module.exports = router;
