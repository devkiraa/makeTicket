import mongoose from 'mongoose';

const PassSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },

    // The events included in this pass
    includedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],

    price: { type: Number, default: 0 },
    maxSales: { type: Number, default: 0 }, // 0 = unlimited
    currentSales: { type: Number, default: 0 },

    status: { type: String, enum: ['active', 'inactive', 'sold_out'], default: 'active' },

    // Date validity for selling the pass
    saleStartsAt: { type: Date },
    saleEndsAt: { type: Date }
}, { timestamps: true });

export const Pass = mongoose.model('Pass', PassSchema);
