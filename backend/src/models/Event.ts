import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    date: { type: Date }, // Optional now
    location: { type: String },
    description: { type: String },
    price: { type: Number, default: 0 },
    maxRegistrations: { type: Number, default: 0 }, // 0 = unlimited
    allowMultipleRegistrations: { type: Boolean, default: true }, // Allow same person to register multiple times
    status: { type: String, enum: ['active', 'closed', 'draft'], default: 'draft' },
    // Dynamic Form Schema
    formSchema: [{
        id: String,
        itemType: { type: String, enum: ['question', 'section'], default: 'question' },
        label: String,
        type: { type: String, enum: ['text', 'textarea', 'email', 'number', 'select', 'checkbox', 'radio', 'date', 'time', 'url', 'tel', 'file'] },
        required: Boolean,
        placeholder: String,
        description: String,
        sectionDescription: String, // For section type
        options: [String], // For select, radio
        validationRegex: String
    }],
    authorizedHelpers: [{ type: String }], // List of Helper Emails or IDs

    // Email Configuration
    emailTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    sendConfirmationEmail: { type: Boolean, default: true }
}, { timestamps: true });

EventSchema.index({ hostId: 1, slug: 1 }, { unique: true });

export const Event = mongoose.model('Event', EventSchema);
