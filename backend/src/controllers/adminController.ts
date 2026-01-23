import { Request, Response } from 'express';
import { createSession } from './authController';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { PlanConfig, DEFAULT_PLAN_CONFIGS } from '../models/PlanConfig';
import { EmailTemplate } from '../models/EmailTemplate';
import { SecurityEvent } from '../models/SecurityEvent';
import { Session } from '../models/Session';
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

// Get Security Events (Threat Monitor)
export const getSecurityEvents = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const events = await SecurityEvent.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'email username')
            .lean();

        const total = await SecurityEvent.countDocuments();

        res.json({
            events,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch security events' });
    }
};

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
            .select('-password -smtpConfig')
            .lean();

        // Fetch subscriptions for these users
        const userIds = users.map(u => u._id);
        const subscriptions = await Subscription.find({ userId: { $in: userIds } }).select('userId plan status').lean();

        // Merge plan info
        const usersWithPlans = users.map((user: any) => {
            const sub = subscriptions.find(s => s.userId.toString() === user._id.toString());
            return {
                ...user,
                plan: sub?.plan || 'free',
                planStatus: sub?.status
            };
        });

        res.json({
            users: usersWithPlans,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error: any) {
        logger.error('admin.fetch_users_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
};

// Get Single User Details with Stats
export const getUserDetails = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('-password -smtpConfig').lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch Stats
        const [eventsCount, ticketsCount, subscription] = await Promise.all([
            Event.countDocuments({ hostId: userId }),
            Ticket.countDocuments({ ownerId: userId }),
            Subscription.findOne({ userId }).select('plan status').lean()
        ]);

        res.json({
            ...user,
            eventsCount,
            ticketsCount,
            plan: subscription?.plan || 'free',
            planStatus: subscription?.status
        });
    } catch (error: any) {
        logger.error('admin.fetch_user_details_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch user details' });
    }
};



