const rateLimit = require('express-rate-limit');

// Strict rate limiter for sensitive endpoints (login, password guarded downloads)
// Limits IP to 10 requests per 15 minutes
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, 
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    strictLimiter
};
