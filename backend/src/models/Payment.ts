import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    // Razorpay Details
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    razorpaySubscriptionId: { type: String },
    
    // User Details
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Payment Details
    amount: { type: Number, required: true }, // Amount in paise
    currency: { type: String, default: 'INR' },
    status: { 
        type: String, 
        enum: ['created', 'attempted', 'paid', 'failed', 'refunded', 'expired'], 
        default: 'created' 
    },
    
    // Payment Purpose
    type: {
        type: String,
        enum: ['subscription', 'one_time', 'upgrade'],
        default: 'subscription'
    },
    plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise']
    },
    
    // Metadata
    receipt: { type: String },
    notes: { type: mongoose.Schema.Types.Mixed },
    
    // Payment Method Info
    method: { type: String }, // card, upi, netbanking, wallet
    bank: { type: String },
    wallet: { type: String },
    vpa: { type: String }, // UPI VPA
    cardLast4: { type: String },
    
    // Refund Details
    refundId: { type: String },
    refundAmount: { type: Number },
    refundStatus: { type: String },
    refundedAt: { type: Date },
    
    // Timestamps
    paidAt: { type: Date },
    failedAt: { type: Date },
    expiresAt: { type: Date },
    
    // Invoice
    invoiceId: { type: String },
    invoiceUrl: { type: String }
}, { timestamps: true });

// Indexes
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ razorpayPaymentId: 1 });
PaymentSchema.index({ razorpaySubscriptionId: 1 });

export const Payment = mongoose.model('Payment', PaymentSchema);