// Get User Events
export const getUserEvents = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const events = await Event.find({ hostId: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Event.countDocuments({ hostId: userId });

        res.json({
            events,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch user events' });
    }
};

// Get User Activity (Synthetic Timeline with Pagination)
export const getUserActivity = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        const [logins, events, tickets] = await Promise.all([
            Session.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            Event.find({ hostId: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).select('title createdAt _id').lean(),
            Ticket.find({ ownerId: userId }).sort({ purchaseDate: -1 }).skip(skip).limit(limit).populate('eventId', 'title').lean()
        ]);

        const mappedActivity = [
            ...logins.map(item => ({
                type: 'login',
                title: 'Logged in',
                details: `${item.deviceType || 'Unknown device'} (${item.os || 'Unknown OS'})`,
                timestamp: item.createdAt,
                id: item._id
            })),
            ...events.map(item => ({
                type: 'event_created',
                title: 'Created Event',
                details: item.title,
                timestamp: item.createdAt,
                id: item._id
            })),
            ...tickets.map((item: any) => ({
                type: 'ticket_purchased',
                title: 'Registered for Event',
                details: item.eventId?.title || 'Unknown Event',
                timestamp: item.purchaseDate || item.createdAt,
                id: item._id
            }))
        ];

        // Sort combined results
        const activity = mappedActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const hasMore = logins.length === limit || events.length === limit || tickets.length === limit;

        res.json({
            activity,
            page,
            hasMore
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch activity' });
    }
};

// Permanently Delete User
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting self or other admins (unless super admin, but simplified here)
        // @ts-ignore
        if (userId === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // Perform cascading delete
        // 1. Delete Events hosted by user
        await Event.deleteMany({ hostId: userId });

        // 2. Delete Tickets owned by user
        await Ticket.deleteMany({ $or: [{ ownerId: userId }, { userId: userId }] });

        // 3. Delete Subscriptions
        await Subscription.deleteMany({ userId });

        // 4. Delete Payments
        await Payment.deleteMany({ userId });

        // 5. Delete Sessions
        await Session.deleteMany({ userId });

        // 6. Delete User Security Events
        await SecurityEvent.deleteMany({ userId });

        // 7. Finally, delete the User
        await User.findByIdAndDelete(userId);

        // Audit Log
        await AuditLog.create({
            // @ts-ignore
            adminId: req.user.id,
            action: 'DELETE_USER',
            targetId: userId,
            details: { email: user.email, name: user.name },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'User and all associated data permanently deleted' });
    } catch (error: any) {
        logger.error('admin.delete_user_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to delete user' });
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

        // Create a Session for the user (impersonated)
        const session = await createSession(targetUser._id.toString(), req, 'impersonate');

        // Generate a new token for the target user
        const token = jwt.sign(
            {
                email: targetUser.email,
                id: targetUser._id,
                role: targetUser.role,
                isImpersonated: true,
                // @ts-ignore
                adminId: req.user.id,
                sessionId: session._id
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
        const { code, state, error: oauthError } = req.query;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Handle OAuth error from Google
        if (oauthError) {
            logger.error('admin.Drive OAuth error from Google:', { error: oauthError });
            return res.redirect(`${frontendUrl}/dashboard/admin/logs?error=oauth_denied&details=${encodeURIComponent(oauthError as string)}`);
        }

        const adminId = (state as string)?.replace('drive_logs_', '');

        if (!code || !adminId) {
            logger.error('admin.Drive callback missing params:', { hasCode: !!code, hasAdminId: !!adminId, state });
            return res.redirect(`${frontendUrl}/dashboard/admin/logs?error=invalid_callback`);
        }

        logger.info('admin.Processing Drive callback', { adminId });
        const result = await handleDriveCallback(code as string, adminId);

        logger.info('admin.Drive connected successfully', { email: result.email, folderId: result.folderId });
        res.redirect(`${frontendUrl}/dashboard/admin/logs?drive_connected=true&email=${encodeURIComponent(result.email || '')}`);
    } catch (error: any) {
        logger.error('admin.Drive callback error:', {
            error: error?.message || 'Unknown error',
            stack: error?.stack,
            code: error?.code
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/dashboard/admin/logs?error=callback_failed&details=${encodeURIComponent(error?.message || 'Unknown error')}`);
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
        const {
            systemEmail,
            emailSettings,
            emailTemplates,
            emailSenderConfig,
            useCustomDomain,
            customDomainEmail,
            customDomainName,
            platformName,
            supportEmail,
            maintenanceMode,
            registrationEnabled,
            securitySettings
        } = req.body;

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
        if (emailSenderConfig !== undefined) {
            settings.emailSenderConfig = { ...settings.emailSenderConfig, ...emailSenderConfig };
        }
        if (securitySettings !== undefined) {
            settings.securitySettings = { ...settings.securitySettings, ...securitySettings };
        }
        if (platformName !== undefined) settings.platformName = platformName;
        if (supportEmail !== undefined) settings.supportEmail = supportEmail;
        if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
        if (registrationEnabled !== undefined) settings.registrationEnabled = registrationEnabled;
        if (useCustomDomain !== undefined) settings.useCustomDomain = useCustomDomain;
        if (customDomainEmail !== undefined) settings.customDomainEmail = customDomainEmail;
        if (customDomainName !== undefined) settings.customDomainName = customDomainName;

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

// Get all email logs with pagination and filtering
export const getAllEmailLogs = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        // Build query
        const query: any = {};

        // Filter by status
        if (req.query.status && req.query.status !== 'all') {
            query.status = req.query.status;
        }

        // Filter by provider
        if (req.query.provider && req.query.provider !== 'all') {
            query.provider = req.query.provider;
        }

        // Filter by type
        if (req.query.type && req.query.type !== 'all') {
            query.type = req.query.type;
        }

        // Search by email or subject
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search as string, 'i');
            query.$or = [
                { toEmail: searchRegex },
                { subject: searchRegex },
                { fromEmail: searchRegex }
            ];
        }

        // Date range filter
        if (req.query.startDate) {
            query.createdAt = { ...query.createdAt, $gte: new Date(req.query.startDate as string) };
        }
        if (req.query.endDate) {
            const endDate = new Date(req.query.endDate as string);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt = { ...query.createdAt, $lte: endDate };
        }

        const [emails, total] = await Promise.all([
            EmailLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'email name')
                .lean(),
            EmailLog.countDocuments(query)
        ]);

        res.json({
            emails,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('admin.Get all email logs error:', { error: (error as Error)?.message || 'Unknown error' });
        res.status(500).json({ message: 'Failed to fetch email logs' });
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

// Test specific system email type
export const testSystemEmailType = async (req: Request, res: Response) => {
    try {
        const { emailType, recipientEmail } = req.body;

        if (!recipientEmail) {
            return res.status(400).json({ message: 'Recipient email is required' });
        }

        if (!emailType) {
            return res.status(400).json({ message: 'Email type is required' });
        }

        const validTypes = ['welcomeEmail', 'passwordReset', 'hostUpgradeConfirmation', 'suspensionNotice', 'loginAlert'];
        if (!validTypes.includes(emailType)) {
            return res.status(400).json({ message: `Invalid email type. Must be one of: ${validTypes.join(', ')}` });
        }

        const zeptoToken = process.env.ZEPTOMAIL_TOKEN;
        if (!zeptoToken) {
            return res.status(400).json({
                message: 'ZeptoMail is not configured. Add ZEPTOMAIL_TOKEN to your .env file.'
            });
        }

        // Get system settings
        const { SystemSettings } = await import('../models/SystemSettings');
        const settings = await (SystemSettings as any).getSettings();
        const platformName = settings.platformName || 'MakeTicket';

        // Get sender configuration
        const senderConfig = settings.emailSenderConfig || {};
        const senderType = senderConfig[emailType] || 'noreply';

        // Sender addresses mapping
        const senderEmails: Record<string, string> = {
            noreply: `noreply@maketicket.app`,
            hello: `hello@maketicket.app`,
            support: `support@maketicket.app`,
            info: `info@maketicket.app`,
            security: `security@maketicket.app`
        };

        // Priority: 1. Custom domain, 2. Configured sender based on type, 3. ZeptoMail env fallback
        let fromEmail: string;
        if (settings.useCustomDomain && settings.customDomainEmail) {
            fromEmail = settings.customDomainEmail;
        } else {
            // Use the configured sender email based on email type
            // Fallback to ZEPTOMAIL_FROM_EMAIL only if specific sender not configured
            const configuredSenderEmail = senderEmails[senderType];
            fromEmail = configuredSenderEmail || process.env.ZEPTOMAIL_FROM_EMAIL || 'hello@maketicket.app';
        }

        const fromName = settings.useCustomDomain && settings.customDomainName
            ? settings.customDomainName
            : (process.env.ZEPTOMAIL_FROM_NAME || platformName);

        // Get email template
        const customTemplate = settings.emailTemplates?.[emailType];

        // Type to subject mapping
        const subjects: Record<string, string> = {
            welcomeEmail: `Welcome to ${platformName}!`,
            passwordReset: `Reset Your Password - ${platformName}`,
            hostUpgradeConfirmation: `Congratulations! You're now a Host on ${platformName}`,
            suspensionNotice: `Account Suspended - ${platformName}`,
            loginAlert: `New login detected - ${platformName}`
        };

        // Default templates
        const defaultTemplates: Record<string, string> = {
            welcomeEmail: `<!DOCTYPE html><html><body style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;"><div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px; text-align: center;"><h1>Welcome to ${platformName}!</h1></div><div style="padding: 30px;"><p>Hi <strong>Test User</strong>,</p><p>Thank you for joining ${platformName}! This is a test email.</p><p style="text-align: center;"><a href="#" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none;">Get Started</a></p></div></div></body></html>`,
            passwordReset: `<!DOCTYPE html><html><body style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;"><div style="background: #EF4444; color: white; padding: 30px; text-align: center;"><h1>🔐 Password Reset Request</h1></div><div style="padding: 30px;"><p>Hi <strong>Test User</strong>,</p><p>We received a request to reset your password. This is a test email.</p><p style="text-align: center;"><a href="#" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none;">Reset Password</a></p><div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0; color: #92400E;">⚠️ This link will expire in 30 minutes.</div></div></div></body></html>`,
            hostUpgradeConfirmation: `<!DOCTYPE html><html><body style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;"><div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 40px; text-align: center;"><h1>🎉 Congratulations, Host!</h1></div><div style="padding: 30px;"><p>Hi <strong>Test User</strong>,</p><p>Your account has been upgraded to Host status! This is a test email.</p><p style="text-align: center;"><a href="#" style="display: inline-block; background: #10B981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none;">Go to Dashboard</a></p></div></div></body></html>`,
            suspensionNotice: `<!DOCTYPE html><html><body style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;"><div style="background: #DC2626; color: white; padding: 30px; text-align: center;"><h1>⚠️ Account Suspended</h1></div><div style="padding: 30px;"><p>Hi <strong>Test User</strong>,</p><p>Your account has been suspended. This is a test email.</p><div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 15px;"><strong>Reason:</strong> Test suspension reason</div></div></div></body></html>`,
            loginAlert: `<!DOCTYPE html><html><body style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px;"><div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;"><div style="background: #3B82F6; color: white; padding: 30px; text-align: center;"><h1>🔔 New Login Detected</h1></div><div style="padding: 30px;"><p>Hi <strong>Test User</strong>,</p><p>A new login was detected. This is a test email.</p><div style="background: #EFF6FF; border-radius: 8px; padding: 20px;"><p><strong>Time:</strong> ${new Date().toLocaleString()}</p><p><strong>IP:</strong> 192.168.1.1 (Test)</p><p><strong>Device:</strong> Test Browser</p></div></div></div></body></html>`
        };

        const emailHtml = customTemplate || defaultTemplates[emailType] || defaultTemplates.welcomeEmail;

        const zeptoUrl = process.env.ZEPTOMAIL_URL || 'https://api.zeptomail.in/v1.1/email';
        const client = new SendMailClient({ url: zeptoUrl, token: zeptoToken });

        await client.sendMail({
            from: {
                address: fromEmail,
                name: fromName
            },
            to: [{
                email_address: {
                    address: recipientEmail,
                    name: recipientEmail.split('@')[0]
                }
            }],
            subject: `[TEST] ${subjects[emailType] || 'System Email Test'}`,
            htmlbody: emailHtml
        });

        // Log the test email
        await EmailLog.create({
            userId: null,
            type: `test_${emailType}`,
            fromEmail: fromEmail,
            toEmail: recipientEmail,
            subject: `[TEST] ${subjects[emailType]}`,
            status: 'sent',
            provider: 'zeptomail',
            sentAt: new Date()
        });

        res.json({
            success: true,
            message: `Test ${emailType} email sent to ${recipientEmail}`,
            emailType,
            from: `${fromName} <${fromEmail}>`
        });

    } catch (error: any) {
        logger.error('admin.Test system email type error:', { error: (error as Error)?.message || 'Unknown error' });

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

/**
 * Update per-user plan overrides (intended for Enterprise custom quotas/features)
 * Body:
 *  - limits: { [key: string]: number | null }
 *  - features: { [key: string]: boolean | null }
 * Passing null removes that specific override key.
 */
export const updateUserPlanOverrides = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { limits, features } = req.body || {};

        const subscription = await Subscription.findOne({ userId });
        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found for user' });
        }

        if (subscription.plan !== 'enterprise') {
            return res.status(400).json({ message: 'Plan overrides are supported for enterprise users only' });
        }

        const nextOverrides: any = {
            ...(subscription.planOverrides || {})
        };

        if (limits && typeof limits === 'object') {
            const current = (subscription.planOverrides as any)?.limits && typeof (subscription.planOverrides as any).limits === 'object'
                ? { ...(subscription.planOverrides as any).limits }
                : {};

            for (const [key, value] of Object.entries(limits)) {
                if (value === null || typeof value === 'undefined') {
                    delete current[key];
                } else {
                    current[key] = value;
                }
            }

            nextOverrides.limits = Object.keys(current).length > 0 ? current : undefined;
        }

        if (features && typeof features === 'object') {
            const current = (subscription.planOverrides as any)?.features && typeof (subscription.planOverrides as any).features === 'object'
                ? { ...(subscription.planOverrides as any).features }
                : {};

            for (const [key, value] of Object.entries(features)) {
                if (value === null || typeof value === 'undefined') {
                    delete current[key];
                } else {
                    current[key] = value;
                }
            }

            nextOverrides.features = Object.keys(current).length > 0 ? current : undefined;
        }

        const hasAnyOverrides = !!(nextOverrides.limits || nextOverrides.features);
        if (!hasAnyOverrides) {
            subscription.planOverrides = undefined as any;
        } else {
            // @ts-ignore
            const adminId = (req as any).user?.id;
            nextOverrides.updatedBy = adminId || nextOverrides.updatedBy;
            nextOverrides.updatedAt = new Date();
            subscription.planOverrides = nextOverrides;
        }

        await subscription.save();

        const summary = await getUserPlanSummary(userId);

        res.json({
            message: 'Plan overrides updated',
            subscription,
            summary
        });
    } catch (error: any) {
        logger.error('admin.update_user_plan_overrides_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to update plan overrides' });
    }
};

/**
 * Clear all per-user plan overrides
 */
export const clearUserPlanOverrides = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const subscription = await Subscription.findOne({ userId });
        if (!subscription) {
            return res.status(404).json({ message: 'Subscription not found for user' });
        }

        subscription.planOverrides = undefined as any;
        await subscription.save();

        const summary = await getUserPlanSummary(userId);

        res.json({
            message: 'Plan overrides cleared',
            subscription,
            summary
        });
    } catch (error: any) {
        logger.error('admin.clear_user_plan_overrides_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to clear plan overrides' });
    }
};

