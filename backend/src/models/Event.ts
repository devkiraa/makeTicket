import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    date: { type: Date }, // Optional now
    location: { type: String },
    description: { type: String },
    price: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'closed', 'draft'], default: 'draft' },
    // Dynamic Form Schema
    formSchema: [{
        id: String,
        label: String,
        type: { type: String, enum: ['text', 'textarea', 'email', 'number', 'select', 'checkbox', 'radio', 'date', 'file'] },
        required: Boolean,
        placeholder: String,
        options: [String], // For select, radio
        validationRegex: String
    }],
    authorizedHelpers: [{ type: String }] // List of Helper Emails or IDs
}, { timestamps: true });

EventSchema.index({ hostId: 1, slug: 1 }, { unique: true });

export const Event = mongoose.model('Event', EventSchema);
