import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true }, // Allow null/undefined, but unique if present
    name: { type: String },
    password: { type: String, required: true }, // Added password field for Auth
    googleId: { type: String }, // For Google Auth
    googleAvatar: { type: String }, // Google profile picture URL (stored separately)
    // Google API Tokens (for Forms API access)
    googleTokens: {
        accessToken: { type: String },
        refreshToken: { type: String },
        expiresAt: { type: Date },
        scope: { type: String }
    },
    role: { type: String, enum: ['admin', 'host', 'user'], default: 'user' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    suspensionReason: { type: String },
    avatar: { type: String }, // URL or Base64
    banner: { type: String }, // URL or Base64 for profile banner
    socials: {
        twitter: { type: String },
        linkedin: { type: String },
        instagram: { type: String },
        website: { type: String },
        github: { type: String }
    },
    // Encrypted PII (Field-level encryption)
    phoneNumber: { type: String }, // Encrypted
    address: { type: String }, // Encrypted
    isEncrypted: { type: Boolean, default: false }, // Flag to track migration status

    // Encrypted SMTP Config
    smtpConfig: {
        host: { type: String },
        user: { type: String }, // Encrypted
        pass: { type: String }, // Encrypted
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        iv: { type: String } // For decryption
    },
    // Password Reset
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },

    // Password Reset Rate Limiting
    resetRequestsCount: { type: Number, default: 0 },
    resetRequestsDate: { type: Date, default: Date.now },
    lastResetRequestAt: { type: Date },

    // Two-Factor Authentication
    twoFactorSecret: { type: String }, // Stored temporarily during setup, then finalized
    isTwoFactorEnabled: { type: Boolean, default: false },
    twoFactorRecoveryCodes: [{ type: String }],

    // Login Tracking
    lastLogin: { type: Date },
    lastLoginIp: { type: String },
    loginCount: { type: Number, default: 0 },

    // Account Lockout (brute-force protection)
    failedLoginAttempts: { type: Number, default: 0 },
    lockoutUntil: { type: Date },
    lastFailedLogin: { type: Date },
    lockoutLevel: { type: Number, default: 0 }, // Escalating lockout: 0=none, 1=5min, 2=15min, 3=1hr, 4=24hr

    // Login History (for anomaly detection)
    loginHistory: [{
        ipAddress: { type: String },
        userAgent: { type: String },
        timestamp: { type: Date },
        location: {
            lat: { type: Number },
            lon: { type: Number },
            city: { type: String },
            country: { type: String }
        }
    }],

    // Known Devices (for login notifications)
    knownDevices: [{
        deviceHash: { type: String },
        userAgent: { type: String },
        lastSeen: { type: Date },
        ipAddress: { type: String },
        location: { type: String }
    }],

    // GDPR
    deletionRequestedAt: { type: Date },
    deletionConfirmCode: { type: String },
    deletionConfirmExpiry: { type: Date }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);