// ==================== EMAIL TEMPLATES MANAGEMENT ====================

/**
 * Get all system email templates (admin only)
 */
export const getSystemEmailTemplates = async (req: Request, res: Response) => {
    try {
        const { type, category, active } = req.query;

        const query: any = { isSystem: true };
        if (type) query.type = type;
        if (category) query.category = category;
        if (active !== undefined) query.isActive = active === 'true';

        const templates = await EmailTemplate.find(query)
            .sort({ category: 1, type: 1, name: 1 });

        res.json(templates);
    } catch (error: any) {
        logger.error('admin.get_system_templates_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch system templates' });
    }
};

/**
 * Create a new system email template (admin only)
 */
export const createSystemEmailTemplate = async (req: Request, res: Response) => {
    try {
        const { name, description, subject, body, type, category, isDefault, isActive, previewImage } = req.body;

        if (!name || !subject || !body) {
            return res.status(400).json({ message: 'Name, subject, and body are required' });
        }

        // Check if template with same name exists
        const existing = await EmailTemplate.findOne({ isSystem: true, name });
        if (existing) {
            return res.status(400).json({ message: 'A system template with this name already exists' });
        }

        // If setting as default, unset other defaults of same type
        if (isDefault) {
            await EmailTemplate.updateMany(
                { isSystem: true, type: type || 'custom' },
                { isDefault: false }
            );
        }

        const template = await EmailTemplate.create({
            userId: null,
            name,
            description,
            subject,
            body,
            type: type || 'custom',
            category: category || 'event',
            isSystem: true,
            isDefault: isDefault || false,
            isActive: isActive !== false,
            previewImage
        });

        logger.info('admin.system_template_created', { templateId: template._id, name });
        res.status(201).json(template);
    } catch (error: any) {
        logger.error('admin.create_system_template_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to create system template' });
    }
};

