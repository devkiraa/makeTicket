import express from 'express';
import { verifyToken } from '../middleware/auth';
import { verifyAdmin } from '../middleware/admin';
import {
    getSystemStats,
    runSystemHealthCheck,
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
    updateUserRole,
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
    getZeptoMailCredits,
    sendZeptoMailTestEmail
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
adminRouter.patch('/users/:userId/role', updateUserRole);
adminRouter.patch('/users/:userId/status', toggleUserStatus);
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

// Email Statistics
adminRouter.get('/email/stats', getEmailStats);
adminRouter.get('/email/zeptomail/credits', getZeptoMailCredits);
adminRouter.post('/email/zeptomail/test', sendZeptoMailTestEmail);
