import mongoose from 'mongoose';

const EmailTemplateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true }, // Template name for selection
    subject: { type: String, required: true },
    body: { type: String, required: true }, // HTML content with placeholders

    // Template type
    type: {
        type: String,
        enum: ['registration', 'reminder', 'update', 'cancellation', 'custom'],
        default: 'custom'
    },

    // Available placeholders (for reference)
    // {{guest_name}}, {{guest_email}}, {{event_title}}, {{event_date}}, 
    // {{event_location}}, {{ticket_code}}, {{qr_code}}, {{event_link}}

    isDefault: { type: Boolean, default: false }, // Default template for new events
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

EmailTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });

export const EmailTemplate = mongoose.model('EmailTemplate', EmailTemplateSchema);