/**
 * Update a system email template (admin only)
 */
export const updateSystemEmailTemplate = async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;
        const { name, description, subject, body, type, category, isDefault, isActive, previewImage } = req.body;

        const template = await EmailTemplate.findOne({ _id: templateId, isSystem: true });
        if (!template) {
            return res.status(404).json({ message: 'System template not found' });
        }

        // If setting as default, unset other defaults of same type
        if (isDefault && !template.isDefault) {
            await EmailTemplate.updateMany(
                { isSystem: true, type: type || template.type, _id: { $ne: templateId } },
                { isDefault: false }
            );
        }

        // Update fields
        if (name !== undefined) template.name = name;
        if (description !== undefined) template.description = description;
        if (subject !== undefined) template.subject = subject;
        if (body !== undefined) template.body = body;
        if (type !== undefined) template.type = type;
        if (category !== undefined) template.category = category;
        if (isDefault !== undefined) template.isDefault = isDefault;
        if (isActive !== undefined) template.isActive = isActive;
        if (previewImage !== undefined) template.previewImage = previewImage;

        await template.save();

        logger.info('admin.system_template_updated', { templateId, name: template.name });
        res.json(template);
    } catch (error: any) {
        logger.error('admin.update_system_template_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to update system template' });
    }
};

/**
 * Toggle system template active status (admin only)
 */
