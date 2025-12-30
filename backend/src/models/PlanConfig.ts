import mongoose from 'mongoose';

// Schema for plan feature limits - stored in database for admin configuration
const PlanConfigSchema = new mongoose.Schema({
    planId: { 
        type: String, 
        enum: ['free', 'starter', 'pro', 'enterprise'], 
        required: true,
        unique: true
    },
    
    // Display Information
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, default: 0 }, // INR per month, null for enterprise (custom)
    isActive: { type: Boolean, default: true },
    
    // Numeric Limits (-1 means unlimited)
    limits: {
        // Event Limits
        maxEventsPerMonth: { type: Number, default: 2 },
        maxEventsTotal: { type: Number, default: -1 }, // Total events ever, -1 = unlimited
        maxAttendeesPerEvent: { type: Number, default: 50 },
        maxTotalAttendees: { type: Number, default: -1 }, // Total attendees across all events
        
        // Team & Collaboration
        maxTeamMembers: { type: Number, default: 1 },
        maxCoordinatorsPerEvent: { type: Number, default: 1 },
        
        // Email Limits
        maxEmailsPerMonth: { type: Number, default: 100 },
        maxEmailTemplates: { type: Number, default: 1 },
        
        // Ticket Templates
        maxTicketTemplates: { type: Number, default: 1 },
        
        // Storage
        maxStorageMB: { type: Number, default: 100 },
        maxFileUploadMB: { type: Number, default: 5 },
        
        // Form Fields
        maxCustomFieldsPerEvent: { type: Number, default: 5 },
        
        // API
        maxApiRequestsPerDay: { type: Number, default: 0 }
    },
    
    // Boolean Feature Flags
    features: {
        // Branding
        customBranding: { type: Boolean, default: false },
        removeMakeTicketBranding: { type: Boolean, default: false },
        whiteLabel: { type: Boolean, default: false },
        customDomain: { type: Boolean, default: false },
        
        // Email
        priorityEmail: { type: Boolean, default: false },
        customEmailTemplates: { type: Boolean, default: false },
        customSmtp: { type: Boolean, default: false },
        
        // Analytics
        basicAnalytics: { type: Boolean, default: true },
        advancedAnalytics: { type: Boolean, default: false },
        exportData: { type: Boolean, default: false },
        realtimeDashboard: { type: Boolean, default: false },
        
        // Integrations
        googleFormsIntegration: { type: Boolean, default: false },
        googleSheetsIntegration: { type: Boolean, default: false },
        webhooks: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        zapierIntegration: { type: Boolean, default: false },
        
        // Payments
        acceptPayments: { type: Boolean, default: false },
        multiCurrency: { type: Boolean, default: false },
        
        // Wallet
        googleWalletPass: { type: Boolean, default: true },
        appleWalletPass: { type: Boolean, default: false },
        
        // Support
        emailSupport: { type: Boolean, default: true },
        prioritySupport: { type: Boolean, default: false },
        dedicatedSupport: { type: Boolean, default: false },
        phoneSupport: { type: Boolean, default: false },
        slaGuarantee: { type: Boolean, default: false },
        
        // Security
        ssoIntegration: { type: Boolean, default: false },
        auditLogs: { type: Boolean, default: false },
        advancedSecurity: { type: Boolean, default: false },
        
        // Event Features
        waitlistManagement: { type: Boolean, default: false },
        recurringEvents: { type: Boolean, default: false },
        privateEvents: { type: Boolean, default: true },
        eventDuplication: { type: Boolean, default: false },
        bulkImport: { type: Boolean, default: false },
        checkInApp: { type: Boolean, default: true },
        qrScanning: { type: Boolean, default: true }
    },
    
    // Razorpay Plan ID (if applicable)
    razorpayPlanId: { type: String },
    
    // Display order for pricing page
    displayOrder: { type: Number, default: 0 },
    
    // Badge/Label (e.g., "Most Popular", "Best Value")
    badge: { type: String },
    
    // Color theme for UI
    themeColor: { type: String, default: '#6366f1' }
    
}, { timestamps: true });

