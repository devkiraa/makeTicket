/**
 * Security Middleware Module
 * Centralized security middleware for the application
 */
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import mongoSanitize from 'express-mongo-sanitize';
import { logger } from '../lib/logger';
import { SecurityEvent } from '../models/SecurityEvent';
import { getRedisClient, isRedisAvailable } from '../lib/redis';

// ==================== HELMET CONFIGURATION ====================
export const helmetMiddleware = helmet({
    contentSecurityPolicy: false, // Handled by frontend
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
});

// ==================== REDIS STORE FACTORY ====================

/**
 * Creates a Redis store for rate limiting if Redis is available
 * Falls back to in-memory store otherwise
 */
const createRateLimitStore = (prefix: string) => {
    const client = getRedisClient();
    if (client && isRedisAvailable()) {
        logger.info(`ratelimit.using_redis`, { prefix });
        return new RedisStore({
            // @ts-ignore - RedisStore types are compatible
            sendCommand: (...args: string[]) => client.call(...args),
            prefix: `rl:${prefix}:`
        });
    }
    // Falls back to in-memory (default behavior of express-rate-limit)
    return undefined;
};

// ==================== RATE LIMITERS ====================

/**
 * Authentication rate limiter
 * Strict limits for login, register, forgot-password
 * 5 attempts per 15 minutes per IP/email
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    skipSuccessfulRequests: true,
    keyGenerator: (req: Request) => {
        // Use email if available, otherwise IP
        return req.body?.email?.toLowerCase() || req.ip || 'unknown';
    },
    handler: async (req: Request, res: Response) => {
        logger.warn('ratelimit.auth_exceeded', {
            ip: req.ip,
            email: req.body?.email,
            path: req.path
        });

        // Log security event
        await SecurityEvent.create({
            type: 'rate_limit_exceeded',
            severity: 'medium',
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'],
            details: {
                endpoint: req.path,
                email: req.body?.email
            }
        }).catch(() => { }); // Don't fail if logging fails

        res.status(429).json({
            message: 'Too many attempts. Please try again in 15 minutes.',
            retryAfter: 900
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use Redis store if available
    store: createRateLimitStore('auth')
});

/**
 * Password reset rate limiter
 * 3 attempts per hour per email
 */
export const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: (req: Request) => req.body?.email?.toLowerCase() || req.ip || 'unknown',
    message: { message: 'Too many password reset requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore('pwreset')
});

/**
 * QR/Ticket scan rate limiter
 * 30 scans per minute per user
 */
export const scanLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    keyGenerator: (req: Request) => (req as any).user?.id || req.ip || 'unknown',
    handler: async (req: Request, res: Response) => {
        logger.warn('ratelimit.scan_exceeded', {
            ip: req.ip,
            userId: (req as any).user?.id
        });

        await SecurityEvent.create({
            type: 'rate_limit_exceeded',
            severity: 'high',
            userId: (req as any).user?.id,
            ipAddress: req.ip || 'unknown',
            details: { endpoint: 'scan', reason: 'potential_enumeration' }
        }).catch(() => { });

        res.status(429).json({
            message: 'Too many scan attempts. Please slow down.',
            retryAfter: 60
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore('scan')
});

/**
 * Bulk email rate limiter
 * 3 bulk operations per hour
 */
export const bulkEmailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    keyGenerator: (req: Request) => (req as any).user?.id || req.ip || 'unknown',
    message: { message: 'Bulk email limit exceeded. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore('bulkemail')
});

/**
 * Coordinator invite acceptance rate limiter
 * 10 attempts per hour
 */
export const inviteAcceptLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { message: 'Too many invite attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore('invite')
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRateLimitStore('api')
});

// ==================== MONGO SANITIZATION ====================
export const mongoSanitizeMiddleware = mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        logger.warn('security.nosql_injection_attempt', {
            ip: req.ip,
            key,
            path: req.path
        });
    }
});

// ==================== SECURITY VALIDATION MIDDLEWARE ====================

/**
 * Validate that critical environment variables are set
 * Call this at server startup
 */
export const validateSecurityConfig = (): void => {
    const required = [
        'JWT_SECRET',
        'RAZORPAY_WEBHOOK_SECRET'
    ];

    const missing: string[] = [];
    const insecure: string[] = [];

    for (const key of required) {
        if (!process.env[key]) {
            missing.push(key);
        }
    }

    // Check for insecure defaults
    if (process.env.JWT_SECRET === 'test_secret') {
        insecure.push('JWT_SECRET is set to insecure default value');
    }

    if (missing.length > 0) {
        logger.fatal('security.config_missing', { missing });
        console.error('\n🚨 CRITICAL: Missing required security configuration:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\nServer cannot start without these variables.\n');
        process.exit(1);
    }

    if (insecure.length > 0 && process.env.NODE_ENV === 'production') {
        logger.fatal('security.insecure_config', { insecure });
        console.error('\n🚨 CRITICAL: Insecure configuration detected in production:');
        insecure.forEach(msg => console.error(`   - ${msg}`));
        console.error('\nServer cannot start with insecure configuration in production.\n');
        process.exit(1);
    }

    logger.info('security.config_validated', { status: 'ok' });
};

/**
 * Log failed validation/scan attempts as security events
 */
export const logSecurityEvent = async (
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    req: Request,
    details: object
): Promise<void> => {
    try {
        await SecurityEvent.create({
            type,
            severity,
            userId: (req as any).user?.id,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown',
            userAgent: req.headers['user-agent'],
            details
        });
    } catch (error) {
        logger.error('security.event_log_failed', { type, error: (error as Error).message });
    }
};
