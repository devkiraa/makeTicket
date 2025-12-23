import crypto from 'crypto';

const algorithm = 'aes-256-ctr';
const secretKey = process.env.ENCRYPTION_KEY || 'default_secret_key_32_chars_long!!'; // Ensure this is 32 chars
const ivLength = 16;

export const encrypt = (text: string) => {
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
};

export const decrypt = (hash: { iv: string, content: string }) => {
    // In our User model, we might store these differently, essentially we need the iv and the encrypted text
    // The model has 'iv' and 'user'/'pass' as the content.
    // However, the worker expects to receive the whole smtpConfig object.
    // Let's assume the helper receives the specific encrypted string and the iv.

    // BUT, our worker example passed the whole smtpConfig to this potentially. 
    // Let's align with the worker logic: "const { user, pass } = decrypt(host.smtpConfig);"
    // This implies decrypt takes the whole config and returns decrypted user/pass. 
    // This is a bit specific. Let's make a generic decrypt and a specific helper or just generic.

    // For simplicity of the requested "Worker Logic", I will provide a generic decrypt function 
    // and let the worker call it twice.

    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(hash.iv, 'hex'));
    const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrpyted.toString();
};
