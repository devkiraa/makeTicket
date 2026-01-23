/**
 * Payload Size Limits Middleware
 * Enforces stricter body size limits for different endpoints
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

// Sizes in bytes
const SIZES = {
    '1kb': 1024,
    '10kb': 10240,
    '100kb': 102400,
    '500kb': 512000,
    '1mb': 1048576,
    '5mb': 5242880,
    '10mb': 10485760,
    '50mb': 52428800 // Legacy global limit
};

/**
 * Create a middleware that enforces a specific content length limit
 */
export const limitPayloadSize = (maxSize: number) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);

        if (contentLength > maxSize) {
            logger.warn('security.payload_too_large', {
                path: req.path,
                ip: req.ip,
                size: contentLength,
                limit: maxSize
            });

            return res.status(413).json({
                message: 'Request entity too large',
                limit: maxSize
            });
        }

        next();
    };
};

/**
 * Standard limits for different route types
 */
export const payloadLimits = {
    // Standard API requests (JSON data)
    standard: limitPayloadSize(SIZES['100kb']),

    // Auth requests (login/register) - slightly larger for metadata
    auth: limitPayloadSize(SIZES['500kb']),

    // File uploads - generous limit
    upload: limitPayloadSize(SIZES['10mb']),

    // Bulk operations (e.g. email lists)
    bulk: limitPayloadSize(SIZES['5mb']),

    // Webhooks - typically small JSON
    webhook: limitPayloadSize(SIZES['500kb'])
};
