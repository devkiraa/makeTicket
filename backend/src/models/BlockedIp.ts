import mongoose from 'mongoose';

const BlockedIpSchema = new mongoose.Schema({
    ipAddress: { type: String, required: true, unique: true },
    reason: { type: String },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const BlockedIp = mongoose.model('BlockedIp', BlockedIpSchema);
