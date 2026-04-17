// Authentication utilities
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Hash password
const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
    return bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (userId, sessionVersion = 0) => {
    return jwt.sign({ userId, sessionVersion }, JWT_SECRET, { expiresIn: '24h' });
};

// Verify JWT token
const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Verify session version matches to prevent concurrent multi-device logins
        if (decoded.sessionVersion !== user.sessionVersion) {
            return res.status(401).json({ error: 'Session expired (logged in from another device)' });
        }

        // Check inactivity timeout
        if (!user.sessionExpiresAt || user.sessionExpiresAt.getTime() < Date.now()) {
            if (user.sessionExpiresAt) {
                user.sessionExpiresAt = null;
                await user.save(); // Clean up state
            }
            return res.status(401).json({ error: 'Session expired due to inactivity' });
        }

        // Heartbeat: Extend session if there is less than 14 minutes remaining (avoids DB thrashing)
        const fourteenMinsFromNow = Date.now() + (14 * 60 * 1000);
        if (user.sessionExpiresAt.getTime() < fourteenMinsFromNow) {
            user.sessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
            await user.save();
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken,
    authenticateToken
};
