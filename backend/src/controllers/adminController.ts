import { Request, Response } from 'express';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import fs from 'fs';
import path from 'path';
import {
    getLogsFromFile,
    getAvailableLogFiles,
    searchLogs,
    clearLogs,
    registerSSEClient,
    unregisterSSEClient,
    getBufferedLogs,
    getDriveAuthUrl,
    handleDriveCallback,
    uploadLogsToDrive,
    getBackupStatus,
    disconnectDrive
} from '../services/logService';

// Get System Overview Stats
export const getSystemStats = async (req: Request, res: Response) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalEvents = await Event.countDocuments();
        // Calculate total successful tickets (issued or checked-in)
        const totalTickets = await Ticket.countDocuments({
            status: { $in: ['issued', 'checked-in'] }
        });

        const activeEvents = await Event.countDocuments({ status: 'active' });

        // Get recent signups (last 5)
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name email role createdAt avatar');

        res.json({
            stats: {
                totalUsers,
                totalEvents,
                activeEvents,
                totalTickets
            },
            recentUsers
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Failed to fetch system stats' });
    }
};

// Start or fix issues functionality (placeholder for future)
export const runSystemHealthCheck = async (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date() });
};


import jwt from 'jsonwebtoken';
import { AuditLog } from '../models/AuditLog';

// Get paginated and filtered users
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string || '';
        const role = req.query.role as string || '';
        const status = req.query.status as string || '';
        const sortBy = req.query.sortBy as string || 'createdAt';
        const order = req.query.order === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;

        let query: any = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) query.role = role;
        // @ts-ignore
        if (status) query.status = status;

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .sort({ [sortBy]: order })
            .skip(skip)
            .limit(limit)
            .select('-password -smtpConfig');

        res.json({
            users,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

// Update User Role
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!['admin', 'host', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(userId, { role }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Audit Log
        await AuditLog.create({
            // @ts-ignore
            adminId: req.user.id,
            action: 'UPDATE_ROLE',
            targetId: userId,
            details: { role },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: `Role updated to ${role}`, user });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update role' });
    }
};

// Toggle Suspension
export const toggleUserStatus = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;

        if (!['active', 'suspended'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const user = await User.findByIdAndUpdate(userId, {
            status,
            suspensionReason: status === 'suspended' ? reason : null
        }, { new: true });

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Audit Log
        await AuditLog.create({
            // @ts-ignore
            adminId: req.user.id,
            action: status === 'suspended' ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
            targetId: userId,
            details: { reason },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: `User ${status}`, user });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update user status' });
    }
};

// Impersonate User
export const impersonateUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const targetUser = await User.findById(userId);

        if (!targetUser) return res.status(404).json({ message: 'User not found' });
        // @ts-ignore
        if (targetUser.role === 'admin') {
            return res.status(403).json({ message: 'Cannot impersonate another admin' });
        }

        // Audit Log
        await AuditLog.create({
            // @ts-ignore
            adminId: req.user.id,
            action: 'IMPERSONATE',
            targetId: userId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Generate a new token for the target user
        const token = jwt.sign(
            {
                email: targetUser.email,
                id: targetUser._id,
                role: targetUser.role,
                isImpersonated: true,
                // @ts-ignore
                adminId: req.user.id
            },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '2h' } // Shorter duration for impersonation sessions
        );

        res.json({ token, user: targetUser });
    } catch (error) {
        res.status(500).json({ message: 'Impersonation failed' });
    }
};

export const getServerLogs = async (req: Request, res: Response) => {
    try {
        const requestedFile = (req.query.file as string) || 'access.log';
        const search = req.query.search as string;
        const lines = parseInt(req.query.lines as string) || 100;

        // Get available files
        const availableFiles = getAvailableLogFiles();

        // Get logs - search if query provided, otherwise get recent
        const logs = search 
            ? searchLogs(search, requestedFile)
            : getLogsFromFile(requestedFile, lines);

        // Get backup status
        const backupStatus = await getBackupStatus();

        res.json({ 
            logs, 
            availableFiles, 
            currentFile: requestedFile,
            backupStatus,
            totalBuffered: getBufferedLogs().length
        });
    } catch (error) {
        console.error('Fetch logs error:', error);
        res.status(500).json({ message: 'Failed to fetch logs' });
    }
};

// Real-time logs via SSE (handles its own auth)
export const streamLogs = async (req: Request, res: Response) => {
    // Manual auth check for SSE (can't use middleware as it returns JSON on failure)
    const token = req.query.token as string;
    
    if (!token) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Unauthorized - No token' })}\n\n`);
        return res.end();
    }

    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
        
        // Check if admin
        if (decoded.role !== 'admin') {
            res.setHeader('Content-Type', 'text/event-stream');
            res.write(`data: ${JSON.stringify({ type: 'error', message: 'Unauthorized - Admin only' })}\n\n`);
            return res.end();
        }

        const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // For nginx

        // Send initial connection message
        res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

        // Send buffered logs
        const bufferedLogs = getBufferedLogs();
        if (bufferedLogs.length > 0) {
            res.write(`data: ${JSON.stringify({ type: 'history', data: bufferedLogs.slice(0, 50) })}\n\n`);
        }

        // Register client for real-time updates
        registerSSEClient(clientId, res);

        // Handle client disconnect
        req.on('close', () => {
            unregisterSSEClient(clientId);
        });

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
            res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        }, 30000);

        req.on('close', () => {
            clearInterval(heartbeat);
        });
    } catch (error: any) {
        console.error('Stream logs auth error:', error.message);
        res.setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Invalid token' })}\n\n`);
        return res.end();
    }
};

