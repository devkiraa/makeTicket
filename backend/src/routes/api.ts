import express from 'express';
import { createEvent, getEvent, getMyEvents, updateEvent, checkEventSlug, deleteEvent, toggleRegistrationPause } from '../controllers/eventController';
import { registerTicket, validateTicket, getEventAttendees, checkRegistration, approveTicket, rejectTicket, getPendingTickets, transferTicket } from '../controllers/ticketController';
import { verifyToken, requireAdmin } from '../middleware/auth';
import {
    canCreateEvent,
    canAddAttendee,
    canAddCoordinator,
    canCreateEmailTemplate,
    canCreateTicketTemplate,
    requireExportData,
    requireBulkImport
} from '../middleware/planLimits';
import { scanLimiter, inviteAcceptLimiter } from '../middleware/security';
import { googleAuthRedirect, googleAuthCallback, getProfile, getSessions, revokeSession, updateProfile, checkUsernameAvailability } from '../controllers/authController';
import { getPublicUserProfile } from '../controllers/userController';
import { getDashboardStats, getAllAttendees, getMyRegistrations, upgradeToHost } from '../controllers/dashboardController';
import { registerInterest } from '../controllers/interestController';
import {
    addCoordinator,
    acceptInvite,
    getInviteDetails,
    getEventCoordinators,
    updateCoordinator,
    removeCoordinator,
    getMyCoordinatedEvents,
    scanQRCheckIn
} from '../controllers/coordinatorController';

export const apiRouter = express.Router();

// Public User Profile
apiRouter.get('/users/:username', getPublicUserProfile);

// Google Auth
// Google Auth
apiRouter.get('/auth/google', googleAuthRedirect);
apiRouter.get('/auth/google/callback', googleAuthCallback);

// User Profile & Sessions
apiRouter.get('/auth/me', verifyToken, getProfile);
apiRouter.patch('/auth/me', verifyToken, updateProfile); // Add Update Profile
apiRouter.get('/auth/username', checkUsernameAvailability); // Public check
apiRouter.get('/auth/sessions', verifyToken, getSessions);
apiRouter.delete('/auth/sessions/:sessionId', verifyToken, revokeSession);

// Events
apiRouter.post('/events', verifyToken, canCreateEvent, createEvent);
apiRouter.get('/events/my', verifyToken, getMyEvents);
apiRouter.get('/events/check-slug', verifyToken, checkEventSlug); // Check slug availability
apiRouter.patch('/events/update/:id', verifyToken, updateEvent); // Explicit update route
apiRouter.put('/events/update/:id', verifyToken, updateEvent); // Also support PUT
apiRouter.delete('/events/:id', verifyToken, deleteEvent); // Delete event
apiRouter.post('/events/:id/toggle-pause', verifyToken, toggleRegistrationPause); // Pause/resume registration


// Tickets & Coordinators (MUST be before :username/:slug to avoid conflicts)
apiRouter.post('/events/:eventId/register', registerTicket);
apiRouter.post('/tickets/:ticketId/transfer', verifyToken, transferTicket); // Transfer ticket
apiRouter.get('/events/:eventId/check-registration', checkRegistration); // Check if email already registered
apiRouter.get('/events/:eventId/attendees', verifyToken, getEventAttendees);
apiRouter.get('/events/:eventId/coordinators', verifyToken, getEventCoordinators); // Get coordinators for event
apiRouter.get('/events/:eventId/pending-tickets', verifyToken, getPendingTickets); // Get pending/waitlisted tickets
apiRouter.post('/tickets/:ticketId/approve', verifyToken, approveTicket); // Approve a pending ticket
apiRouter.post('/tickets/:ticketId/reject', verifyToken, rejectTicket); // Reject a pending ticket

// Public Event Page (LAST - catch-all pattern)
apiRouter.post('/events/:eventId/interest', registerInterest); // Notify me
apiRouter.get('/events/:username/:slug', getEvent);

apiRouter.post('/validate', verifyToken, scanLimiter, validateTicket); // Rate limited

