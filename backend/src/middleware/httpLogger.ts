/**
 * HTTP Logging Middleware
 * 
 * Logs HTTP request/response lifecycle with structured JSON output.
 * Replaces morgan for production use.
 */

import { Request, Response, NextFunction } from 'express';
import logger, { setContext } from '../lib/logger';

// Paths to exclude from logging (health checks, static assets)
const EXCLUDE_PATHS = new Set([
    '/health',
    '/favicon.ico',
    '/robots.txt',
]);

// Paths with reduced logging (high frequency)
const REDUCED_LOG_PATHS = [
    '/api/notifications/unread-count',
];

export function httpLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = req.startTime || Date.now();
    const path = req.path;
    
    // Skip excluded paths
    if (EXCLUDE_PATHS.has(path)) {
        return next();
    }
    
    // Check if this is a reduced logging path
    const isReducedLogPath = REDUCED_LOG_PATHS.some(p => path.includes(p));
    
    // Get client IP (respecting proxy)
    const clientIp = req.ip || 
                     req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 
                     req.socket.remoteAddress || 
                     'unknown';
    
    // Log request received (skip for reduced paths in production)
    if (!isReducedLogPath || process.env.NODE_ENV !== 'production') {
        logger.debug('http.request.start', {
            method: req.method,
            path: path,
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
            client_ip: clientIp,
            user_agent: req.headers['user-agent']?.slice(0, 100),
        });
    }
    
    // Capture response
    const originalSend = res.send;
    res.send = function(body): Response {
        const responseTime = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Attach user_id to context if auth middleware set it later in the pipeline
        const user = (req as any).user;
        const userId = user?.id || user?._id;
        if (userId) {
            setContext({ user_id: String(userId) });
        }
        
        // Determine log level based on status code
        const logData = {
            method: req.method,
            path: path,
            status_code: statusCode,
            response_time_ms: responseTime,
            client_ip: clientIp,
            content_length: res.get('Content-Length'),
        };
        
        // Skip logging for reduced paths with successful responses in production
        if (isReducedLogPath && statusCode < 400 && process.env.NODE_ENV === 'production') {
            return originalSend.call(this, body);
        }
        
        if (statusCode >= 500) {
            logger.error('http.response.error', undefined, logData);
        } else if (statusCode >= 400) {
            logger.warn('http.response.client_error', logData);
        } else {
            logger.info('http.response.success', logData);
        }
        
        return originalSend.call(this, body);
    };
    
    next();
}

export default httpLoggingMiddleware;
