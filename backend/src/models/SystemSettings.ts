import mongoose from 'mongoose';

// Global system settings configurable by admin
const SystemSettingsSchema = new mongoose.Schema({
    // Singleton pattern - only one document
    _id: { type: String, default: 'system_settings' },

    // System Email Account Configuration (Gmail OAuth)
    systemEmail: {
        enabled: { type: Boolean, default: false },
        accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailAccount' }, // Reference to existing EmailAccount
        fromName: { type: String, default: 'MakeTicket' },
        fromEmail: { type: String } // Optional custom from email
    },

    // Email Toggle Settings - what system emails to send
    emailSettings: {
        // Account-related emails
        welcomeEmail: { type: Boolean, default: true },
        accountVerification: { type: Boolean, default: false },
        passwordReset: { type: Boolean, default: true },

        // Host-related emails
        hostUpgradeConfirmation: { type: Boolean, default: true },

        // Event-related system emails
        eventPublished: { type: Boolean, default: false },
        dailyDigest: { type: Boolean, default: false },

        // Security emails
        loginAlert: { type: Boolean, default: false },
        suspensionNotice: { type: Boolean, default: true }
    },

    // Email Templates for system emails (optional custom templates)
    emailTemplates: {
        welcomeEmail: { type: String }, // Custom HTML template
        passwordReset: { type: String },
        hostUpgradeConfirmation: { type: String },
        suspensionNotice: { type: String }
    },

    // Other global settings
    platformName: { type: String, default: 'MakeTicket' },
    supportEmail: { type: String },
    maintenanceMode: { type: Boolean, default: false },
    registrationEnabled: { type: Boolean, default: true }

}, { timestamps: true });

// Ensure only one document exists
SystemSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findById('system_settings');
    if (!settings) {
        settings = await this.create({ _id: 'system_settings' });
    }
    return settings;
};

export const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);
