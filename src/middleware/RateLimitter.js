import rateLimit from 'express-rate-limit';

// Default rate limiter - 100 requests per 15 minutes
export const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    keyGenerator: (req) => req.ip,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});



// Strict rate limiter for sensitive operations like voting - 10 requests per minute
export const strictLimiter = rateLimit({    
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 5,
    keyGenerator: (req) => req.ip,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

// Form submission limiter - 5 requests per minute
export const formLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 5,
    keyGenerator: (req) => req.ip,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many form submissions, please try again later.'
    }
});

// Custom rate limiter factory
export const rateLimiter = (limit, windowMinutes = 1) => {
    return rateLimit({
        windowMs: windowMinutes * 60 * 1000,
        limit: limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: {
            success: false,
            message: 'Too many requests, please try again later.'
        }
    });
};