import mongoose from 'mongoose';

const EmailAccountSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true }, // Gmail address
    name: { type: String }, // Display name for the account
    provider: { type: String, enum: ['gmail', 'smtp'], default: 'gmail' },

    // Custom domain "Send As" (optional)
    customFromEmail: { type: String }, // e.g., hello@yourdomain.com
    customFromName: { type: String },  // e.g., "MakeTicket Events"

    // OAuth tokens (encrypted in production)
    accessToken: { type: String },
    refreshToken: { type: String },
    tokenExpiry: { type: Date },

    // Status
    isActive: { type: Boolean, default: false }, // Only one can be active per user
    isVerified: { type: Boolean, default: false },
    lastUsed: { type: Date },

    // Stats
    emailsSent: { type: Number, default: 0 }
}, { timestamps: true });

// Ensure only one active email per user
EmailAccountSchema.index({ userId: 1, email: 1 }, { unique: true });

export const EmailAccount = mongoose.model('EmailAccount', EmailAccountSchema);
