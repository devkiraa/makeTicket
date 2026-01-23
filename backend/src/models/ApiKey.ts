import mongoose from 'mongoose';
import crypto from 'crypto';

export interface IApiKey extends mongoose.Document {
    name: string;
    key: string;
    keyPrefix: string; // First 8 chars for identification
    hashedKey: string; // Hashed version for secure storage
    ownerId: mongoose.Types.ObjectId;
    ownerType: 'user' | 'organization';
    permissions: string[];
    rateLimit: number; // Requests per minute
    isActive: boolean;
    lastUsedAt: Date;
    usageCount: number;
    expiresAt?: Date;
    ipWhitelist?: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ApiKeySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    key: {
        type: String,
        unique: true,
        sparse: true
    },
    keyPrefix: {
        type: String,
        required: true
    },
    hashedKey: {
        type: String,
        required: true,
        unique: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ownerType: {
        type: String,
        enum: ['user', 'organization'],
        default: 'user'
    },
    permissions: {
        type: [String],
        enum: [
            'read:events',
            'read:registrations',
            'read:analytics',
            'read:tickets',
            'write:events',
            'write:registrations'
        ],
        default: ['read:events', 'read:registrations', 'read:analytics']
    },
    rateLimit: {
        type: Number,
        default: 60 // 60 requests per minute
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastUsedAt: {
        type: Date
    },
    usageCount: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date
    },
    ipWhitelist: {
        type: [String],
        default: []
    }
}, { timestamps: true });

// Indexes
ApiKeySchema.index({ ownerId: 1 });
ApiKeySchema.index({ isActive: 1 });
ApiKeySchema.index({ keyPrefix: 1 });

// Generate a new API key
ApiKeySchema.statics.generateKey = function (): { key: string; prefix: string; hash: string } {
    const prefix = 'mt_'; // maketicket prefix
    const keyBody = crypto.randomBytes(32).toString('hex');
    const key = `${prefix}${keyBody}`;
    const keyPrefix = key.substring(0, 11); // mt_ + first 8 chars
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    return { key, prefix: keyPrefix, hash };
};

// Verify an API key
ApiKeySchema.statics.verifyKey = async function (key: string): Promise<IApiKey | null> {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const apiKey = await this.findOne({ hashedKey: hash, isActive: true });

    if (apiKey) {
        // Check expiration
        if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
            return null;
        }

        // Update usage stats
        apiKey.lastUsedAt = new Date();
        apiKey.usageCount += 1;
        await apiKey.save();
    }

    return apiKey;
};

export const ApiKey = mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
