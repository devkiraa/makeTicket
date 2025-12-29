import express from 'express';
import { createEvent, getEvent, getMyEvents, updateEvent, checkEventSlug, deleteEvent } from '../controllers/eventController';
import { registerTicket, validateTicket, getEventAttendees, checkRegistration, approveTicket, rejectTicket, getPendingTickets } from '../controllers/ticketController';
import { verifyToken } from '../middleware/auth';
import { googleAuthRedirect, googleAuthCallback, getProfile, getSessions, revokeSession, updateProfile, checkUsernameAvailability } from '../controllers/authController';
import { getPublicUserProfile } from '../controllers/userController';
import { getDashboardStats, getAllAttendees, getMyRegistrations, upgradeToHost } from '../controllers/dashboardController';
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
apiRouter.post('/events', verifyToken, createEvent);
apiRouter.get('/events/my', verifyToken, getMyEvents);
apiRouter.get('/events/check-slug', verifyToken, checkEventSlug); // Check slug availability
apiRouter.patch('/events/update/:id', verifyToken, updateEvent); // Explicit update route
apiRouter.put('/events/update/:id', verifyToken, updateEvent); // Also support PUT
apiRouter.delete('/events/:id', verifyToken, deleteEvent); // Delete event


// Tickets & Coordinators (MUST be before :username/:slug to avoid conflicts)
apiRouter.post('/events/:eventId/register', registerTicket);
apiRouter.get('/events/:eventId/check-registration', checkRegistration); // Check if email already registered
apiRouter.get('/events/:eventId/attendees', verifyToken, getEventAttendees);
apiRouter.get('/events/:eventId/coordinators', verifyToken, getEventCoordinators); // Get coordinators for event
apiRouter.get('/events/:eventId/pending-tickets', verifyToken, getPendingTickets); // Get pending/waitlisted tickets
apiRouter.post('/tickets/:ticketId/approve', verifyToken, approveTicket); // Approve a pending ticket
apiRouter.post('/tickets/:ticketId/reject', verifyToken, rejectTicket); // Reject a pending ticket

// Public Event Page (LAST - catch-all pattern)
apiRouter.get('/events/:username/:slug', getEvent);

apiRouter.post('/validate', verifyToken, validateTicket);

// Dashboard
apiRouter.get('/dashboard/stats', verifyToken, getDashboardStats);
apiRouter.get('/dashboard/attendees', verifyToken, getAllAttendees);
apiRouter.get('/dashboard/my-registrations', verifyToken, getMyRegistrations); // Get events user has registered for
apiRouter.post('/dashboard/upgrade-to-host', verifyToken, upgradeToHost); // Upgrade from user to host

// Coordinators

apiRouter.post('/coordinators', verifyToken, addCoordinator); // Host adds coordinator
apiRouter.get('/coordinators/my-events', verifyToken, getMyCoordinatedEvents); // Get events I'm coordinating
apiRouter.get('/coordinators/invite/:token', getInviteDetails); // Public - get invite details
apiRouter.post('/coordinators/invite/:token/accept', verifyToken, acceptInvite); // Accept invite
apiRouter.patch('/coordinators/:coordinatorId', verifyToken, updateCoordinator); // Update permissions
apiRouter.delete('/coordinators/:coordinatorId', verifyToken, removeCoordinator); // Remove coordinator

// QR Scanning
apiRouter.post('/scan/check-in', verifyToken, scanQRCheckIn); // Scan and check-in

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
    getEmailLogDetail
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

// Email Templates
apiRouter.post('/email/templates', verifyToken, createEmailTemplate);
apiRouter.get('/email/templates', verifyToken, getEmailTemplates);
apiRouter.get('/email/templates/placeholders', verifyToken, getPlaceholders);
apiRouter.get('/email/templates/:templateId', verifyToken, getEmailTemplate);
apiRouter.patch('/email/templates/:templateId', verifyToken, updateEmailTemplate);
apiRouter.delete('/email/templates/:templateId', verifyToken, deleteEmailTemplate);

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

apiRouter.post('/ticket-templates', verifyToken, createTicketTemplate);
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
apiRouter.post('/contacts/sync', verifyToken, syncContacts);
apiRouter.get('/contacts/export', verifyToken, exportContacts);
apiRouter.post('/contacts/email', verifyToken, sendBulkEmail);
apiRouter.delete('/contacts/:contactId', verifyToken, deleteContact);

// Wallet Integration
import { getApplePass, getGoogleWalletLink } from '../controllers/walletController';

apiRouter.get('/wallet/apple/:ticketId', getApplePass);
apiRouter.get('/wallet/google/:ticketId', getGoogleWalletLink);
