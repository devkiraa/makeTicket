import mongoose from 'mongoose';

const ContactSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    source: { type: String, default: 'registration' }, // registration, manual, import
    eventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }], // Events they've attended
    tags: [{ type: String }],
    optedIn: { type: Boolean, default: true }, // Marketing consent
    lastEventDate: { type: Date },
    totalEvents: { type: Number, default: 1 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index for unique email per host
ContactSchema.index({ hostId: 1, email: 1 }, { unique: true });

export const Contact = mongoose.model('Contact', ContactSchema);
