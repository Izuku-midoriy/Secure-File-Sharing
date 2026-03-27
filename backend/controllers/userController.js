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
            password: hashedPassword
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

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

        // Generate token
        const token = generateToken(user._id);

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
