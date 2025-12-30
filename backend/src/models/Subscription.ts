import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    
    // Plan Details
    plan: { 
        type: String, 
        enum: ['free', 'starter', 'pro', 'enterprise'], 
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
        maxAttendeesPerEvent: { type: Number, default: 50 },
        maxEventsPerMonth: { type: Number, default: 2 },
        maxTeamMembers: { type: Number, default: 1 },
        customBranding: { type: Boolean, default: false },
        priorityEmail: { type: Boolean, default: false },
        advancedAnalytics: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        customEmailTemplates: { type: Boolean, default: false },
        exportData: { type: Boolean, default: false },
        customDomain: { type: Boolean, default: false },
        dedicatedSupport: { type: Boolean, default: false },
        slaGuarantee: { type: Boolean, default: false },
        whiteLabel: { type: Boolean, default: false }
    },

    // Per-account plan overrides (primarily for Enterprise custom quotas)
    // Shape matches PlanConfig.limits / PlanConfig.features (stored as Mixed to avoid schema drift).
    planOverrides: {
        limits: { type: mongoose.Schema.Types.Mixed },
        features: { type: mongoose.Schema.Types.Mixed },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date }
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

// Plan configurations - All prices in INR
export const PLAN_CONFIGS = {
    free: {
        name: 'Free',
        price: 0,
        description: 'Perfect for trying out MakeTicket',
        limits: {
            maxAttendeesPerEvent: 50,
            maxEventsPerMonth: 2,
            maxTeamMembers: 1,
            customBranding: false,
            priorityEmail: false,
            advancedAnalytics: false,
            apiAccess: false,
            customEmailTemplates: false,
            exportData: false,
            customDomain: false,
            dedicatedSupport: false,
            slaGuarantee: false,
            whiteLabel: false
        }
    },
    starter: {
        name: 'Starter',
        price: 49, // INR per month
        description: 'Great for small events and communities',
        limits: {
            maxAttendeesPerEvent: 200,
            maxEventsPerMonth: 5,
            maxTeamMembers: 2,
            customBranding: false,
            priorityEmail: false,
            advancedAnalytics: false,
            apiAccess: false,
            customEmailTemplates: true,
            exportData: true,
            customDomain: false,
            dedicatedSupport: false,
            slaGuarantee: false,
            whiteLabel: false
        }
    },
    pro: {
        name: 'Pro',
        price: 499, // INR per month
        description: 'For growing organizers and teams',
        limits: {
            maxAttendeesPerEvent: 1000,
            maxEventsPerMonth: -1, // unlimited
            maxTeamMembers: 10,
            customBranding: true,
            priorityEmail: true,
            advancedAnalytics: true,
            apiAccess: false,
            customEmailTemplates: true,
            exportData: true,
            customDomain: false,
            dedicatedSupport: false,
            slaGuarantee: false,
            whiteLabel: false
        }
    },
    enterprise: {
        name: 'Enterprise',
        price: null, // Custom pricing
        description: 'For large organizations with custom needs',
        limits: {
            maxAttendeesPerEvent: -1, // unlimited
            maxEventsPerMonth: -1,
            maxTeamMembers: -1,
            customBranding: true,
            priorityEmail: true,
            advancedAnalytics: true,
            apiAccess: true,
            customEmailTemplates: true,
            exportData: true,
            customDomain: true,
            dedicatedSupport: true,
            slaGuarantee: true,
            whiteLabel: true
        }
    }
};

export const Subscription = mongoose.model('Subscription', SubscriptionSchema);
