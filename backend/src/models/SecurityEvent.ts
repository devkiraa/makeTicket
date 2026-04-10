import mongoose from 'mongoose';

const SecurityEventSchema = new mongoose.Schema({
    type: { type: String, required: true }, // e.g., 'auth_failure', 'brute_force', 'suspicious_ip', 'admin_action', 'api_key_rotation'
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    userAgent: { type: String },
    location: { type: String }, // Optional: City/Country if we add geo-ip later
    details: { type: mongoose.Schema.Types.Mixed }, // Arbitrary JSON data
    status: { type: String, enum: ['new', 'investigating', 'resolved', 'false_positive'], default: 'new' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

SecurityEventSchema.index({ createdAt: -1 });
SecurityEventSchema.index({ type: 1 });
SecurityEventSchema.index({ severity: 1 });
SecurityEventSchema.index({ status: 1 });
SecurityEventSchema.index({ userId: 1, createdAt: -1 });
SecurityEventSchema.index({ ipAddress: 1, createdAt: -1 });

export const SecurityEvent = mongoose.model('SecurityEvent', SecurityEventSchema);
