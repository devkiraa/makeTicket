import { Request, Response } from 'express';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import fs from 'fs';
import path from 'path';

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

        if (!['admin', 'host', 'helper'].includes(role)) {
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
        const logsDir = path.join(process.cwd(), 'logs');
        const requestedFile = (req.query.file as string) || 'access.log';
        const logPath = path.join(logsDir, requestedFile);

        // Get list of all log files
        let availableFiles: string[] = [];
        if (fs.existsSync(logsDir)) {
            availableFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
        }

        if (!fs.existsSync(logPath)) {
            return res.json({ logs: [], availableFiles });
        }

        const data = fs.readFileSync(logPath, 'utf8');
        // Split by newline and take last 100
        const logs = data.split('\n').filter(Boolean).reverse().slice(0, 100);

        res.json({ logs, availableFiles, currentFile: requestedFile });
    } catch (error) {
        console.error('Fetch logs error:', error);
        res.status(500).json({ message: 'Failed to fetch logs' });
    }
};

export const clearServerLogs = async (req: Request, res: Response) => {
    try {
        const logPath = path.join(process.cwd(), 'logs/access.log');
        fs.writeFileSync(logPath, ''); // Clear file
        res.json({ message: 'Logs cleared successfully' });
    } catch (error) {
        console.error('Clear logs error:', error);
        res.status(500).json({ message: 'Failed to clear logs' });
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
