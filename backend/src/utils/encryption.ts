/**
 * Encryption Utilities
 * Provides both legacy AES-256-CTR and new AES-256-GCM encryption
 */
import crypto from 'crypto';

// ==================== LEGACY ENCRYPTION (for backward compatibility) ====================

const algorithm = 'aes-256-ctr';
const secretKey = process.env.ENCRYPTION_KEY || 'default_secret_key_32_chars_long!!';
const ivLength = 16;

export const encrypt = (text: string) => {
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey.padEnd(32, '0').slice(0, 32)), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

export const decrypt = (hash: { iv: string, content: string }) => {
    const decipher = crypto.createDecipheriv(
        algorithm,
        Buffer.from(secretKey.padEnd(32, '0').slice(0, 32)),
        Buffer.from(hash.iv, 'hex')
    );
    const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrypted.toString();
};

// ==================== NEW FIELD-LEVEL ENCRYPTION (AES-256-GCM) ====================

const GCM_ALGORITHM = 'aes-256-gcm';
const GCM_IV_LENGTH = 16;

/**
 * Get encryption key from environment
 */
const getEncryptionKey = (): Buffer => {
    const key = process.env.ENCRYPTION_KEY || secretKey;
    if (key.length === 64) {
        return Buffer.from(key, 'hex');
    }
    return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypt a field for storage
 * Returns: iv:authTag:encryptedData (hex format)
 */
export const encryptField = (plaintext: string): string => {
    if (!plaintext) return plaintext;

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt a field from storage
 */
export const decryptField = (ciphertext: string): string => {
    if (!ciphertext || !ciphertext.includes(':')) return ciphertext;

    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

/**
 * Deterministic encryption for searchable fields
 * Uses HMAC-derived IV for consistent encryption
 */
export const encryptSearchable = (plaintext: string): string => {
    if (!plaintext) return plaintext;

    const key = getEncryptionKey();
    const ivKey = crypto.createHash('sha256').update(key).update('iv-derivation').digest();
    const iv = crypto.createHmac('sha256', ivKey)
        .update(plaintext.toLowerCase())
        .digest()
        .subarray(0, GCM_IV_LENGTH);

    const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext.toLowerCase(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Hash a value for indexing (one-way, for lookups)
 */
export const hashForIndex = (value: string): string => {
    if (!value) return value;
    const key = getEncryptionKey();
    return crypto.createHmac('sha256', key).update(value.toLowerCase()).digest('hex');
};

/**
 * Generate device fingerprint hash
 */
export const generateDeviceHash = (userAgent: string, ip: string): string => {
    const data = `${userAgent}:${ip.split('.').slice(0, 2).join('.')}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
};

/**
 * Check if a value is encrypted with field encryption
 */
export const isFieldEncrypted = (value: string): boolean => {
    if (!value) return false;
    const parts = value.split(':');
    return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
};

/**
 * Encrypt QR Payload (separate key context)
 */
export const encryptQR = (payload: string): string => {
    // Derive a unique key for QR codes
    const baseKey = getEncryptionKey();
    const qrKey = crypto.createHash('sha256').update(baseKey).update('qr-code-key-context').digest();

    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv(GCM_ALGORITHM, qrKey, iv);

    let encrypted = cipher.update(payload, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: qr_v1:iv:authTag:content
    return `qr_v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt QR Payload
 */
export const decryptQR = (encryptedPayload: string): string => {
    if (!encryptedPayload || !encryptedPayload.startsWith('qr_v1:')) return encryptedPayload;

    const parts = encryptedPayload.split(':');
    if (parts.length !== 4) throw new Error('Invalid QR format');

    const [, ivHex, authTagHex, contentHex] = parts;
    const baseKey = getEncryptionKey();
    const qrKey = crypto.createHash('sha256').update(baseKey).update('qr-code-key-context').digest();

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, qrKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

