import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionToken: { type: String }, // For secure session identification (optional for legacy sessions)
    userAgent: { type: String },
    ipAddress: { type: String },
    // Parsed device info
    deviceType: { type: String, enum: ['desktop', 'mobile', 'tablet', 'unknown'], default: 'unknown' },
    browser: { type: String },
    os: { type: String },
    // Location (derived from IP)
    country: { type: String },
    city: { type: String },
    // Status
    isValid: { type: Boolean, default: true },
    lastActiveAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    // Login metadata
    loginMethod: { type: String, enum: ['email', 'google', 'impersonate'], default: 'email' }
}, { timestamps: true });

// Index for faster lookups
SessionSchema.index({ userId: 1, isValid: 1 });
SessionSchema.index({ sessionToken: 1 }, { sparse: true }); // Sparse allows null values
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

export const Session = mongoose.model('Session', SessionSchema);
