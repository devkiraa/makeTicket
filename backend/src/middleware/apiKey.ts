import { Request, Response, NextFunction } from 'express';
import { ApiKey } from '../models/ApiKey';
import { logger } from '../lib/logger';

// Rate limiting store (in-memory, should use Redis for production)
const rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

// Extend Request to include apiKey
declare global {
    namespace Express {
        interface Request {
            apiKey?: any;
        }
    }
}

// Middleware to validate API key
export const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get API key from header or query
        const apiKeyHeader = req.headers['x-api-key'] as string;
        const apiKeyQuery = req.query.api_key as string;
        const apiKey = apiKeyHeader || apiKeyQuery;

        if (!apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key is required',
                message: 'Please provide an API key via X-API-Key header or api_key query parameter'
            });
        }

        // Validate key format
        if (!apiKey.startsWith('mt_')) {
            return res.status(401).json({
                success: false,
                error: 'Invalid API key format',
                message: 'API key must start with mt_'
            });
        }

        // Verify the key
        const keyDoc = await (ApiKey as any).verifyKey(apiKey);

        if (!keyDoc) {
            logger.warn('api.invalid_key', { keyPrefix: apiKey.substring(0, 11) });
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired API key'
            });
        }

        // Check IP whitelist
        if (keyDoc.ipWhitelist && keyDoc.ipWhitelist.length > 0) {
            const clientIp = req.ip || req.connection.remoteAddress;
            if (!keyDoc.ipWhitelist.includes(clientIp)) {
                logger.warn('api.ip_not_whitelisted', { keyPrefix: keyDoc.keyPrefix, ip: clientIp });
                return res.status(403).json({
                    success: false,
                    error: 'IP address not whitelisted'
                });
            }
        }

        // Rate limiting
        const rateKey = keyDoc.hashedKey;
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute window

        let rateData = rateLimitStore.get(rateKey);

        if (!rateData || now > rateData.resetTime) {
            rateData = { count: 1, resetTime: now + windowMs };
            rateLimitStore.set(rateKey, rateData);
        } else {
            rateData.count++;
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', keyDoc.rateLimit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, keyDoc.rateLimit - rateData.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(rateData.resetTime / 1000));

        if (rateData.count > keyDoc.rateLimit) {
            logger.warn('api.rate_limit_exceeded', { keyPrefix: keyDoc.keyPrefix });
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                message: `You have exceeded ${keyDoc.rateLimit} requests per minute`,
                retryAfter: Math.ceil((rateData.resetTime - now) / 1000)
            });
        }

        // Attach key info to request
        req.apiKey = keyDoc;

        // Logging: Record request start time
        const startTime = Date.now();

        // After the response is sent, log the access
        res.on('finish', async () => {
            try {
                const { ApiLog } = require('../models/ApiLog');
                await ApiLog.create({
                    apiKeyId: keyDoc._id,
                    ownerId: keyDoc.ownerId,
                    method: req.method,
                    url: req.originalUrl || req.url,
                    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
                    statusCode: res.statusCode,
                    duration: Date.now() - startTime,
                    userAgent: req.headers['user-agent']
                });
            } catch (logError) {
                logger.error('api.log_failed', { error: (logError as Error).message });
            }
        });

        next();
    } catch (error) {
        logger.error('api.auth_error', { error: (error as Error).message });
        res.status(500).json({
            success: false,
            error: 'Authentication error'
        });
    }
};

// Check if API key has specific permission
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.apiKey) {
            return res.status(401).json({
                success: false,
                error: 'API key not found'
            });
        }

        if (!req.apiKey.permissions.includes(permission)) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                message: `This API key does not have '${permission}' permission`,
                required: permission,
                available: req.apiKey.permissions
            });
        }

        next();
    };
};
