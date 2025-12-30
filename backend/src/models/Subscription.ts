import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    
    // Plan Details
    plan: { 
        type: String, 
        enum: ['free', 'pro', 'enterprise'], 
        default: 'free' 
    },
    
    // Razorpay Subscription Details
    razorpaySubscriptionId: { type: String },
    razorpayCustomerId: { type: String },
    
    // Billing
    status: { 
        type: String, 
        enum: ['active', 'cancelled', 'expired', 'past_due', 'pending'], 
        default: 'active' 
    },
    
    // Current Period
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
    
    // Plan Limits
    limits: {
        maxAttendeesPerEvent: { type: Number, default: 100 },      // Free: 100, Pro: 1000, Enterprise: unlimited
        maxEvents: { type: Number, default: -1 },                   // -1 = unlimited
        maxTeamMembers: { type: Number, default: 1 },               // Free: 1, Pro: 5, Enterprise: unlimited
        customBranding: { type: Boolean, default: false },
        priorityEmail: { type: Boolean, default: false },
        advancedAnalytics: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        customEmailTemplates: { type: Boolean, default: false },
        exportData: { type: Boolean, default: false }
    },
    
    // Payment History Reference
    lastPaymentId: { type: String },
    lastPaymentDate: { type: Date },
    lastPaymentAmount: { type: Number },
    
    // Trial
    trialEndsAt: { type: Date },
    hasUsedTrial: { type: Boolean, default: false },
    
    // Cancellation
    cancelledAt: { type: Date },
    cancelReason: { type: String }
}, { timestamps: true });

// Plan configurations
export const PLAN_CONFIGS = {
    free: {
        name: 'Free',
        price: 0,
        limits: {
            maxAttendeesPerEvent: 100,
            maxEvents: -1,
            maxTeamMembers: 1,
            customBranding: false,
            priorityEmail: false,
            advancedAnalytics: false,
            apiAccess: false,
            customEmailTemplates: false,
            exportData: false
        }
    },
    pro: {
        name: 'Pro',
        price: 999, // INR per month
        razorpayPlanId: process.env.RAZORPAY_PRO_PLAN_ID || '',
        limits: {
            maxAttendeesPerEvent: 1000,
            maxEvents: -1,
            maxTeamMembers: 5,
            customBranding: true,
            priorityEmail: true,
            advancedAnalytics: true,
            apiAccess: false,
            customEmailTemplates: true,
            exportData: true
        }
    },
    enterprise: {
        name: 'Enterprise',
        price: null, // Custom pricing
        limits: {
            maxAttendeesPerEvent: -1, // unlimited
            maxEvents: -1,
            maxTeamMembers: -1,
            customBranding: true,
            priorityEmail: true,
            advancedAnalytics: true,
            apiAccess: true,
            customEmailTemplates: true,
            exportData: true
        }
    }
};

export const Subscription = mongoose.model('Subscription', SubscriptionSchema);
