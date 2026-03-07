import mongoose from 'mongoose';

const PromoCodeSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true, uppercase: true, trim: true },

    // Type of discount
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 }, // percentage (1-100) or fixed amount

    // Limitations
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    currentUses: { type: Number, default: 0 },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date }, // Optional expiry

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Ensure a code is unique per event
PromoCodeSchema.index({ eventId: 1, code: 1 }, { unique: true });

export const PromoCode = mongoose.model('PromoCode', PromoCodeSchema);