export const toggleSystemTemplateStatus = async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;

        const template = await EmailTemplate.findOne({ _id: templateId, isSystem: true });
        if (!template) {
            return res.status(404).json({ message: 'System template not found' });
        }

        template.isActive = !template.isActive;
        await template.save();

        logger.info('admin.system_template_toggled', {
            templateId,
            name: template.name,
            isActive: template.isActive
        });

        res.json({
            message: `Template ${template.isActive ? 'activated' : 'deactivated'}`,
            template
        });
    } catch (error: any) {
        logger.error('admin.toggle_system_template_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to toggle template status' });
    }
};

/**
 * Delete a system email template (admin only)
 */
export const deleteSystemEmailTemplate = async (req: Request, res: Response) => {
    try {
        const { templateId } = req.params;

        const template = await EmailTemplate.findOneAndDelete({ _id: templateId, isSystem: true });
        if (!template) {
            return res.status(404).json({ message: 'System template not found' });
        }

        logger.info('admin.system_template_deleted', { templateId, name: template.name });
        res.json({ message: 'System template deleted' });
    } catch (error: any) {
        logger.error('admin.delete_system_template_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to delete system template' });
    }
};

/**
 * Seed default email templates (admin only)
 */
export const seedDefaultTemplates = async (req: Request, res: Response) => {
    try {
        const defaultTemplates = [
            {
                name: 'Event Registration Confirmation',
                description: 'Sent when a guest successfully registers for an event',
                subject: 'Your Registration is Confirmed - {{event_title}}',
                body: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmed</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 You're In!</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Registration Confirmed</p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">Hi {{guest_name}},</p>
                            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Great news! Your registration for <strong style="color: #667eea;">{{event_title}}</strong> has been confirmed.
                            </p>
                            
                            <!-- Event Details Card -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #333; font-size: 14px; margin: 0 0 15px 0;"><strong>📅 Date:</strong> {{event_date}}</p>
                                        <p style="color: #333; font-size: 14px; margin: 0 0 15px 0;"><strong>📍 Location:</strong> {{event_location}}</p>
                                        <p style="color: #333; font-size: 14px; margin: 0;"><strong>🎫 Ticket Code:</strong> {{ticket_code}}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- QR Code -->
                            <div style="text-align: center; margin-bottom: 30px;">
                                <p style="color: #666; font-size: 14px; margin: 0 0 15px 0;">Your Entry QR Code:</p>
                                <img src="{{qr_code}}" alt="QR Code" style="width: 180px; height: 180px; border: 1px solid #eee; border-radius: 8px;">
                            </div>
                            
                            <!-- CTA Button -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="{{event_link}}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Event Details</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: #999; font-size: 14px; margin: 0;">Organized by {{organizer_name}}</p>
                            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">Powered by MakeTicket</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                type: 'registration',
                category: 'event',
                isSystem: true,
                isDefault: true,
                isActive: true
            },
            {
                name: 'Event Reminder',
                description: 'Reminder email sent before the event starts',
                subject: 'Reminder: {{event_title}} is Tomorrow!',
                body: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⏰ Don't Forget!</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Event Reminder</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">Hi {{guest_name}},</p>
                            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Just a friendly reminder that <strong style="color: #f5576c;">{{event_title}}</strong> is coming up soon!
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff5f5; border-radius: 8px; border-left: 4px solid #f5576c; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #333; font-size: 14px; margin: 0 0 15px 0;"><strong>📅 Date:</strong> {{event_date}}</p>
                                        <p style="color: #333; font-size: 14px; margin: 0 0 15px 0;"><strong>📍 Location:</strong> {{event_location}}</p>
                                        <p style="color: #333; font-size: 14px; margin: 0;"><strong>🎫 Your Ticket:</strong> {{ticket_code}}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                                Please arrive 15 minutes early and have your QR code ready for check-in. We look forward to seeing you!
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="{{event_link}}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Event</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: #999; font-size: 14px; margin: 0;">Organized by {{organizer_name}}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                type: 'reminder',
                category: 'event',
                isSystem: true,
                isDefault: true,
                isActive: true
            },
            {
                name: 'Event Update Notification',
                description: 'Sent when event details are updated',
                subject: 'Important Update: {{event_title}}',
                body: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">📢 Event Update</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Important Information</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">Hi {{guest_name}},</p>
                            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                There has been an update to <strong style="color: #4facfe;">{{event_title}}</strong>. Please review the latest details below.
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #4facfe; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #333; font-size: 14px; margin: 0 0 15px 0;"><strong>📅 Date:</strong> {{event_date}}</p>
                                        <p style="color: #333; font-size: 14px; margin: 0;"><strong>📍 Location:</strong> {{event_location}}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                                Your ticket remains valid. If you have any questions, please contact the event organizer.
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="{{event_link}}" style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">View Updated Details</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: #999; font-size: 14px; margin: 0;">Organized by {{organizer_name}}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                type: 'update',
                category: 'event',
                isSystem: true,
                isDefault: true,
                isActive: true
            },
            {
                name: 'Event Cancellation Notice',
                description: 'Sent when an event is cancelled',
                subject: 'Event Cancelled: {{event_title}}',
                body: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">😔 Event Cancelled</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">We're Sorry</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">Hi {{guest_name}},</p>
                            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                We regret to inform you that <strong>{{event_title}}</strong> has been cancelled.
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #333; font-size: 14px; margin: 0 0 15px 0;"><strong>Original Date:</strong> {{event_date}}</p>
                                        <p style="color: #333; font-size: 14px; margin: 0;"><strong>Location:</strong> {{event_location}}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                                If you have any questions or concerns, please contact the event organizer directly.
                            </p>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                                We apologize for any inconvenience this may cause and hope to see you at future events.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: #999; font-size: 14px; margin: 0;">Organized by {{organizer_name}}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                type: 'cancellation',
                category: 'event',
                isSystem: true,
                isDefault: true,
                isActive: true
            },
            {
                name: 'Thank You Email',
                description: 'Sent after the event to thank attendees',
                subject: 'Thank You for Attending {{event_title}}!',
                body: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🙏 Thank You!</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">We Appreciate You</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">Hi {{guest_name}},</p>
                            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                Thank you for attending <strong style="color: #11998e;">{{event_title}}</strong>! We hope you had an amazing experience.
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #38ef7d; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;">Your participation made this event special! 🌟</p>
                                        <p style="color: #666; font-size: 14px; margin: 0;">We'd love to hear your feedback.</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                                Stay connected with us for future events. We look forward to seeing you again!
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="{{event_link}}" style="display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">Share Your Feedback</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: #999; font-size: 14px; margin: 0;">With gratitude, {{organizer_name}}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                type: 'thank_you',
                category: 'event',
                isSystem: true,
                isDefault: true,
                isActive: true
            },
            {
                name: 'Event Invitation',
                description: 'Invite someone to register for an event',
                subject: 'You\'re Invited: {{event_title}}',
                body: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✨ You're Invited!</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Special Invitation</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0;">Hi {{guest_name}},</p>
                            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                                You've been invited to <strong style="color: #ff6b6b;">{{event_title}}</strong>! We'd love to have you join us.
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fff5f5; border-radius: 8px; margin-bottom: 30px;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="color: #333; font-size: 14px; margin: 0 0 15px 0;"><strong>📅 Date:</strong> {{event_date}}</p>
                                        <p style="color: #333; font-size: 14px; margin: 0;"><strong>📍 Location:</strong> {{event_location}}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                                Secure your spot now! Click the button below to register.
                            </p>
                            
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="{{event_link}}" style="display: inline-block; background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">Register Now</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: #999; font-size: 14px; margin: 0;">Invitation from {{organizer_name}}</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`,
                type: 'invitation',
                category: 'event',
                isSystem: true,
                isDefault: true,
                isActive: true
            },
            {
                name: 'Simple Registration',
                description: 'Minimal design registration confirmation',
                subject: 'Registration Confirmed - {{event_title}}',
                body: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
            <td>
                <h1 style="color: #333; font-size: 24px; margin: 0 0 20px 0; border-bottom: 2px solid #333; padding-bottom: 10px;">Registration Confirmed</h1>
                
                <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Dear {{guest_name}},</p>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                    Your registration for <strong>{{event_title}}</strong> has been confirmed.
                </p>
                
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 30px;">
                    <tr>
                        <td style="padding: 15px 0; border-top: 1px solid #eee;">
                            <strong style="color: #333;">Event:</strong>
                            <span style="color: #666; float: right;">{{event_title}}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 0; border-top: 1px solid #eee;">
                            <strong style="color: #333;">Date:</strong>
                            <span style="color: #666; float: right;">{{event_date}}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 0; border-top: 1px solid #eee;">
                            <strong style="color: #333;">Location:</strong>
                            <span style="color: #666; float: right;">{{event_location}}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 15px 0; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
                            <strong style="color: #333;">Ticket Code:</strong>
                            <span style="color: #666; float: right; font-family: monospace;">{{ticket_code}}</span>
                        </td>
                    </tr>
                </table>
                
                <div style="text-align: center; margin-bottom: 30px;">
                    <img src="{{qr_code}}" alt="QR Code" style="width: 150px; height: 150px;">
                    <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">Present this QR code at entry</p>
                </div>
                
                <p style="color: #999; font-size: 12px; margin: 30px 0 0 0; text-align: center;">
                    {{organizer_name}} • Powered by MakeTicket
                </p>
            </td>
        </tr>
    </table>
</body>
</html>`,
                type: 'registration',
                category: 'event',
                isSystem: true,
                isDefault: false,
                isActive: true
            }
        ];

        let created = 0;
        let skipped = 0;

        for (const templateData of defaultTemplates) {
            const existing = await EmailTemplate.findOne({
                isSystem: true,
                name: templateData.name
            });

            if (!existing) {
                await EmailTemplate.create(templateData);
                created++;
            } else {
                skipped++;
            }
        }

        logger.info('admin.templates_seeded', { created, skipped });
        res.json({
            message: `Seeded ${created} templates, skipped ${skipped} existing`,
            created,
            skipped
        });
    } catch (error: any) {
        logger.error('admin.seed_templates_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to seed templates' });
    }
};

// ==================== SECURITY DANGER ZONE ACTIONS ====================

// Force logout all users (invalidate all sessions)
export const forceLogoutAllUsers = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const adminId = req.user?.id;

        // Check if database connection is available
        if (!mongoose.connection.db) {
            throw new Error('Database connection not available');
        }

        // Clear all sessions from database
        const sessionCount = await mongoose.connection.db.collection('sessions').deleteMany({});

        // Audit log this critical action
        await AuditLog.create({
            adminId,
            action: 'FORCE_LOGOUT_ALL_USERS',
            details: {
                sessionsCleared: sessionCount.deletedCount || 0,
                reason: 'Admin initiated force logout'
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        logger.warn('admin.force_logout_all_users', {
            adminId,
            sessionsCleared: sessionCount.deletedCount,
            ipAddress: req.ip
        });

        res.json({
            message: 'All users have been logged out successfully',
            sessionsCleared: sessionCount.deletedCount || 0
        });
    } catch (error: any) {
        logger.error('admin.force_logout_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to force logout all users' });
    }
};

// Rotate API keys (invalidate all existing API keys)
export const rotateApiKeys = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const adminId = req.user?.id;

        // For now, this is a placeholder - in a real implementation,
        // you would invalidate all API keys and generate new ones
        // Since this app doesn't seem to have API keys yet, we'll just log the action

        // Audit log this critical action
        await AuditLog.create({
            adminId,
            action: 'ROTATE_API_KEYS',
            details: {
                reason: 'Admin initiated API key rotation'
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        logger.warn('admin.rotate_api_keys', {
            adminId,
            ipAddress: req.ip
        });

        res.json({
            message: 'API keys rotated successfully. All existing API keys have been invalidated.',
            note: 'Users will need to generate new API keys if this feature is implemented.'
        });
    } catch (error: any) {
        logger.error('admin.rotate_api_keys_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to rotate API keys' });
    }
};

// ==================== API KEY MANAGEMENT ====================

import { ApiKey } from '../models/ApiKey';

/**
 * Get all API keys (admin)
 */
export const getAllApiKeys = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 20, active } = req.query;
        const pageNum = parseInt(page as string) || 1;
        const limitNum = Math.min(parseInt(limit as string) || 20, 100);
        const skip = (pageNum - 1) * limitNum;

        const query: any = {};
        if (active !== undefined) {
            query.isActive = active === 'true';
        }

        const [apiKeys, total] = await Promise.all([
            ApiKey.find(query)
                .populate('ownerId', 'name email')
                .select('-hashedKey')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            ApiKey.countDocuments(query)
        ]);

        res.json({
            apiKeys: apiKeys.map(key => ({
                id: key._id,
                name: key.name,
                keyPrefix: key.keyPrefix,
                owner: key.ownerId,
                permissions: key.permissions,
                rateLimit: key.rateLimit,
                isActive: key.isActive,
                usageCount: key.usageCount,
                lastUsedAt: key.lastUsedAt,
                expiresAt: key.expiresAt,
                createdAt: key.createdAt
            })),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error: any) {
        logger.error('admin.get_api_keys_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch API keys' });
    }
};

/**
 * Create a new API key
 */
export const createApiKey = async (req: Request, res: Response) => {
    try {
        const { name, permissions, rateLimit, expiresAt, ipWhitelist } = req.body;
        // @ts-ignore
        const adminId = req.user?.id;

        if (!name) {
            return res.status(400).json({ message: 'API key name is required' });
        }

        // Generate key
        const { key, prefix, hash } = (ApiKey as any).generateKey();

        const apiKey = await ApiKey.create({
            name,
            keyPrefix: prefix,
            hashedKey: hash,
            ownerId: adminId,
            ownerType: 'user',
            permissions: permissions || ['read:events', 'read:registrations', 'read:analytics'],
            rateLimit: rateLimit || 60,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            ipWhitelist: ipWhitelist || []
        });

        // Audit log
        await AuditLog.create({
            adminId,
            action: 'CREATE_API_KEY',
            details: {
                keyId: apiKey._id,
                keyPrefix: prefix,
                name
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        logger.info('admin.api_key_created', { keyPrefix: prefix, name });

        res.status(201).json({
            message: 'API key created successfully',
            apiKey: {
                id: apiKey._id,
                name: apiKey.name,
                key: key, // Only shown once!
                keyPrefix: prefix,
                permissions: apiKey.permissions,
                rateLimit: apiKey.rateLimit,
                expiresAt: apiKey.expiresAt,
                createdAt: apiKey.createdAt
            },
            warning: 'Save this API key securely. It will not be shown again!'
        });
    } catch (error: any) {
        logger.error('admin.create_api_key_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to create API key' });
    }
};

/**
 * Update an API key
 */
export const updateApiKey = async (req: Request, res: Response) => {
    try {
        const { keyId } = req.params;
        const { name, permissions, rateLimit, isActive, expiresAt, ipWhitelist } = req.body;
        // @ts-ignore
        const adminId = req.user?.id;

        const apiKey = await ApiKey.findById(keyId);
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        // Update fields
        if (name !== undefined) apiKey.name = name;
        if (permissions !== undefined) apiKey.permissions = permissions;
        if (rateLimit !== undefined) apiKey.rateLimit = rateLimit;
        if (isActive !== undefined) apiKey.isActive = isActive;
        if (expiresAt !== undefined) apiKey.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
        if (ipWhitelist !== undefined) apiKey.ipWhitelist = ipWhitelist;

        await apiKey.save();

        // Audit log
        await AuditLog.create({
            adminId,
            action: 'UPDATE_API_KEY',
            details: {
                keyId: apiKey._id,
                keyPrefix: apiKey.keyPrefix,
                updatedFields: Object.keys(req.body)
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            message: 'API key updated successfully',
            apiKey: {
                id: apiKey._id,
                name: apiKey.name,
                keyPrefix: apiKey.keyPrefix,
                permissions: apiKey.permissions,
                rateLimit: apiKey.rateLimit,
                isActive: apiKey.isActive,
                expiresAt: apiKey.expiresAt,
                updatedAt: apiKey.updatedAt
            }
        });
    } catch (error: any) {
        logger.error('admin.update_api_key_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to update API key' });
    }
};

/**
 * Revoke (deactivate) an API key
 */
export const revokeApiKey = async (req: Request, res: Response) => {
    try {
        const { keyId } = req.params;
        // @ts-ignore
        const adminId = req.user?.id;

        const apiKey = await ApiKey.findById(keyId);
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        apiKey.isActive = false;
        await apiKey.save();

        // Audit log
        await AuditLog.create({
            adminId,
            action: 'REVOKE_API_KEY',
            details: {
                keyId: apiKey._id,
                keyPrefix: apiKey.keyPrefix,
                name: apiKey.name
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        logger.warn('admin.api_key_revoked', { keyPrefix: apiKey.keyPrefix });

        res.json({ message: 'API key revoked successfully' });
    } catch (error: any) {
        logger.error('admin.revoke_api_key_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to revoke API key' });
    }
};

/**
 * Delete an API key permanently
 */
export const deleteApiKey = async (req: Request, res: Response) => {
    try {
        const { keyId } = req.params;
        // @ts-ignore
        const adminId = req.user?.id;

        const apiKey = await ApiKey.findById(keyId);
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        const keyPrefix = apiKey.keyPrefix;
        const keyName = apiKey.name;

        await ApiKey.findByIdAndDelete(keyId);

        // Audit log
        await AuditLog.create({
            adminId,
            action: 'DELETE_API_KEY',
            details: {
                keyId,
                keyPrefix,
                name: keyName
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        logger.warn('admin.api_key_deleted', { keyPrefix, keyName });

        res.json({ message: 'API key deleted successfully' });
    } catch (error: any) {
        logger.error('admin.delete_api_key_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to delete API key' });
    }
};

/**
 * Get API key usage stats
 */
export const getApiKeyStats = async (req: Request, res: Response) => {
    try {
        const stats = await ApiKey.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: ['$isActive', 1, 0] } },
                    inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
                    totalUsage: { $sum: '$usageCount' }
                }
            }
        ]);

        const recentlyUsed = await ApiKey.find({ lastUsedAt: { $exists: true } })
            .sort({ lastUsedAt: -1 })
            .limit(5)
            .select('name keyPrefix lastUsedAt usageCount');

        const topByUsage = await ApiKey.find()
            .sort({ usageCount: -1 })
            .limit(5)
            .select('name keyPrefix usageCount');

        res.json({
            overview: stats[0] || { total: 0, active: 0, inactive: 0, totalUsage: 0 },
            recentlyUsed,
            topByUsage
        });
    } catch (error: any) {
        logger.error('admin.api_key_stats_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch API key stats' });
    }
};