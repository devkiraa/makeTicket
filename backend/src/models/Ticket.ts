import mongoose from 'mongoose';

const TicketSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional if guest checkout
    guestName: { type: String }, // Extracted for easy access
    guestEmail: { type: String }, // Extracted for easy access
    // Dynamic Answers - using strict: false or Map for flexibility
    formData: { type: Map, of: mongoose.Schema.Types.Mixed },
    pricePaid: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'free'], default: 'completed' },
    qrCodeHash: { type: String, required: true, unique: true },
    status: { type: String, enum: ['issued', 'checked-in'], default: 'issued' },
    checkedInAt: { type: Date },
    checkedInBy: { type: String } // Helper info
}, { timestamps: true });

export const Ticket = mongoose.model('Ticket', TicketSchema);