// Default plan configurations
export const DEFAULT_PLAN_CONFIGS = {
    free: {
        planId: 'free',
        name: 'Free',
        description: 'Perfect for trying out MakeTicket',
        price: 0,
        displayOrder: 0,
        themeColor: '#64748b',
        limits: {
            maxEventsPerMonth: 2,
            maxEventsTotal: 5,
            maxAttendeesPerEvent: 50,
            maxTotalAttendees: 250,
            maxTeamMembers: 1,
            maxCoordinatorsPerEvent: 1,
            maxEmailsPerMonth: 100,
            maxEmailTemplates: 1,
            maxTicketTemplates: 1,
            maxStorageMB: 100,
            maxFileUploadMB: 5,
            maxCustomFieldsPerEvent: 5,
            maxApiRequestsPerDay: 0
        },
        features: {
            customBranding: false,
            removeMakeTicketBranding: false,
            whiteLabel: false,
            customDomain: false,
            priorityEmail: false,
            customEmailTemplates: false,
            customSmtp: false,
            basicAnalytics: true,
            advancedAnalytics: false,
            exportData: false,
            realtimeDashboard: false,
            googleFormsIntegration: false,
            googleSheetsIntegration: false,
            webhooks: false,
            apiAccess: false,
            zapierIntegration: false,
            acceptPayments: false,
            multiCurrency: false,
            googleWalletPass: true,
            appleWalletPass: false,
            emailSupport: true,
            prioritySupport: false,
            dedicatedSupport: false,
            phoneSupport: false,
            slaGuarantee: false,
            ssoIntegration: false,
            auditLogs: false,
            advancedSecurity: false,
            waitlistManagement: false,
            recurringEvents: false,
            privateEvents: true,
            eventDuplication: false,
            bulkImport: false,
            checkInApp: true,
            qrScanning: true
        }
    },
    starter: {
        planId: 'starter',
        name: 'Starter',
        description: 'Great for small events and communities',
        price: 49,
        displayOrder: 1,
        themeColor: '#22c55e',
        limits: {
            maxEventsPerMonth: 5,
            maxEventsTotal: -1,
            maxAttendeesPerEvent: 200,
            maxTotalAttendees: -1,
            maxTeamMembers: 2,
            maxCoordinatorsPerEvent: 3,
            maxEmailsPerMonth: 500,
            maxEmailTemplates: 3,
            maxTicketTemplates: 3,
            maxStorageMB: 500,
            maxFileUploadMB: 10,
            maxCustomFieldsPerEvent: 10,
            maxApiRequestsPerDay: 100
        },
        features: {
            customBranding: false,
            removeMakeTicketBranding: false,
            whiteLabel: false,
            customDomain: false,
            priorityEmail: false,
            customEmailTemplates: true,
            customSmtp: false,
            basicAnalytics: true,
            advancedAnalytics: false,
            exportData: true,
            realtimeDashboard: false,
            googleFormsIntegration: true,
            googleSheetsIntegration: true,
            webhooks: false,
            apiAccess: false,
            zapierIntegration: false,
            acceptPayments: true,
            multiCurrency: false,
            googleWalletPass: true,
            appleWalletPass: false,
            emailSupport: true,
            prioritySupport: false,
            dedicatedSupport: false,
            phoneSupport: false,
            slaGuarantee: false,
            ssoIntegration: false,
            auditLogs: false,
            advancedSecurity: false,
            waitlistManagement: true,
            recurringEvents: false,
            privateEvents: true,
            eventDuplication: true,
            bulkImport: false,
            checkInApp: true,
            qrScanning: true
        }
    },
    pro: {
        planId: 'pro',
        name: 'Pro',
        description: 'For growing organizers and teams',
        price: 499,
        displayOrder: 2,
        badge: 'Most Popular',
        themeColor: '#6366f1',
        limits: {
            maxEventsPerMonth: -1,
            maxEventsTotal: -1,
            maxAttendeesPerEvent: 1000,
            maxTotalAttendees: -1,
            maxTeamMembers: 10,
            maxCoordinatorsPerEvent: 10,
            maxEmailsPerMonth: 5000,
            maxEmailTemplates: 10,
            maxTicketTemplates: 10,
            maxStorageMB: 2000,
            maxFileUploadMB: 25,
            maxCustomFieldsPerEvent: 25,
            maxApiRequestsPerDay: 1000
        },
        features: {
            customBranding: true,
            removeMakeTicketBranding: false,
            whiteLabel: false,
            customDomain: false,
            priorityEmail: true,
            customEmailTemplates: true,
            customSmtp: true,
            basicAnalytics: true,
            advancedAnalytics: true,
            exportData: true,
            realtimeDashboard: true,
            googleFormsIntegration: true,
            googleSheetsIntegration: true,
            webhooks: true,
            apiAccess: false,
            zapierIntegration: true,
            acceptPayments: true,
            multiCurrency: false,
            googleWalletPass: true,
            appleWalletPass: true,
            emailSupport: true,
            prioritySupport: true,
            dedicatedSupport: false,
            phoneSupport: false,
            slaGuarantee: false,
            ssoIntegration: false,
            auditLogs: true,
            advancedSecurity: false,
            waitlistManagement: true,
            recurringEvents: true,
            privateEvents: true,
            eventDuplication: true,
            bulkImport: true,
            checkInApp: true,
            qrScanning: true
        }
    },
    enterprise: {
        planId: 'enterprise',
        name: 'Enterprise',
        description: 'For large organizations with custom needs',
        price: null, // Custom pricing
        displayOrder: 3,
        themeColor: '#f59e0b',
        limits: {
            maxEventsPerMonth: -1,
            maxEventsTotal: -1,
            maxAttendeesPerEvent: -1,
            maxTotalAttendees: -1,
            maxTeamMembers: -1,
            maxCoordinatorsPerEvent: -1,
            maxEmailsPerMonth: -1,
            maxEmailTemplates: -1,
            maxTicketTemplates: -1,
            maxStorageMB: -1,
            maxFileUploadMB: 100,
            maxCustomFieldsPerEvent: -1,
            maxApiRequestsPerDay: -1
        },
        features: {
            customBranding: true,
            removeMakeTicketBranding: true,
            whiteLabel: true,
            customDomain: true,
            priorityEmail: true,
            customEmailTemplates: true,
            customSmtp: true,
            basicAnalytics: true,
            advancedAnalytics: true,
            exportData: true,
            realtimeDashboard: true,
            googleFormsIntegration: true,
            googleSheetsIntegration: true,
            webhooks: true,
            apiAccess: true,
            zapierIntegration: true,
            acceptPayments: true,
            multiCurrency: true,
            googleWalletPass: true,
            appleWalletPass: true,
            emailSupport: true,
            prioritySupport: true,
            dedicatedSupport: true,
            phoneSupport: true,
            slaGuarantee: true,
            ssoIntegration: true,
            auditLogs: true,
            advancedSecurity: true,
            waitlistManagement: true,
            recurringEvents: true,
            privateEvents: true,
            eventDuplication: true,
            bulkImport: true,
            checkInApp: true,
            qrScanning: true
        }
    }
};

export const PlanConfig = mongoose.model('PlanConfig', PlanConfigSchema);
