import crypto from 'crypto';
import {
    escapeRegex,
    createHmacSignature,
    verifyHmacSignature,
    createSignedState,
    verifySignedState,
    generateSecureToken,
    validatePassword,
    generateAuthCode,
    hashValue
} from './security';

describe('Security Utils', () => {
    describe('escapeRegex', () => {
        it('should escape regex special characters', () => {
            const input = '.*+?^${}()|[]\\';
            const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\';
            expect(escapeRegex(input)).toBe(expected);
        });

        it('should handle empty or non-string inputs', () => {
            expect(escapeRegex('')).toBe('');
            // @ts-ignore
            expect(escapeRegex(null)).toBe('');
            // @ts-ignore
            expect(escapeRegex(undefined)).toBe('');
        });
    });

    describe('HMAC Signatures', () => {
        const data = 'test-data';
        const secret = 'super-secret-key';

        it('should create and verify signature correctly', () => {
            const signature = createHmacSignature(data, secret);
            expect(typeof signature).toBe('string');
            expect(verifyHmacSignature(data, signature, secret)).toBe(true);
        });

        it('should fail verification for tampered data', () => {
            const signature = createHmacSignature(data, secret);
            expect(verifyHmacSignature('tampered-data', signature, secret)).toBe(false);
        });

        it('should fail verification for tampered signature', () => {
            expect(verifyHmacSignature(data, 'invalid-signature', secret)).toBe(false);
        });
    });

    describe('State Signing', () => {
        const stateData = { returnUrl: '/dashboard', id: 123 };
        const secret = 'super-secret-key';

        it('should sign and verify state object correctly', () => {
            const signedState = createSignedState(stateData, secret);
            expect(typeof signedState).toBe('string');

            const verifiedData = verifySignedState(signedState, secret);
            expect(verifiedData).toEqual(stateData);
        });

        it('should return null if signature is tampered with', () => {
            const signedState = createSignedState(stateData, secret);
            // Decode, tamper payload, and re-encode
            const decoded = Buffer.from(signedState, 'base64').toString();
            const [payload, signature] = decoded.split('|');
            const tamperedPayload = JSON.stringify({ returnUrl: '/malicious' });
            const tamperedState = Buffer.from(`${tamperedPayload}|${signature}`).toString('base64');

            const verifiedData = verifySignedState(tamperedState, secret);
            expect(verifiedData).toBeNull();
        });

        it('should return null if invalid format', () => {
            const verifiedData = verifySignedState('invalid.format.string', secret);
            expect(verifiedData).toBeNull();
        });
    });

    describe('Tokens and Codes', () => {
        it('should generate secure tokens of requested length', () => {
            const token = generateSecureToken(16);
            expect(typeof token).toBe('string');
            expect(token.length).toBe(32); // 16 bytes = 32 hex chars
        });

        it('should generate auth code', () => {
            const code = generateAuthCode();
            expect(typeof code).toBe('string');
            expect(code.length).toBe(64); // 32 bytes = 64 hex chars
        });

        it('should hash values consistently', () => {
            const value = 'test-value';
            const hash1 = hashValue(value);
            const hash2 = hashValue(value);
            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(64); // sha256 hex length
        });
    });

    describe('validatePassword', () => {
        it('should require minimum length', () => {
            const result = validatePassword('Short1!');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('at least 8 characters');
        });

        it('should require uppercase letter', () => {
            const result = validatePassword('nouppercase1!');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('uppercase letter');
        });

        it('should require lowercase letter', () => {
            const result = validatePassword('NOLOWERCASE1!');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('lowercase letter');
        });

        it('should require a number', () => {
            const result = validatePassword('NoNumbersHere!');
            expect(result.valid).toBe(false);
            expect(result.message).toContain('number');
        });

        it('should reject common passwords', () => {
            const result = validatePassword('Password1'); // Meets other criteria, but common
            expect(result.valid).toBe(false);
            expect(result.message).toContain('too common');
        });

        it('should accept strong passwords', () => {
            const result = validatePassword('Str0ng!P@ssw0rd99');
            expect(result.valid).toBe(true);
            expect(result.message).toBeUndefined();
        });
    });
});
