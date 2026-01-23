import express from 'express';
import { verifyToken } from '../middleware/auth';
import { verifyAdmin } from '../middleware/admin';
import {
    getSystemStats,
    runSystemHealthCheck,
    getServerStatus,
    getServerLogs,
    clearServerLogs,
    streamLogs,
    downloadLogs,
    getLogsDriveAuthUrl,
    logsDriveCallback,
    triggerLogBackup,
    getLogBackupStatus,
    disconnectLogsDrive,
    getAllUsers,
    getUserDetails,
    getUserEvents,
    getUserActivity,
    updateUserRole,
    deleteUser,
    toggleUserStatus,
    impersonateUser,
    getUserSessions,
    getUserLoginHistory,
    terminateSession,
    terminateAllUserSessions,
    getAllActiveSessions,
    getSystemSettings,
    updateSystemSettings,
    testSystemEmail,
    getSystemEmailAuthUrl,
    systemEmailCallback,
    getEmailStats,
    getAllEmailLogs,
    getZeptoMailCredits,
    sendZeptoMailTestEmail,
    testSystemEmailType,
    // Revenue Management
    getRevenueStats,
    getAllPayments,
    getAllSubscriptions,
    getCancelledSubscriptions,
    processRefund,
    getPaymentDetails,
    // Plan Configuration
    getPlanConfigs,
    getPlanConfigById,
    updatePlanConfig,
    resetPlanConfig,
    getPlanUsageStats,
    getUserPlanDetails,
    setUserPlan,
    updateUserPlanOverrides,
    clearUserPlanOverrides,
    // Email Templates
    getSystemEmailTemplates,
    createSystemEmailTemplate,
    updateSystemEmailTemplate,
    toggleSystemTemplateStatus,
    deleteSystemEmailTemplate,
    seedDefaultTemplates,
    // Security Actions
    forceLogoutAllUsers,
    rotateApiKeys
} from '../controllers/adminController';

export const adminRouter = express.Router();

// Routes that don't go through standard middleware (OAuth callbacks, SSE)
adminRouter.get('/system-email/callback', systemEmailCallback);
adminRouter.get('/logs/drive/callback', logsDriveCallback);

// SSE stream - handles its own auth to avoid JSON error responses
adminRouter.get('/logs/stream', streamLogs);

// All other admin routes require Login AND Admin Role
adminRouter.use(verifyToken, verifyAdmin);

adminRouter.get('/stats', getSystemStats);
adminRouter.get('/health', runSystemHealthCheck);
adminRouter.get('/server-status', getServerStatus);

// Log Management
adminRouter.get('/logs', getServerLogs);
adminRouter.get('/logs/stream', streamLogs);
adminRouter.get('/logs/download', downloadLogs);
adminRouter.delete('/logs', clearServerLogs);

// Log Backup (Google Drive)
adminRouter.get('/logs/drive/auth-url', getLogsDriveAuthUrl);
adminRouter.post('/logs/backup', triggerLogBackup);
adminRouter.get('/logs/backup/status', getLogBackupStatus);
adminRouter.delete('/logs/drive', disconnectLogsDrive);

// User Management
adminRouter.get('/users', getAllUsers);
adminRouter.get('/users/:userId', getUserDetails);
adminRouter.get('/users/:userId/events', getUserEvents);
adminRouter.get('/users/:userId/activity', getUserActivity);
adminRouter.patch('/users/:userId/role', updateUserRole);
adminRouter.patch('/users/:userId/status', toggleUserStatus);
adminRouter.delete('/users/:userId', deleteUser);
adminRouter.post('/users/:userId/impersonate', impersonateUser);

// Session Management
adminRouter.get('/sessions', getAllActiveSessions);                    // All active sessions
adminRouter.get('/users/:userId/sessions', getUserSessions);           // Active sessions for user
adminRouter.get('/users/:userId/login-history', getUserLoginHistory);  // Full login history
adminRouter.delete('/sessions/:sessionId', terminateSession);          // Kill single session
adminRouter.delete('/users/:userId/sessions', terminateAllUserSessions); // Kill all user sessions

// System Settings
adminRouter.get('/settings', getSystemSettings);
adminRouter.patch('/settings', updateSystemSettings);
adminRouter.post('/settings/test-email', testSystemEmail);
adminRouter.get('/system-email/auth-url', getSystemEmailAuthUrl);      // Get Gmail OAuth URL

// Email Statistics & Logs
adminRouter.get('/email/stats', getEmailStats);
adminRouter.get('/email/logs', getAllEmailLogs);
adminRouter.get('/email/zeptomail/credits', getZeptoMailCredits);
adminRouter.post('/email/zeptomail/test', sendZeptoMailTestEmail);
adminRouter.post('/email/test-type', testSystemEmailType);

// Revenue Management
adminRouter.get('/revenue/stats', getRevenueStats);
adminRouter.get('/revenue/payments', getAllPayments);
adminRouter.get('/revenue/payments/:paymentId', getPaymentDetails);
adminRouter.get('/revenue/subscriptions', getAllSubscriptions);
adminRouter.get('/revenue/cancelled', getCancelledSubscriptions);
adminRouter.post('/revenue/refund/:paymentId', processRefund);

// Plan Configuration Management
adminRouter.get('/plans', getPlanConfigs);
adminRouter.get('/plans/stats', getPlanUsageStats);
adminRouter.get('/plans/:planId', getPlanConfigById);
adminRouter.patch('/plans/:planId', updatePlanConfig);
adminRouter.post('/plans/:planId/reset', resetPlanConfig);
adminRouter.get('/users/:userId/plan', getUserPlanDetails);
adminRouter.post('/users/:userId/plan', setUserPlan);
adminRouter.patch('/users/:userId/plan-overrides', updateUserPlanOverrides);
adminRouter.delete('/users/:userId/plan-overrides', clearUserPlanOverrides);

// Email Template Management
adminRouter.get('/email-templates', getSystemEmailTemplates);
adminRouter.post('/email-templates', createSystemEmailTemplate);
adminRouter.post('/email-templates/seed', seedDefaultTemplates);
adminRouter.patch('/email-templates/:templateId', updateSystemEmailTemplate);
adminRouter.patch('/email-templates/:templateId/toggle', toggleSystemTemplateStatus);
adminRouter.delete('/email-templates/:templateId', deleteSystemEmailTemplate);

// Security Actions (Migrated to SecurityController)
import {
    getSecurityEvents,
    getSecurityStats,
    exportSecurityLogs,
    forceLogoutUser
} from '../controllers/securityController';

adminRouter.get('/security/events', getSecurityEvents);
adminRouter.get('/security/stats', getSecurityStats);
adminRouter.get('/security/export', exportSecurityLogs);
adminRouter.post('/security/force-logout', forceLogoutUser);
// Legacy actions from admin controller
adminRouter.post('/security/force-logout-all', forceLogoutAllUsers);
adminRouter.post('/security/rotate-api-keys', rotateApiKeys);

// API Key Management
import {
    getAllApiKeys,
    createApiKey,
    updateApiKey,
    revokeApiKey,
    deleteApiKey,
    getApiKeyStats
} from '../controllers/adminController';

adminRouter.get('/api-keys', getAllApiKeys);
adminRouter.post('/api-keys', createApiKey);
adminRouter.get('/api-keys/stats', getApiKeyStats);
adminRouter.patch('/api-keys/:keyId', updateApiKey);
adminRouter.post('/api-keys/:keyId/revoke', revokeApiKey);
adminRouter.delete('/api-keys/:keyId', deleteApiKey);