// Dashboard
apiRouter.get('/dashboard/stats', verifyToken, getDashboardStats);
apiRouter.get('/dashboard/attendees', verifyToken, getAllAttendees);
apiRouter.get('/dashboard/my-registrations', verifyToken, getMyRegistrations); // Get events user has registered for
apiRouter.post('/dashboard/upgrade-to-host', verifyToken, upgradeToHost); // Upgrade from user to host

// Coordinators

apiRouter.post('/coordinators', verifyToken, canAddCoordinator, addCoordinator); // Host adds coordinator
apiRouter.get('/coordinators/my-events', verifyToken, getMyCoordinatedEvents); // Get events I'm coordinating
apiRouter.get('/coordinators/invite/:token', getInviteDetails); // Public - get invite details
apiRouter.post('/coordinators/invite/:token/accept', verifyToken, inviteAcceptLimiter, acceptInvite); // Accept invite (rate limited)
apiRouter.patch('/coordinators/:coordinatorId', verifyToken, updateCoordinator); // Update permissions
apiRouter.delete('/coordinators/:coordinatorId', verifyToken, removeCoordinator); // Remove coordinator

// QR Scanning (rate limited to prevent brute-force ticket enumeration)
apiRouter.post('/scan/check-in', verifyToken, scanLimiter, scanQRCheckIn); // Scan and check-in

// Email System
import {
    getGmailAuthUrl,
    gmailCallback,
    getEmailAccounts,
    setActiveEmailAccount,
    updateEmailAccount,
    deleteEmailAccount,
    sendTestEmail,
    createZeptoMailAccount,
    createEmailTemplate,
    getEmailTemplates,
    getEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    getPlaceholders,
    getEmailLogs,
    getEmailLogStats,
    getEmailLogDetail,
    getAvailableTemplates,
    getSystemTemplateById
} from '../controllers/emailController';

// Email Accounts (Gmail OAuth)
apiRouter.get('/email/gmail/auth', verifyToken, getGmailAuthUrl);
apiRouter.get('/email/gmail/callback', gmailCallback); // No auth - redirect from Google with state param
apiRouter.get('/email/accounts', verifyToken, getEmailAccounts);
apiRouter.patch('/email/accounts/:accountId/activate', verifyToken, setActiveEmailAccount);
apiRouter.patch('/email/accounts/:accountId', verifyToken, updateEmailAccount); // Update custom from address
apiRouter.post('/email/accounts/:accountId/test', verifyToken, sendTestEmail);
apiRouter.delete('/email/accounts/:accountId', verifyToken, deleteEmailAccount);

// ZeptoMail
apiRouter.post('/email/zeptomail', verifyToken, createZeptoMailAccount);

// Email Templates (User's own templates)
apiRouter.post('/email/templates', verifyToken, canCreateEmailTemplate, createEmailTemplate);
apiRouter.get('/email/templates', verifyToken, getEmailTemplates);
apiRouter.get('/email/templates/placeholders', verifyToken, getPlaceholders);
apiRouter.get('/email/templates/:templateId', verifyToken, getEmailTemplate);
apiRouter.patch('/email/templates/:templateId', verifyToken, updateEmailTemplate);
apiRouter.delete('/email/templates/:templateId', verifyToken, deleteEmailTemplate);

// System Email Templates (Available to all users - read only)
apiRouter.get('/email/system-templates', verifyToken, getAvailableTemplates);
apiRouter.get('/email/system-templates/:templateId', verifyToken, getSystemTemplateById);

// Email Logs
apiRouter.get('/email/logs', verifyToken, getEmailLogs);
apiRouter.get('/email/logs/stats', verifyToken, getEmailLogStats);
apiRouter.get('/email/logs/:logId', verifyToken, getEmailLogDetail);

// Ticket Templates
import {
    createTicketTemplate,
    getTicketTemplates,
    getTicketTemplate,
    updateTicketTemplate,
    deleteTicketTemplate,
    getDefaultTicketTemplate,
    getTemplateSpecs
} from '../controllers/ticketTemplateController';