export const clearServerLogs = async (req: Request, res: Response) => {
    try {
        const filename = (req.query.file as string) || 'access.log';
        const success = clearLogs(filename);
        
        if (success) {
            // Audit log
            await AuditLog.create({
                // @ts-ignore
                adminId: req.user.id,
                action: 'CLEAR_LOGS',
                details: { filename },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
            res.json({ message: 'Logs cleared successfully' });
        } else {
            res.status(500).json({ message: 'Failed to clear logs' });
        }
    } catch (error) {
        console.error('Clear logs error:', error);
        res.status(500).json({ message: 'Failed to clear logs' });
    }
};

// Download log file
export const downloadLogs = async (req: Request, res: Response) => {
    try {
        const filename = (req.query.file as string) || 'access.log';
        const logsDir = path.join(process.cwd(), 'logs');
        const logPath = path.join(logsDir, filename);

        if (!fs.existsSync(logPath)) {
            return res.status(404).json({ message: 'Log file not found' });
        }

        res.download(logPath, filename);
    } catch (error) {
        console.error('Download logs error:', error);
        res.status(500).json({ message: 'Failed to download logs' });
    }
};

// ==================== GOOGLE DRIVE LOG BACKUP ====================

// Get Drive auth URL
export const getLogsDriveAuthUrl = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const adminId = req.user?.id;
        
        if (!adminId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const url = getDriveAuthUrl(adminId);
        res.json({ url });
    } catch (error) {
        console.error('Drive auth URL error:', error);
        res.status(500).json({ message: 'Failed to generate auth URL' });
    }
};

// Drive OAuth callback
export const logsDriveCallback = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        const adminId = (state as string)?.replace('drive_logs_', '');

        if (!code || !adminId) {
            return res.redirect(`${frontendUrl}/dashboard/admin/logs?error=invalid_callback`);
        }

        const result = await handleDriveCallback(code as string, adminId);
        
        res.redirect(`${frontendUrl}/dashboard/admin/logs?drive_connected=true&email=${encodeURIComponent(result.email || '')}`);
    } catch (error) {
        console.error('Drive callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/dashboard/admin/logs?error=callback_failed`);
    }
};

