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
    // Encrypted SMTP Config
    smtpConfig: {
        host: { type: String },
        user: { type: String }, // Encrypted
        pass: { type: String }, // Encrypted
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        iv: { type: String } // For decryption
    }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);