apiRouter.post('/ticket-templates', verifyToken, canCreateTicketTemplate, createTicketTemplate);
apiRouter.get('/ticket-templates', verifyToken, getTicketTemplates);
apiRouter.get('/ticket-templates/specs', verifyToken, getTemplateSpecs);
apiRouter.get('/ticket-templates/default', verifyToken, getDefaultTicketTemplate);
apiRouter.get('/ticket-templates/:templateId', verifyToken, getTicketTemplate);
apiRouter.patch('/ticket-templates/:templateId', verifyToken, updateTicketTemplate);
apiRouter.delete('/ticket-templates/:templateId', verifyToken, deleteTicketTemplate);

// Notifications
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    getUnreadCount
} from '../controllers/notificationController';

apiRouter.get('/notifications', verifyToken, getNotifications);
apiRouter.get('/notifications/unread-count', verifyToken, getUnreadCount);
apiRouter.patch('/notifications/read-all', verifyToken, markAllAsRead);
apiRouter.patch('/notifications/:notificationId/read', verifyToken, markAsRead);
apiRouter.delete('/notifications/:notificationId', verifyToken, deleteNotification);
apiRouter.delete('/notifications', verifyToken, clearAllNotifications);

import {
    getSecurityEvents,
    getSecurityStats,
    exportSecurityLogs,
    forceLogoutUser,
    streamSecurityLogs
} from '../controllers/securityController';

// Admin Security Dashboard
apiRouter.get('/admin/security/events', verifyToken, requireAdmin, getSecurityEvents);
apiRouter.get('/admin/security/stats', verifyToken, requireAdmin, getSecurityStats);
apiRouter.get('/admin/security/export', verifyToken, requireAdmin, exportSecurityLogs);
apiRouter.get('/admin/security/stream', verifyToken, requireAdmin, streamSecurityLogs); // New SIEM endpoint
apiRouter.post('/admin/security/logout', verifyToken, requireAdmin, forceLogoutUser);

// Contacts & Marketing
import {
    getContacts,
    syncContacts,
    exportContacts,
    sendBulkEmail,
    deleteContact,
    getContactStats
} from '../controllers/contactController';

apiRouter.get('/contacts', verifyToken, getContacts);
apiRouter.get('/contacts/stats', verifyToken, getContactStats);
apiRouter.post('/contacts/sync', verifyToken, requireBulkImport, syncContacts);
apiRouter.get('/contacts/export', verifyToken, requireExportData, exportContacts);
apiRouter.post('/contacts/email', verifyToken, sendBulkEmail);
apiRouter.delete('/contacts/:contactId', verifyToken, deleteContact);

// Wallet Integration
import { getApplePass, getGoogleWalletLink } from '../controllers/walletController';

apiRouter.get('/wallet/apple/:ticketId', getApplePass);
apiRouter.get('/wallet/google/:ticketId', getGoogleWalletLink);

// User API Key Management (for external API access)
import {
    getUserApiKeys,
    createUserApiKey,
    updateUserApiKey,
    regenerateUserApiKey,
    deleteUserApiKey,
    getUserApiKeyUsage
} from '../controllers/apiKeyController';

apiRouter.get('/api-keys', verifyToken, getUserApiKeys);
apiRouter.post('/api-keys', verifyToken, createUserApiKey);
apiRouter.get('/api-keys/usage', verifyToken, getUserApiKeyUsage);
apiRouter.patch('/api-keys/:keyId', verifyToken, updateUserApiKey);
apiRouter.post('/api-keys/:keyId/regenerate', verifyToken, regenerateUserApiKey);
apiRouter.delete('/api-keys/:keyId', verifyToken, deleteUserApiKey);

// Event Announcements (Cancel, Time Change, Custom Updates)
import {
    sendEventAnnouncement,
    cancelEvent,
    updateEventTime,
    getAnnouncementPreview
} from '../controllers/announcementController';

apiRouter.post('/events/:eventId/announce', verifyToken, sendEventAnnouncement);
apiRouter.post('/events/:eventId/cancel', verifyToken, cancelEvent);
apiRouter.post('/events/:eventId/update-time', verifyToken, updateEventTime);
apiRouter.post('/events/:eventId/announce/preview', verifyToken, getAnnouncementPreview);

// GDPR Routes
import { gdprRouter } from './gdpr';
apiRouter.use('/gdpr', gdprRouter);
