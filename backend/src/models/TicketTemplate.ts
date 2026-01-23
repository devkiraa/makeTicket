import mongoose from 'mongoose';

const TicketTemplateSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },

    // Ticket dimensions (in pixels)
    width: { type: Number, default: 600 },
    height: { type: Number, default: 300 },

    // Background
    backgroundColor: { type: String, default: '#ffffff' },
    backgroundImage: { type: String }, // Base64 or URL
    backgroundSize: { type: String, default: 'cover' }, // cover, contain, stretch

    // QR Code settings
    qrCode: {
        x: { type: Number, default: 20 },
        y: { type: Number, default: 20 },
        size: { type: Number, default: 120 },
        backgroundColor: { type: String, default: '#ffffff' },
        foregroundColor: { type: String, default: '#000000' }
    },

    // Text elements
    elements: [{
        id: { type: String, required: true },
        type: { type: String, enum: ['text', 'placeholder'], required: true },
        content: { type: String }, // For static text
        placeholder: { type: String }, // For dynamic: guest_name, event_title, ticket_code, event_date, event_location
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        fontSize: { type: Number, default: 16 },
        fontFamily: { type: String, default: 'Arial' },
        fontWeight: { type: String, default: 'normal' },
        color: { type: String, default: '#000000' },
        textAlign: { type: String, default: 'left' }
    }],

    // Meta
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isGlobal: { type: Boolean, default: false }, // Available to all users
}, { timestamps: true });

// Compound index for unique names per user
TicketTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });

export const TicketTemplate = mongoose.model('TicketTemplate', TicketTemplateSchema);
