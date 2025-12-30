import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { PlanConfig, DEFAULT_PLAN_CONFIGS } from '../models/PlanConfig';
import { 
    getAllPlanConfigs, 
    clearPlanConfigCache,
    getUserPlanSummary 
} from '../services/planLimitService';
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
import { logger } from '../lib/logger';

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
    } catch (error: any) {
        logger.error('admin.stats_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch system stats' });
    }
};

// Server start time for uptime calculation
const serverStartTime = Date.now();

// Keep-alive status tracking
interface KeepAliveStatus {
    enabled: boolean;
    lastPing: Date | null;
    pingCount: number;
    lastPingSuccess: boolean;
    interval: number;
}

export const keepAliveStatus: KeepAliveStatus = {
    enabled: process.env.NODE_ENV === 'production',
    lastPing: null,
    pingCount: 0,
    lastPingSuccess: false,
    interval: 10 * 60 * 1000 // 10 minutes
};

// Update keep-alive status (called from server.ts)
export const updateKeepAliveStatus = (success: boolean) => {
    keepAliveStatus.lastPing = new Date();
    keepAliveStatus.pingCount++;
    keepAliveStatus.lastPingSuccess = success;
};

// Get comprehensive server status
export const getServerStatus = async (req: Request, res: Response) => {
    try {
        const now = Date.now();
        const uptimeMs = now - serverStartTime;
        const uptimeSeconds = Math.floor(uptimeMs / 1000);
        const uptimeMinutes = Math.floor(uptimeSeconds / 60);
        const uptimeHours = Math.floor(uptimeMinutes / 60);
        const uptimeDays = Math.floor(uptimeHours / 24);

        // Memory usage
        const memoryUsage = process.memoryUsage();
        const formatBytes = (bytes: number) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        // Database status
        const dbStatus = mongoose.connection?.readyState ?? 0;
        const dbStatusMap: { [key: number]: string } = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        // Count documents
        const [userCount, eventCount, ticketCount] = await Promise.all([
            User.countDocuments(),
            Event.countDocuments(),
            Ticket.countDocuments()
        ]);

        // Redis status check
        let redisStatus = 'not_configured';
        try {
            if (process.env.REDIS_HOST) {
                // Just check if env vars are set
                redisStatus = 'configured';
            }
        } catch {
            redisStatus = 'error';
        }

        res.json({
            server: {
                status: 'online',
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                pid: process.pid
            },
            uptime: {
                raw: uptimeMs,
                seconds: uptimeSeconds,
                formatted: `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`,
                startedAt: new Date(serverStartTime).toISOString()
            },
            memory: {
                heapUsed: formatBytes(memoryUsage.heapUsed),
                heapTotal: formatBytes(memoryUsage.heapTotal),
                rss: formatBytes(memoryUsage.rss),
                external: formatBytes(memoryUsage.external),
                heapUsedPercent: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1)
            },
            database: {
                status: dbStatusMap[dbStatus] || 'unknown',
                connected: dbStatus === 1,
                collections: {
                    users: userCount,
                    events: eventCount,
                    tickets: ticketCount
                }
            },
            redis: {
                status: redisStatus,
                host: process.env.REDIS_HOST ? '***configured***' : 'not_set'
            },
            keepAlive: {
                enabled: keepAliveStatus.enabled,
                lastPing: keepAliveStatus.lastPing,
                pingCount: keepAliveStatus.pingCount,
                lastPingSuccess: keepAliveStatus.lastPingSuccess,
                intervalMinutes: keepAliveStatus.interval / 60000,
                nextPingIn: keepAliveStatus.lastPing 
                    ? Math.max(0, keepAliveStatus.interval - (now - new Date(keepAliveStatus.lastPing).getTime()))
                    : null
            },
            services: {
                razorpay: !!process.env.RAZORPAY_KEY_ID,
                zeptomail: !!process.env.ZEPTOMAIL_TOKEN,
                googleWallet: !!process.env.GOOGLE_WALLET_ISSUER_ID,
                googleAuth: !!process.env.GOOGLE_CLIENT_ID
            },
            hosting: {
                backend: {
                    platform: process.env.RENDER === 'true' ? 'Render' : (process.env.VERCEL ? 'Vercel' : (process.env.NODE_ENV === 'production' ? 'Cloud' : 'Local')),
                    url: process.env.BACKEND_URL || 'http://localhost:5000',
                    region: process.env.RENDER_REGION || process.env.VERCEL_REGION || (process.env.NODE_ENV === 'production' ? 'Auto' : 'Local'),
                    instance: process.env.RENDER_INSTANCE_ID || process.env.RENDER_SERVICE_ID || 'local',
                    serviceType: process.env.RENDER_SERVICE_TYPE || (process.env.NODE_ENV === 'production' ? 'Web Service' : 'Development')
                },
                frontend: {
                    platform: 'Vercel',
                    url: process.env.FRONTEND_URL || 'http://localhost:3000'
                },
                database: {
                    provider: 'MongoDB Atlas',
                    cluster: process.env.MONGO_URI?.includes('mongodb+srv') ? 'Atlas Cluster' : 'Self-hosted'
                },
                cache: {
                    provider: process.env.REDIS_HOST?.includes('upstash') ? 'Upstash Redis' : (process.env.REDIS_HOST ? 'Redis' : 'None'),
                    region: process.env.REDIS_HOST?.includes('upstash') ? 'Global Edge' : 'N/A'
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        logger.error('admin.server_status_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch server status' });
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
    } catch (error: any) {
        logger.error('admin.fetch_users_failed', { error: error.message }, error);
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
        const userIdFilter = (req.query.userId as string) || (req.query.user_id as string);
        const ipFilter = (req.query.ip as string) || (req.query.client_ip as string);
        const lines = parseInt(req.query.lines as string) || 100;

        // Get available files
        const availableFiles = getAvailableLogFiles();

        const parseJsonLine = (line: string): any | null => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        };

        const normalize = (v: string) => v.trim();

        // Get logs - support structured filtering by userId/ip (and optional search)
        let logs: string[];

        const hasStructuredFilters = !!(userIdFilter || ipFilter);
        if (hasStructuredFilters) {
            const recent = getLogsFromFile(requestedFile, Math.max(2000, lines * 20));
            const searchLower = search ? search.toLowerCase() : null;
            const wantedUserId = userIdFilter ? normalize(userIdFilter) : null;
            const wantedIp = ipFilter ? normalize(ipFilter) : null;

            logs = recent.filter((line) => {
                const parsed = parseJsonLine(line);

                if (searchLower && !line.toLowerCase().includes(searchLower)) {
                    return false;
                }

                if (wantedUserId) {
                    const lineUserId = parsed?.user_id ?? parsed?.userId ?? parsed?.user_id;
                    if (lineUserId) {
                        if (String(lineUserId) !== wantedUserId) return false;
                    } else {
                        // fallback substring match for non-JSON lines
                        if (!line.includes(wantedUserId)) return false;
                    }
                }

                if (wantedIp) {
                    const lineIp = parsed?.client_ip ?? parsed?.ip ?? parsed?.clientIp;
                    if (lineIp) {
                        if (String(lineIp) !== wantedIp) return false;
                    } else {
                        if (!line.includes(wantedIp)) return false;
                    }
                }

                return true;
            }).slice(0, lines);
        } else {
            logs = search
                ? searchLogs(search, requestedFile)
                : getLogsFromFile(requestedFile, lines);
        }

        // Get backup status
        const backupStatus = await getBackupStatus();

        res.json({ 
            logs, 
            availableFiles, 
            currentFile: requestedFile,
            backupStatus,
            totalBuffered: getBufferedLogs().length
        });
    } catch (error: any) {
        logger.error('admin.fetch_logs_failed', { error: error.message }, error);
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
        logger.error('admin.stream_logs_auth_failed', { error: error.message });
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
    } catch (error: any) {
        logger.error('admin.clear_logs_failed', { error: error.message }, error);
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
    } catch (error: any) {
        logger.error('admin.download_logs_failed', { error: error.message }, error);
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
        logger.error('admin.Drive auth URL error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Drive callback error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Trigger backup error:', { error: (error as Error)?.message || 'Unknown error' });
        res.status(500).json({ message: error.message || 'Failed to trigger backup' });
    }
};

// Get backup status
export const getLogBackupStatus = async (req: Request, res: Response) => {
    try {
        const status = await getBackupStatus();
        res.json(status);
    } catch (error) {
        logger.error('admin.Get backup status error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Disconnect Drive error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Get user sessions error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Get login history error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Terminate session error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Terminate all sessions error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Get all sessions error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Get system settings error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Update system settings error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Test system email error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.System email auth URL error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.System email callback error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.Get email stats error:', { error: (error as Error)?.message || 'Unknown error' });
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
            logger.error('admin.zeptomail_api_error', { status: response.status, error: errorText });
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
        logger.error('admin.Get ZeptoMail credits error:', { error: (error as Error)?.message || 'Unknown error' });
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
        logger.error('admin.ZeptoMail test email error:', { error: (error as Error)?.message || 'Unknown error' });
        
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
        } catch (logError: any) {
            logger.error('admin.email_log_failed', { error: logError.message });
        }

        res.status(500).json({ 
            success: false,
            message: 'Failed to send test email',
            error: error.message 
        });
    }
};

