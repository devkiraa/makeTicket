import mongoose from 'mongoose';

const EmailLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional for system emails

    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },

    // Email details
    type: {
        type: String,
        enum: [
            'registration', 'reminder', 'update', 'cancellation', 'test', 'custom',
            // System email types
            'system_welcome', 'system_passwordReset', 'system_hostUpgrade',
            'system_suspension', 'system_loginAlert'
        ],
        default: 'registration'
    },

    // Sender/Recipient
    fromEmail: { type: String, required: true },
    toEmail: { type: String, required: true },
    toName: { type: String },

    // Content
    subject: { type: String, required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    templateName: { type: String },

    // Status
    status: {
        type: String,
        enum: ['sent', 'failed', 'pending', 'bounced'],
        default: 'sent'
    },
    errorMessage: { type: String },

    // Provider tracking
    provider: {
        type: String,
        enum: ['gmail', 'zeptomail', 'smtp', 'system'],
        default: 'gmail'
    },

    // ZeptoMail specific
    zeptoRequestId: { type: String },
    zeptoMessageId: { type: String },

    // Metadata
    eventTitle: { type: String },
    ticketCode: { type: String },

    // Tracking
    sentAt: { type: Date, default: Date.now },
    openedAt: { type: Date },
    clickedAt: { type: Date }
}, { timestamps: true });

// Index for efficient queries
EmailLogSchema.index({ userId: 1, createdAt: -1 });
EmailLogSchema.index({ eventId: 1 });
EmailLogSchema.index({ toEmail: 1 });

export const EmailLog = mongoose.model('EmailLog', EmailLogSchema);
