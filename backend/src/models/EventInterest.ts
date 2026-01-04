import mongoose from 'mongoose';

const EventInterestSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    email: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional linked user
    name: { type: String }, // Optional name
    status: { type: String, enum: ['pending', 'notified', 'registered'], default: 'pending' },
    source: { type: String, enum: ['email', 'google'], default: 'email' }
}, { timestamps: true });

// Prevent duplicate interest for same email + event
EventInterestSchema.index({ event: 1, email: 1 }, { unique: true });

export const EventInterest = mongoose.model('EventInterest', EventInterestSchema);
