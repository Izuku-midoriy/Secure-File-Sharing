// User controller for authentication and user management
const User = require('../models/User');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');

// Register user
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate inputs are strings to prevent NoSQL injection
        if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input parameters' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email: String(email) }, { username: String(username) }]
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email or username already exists'
            });
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const user = new User({
            username,
            email,
            password: hashedPassword,
            sessionVersion: 1,
            sessionExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id, user.sessionVersion);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate inputs are strings
        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input type' });
        }

        // Find user by username or email
        const user = await User.findOne({
            $or: [{ username: String(username) }, { email: String(username) }]
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await comparePassword(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if an active session exists (strict single-session blocker)
        if (user.sessionExpiresAt && user.sessionExpiresAt.getTime() > Date.now()) {
            return res.status(403).json({ error: 'Account is currently active on another device.' });
        }

        // Increment session version to invalidate tokens on other devices
        user.sessionVersion = (user.sessionVersion || 0) + 1;
        // Set new active session expiry for 15 minutes
        user.sessionExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        // Generate token
        const token = generateToken(user._id, user.sessionVersion);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
};

// Logout user
exports.logout = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            // Instantly clear the session expiration so the user or anyone can log in again immediately
            user.sessionExpiresAt = null;
            await user.save();
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error during logout' });
    }
};

// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .populate('uploadedFiles', 'originalName size uploadedAt')
            .populate('sharedWithMe', 'originalName size uploadedAt uploadedBy');

        res.json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                uploadedFiles: user.uploadedFiles,
                sharedWithMe: user.sharedWithMe
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching profile' });
    }
};
