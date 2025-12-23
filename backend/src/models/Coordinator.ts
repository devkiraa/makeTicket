import mongoose from 'mongoose';

// Coordinator permissions
export interface CoordinatorPermissions {
    canScanQR: boolean;      // Can check-in attendees
    canViewAttendees: boolean; // Can view attendee list
    canEditEvent: boolean;    // Can edit event details
    canExportData: boolean;   // Can export attendee data
    canSendEmails: boolean;   // Can send emails to attendees
}

const CoordinatorSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Filled when they accept invite
    email: { type: String, required: true }, // Email to send invite to
    name: { type: String }, // Optional name for display

    // Invite token for joining
    inviteToken: { type: String, required: true, unique: true },
    inviteExpiry: { type: Date },

    // Status
    status: {
        type: String,
        enum: ['pending', 'active', 'revoked'],
        default: 'pending'
    },

    // Permissions
    permissions: {
        canScanQR: { type: Boolean, default: true },
        canViewAttendees: { type: Boolean, default: true },
        canEditEvent: { type: Boolean, default: false },
        canExportData: { type: Boolean, default: false },
        canSendEmails: { type: Boolean, default: false }
    },

    // Metadata
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    acceptedAt: { type: Date }
}, { timestamps: true });

// Ensure unique coordinator per event
CoordinatorSchema.index({ eventId: 1, email: 1 }, { unique: true });

export const Coordinator = mongoose.model('Coordinator', CoordinatorSchema);
