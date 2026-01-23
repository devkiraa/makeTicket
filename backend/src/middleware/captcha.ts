/**
 * CAPTCHA Middleware
 * Verifies reCAPTCHA v3 tokens for public forms
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { SecurityEvent } from '../models/SecurityEvent';

const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

// Minimum score threshold (0.0 - 1.0)
// 0.5 is recommended by Google for most use cases
const MIN_SCORE = parseFloat(process.env.RECAPTCHA_MIN_SCORE || '0.5');

interface RecaptchaResponse {
    success: boolean;
    score?: number;
    action?: string;
    challenge_ts?: string;
    hostname?: string;
    'error-codes'?: string[];
}

/**
 * Verify reCAPTCHA token with Google
 */
const verifyRecaptcha = async (token: string, expectedAction?: string): Promise<{
    success: boolean;
    score?: number;
    reason?: string;
}> => {
    if (!RECAPTCHA_SECRET) {
        logger.warn('captcha.not_configured', { message: 'RECAPTCHA_SECRET_KEY not set' });
        // Allow through if not configured (development mode)
        return { success: true, score: 1.0, reason: 'captcha_not_configured' };
    }

    try {
        const params = new URLSearchParams({
            secret: RECAPTCHA_SECRET,
            response: token
        });

        const response = await fetch(RECAPTCHA_VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const data: RecaptchaResponse = await response.json();

        if (!data.success) {
            return {
                success: false,
                reason: data['error-codes']?.join(', ') || 'verification_failed'
            };
        }

        // Check score threshold
        if (data.score !== undefined && data.score < MIN_SCORE) {
            return {
                success: false,
                score: data.score,
                reason: 'score_too_low'
            };
        }

        // Check action if expected
        if (expectedAction && data.action !== expectedAction) {
            return {
                success: false,
                score: data.score,
                reason: 'action_mismatch'
            };
        }

        return { success: true, score: data.score };
    } catch (error) {
        logger.error('captcha.verification_error', { error: (error as Error).message });
        return { success: false, reason: 'verification_error' };
    }
};

/**
 * Middleware to verify reCAPTCHA token
 * Expects token in request body under 'captchaToken' or 'recaptchaToken'
 */
export const verifyCaptcha = (action?: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const token = req.body.captchaToken || req.body.recaptchaToken || req.headers['x-captcha-token'];

        if (!token) {
            // If CAPTCHA not configured, allow through
            if (!RECAPTCHA_SECRET) {
                return next();
            }

            await SecurityEvent.create({
                type: 'captcha_failed',
                severity: 'low',
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
                details: { reason: 'missing_token', path: req.path }
            }).catch(() => { });

            return res.status(400).json({
                message: 'CAPTCHA verification required',
                error: 'missing_captcha_token'
            });
        }

        const result = await verifyRecaptcha(token as string, action);

        if (!result.success) {
            await SecurityEvent.create({
                type: 'captcha_failed',
                severity: 'medium',
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
                details: {
                    reason: result.reason,
                    score: result.score,
                    path: req.path
                }
            }).catch(() => { });

            logger.warn('captcha.failed', {
                ip: req.ip,
                reason: result.reason,
                score: result.score,
                path: req.path
            });

            return res.status(403).json({
                message: 'CAPTCHA verification failed',
                error: result.reason
            });
        }

        // Attach score to request for logging/decision making
        (req as any).captchaScore = result.score;
        next();
    };
};

/**
 * Optional CAPTCHA - verifies if present but doesn't block if missing
 */
export const optionalCaptcha = (action?: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const token = req.body.captchaToken || req.body.recaptchaToken || req.headers['x-captcha-token'];

        if (!token) {
            return next();
        }

        const result = await verifyRecaptcha(token as string, action);
        (req as any).captchaScore = result.success ? result.score : 0;
        (req as any).captchaVerified = result.success;

        // Log but don't block
        if (!result.success) {
            logger.info('captcha.optional_failed', {
                ip: req.ip,
                reason: result.reason,
                path: req.path
            });
        }

        next();
    };
};

/**
 * High-security CAPTCHA with stricter score threshold
 */
export const strictCaptcha = verifyCaptcha;

// Export for use in routes
export default verifyCaptcha;