// Manually trigger backup
export const triggerLogBackup = async (req: Request, res: Response) => {
    try {
        const result = await uploadLogsToDrive();
        
        if (result.success) {
            // Audit log
            await AuditLog.create({
                // @ts-ignore
                adminId: req.user.id,
                action: 'MANUAL_LOG_BACKUP',
                details: { fileId: result.fileId },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
            res.json({ message: 'Backup completed successfully', fileId: result.fileId });
        } else {
            res.status(500).json({ message: result.error || 'Backup failed' });
        }
    } catch (error: any) {
        console.error('Trigger backup error:', error);
        res.status(500).json({ message: error.message || 'Failed to trigger backup' });
    }
};

// Get backup status
export const getLogBackupStatus = async (req: Request, res: Response) => {
    try {
        const status = await getBackupStatus();
        res.json(status);
    } catch (error) {
        console.error('Get backup status error:', error);
        res.status(500).json({ message: 'Failed to get backup status' });
    }
};

// Disconnect Drive
export const disconnectLogsDrive = async (req: Request, res: Response) => {
    try {
        await disconnectDrive();
        
        // Audit log
        await AuditLog.create({
            // @ts-ignore
            adminId: req.user.id,
            action: 'DISCONNECT_DRIVE_BACKUP',
            details: {},
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Google Drive disconnected successfully' });
    } catch (error) {
        console.error('Disconnect Drive error:', error);
        res.status(500).json({ message: 'Failed to disconnect Drive' });
    }
};


// ==================== SESSION MANAGEMENT ====================

import { Session } from '../models/Session';

// Get all active sessions for a specific user
export const getUserSessions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const sessions = await Session.find({
            userId,
            isValid: true,
            expiresAt: { $gt: new Date() }
        })
            .sort({ lastActiveAt: -1 })
            .lean();

        res.json({ sessions });
    } catch (error) {
        console.error('Get user sessions error:', error);
        res.status(500).json({ message: 'Failed to fetch user sessions' });
    }
};

// Get login history for a user (including expired/terminated sessions)
export const getUserLoginHistory = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const sessions = await Session.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const total = await Session.countDocuments({ userId });

        res.json({
            sessions,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        console.error('Get login history error:', error);
        res.status(500).json({ message: 'Failed to fetch login history' });
    }
};

// Terminate a specific session
export const terminateSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        // @ts-ignore
        const adminId = req.user.id;

        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // Use findByIdAndUpdate to bypass validation for legacy sessions
        await Session.findByIdAndUpdate(sessionId, { isValid: false });

        // Log the action
        await AuditLog.create({
            adminId,
            action: 'TERMINATE_SESSION',
            targetUserId: session.userId,
            details: { sessionId, browser: session.browser, os: session.os },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Session terminated successfully' });
    } catch (error) {
        console.error('Terminate session error:', error);
        res.status(500).json({ message: 'Failed to terminate session' });
    }
};

// Terminate all sessions for a user (force logout everywhere)
export const terminateAllUserSessions = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        // @ts-ignore
        const adminId = req.user.id;

        const result = await Session.updateMany(
            { userId, isValid: true },
            { isValid: false }
        );

        // Log the action
        await AuditLog.create({
            adminId,
            action: 'TERMINATE_ALL_SESSIONS',
            targetUserId: userId,
            details: { terminatedCount: result.modifiedCount },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            message: 'All sessions terminated successfully',
            terminatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Terminate all sessions error:', error);
        res.status(500).json({ message: 'Failed to terminate sessions' });
    }
};

// Get all active sessions across all users (admin overview)
export const getAllActiveSessions = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        // Build query
        const query: any = {
            isValid: true,
            expiresAt: { $gt: new Date() }
        };

        const sessions = await Session.find(query)
            .populate('userId', 'name email avatar role')
            .sort({ lastActiveAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean();

        const total = await Session.countDocuments(query);

        // Get unique user count
        const uniqueUsers = await Session.distinct('userId', query);

        res.json({
            sessions,
            total,
            uniqueUsersOnline: uniqueUsers.length,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        console.error('Get all sessions error:', error);
        res.status(500).json({ message: 'Failed to fetch sessions' });
    }
};

// ==================== SYSTEM SETTINGS ====================

import { SystemSettings } from '../models/SystemSettings';
import { EmailAccount } from '../models/EmailAccount';

// Get system settings
export const getSystemSettings = async (req: Request, res: Response) => {
    try {
        const settings = await (SystemSettings as any).getSettings();

        // Populate email account info if configured
        let emailAccountInfo = null;
        if (settings.systemEmail?.accountId) {
            const account = await EmailAccount.findById(settings.systemEmail.accountId)
                .select('email name provider isActive');
            emailAccountInfo = account;
        }

        // Get all available email accounts (for dropdown)
        const availableEmailAccounts = await EmailAccount.find({ isActive: true })
            .select('email name provider userId')
            .populate('userId', 'name email');

        res.json({
            settings,
            emailAccountInfo,
            availableEmailAccounts
        });
    } catch (error) {
        console.error('Get system settings error:', error);
        res.status(500).json({ message: 'Failed to fetch system settings' });
    }
};

// Update system settings
export const updateSystemSettings = async (req: Request, res: Response) => {
    try {
        const { systemEmail, emailSettings, emailTemplates, platformName, supportEmail, maintenanceMode, registrationEnabled } = req.body;

        const settings = await (SystemSettings as any).getSettings();

        // Update fields
        if (systemEmail !== undefined) {
            settings.systemEmail = { ...settings.systemEmail, ...systemEmail };
        }
        if (emailSettings !== undefined) {
            settings.emailSettings = { ...settings.emailSettings, ...emailSettings };
        }
        if (emailTemplates !== undefined) {
            settings.emailTemplates = { ...settings.emailTemplates, ...emailTemplates };
        }
        if (platformName !== undefined) settings.platformName = platformName;
        if (supportEmail !== undefined) settings.supportEmail = supportEmail;
        if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
        if (registrationEnabled !== undefined) settings.registrationEnabled = registrationEnabled;

        await settings.save();

        // Audit log
        await AuditLog.create({
            // @ts-ignore
            adminId: req.user.id,
            action: 'UPDATE_SYSTEM_SETTINGS',
            details: {
                updatedFields: Object.keys(req.body)
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Settings updated successfully', settings });
    } catch (error) {
        console.error('Update system settings error:', error);
        res.status(500).json({ message: 'Failed to update system settings' });
    }
};

// Test system email
export const testSystemEmail = async (req: Request, res: Response) => {
    try {
        const { recipientEmail } = req.body;

        if (!recipientEmail) {
            return res.status(400).json({ message: 'Recipient email is required' });
        }

        // Import and use the system email service
        const { sendSystemEmail } = require('../services/systemEmailService');

        const success = await sendSystemEmail('welcome', recipientEmail, {
            userName: 'Test User',
            loginUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
        });

        if (success) {
            res.json({ message: 'Test email sent successfully' });
        } else {
            res.status(500).json({ message: 'Failed to send test email. Check your system email configuration.' });
        }
    } catch (error: any) {
        console.error('Test system email error:', error);
        res.status(500).json({ message: error.message || 'Failed to send test email' });
    }
};

// ==================== ADMIN SYSTEM EMAIL OAUTH ====================

import { google } from 'googleapis';
// import { EmailAccount } from '../models/EmailAccount'; // Already imported above

// Get Gmail OAuth URL for Admin System Email
export const getSystemEmailAuthUrl = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const adminId = req.user?.id;

        if (!adminId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_EMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_EMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/system-email/callback`
        );

        const scopes = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: `admin_${adminId}` // Mark as admin flow
        });

        res.json({ url });
    } catch (error) {
        console.error('System email auth URL error:', error);
        res.status(500).json({ message: 'Failed to generate auth URL' });
    }
};

// Gmail OAuth callback for Admin System Email
export const systemEmailCallback = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Get adminId from state parameter (prefixed with 'admin_')
        const adminId = (state as string)?.replace('admin_', '');

        if (!code) {
            return res.redirect(`${frontendUrl}/dashboard/admin/email?error=no_code`);
        }

        if (!adminId) {
            return res.redirect(`${frontendUrl}/dashboard/admin/email?error=no_admin`);
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_EMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_EMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/system-email/callback`
        );

        const { tokens } = await oauth2Client.getToken(code as string);
        oauth2Client.setCredentials(tokens);

        // Get user email from Gmail
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;
        const name = userInfo.data.name;

        if (!email) {
            return res.redirect(`${frontendUrl}/dashboard/admin/email?error=no_email`);
        }

        // Save or update email account (using admin's userId)
        const mongoose = require('mongoose');
        const adminObjectId = new mongoose.Types.ObjectId(adminId);

        let existingAccount = await EmailAccount.findOne({ userId: adminObjectId, email });

        if (existingAccount) {
            existingAccount.accessToken = tokens.access_token || '';
            existingAccount.refreshToken = tokens.refresh_token || existingAccount.refreshToken;
            existingAccount.tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
            existingAccount.isVerified = true;
            existingAccount.isActive = true;
            existingAccount.name = name || existingAccount.name;
            await existingAccount.save();
        } else {
            existingAccount = await EmailAccount.create({
                userId: adminObjectId,
                email,
                name,
                provider: 'gmail',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                isVerified: true,
                isActive: true // Auto-activate for system email
            });
        }

        // Auto-update system settings to use this account
        const { SystemSettings } = require('../models/SystemSettings');
        const settings = await (SystemSettings as any).getSettings();
        settings.systemEmail = {
            ...settings.systemEmail,
            enabled: true,
            accountId: existingAccount._id
        };
        await settings.save();

        res.redirect(`${frontendUrl}/dashboard/admin/email?success=true&email=${email}`);
    } catch (error) {
        console.error('System email callback error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/dashboard/admin/email?error=callback_failed`);
    }
};

// Get email statistics
import { EmailLog } from '../models/EmailLog';

export const getEmailStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);
        
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);

        // Total emails
        const totalEmails = await EmailLog.countDocuments();
        
        // Today's emails
        const todayEmails = await EmailLog.countDocuments({ createdAt: { $gte: today } });
        
        // This week's emails
        const weekEmails = await EmailLog.countDocuments({ createdAt: { $gte: thisWeek } });
        
        // This month's emails
        const monthEmails = await EmailLog.countDocuments({ createdAt: { $gte: thisMonth } });

        // By provider
        const byProvider = await EmailLog.aggregate([
            { $group: { _id: '$provider', count: { $sum: 1 } } }
        ]);

        // By status
        const byStatus = await EmailLog.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // By type
        const byType = await EmailLog.aggregate([
            { $group: { _id: '$type', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Recent emails (last 10)
        const recentEmails = await EmailLog.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('toEmail subject type status provider createdAt');

        // Daily stats for last 7 days
        const last7Days = await EmailLog.aggregate([
            { $match: { createdAt: { $gte: thisWeek } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
                    failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                    total: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // ZeptoMail specific stats
        const zeptoStats = {
            total: await EmailLog.countDocuments({ provider: 'zeptomail' }),
            sent: await EmailLog.countDocuments({ provider: 'zeptomail', status: 'sent' }),
            failed: await EmailLog.countDocuments({ provider: 'zeptomail', status: 'failed' }),
            today: await EmailLog.countDocuments({ provider: 'zeptomail', createdAt: { $gte: today } })
        };

        // Gmail stats
        const gmailStats = {
            total: await EmailLog.countDocuments({ provider: 'gmail' }),
            sent: await EmailLog.countDocuments({ provider: 'gmail', status: 'sent' }),
            failed: await EmailLog.countDocuments({ provider: 'gmail', status: 'failed' }),
            today: await EmailLog.countDocuments({ provider: 'gmail', createdAt: { $gte: today } })
        };

        // Check ZeptoMail configuration
        const zeptoConfigured = !!(process.env.ZEPTOMAIL_TOKEN && process.env.ZEPTOMAIL_FROM_EMAIL);

        res.json({
            overview: {
                total: totalEmails,
                today: todayEmails,
                thisWeek: weekEmails,
                thisMonth: monthEmails
            },
            byProvider: byProvider.reduce((acc, item) => {
                acc[item._id || 'unknown'] = item.count;
                return acc;
            }, {} as Record<string, number>),
            byStatus: byStatus.reduce((acc, item) => {
                acc[item._id || 'unknown'] = item.count;
                return acc;
            }, {} as Record<string, number>),
            byType,
            recentEmails,
            last7Days,
            zeptomail: {
                configured: zeptoConfigured,
                fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL || null,
                fromName: process.env.ZEPTOMAIL_FROM_NAME || null,
                stats: zeptoStats
            },
            gmail: {
                stats: gmailStats
            }
        });
    } catch (error) {
        console.error('Get email stats error:', error);
        res.status(500).json({ message: 'Failed to fetch email statistics' });
    }
};

// Get ZeptoMail account credits and usage
export const getZeptoMailCredits = async (req: Request, res: Response) => {
    try {
        const zeptoToken = process.env.ZEPTOMAIL_TOKEN;
        
        if (!zeptoToken) {
            return res.status(400).json({ 
                configured: false,
                message: 'ZeptoMail is not configured' 
            });
        }

        // ZeptoMail API to get account credit details
        // Using the Mail Agent API to check credits
        const response = await fetch('https://api.zeptomail.in/v1.1/mailagents', {
            method: 'GET',
            headers: {
                'Authorization': zeptoToken,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ZeptoMail API error:', errorText);
            return res.status(response.status).json({ 
                configured: true,
                message: 'Failed to fetch ZeptoMail credits',
                error: errorText
            });
        }

        const data = await response.json();

        // Also get email statistics from ZeptoMail
        const statsResponse = await fetch('https://api.zeptomail.in/v1.1/reports/stats', {
            method: 'GET',
            headers: {
                'Authorization': zeptoToken,
                'Accept': 'application/json'
            }
        });

        let statsData = null;
        if (statsResponse.ok) {
            statsData = await statsResponse.json();
        }

        res.json({
            configured: true,
            fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL,
            fromName: process.env.ZEPTOMAIL_FROM_NAME,
            mailAgents: data.data || data,
            stats: statsData,
            // Note: ZeptoMail credit balance requires account-level API access
            // Credits are typically shown in the ZeptoMail dashboard
        });
    } catch (error: any) {
        console.error('Get ZeptoMail credits error:', error);
        res.status(500).json({ 
            configured: !!process.env.ZEPTOMAIL_TOKEN,
            message: 'Failed to fetch ZeptoMail information',
            error: error.message 
        });
    }
};

// Send test email via ZeptoMail
import { SendMailClient } from 'zeptomail';

export const sendZeptoMailTestEmail = async (req: Request, res: Response) => {
    try {
        const { recipientEmail, recipientName } = req.body;

        if (!recipientEmail) {
            return res.status(400).json({ message: 'Recipient email is required' });
        }

        const zeptoToken = process.env.ZEPTOMAIL_TOKEN;
        if (!zeptoToken) {
            return res.status(400).json({ 
                message: 'ZeptoMail is not configured. Add ZEPTOMAIL_TOKEN to your .env file.' 
            });
        }

        const zeptoUrl = process.env.ZEPTOMAIL_URL || 'https://api.zeptomail.in/v1.1/email';
        const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL || 'hello@maketicket.app';
        const fromName = process.env.ZEPTOMAIL_FROM_NAME || 'MakeTicket';

        const client = new SendMailClient({ url: zeptoUrl, token: zeptoToken });

        const testEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; color: #333; }
        .success-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
        .success-icon { font-size: 48px; margin-bottom: 10px; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ ZeptoMail Test Email</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${recipientName || 'there'}</strong>,</p>
            <p>This is a test email sent via <strong>ZeptoMail</strong> from your MakeTicket platform.</p>
            
            <div class="success-box">
                <div class="success-icon">✅</div>
                <h3 style="margin: 0; color: #16a34a;">ZeptoMail is working!</h3>
                <p style="margin: 10px 0 0 0; color: #64748b;">Your transactional email service is configured correctly.</p>
            </div>
            
            <p><strong>Configuration Details:</strong></p>
            <ul style="color: #64748b;">
                <li>From: ${fromName} &lt;${fromEmail}&gt;</li>
                <li>Provider: ZeptoMail by Zoho</li>
                <li>Sent at: ${new Date().toLocaleString()}</li>
            </ul>
            
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                This email confirms that your ZeptoMail integration is working properly for sending system emails like welcome messages, password resets, and notifications.
            </p>
        </div>
        <div class="footer">
            <p>Sent via ZeptoMail • MakeTicket Platform</p>
        </div>
    </div>
</body>
</html>`;

        await client.sendMail({
            from: {
                address: fromEmail,
                name: fromName
            },
            to: [{
                email_address: {
                    address: recipientEmail,
                    name: recipientName || recipientEmail.split('@')[0]
                }
            }],
            subject: '⚡ ZeptoMail Test - MakeTicket',
            htmlbody: testEmailHtml
        });

        // Log the test email
        await EmailLog.create({
            userId: null,
            type: 'test',
            fromEmail: fromEmail,
            toEmail: recipientEmail,
            toName: recipientName,
            subject: '⚡ ZeptoMail Test - MakeTicket',
            status: 'sent',
            provider: 'zeptomail',
            sentAt: new Date()
        });

        res.json({ 
            success: true,
            message: `Test email sent successfully to ${recipientEmail}`,
            provider: 'zeptomail',
            from: `${fromName} <${fromEmail}>`
        });

    } catch (error: any) {
        console.error('ZeptoMail test email error:', error);
        
        // Log failed email
        try {
            await EmailLog.create({
                userId: null,
                type: 'test',
                fromEmail: process.env.ZEPTOMAIL_FROM_EMAIL || 'unknown',
                toEmail: req.body.recipientEmail || 'unknown',
                subject: '⚡ ZeptoMail Test - MakeTicket',
                status: 'failed',
                provider: 'zeptomail',
                errorMessage: error.message
            });
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }

        res.status(500).json({ 
            success: false,
            message: 'Failed to send test email',
            error: error.message 
        });
    }
};
