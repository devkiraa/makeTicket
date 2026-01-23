// Updated Event model with waitlist and approval fields
import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    date: { type: Date }, // Event date (optional, for display)

    // Event Timing
    eventStartTime: { type: Date }, // When the event starts (date + time)
    eventEndTime: { type: Date }, // When the event ends (date + time)

    // Registration Control
    registrationCloseTime: { type: Date }, // When registration closes (blocks new registrations after this)
    registrationPaused: { type: Boolean, default: false }, // Temporarily pause registrations

    location: { type: String },
    description: { type: String },
    price: { type: Number, default: 0 },
    maxRegistrations: { type: Number, default: 0 }, // 0 = unlimited
    allowMultipleRegistrations: { type: Boolean, default: true }, // Allow same person to register multiple times
    status: { type: String, enum: ['active', 'closed', 'draft'], default: 'draft' },
    // Dynamic Form Schema - using Mixed for flexibility with images and validation
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
        validationRegex: String,
        // Image support
        hasImage: Boolean,
        imageUrl: String, // Base64 or URL
        // Validation settings
        validation: {
            minLength: Number,
            maxLength: Number,
            pattern: String,
            patternError: String
        },
        min: Number,
        max: Number,
        // File upload settings
        fileSettings: {
            acceptedTypes: [String],
            maxSizeMB: Number
        }
    }],
    authorizedHelpers: [{ type: String }], // List of Helper Emails or IDs

    // Email Configuration
    emailTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    sendConfirmationEmail: { type: Boolean, default: true },

    // Ticket Configuration
    ticketTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketTemplate' },
    attachTicket: { type: Boolean, default: true },

    // New features
    waitlistEnabled: { type: Boolean, default: false }, // Host can enable waitlist when event is full
    approvalRequired: { type: Boolean, default: false }, // Host must approve registrations before ticket is issued
    capacityAlertSent: { type: Boolean, default: false }, // Internal flag for capacity alerts

    // Google Sheets Integration
    googleSheetId: { type: String },
    googleSheetUrl: { type: String },

    // Form Header/Banner Image
    formHeaderImage: { type: String }, // Base64 or URL for form banner

    // UPI Payment Configuration
    paymentConfig: {
        enabled: { type: Boolean, default: false },
        upiId: { type: String }, // Host's UPI ID (e.g., username@paytm, 9876543210@ybl)
        upiName: { type: String }, // Name to display on QR (e.g., "Event Organizer Name")
        requirePaymentProof: { type: Boolean, default: true }, // Require screenshot upload
        autoVerifyEnabled: { type: Boolean, default: false }, // Enable auto-verification via statement PDF
        verificationNote: { type: String } // Instructions for payment (e.g., "Please upload clear screenshot")
    },
}, { timestamps: true });

EventSchema.index({ hostId: 1, slug: 1 }, { unique: true });

export const Event = mongoose.model('Event', EventSchema);
