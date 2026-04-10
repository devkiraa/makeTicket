import mongoose from 'mongoose';

export interface IApiLog extends mongoose.Document {
    apiKeyId: mongoose.Types.ObjectId;
    ownerId: mongoose.Types.ObjectId;
    method: string;
    url: string;
    ipAddress: string;
    statusCode: number;
    duration: number;
    userAgent?: string;
    timestamp: Date;
}

const ApiLogSchema = new mongoose.Schema({
    apiKeyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApiKey',
        required: true,
        index: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    method: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    statusCode: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true
    },
    userAgent: {
        type: String
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

// TTL Index: Automatically delete logs after 30 days to save space
ApiLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ApiLog = mongoose.model<IApiLog>('ApiLog', ApiLogSchema);
