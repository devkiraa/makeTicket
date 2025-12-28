import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional if guest checkout
    guestName: { type: String }, // Extracted for easy access
    guestEmail: { type: String }, // Extracted for easy access
    // Dynamic Answers - using Mixed to allow any keys (including those with dots)
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    pricePaid: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'free'], default: 'completed' },
    qrCodeHash: { type: String, required: true, unique: true },
    // Updated status to include waitlist and pending approval states
    status: {
        type: String,
        enum: ['issued', 'checked-in', 'pending', 'waitlisted'],
        default: 'issued'
    },
    // Waitlist flag
    waitlist: { type: Boolean, default: false },
    // Approval flag (false = pending approval, true = approved)
    approved: { type: Boolean, default: true },
    checkedInAt: { type: Date },
    checkedInBy: { type: String } // Helper info
}, { timestamps: true });

export const Ticket = mongoose.model('Ticket', TicketSchema);