// ==================== REVENUE MANAGEMENT ====================

/**
 * Get revenue overview and statistics
 */
export const getRevenueStats = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Build date filter
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate as string);
        if (endDate) dateFilter.$lte = new Date(endDate as string);
        
        const matchStage: any = { status: 'paid' };
        if (Object.keys(dateFilter).length > 0) {
            matchStage.paidAt = dateFilter;
        }

        // Total Revenue
        const totalRevenueResult = await Payment.aggregate([
            { $match: matchStage },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalRevenue = totalRevenueResult[0]?.total || 0;

        // Revenue by Plan
        const revenueByPlan = await Payment.aggregate([
            { $match: matchStage },
            { $group: { _id: '$plan', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]);

        // Revenue by Payment Method
        const revenueByMethod = await Payment.aggregate([
            { $match: matchStage },
            { $group: { _id: '$method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
            { $sort: { total: -1 } }
        ]);

        // Monthly Revenue (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        const monthlyRevenue = await Payment.aggregate([
            { $match: { status: 'paid', paidAt: { $gte: twelveMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$paidAt' },
                        month: { $month: '$paidAt' }
                    },
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Total Refunds
        const refundsResult = await Payment.aggregate([
            { $match: { status: 'refunded' } },
            { $group: { _id: null, total: { $sum: '$refundAmount' }, count: { $sum: 1 } } }
        ]);
        const totalRefunds = refundsResult[0]?.total || 0;
        const refundCount = refundsResult[0]?.count || 0;

        // Pending Refund Requests (cancelled subscriptions that might need refunds)
        const pendingRefunds = await Subscription.countDocuments({
            status: 'cancelled',
            cancelledAt: { $exists: true }
        });

        // Active Subscriptions by Plan
        const activeSubscriptions = await Subscription.aggregate([
            { $match: { status: 'active', plan: { $ne: 'free' } } },
            { $group: { _id: '$plan', count: { $sum: 1 } } }
        ]);

        // Total paid users
        const totalPaidUsers = await Subscription.countDocuments({
            status: 'active',
            plan: { $ne: 'free' }
        });

        // Today's revenue
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayRevenueResult = await Payment.aggregate([
            { $match: { status: 'paid', paidAt: { $gte: todayStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const todayRevenue = todayRevenueResult[0]?.total || 0;

        // This month's revenue
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthRevenueResult = await Payment.aggregate([
            { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const monthRevenue = monthRevenueResult[0]?.total || 0;

        res.json({
            overview: {
                totalRevenue: totalRevenue / 100, // Convert from paise to rupees
                todayRevenue: todayRevenue / 100,
                monthRevenue: monthRevenue / 100,
                totalRefunds: totalRefunds / 100,
                refundCount,
                pendingRefunds,
                totalPaidUsers
            },
            revenueByPlan: revenueByPlan.map(p => ({
                plan: p._id || 'unknown',
                total: p.total / 100,
                count: p.count
            })),
            revenueByMethod: revenueByMethod.map(m => ({
                method: m._id || 'unknown',
                total: m.total / 100,
                count: m.count
            })),
            monthlyRevenue: monthlyRevenue.map(m => ({
                year: m._id.year,
                month: m._id.month,
                total: m.total / 100,
                count: m.count
            })),
            activeSubscriptions: activeSubscriptions.map(s => ({
                plan: s._id,
                count: s.count
            }))
        });

    } catch (error: any) {
        logger.error('admin.Revenue stats error:', { error: (error as Error)?.message || 'Unknown error' });
        res.status(500).json({ message: 'Failed to fetch revenue stats', error: error.message });
    }
};

/**
 * Get all payments with pagination and filters
 */
export const getAllPayments = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const plan = req.query.plan as string;
        const method = req.query.method as string;
        const search = req.query.search as string;
        const sortBy = req.query.sortBy as string || 'createdAt';
        const order = req.query.order === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;
        const query: any = {};

        if (status) query.status = status;
        if (plan) query.plan = plan;
        if (method) query.method = method;

        // Search by payment ID or order ID
        if (search) {
            query.$or = [
                { razorpayPaymentId: { $regex: search, $options: 'i' } },
                { razorpayOrderId: { $regex: search, $options: 'i' } },
                { receipt: { $regex: search, $options: 'i' } }
            ];
        }

        const total = await Payment.countDocuments(query);
        const payments = await Payment.find(query)
            .populate('userId', 'name email avatar')
            .sort({ [sortBy]: order })
            .skip(skip)
            .limit(limit);

        res.json({
            payments: payments.map(p => ({
                _id: p._id,
                razorpayOrderId: p.razorpayOrderId,
                razorpayPaymentId: p.razorpayPaymentId,
                user: p.userId,
                amount: p.amount / 100,
                currency: p.currency,
                status: p.status,
                plan: p.plan,
                method: p.method,
                bank: p.bank,
                wallet: p.wallet,
                vpa: p.vpa,
                refundAmount: p.refundAmount ? p.refundAmount / 100 : null,
                refundStatus: p.refundStatus,
                refundedAt: p.refundedAt,
                paidAt: p.paidAt,
                createdAt: p.createdAt
            })),
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        logger.error('admin.Get all payments error:', { error: (error as Error)?.message || 'Unknown error' });
        res.status(500).json({ message: 'Failed to fetch payments', error: error.message });
    }
};

/**
 * Get all subscriptions with user details
 */
export const getAllSubscriptions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const plan = req.query.plan as string;
        const sortBy = req.query.sortBy as string || 'createdAt';
        const order = req.query.order === 'asc' ? 1 : -1;

        const skip = (page - 1) * limit;
        const query: any = {};

        if (status) query.status = status;
        if (plan) query.plan = plan;

        const total = await Subscription.countDocuments(query);
        const subscriptions = await Subscription.find(query)
            .populate('userId', 'name email avatar createdAt')
            .sort({ [sortBy]: order })
            .skip(skip)
            .limit(limit);

        res.json({
            subscriptions,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        logger.error('admin.Get all subscriptions error:', { error: (error as Error)?.message || 'Unknown error' });
        res.status(500).json({ message: 'Failed to fetch subscriptions', error: error.message });
    }
};

/**
 * Get cancelled subscriptions that may need refunds
 */
export const getCancelledSubscriptions = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const skip = (page - 1) * limit;

        const total = await Subscription.countDocuments({ status: 'cancelled' });
        const subscriptions = await Subscription.find({ status: 'cancelled' })
            .populate('userId', 'name email avatar')
            .sort({ cancelledAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get related payments for refund calculation
        const subscriptionsWithPayments = await Promise.all(
            subscriptions.map(async (sub) => {
                const lastPayment = await Payment.findOne({
                    userId: sub.userId,
                    status: 'paid',
                    plan: sub.plan
                }).sort({ paidAt: -1 });

                // Calculate refund eligibility
                let refundEligible = false;
                let refundAmount = 0;
                let daysRemaining = 0;

                if (sub.currentPeriodEnd && lastPayment) {
                    const now = new Date();
                    const periodEnd = new Date(sub.currentPeriodEnd);
                    const periodStart = new Date(sub.currentPeriodStart || lastPayment.paidAt || now);
                    
                    if (periodEnd > now) {
                        const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
                        daysRemaining = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        
                        // Prorated refund
                        if (totalDays > 0 && daysRemaining > 0) {
                            refundAmount = (lastPayment.amount / 100) * (daysRemaining / totalDays);
                            refundEligible = daysRemaining >= 7; // Only eligible if 7+ days remaining
                        }
                    }
                }

                return {
                    ...sub.toObject(),
                    lastPayment: lastPayment ? {
                        amount: lastPayment.amount / 100,
                        paidAt: lastPayment.paidAt,
                        razorpayPaymentId: lastPayment.razorpayPaymentId
                    } : null,
                    refundInfo: {
                        eligible: refundEligible,
                        amount: Math.round(refundAmount * 100) / 100,
                        daysRemaining
                    }
                };
            })
        );

        res.json({
            subscriptions: subscriptionsWithPayments,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        logger.error('admin.Get cancelled subscriptions error:', { error: (error as Error)?.message || 'Unknown error' });
        res.status(500).json({ message: 'Failed to fetch cancelled subscriptions', error: error.message });
    }
};

/**
 * Process refund for a payment
 */
export const processRefund = async (req: Request, res: Response) => {
    try {
        const { paymentId } = req.params;
        const { amount, reason } = req.body;

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (payment.status === 'refunded') {
            return res.status(400).json({ message: 'Payment already refunded' });
        }

        if (payment.status !== 'paid') {
            return res.status(400).json({ message: 'Can only refund paid payments' });
        }

        const refundAmount = amount ? amount * 100 : payment.amount; // Convert to paise

        if (refundAmount > payment.amount) {
            return res.status(400).json({ message: 'Refund amount cannot exceed payment amount' });
        }

        // Note: In production, you would call Razorpay API to process refund
        // const razorpay = new Razorpay({ key_id, key_secret });
        // const refund = await razorpay.payments.refund(payment.razorpayPaymentId, { amount: refundAmount });

        // For now, just update the payment record
        payment.status = 'refunded';
        payment.refundAmount = refundAmount;
        payment.refundStatus = 'processed';
        payment.refundedAt = new Date();
        payment.notes = {
            ...payment.notes,
            refundReason: reason,
            refundedBy: (req as any).user.id,
            refundedByAdmin: true
        };
        await payment.save();

        // Optionally downgrade user's subscription
        const subscription = await Subscription.findOne({ userId: payment.userId });
        if (subscription && subscription.plan !== 'free') {
            subscription.plan = 'free';
            subscription.status = 'active';
            subscription.limits = {
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
            };
            await subscription.save();
        }

        res.json({
            success: true,
            message: 'Refund processed successfully',
            refund: {
                paymentId: payment._id,
                originalAmount: payment.amount / 100,
                refundAmount: refundAmount / 100,
                status: 'processed'
            }
        });

    } catch (error: any) {
        logger.error('admin.Process refund error:', { error: (error as Error)?.message || 'Unknown error' });
        res.status(500).json({ message: 'Failed to process refund', error: error.message });
    }
};

/**
 * Get payment details by ID
 */
export const getPaymentDetails = async (req: Request, res: Response) => {
    try {
        const { paymentId } = req.params;

        const payment = await Payment.findById(paymentId)
            .populate('userId', 'name email avatar');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Get user's subscription
        const subscription = await Subscription.findOne({ userId: payment.userId });

        res.json({
            payment: {
                ...payment.toObject(),
                amount: payment.amount / 100,
                refundAmount: payment.refundAmount ? payment.refundAmount / 100 : null
            },
            subscription
        });

    } catch (error: any) {
        logger.error('admin.Get payment details error:', { error: (error as Error)?.message || 'Unknown error' });
        res.status(500).json({ message: 'Failed to fetch payment details', error: error.message });
    }
};

// ==================== PLAN CONFIGURATION MANAGEMENT ====================

/**
 * Get all plan configurations
 */
export const getPlanConfigs = async (req: Request, res: Response) => {
    try {
        const configs = await getAllPlanConfigs();
        res.json({ configs });
    } catch (error: any) {
        logger.error('admin.get_plan_configs_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch plan configurations' });
    }
};

/**
 * Get a single plan configuration
 */
export const getPlanConfigById = async (req: Request, res: Response) => {
    try {
        const { planId } = req.params;
        
        let config: any = await PlanConfig.findOne({ planId }).lean();
        
        // If not in DB, return default
        if (!config) {
            config = DEFAULT_PLAN_CONFIGS[planId as keyof typeof DEFAULT_PLAN_CONFIGS];
            if (!config) {
                return res.status(404).json({ message: 'Plan not found' });
            }
        }

        res.json({ config });
    } catch (error: any) {
        logger.error('admin.get_plan_config_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch plan configuration' });
    }
};

/**
 * Update plan configuration
 */
export const updatePlanConfig = async (req: Request, res: Response) => {
    try {
        const { planId } = req.params;
        const updates = req.body;

        // Validate planId
        if (!['free', 'starter', 'pro', 'enterprise'].includes(planId)) {
            return res.status(400).json({ message: 'Invalid plan ID' });
        }

        // Find or create the config
        let config = await PlanConfig.findOne({ planId });
        
        if (!config) {
            // Create from defaults
            const defaults = DEFAULT_PLAN_CONFIGS[planId as keyof typeof DEFAULT_PLAN_CONFIGS];
            config = new PlanConfig({ ...defaults, planId });
        }

        // Update fields
        if (updates.name) config.name = updates.name;
        if (updates.description) config.description = updates.description;
        if (updates.price !== undefined) config.price = updates.price;
        if (updates.isActive !== undefined) config.isActive = updates.isActive;
        if (updates.badge !== undefined) config.badge = updates.badge;
        if (updates.themeColor) config.themeColor = updates.themeColor;
        if (updates.displayOrder !== undefined) config.displayOrder = updates.displayOrder;
        if (updates.razorpayPlanId) config.razorpayPlanId = updates.razorpayPlanId;

        // Update limits
        if (updates.limits) {
            config.limits = { ...config.limits, ...updates.limits };
        }

        // Update features
        if (updates.features) {
            config.features = { ...config.features, ...updates.features };
        }

        await config.save();

        // Clear cache so changes take effect immediately
        clearPlanConfigCache();

        // Log the change
        logger.info('admin.plan_config_updated', { 
            planId, 
            updatedBy: (req as any).userId,
            changes: Object.keys(updates)
        });

        res.json({ 
            message: 'Plan configuration updated successfully',
            config 
        });
    } catch (error: any) {
        logger.error('admin.update_plan_config_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to update plan configuration' });
    }
};

/**
 * Reset plan configuration to defaults
 */
export const resetPlanConfig = async (req: Request, res: Response) => {
    try {
        const { planId } = req.params;

        // Validate planId
        if (!['free', 'starter', 'pro', 'enterprise'].includes(planId)) {
            return res.status(400).json({ message: 'Invalid plan ID' });
        }

        const defaults = DEFAULT_PLAN_CONFIGS[planId as keyof typeof DEFAULT_PLAN_CONFIGS];
        
        await PlanConfig.findOneAndUpdate(
            { planId },
            { ...defaults },
            { upsert: true, new: true }
        );

        // Clear cache
        clearPlanConfigCache();

        logger.info('admin.plan_config_reset', { 
            planId, 
            resetBy: (req as any).userId 
        });

        res.json({ 
            message: 'Plan configuration reset to defaults',
            config: defaults 
        });
    } catch (error: any) {
        logger.error('admin.reset_plan_config_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to reset plan configuration' });
    }
};

/**
 * Get usage statistics for all plans
 */
export const getPlanUsageStats = async (req: Request, res: Response) => {
    try {
        // Get subscription counts by plan
        const planStats = await Subscription.aggregate([
            {
                $group: {
                    _id: '$plan',
                    count: { $sum: 1 },
                    activeCount: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    }
                }
            }
        ]);

        // Get revenue by plan
        const revenueByPlan = await Payment.aggregate([
            { $match: { status: 'captured' } },
            {
                $group: {
                    _id: '$plan',
                    totalRevenue: { $sum: '$amount' },
                    paymentCount: { $sum: 1 }
                }
            }
        ]);

        // Get event creation stats by plan
        const eventStats = await Event.aggregate([
            {
                $lookup: {
                    from: 'subscriptions',
                    localField: 'createdBy',
                    foreignField: 'userId',
                    as: 'subscription'
                }
            },
            { $unwind: { path: '$subscription', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$subscription.plan', 'free'] },
                    eventCount: { $sum: 1 },
                    avgAttendeesPerEvent: { $avg: '$attendeeCount' }
                }
            }
        ]);

        res.json({
            subscriptionStats: planStats,
            revenueByPlan: revenueByPlan.map(r => ({
                ...r,
                totalRevenue: r.totalRevenue / 100 // Convert from paise to rupees
            })),
            eventStats
        });
    } catch (error: any) {
        logger.error('admin.get_plan_usage_stats_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch plan usage statistics' });
    }
};

/**
 * Get a user's plan summary (for admin to view)
 */
export const getUserPlanDetails = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const summary = await getUserPlanSummary(userId);
        
        // Also get the subscription record
        const subscription = await Subscription.findOne({ userId }).lean();

        res.json({
            ...summary,
            subscription
        });
    } catch (error: any) {
        logger.error('admin.get_user_plan_details_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch user plan details' });
    }
};

/**
 * Manually set a user's plan (admin override)
 */
export const setUserPlan = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { plan, reason } = req.body;

        // Validate plan
        if (!['free', 'starter', 'pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ message: 'Invalid plan' });
        }

        // Get plan config for limits
        const planConfig = await PlanConfig.findOne({ planId: plan }).lean() 
            || DEFAULT_PLAN_CONFIGS[plan as keyof typeof DEFAULT_PLAN_CONFIGS];

        // Update or create subscription
        const subscription = await Subscription.findOneAndUpdate(
            { userId },
            {
                plan,
                status: 'active',
                limits: planConfig.limits,
                // Set period for 1 year for manual assignments
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                $unset: { cancelledAt: 1, cancelReason: 1 }
            },
            { upsert: true, new: true }
        );

        // Log the admin action
        logger.info('admin.user_plan_set', {
            userId,
            newPlan: plan,
            setBy: (req as any).userId,
            reason
        });

        res.json({
            message: `User plan updated to ${plan}`,
            subscription
        });
    } catch (error: any) {
        logger.error('admin.set_user_plan_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to update user plan' });
    }
};

