import mongoose from 'mongoose';

const EmailTemplateSchema = new mongoose.Schema({
    // userId is null for system templates (managed by admin)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    name: { type: String, required: true }, // Template name for selection
    description: { type: String }, // Brief description of the template
    subject: { type: String, required: true },
    body: { type: String, required: true }, // HTML content with placeholders

    // Template type
    type: {
        type: String,
        enum: ['registration', 'reminder', 'update', 'cancellation', 'thank_you', 'invitation', 'custom'],
        default: 'custom'
    },

    // Template category
    category: {
        type: String,
        enum: ['event', 'ticket', 'notification', 'marketing', 'system'],
        default: 'event'
    },

    // Available placeholders (for reference)
    // {{guest_name}}, {{guest_email}}, {{event_title}}, {{event_date}}, 
    // {{event_location}}, {{ticket_code}}, {{qr_code}}, {{event_link}},
    // {{organizer_name}}, {{ticket_type}}, {{venue_address}}

    // System template (admin-created, available to all users)
    isSystem: { type: Boolean, default: false },
    
    isDefault: { type: Boolean, default: false }, // Default template for new events
    isActive: { type: Boolean, default: true }, // Only active templates visible to users
    
    // Preview image URL (optional)
    previewImage: { type: String },
    
    // Usage stats
    usageCount: { type: Number, default: 0 }
}, { timestamps: true });

// Index for user templates
EmailTemplateSchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });
// Index for system templates
EmailTemplateSchema.index({ isSystem: 1, name: 1 }, { unique: true, sparse: true });
// Index for active templates
EmailTemplateSchema.index({ isSystem: 1, isActive: 1 });

export const EmailTemplate = mongoose.model('EmailTemplate', EmailTemplateSchema);
