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
    checkedInBy: { type: String }, // Helper info

    // Payment Proof & Verification
    paymentProof: {
        screenshotUrl: { type: String }, // URL to uploaded payment screenshot
        utr: { type: String }, // UPI Transaction Reference Number
        amount: { type: Number }, // Amount claimed by user
        uploadedAt: { type: Date },
        verificationStatus: {
            type: String,
            enum: ['pending', 'verified', 'rejected', 'not_required'],
            default: 'not_required'
        },
        verifiedAt: { type: Date },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin/Host who verified
        verificationMethod: { type: String, enum: ['manual', 'auto', 'none'], default: 'none' },
        rejectionReason: { type: String },
        autoVerifyResponse: { type: mongoose.Schema.Types.Mixed }, // Store Cloudflare Worker response

        // Fraud Scoring (Phase 5)
        riskScore: { type: Number },
        riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
        riskReasons: [{ type: String }]
    }
}, { timestamps: true });

// Indexes for performance
TicketSchema.index({ eventId: 1, guestEmail: 1 });
TicketSchema.index({ 'paymentProof.verificationStatus': 1 });

// SECURITY: Unique partial index on verified UTRs to prevent payment reuse fraud
// Only enforces uniqueness when UTR exists and is verified
TicketSchema.index(
    { 'paymentProof.utr': 1 },
    {
        unique: true,
        partialFilterExpression: {
            'paymentProof.utr': { $exists: true, $ne: '' },
            'paymentProof.verificationStatus': 'verified'
        },
        sparse: true,
        name: 'unique_verified_utr'
    }
);

export const Ticket = mongoose.model('Ticket', TicketSchema);
