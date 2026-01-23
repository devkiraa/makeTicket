/**
 * Security Utilities Module
 * Contains helper functions for security-critical operations
 */
import crypto from 'crypto';

/**
 * Escape special regex characters to prevent ReDoS attacks
 * @param str - User input string to be used in regex
 * @returns Escaped string safe for regex use
 */
export const escapeRegex = (str: string): string => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Create HMAC signature for data
 * @param data - Data to sign
 * @param secret - Secret key for HMAC
 * @returns Hex-encoded signature
 */
export const createHmacSignature = (data: string, secret: string): string => {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify HMAC signature with timing-safe comparison
 * @param data - Original data
 * @param signature - Signature to verify
 * @param secret - Secret key used for signing
 * @returns Boolean indicating if signature is valid
 */
export const verifyHmacSignature = (data: string, signature: string, secret: string): boolean => {
    const expected = createHmacSignature(data, secret);
    try {
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
};

/**
 * Create signed OAuth state parameter
 * @param payload - State data object
 * @param secret - Signing secret
 * @returns Base64-encoded signed state
 */
export const createSignedState = (payload: object, secret: string): string => {
    const data = JSON.stringify(payload);
    const signature = createHmacSignature(data, secret);
    return Buffer.from(`${data}|${signature}`).toString('base64');
};

/**
 * Verify and decode signed OAuth state parameter
 * @param state - Base64-encoded signed state
 * @param secret - Signing secret
 * @returns Decoded payload or null if invalid
 */
export const verifySignedState = (state: string, secret: string): object | null => {
    try {
        const decoded = Buffer.from(state, 'base64').toString();
        const separatorIndex = decoded.lastIndexOf('|');
        if (separatorIndex === -1) return null;

        const payload = decoded.substring(0, separatorIndex);
        const signature = decoded.substring(separatorIndex + 1);

        if (!verifyHmacSignature(payload, signature, secret)) {
            return null;
        }

        return JSON.parse(payload);
    } catch {
        return null;
    }
};

/**
 * Generate cryptographically secure random token
 * @param length - Number of random bytes (output will be 2x in hex)
 * @returns Hex-encoded random token
 */
export const generateSecureToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate password meets security policy
 * @param password - Password to validate
 * @returns Object with valid status and error message if invalid
 */
export const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
        return { valid: false, message: 'Password cannot exceed 128 characters' };
    }

    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number' };
    }

    // Check for common weak passwords
    const commonPasswords = ['password', 'password1', '12345678', 'qwerty123'];
    if (commonPasswords.includes(password.toLowerCase())) {
        return { valid: false, message: 'Password is too common. Please choose a stronger password.' };
    }

    // Advanced Strength Check (NIST / Top 10k)
    try {
        const zxcvbn = require('zxcvbn');
        const result = zxcvbn(password);
        // Score: 0-4. We require at least 2 for public, 3 for admins ideally.
        if (result.score < 2) {
            return {
                valid: false,
                message: 'Password is too weak (easy to guess). ' + (result.feedback.warning || 'Try adding more words or symbols.')
            };
        }
    } catch (e) {
        // Fallback if zxcvbn fails
    }

    return { valid: true };
};

/**
 * Create a short-lived authorization code for token exchange
 * @returns Secure random code
 */
export const generateAuthCode = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Hash a value for secure storage (one-way)
 * @param value - Value to hash
 * @returns SHA256 hash
 */
export const hashValue = (value: string): string => {
    return crypto.createHash('sha256').update(value).digest('hex');
};
