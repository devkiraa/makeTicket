/**
 * Signed URL Middleware for Protected Uploads
 * Generates and validates time-limited signed URLs for file access
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { logger } from '../lib/logger';

const UPLOAD_SECRET = process.env.UPLOAD_SECRET || process.env.JWT_SECRET || 'default-upload-secret';
const URL_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a signed URL for accessing a protected file
 * @param filePath - The file path relative to uploads directory
 * @param expiryMs - Optional custom expiry in milliseconds
 * @returns Signed URL query parameters
 */
export const generateSignedUrl = (filePath: string, expiryMs: number = URL_EXPIRY_MS): string => {
    const expires = Date.now() + expiryMs;
    const data = `${filePath}:${expires}`;
    const signature = crypto.createHmac('sha256', UPLOAD_SECRET).update(data).digest('hex');

    return `?expires=${expires}&signature=${signature}`;
};

/**
 * Generate full signed URL
 */
export const getSignedUploadUrl = (filePath: string, baseUrl?: string): string => {
    const base = baseUrl || process.env.BACKEND_URL || 'http://localhost:5000';
    const signedParams = generateSignedUrl(filePath);
    return `${base}/uploads/${filePath}${signedParams}`;
};

/**
 * Verify a signed URL
 * @param filePath - The file path being accessed
 * @param expires - The expiry timestamp
 * @param signature - The signature to verify
 * @returns Boolean indicating if signature is valid and not expired
 */
export const verifySignedUrl = (filePath: string, expires: string, signature: string): boolean => {
    // Check expiry
    const expiryTime = parseInt(expires, 10);
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
        return false;
    }

    // Verify signature
    const data = `${filePath}:${expires}`;
    const expectedSignature = crypto.createHmac('sha256', UPLOAD_SECRET).update(data).digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
};

/**
 * Middleware to protect sensitive upload directories
 * Requires valid signed URL for access to protected paths
 */
export const signedUrlMiddleware = (protectedPaths: string[] = ['payment-proofs']) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const requestPath = req.path;

        // Check if this path requires protection
        const isProtected = protectedPaths.some(p => requestPath.includes(`/${p}/`));

        if (!isProtected) {
            return next(); // Public path, allow access
        }

        // Extract signed URL parameters
        const { expires, signature } = req.query;

        if (!expires || !signature) {
            logger.warn('upload.unsigned_access_attempt', {
                path: requestPath,
                ip: req.ip
            });
            return res.status(403).json({
                message: 'This file requires signed access. Please request a new link.'
            });
        }

        // Get the file path from the URL (remove /uploads prefix)
        const filePath = requestPath.replace(/^\/uploads\//, '');

        if (!verifySignedUrl(filePath, expires as string, signature as string)) {
            logger.warn('upload.invalid_signature', {
                path: requestPath,
                ip: req.ip,
                expired: Date.now() > parseInt(expires as string, 10)
            });
            return res.status(403).json({
                message: 'Invalid or expired link. Please request a new access link.'
            });
        }

        // Valid signature, allow access
        next();
    };
};

/**
 * Helper to make routes serve files with signed URL protection
 */
export const requireSignedUrl = signedUrlMiddleware(['payment-proofs']);
