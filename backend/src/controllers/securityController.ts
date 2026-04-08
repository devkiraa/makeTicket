/**
 * Security Controller
 * Endpoints for admin security dashboard
 */
import { Request, Response } from 'express';
import { SecurityEvent } from '../models/SecurityEvent';
import { BlockedIp } from '../models/BlockedIp';
import { User } from '../models/User';
import { Parser } from 'json2csv';
import { logger } from '../lib/logger';

/**
 * Get paginated security events
 */
export const getSecurityEvents = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const type = req.query.type as string;
        const severity = req.query.severity as string;
        const search = req.query.search as string;

        const query: any = {};

        if (type) query.type = type;
        if (severity) query.severity = severity;

        if (search) {
            query.$or = [
                { ipAddress: { $regex: search, $options: 'i' } },
                { 'details.emailAttempt': { $regex: search, $options: 'i' } },
                { 'details.reason': { $regex: search, $options: 'i' } }
            ];
        }

        const pipeline: any[] = [
            { $match: query },
            {
                $group: {
                    _id: { ipAddress: "$ipAddress", type: "$type", severity: "$severity" },
                    count: { $sum: { $cond: [{ $ifNull: ["$details.requestCount", false] }, "$details.requestCount", 1] } },
                    createdAt: { $max: "$createdAt" },
                    firstSeen: { $min: "$createdAt" },
                    userId: { $last: "$userId" },
                    details: { $last: "$details" }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    paginatedResults: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'userId',
                                foreignField: '_id',
                                as: 'userDoc'
                            }
                        },
                        {
                            $unwind: {
                                path: '$userDoc',
                                preserveNullAndEmptyArrays: true
                            }
                        },
                        {
                            $addFields: {
                                _id: { $concat: ["$_id.ipAddress", "-", "$_id.type", "-", { $toString: "$_id.severity" }] },
                                ipAddress: "$_id.ipAddress",
                                type: "$_id.type",
                                severity: "$_id.severity",
                                userId: {
                                    $cond: {
                                        if: "$userDoc",
                                        then: { _id: "$userDoc._id", email: "$userDoc.email", name: "$userDoc.name" },
                                        else: null
                                    }
                                }
                            }
                        },
                        {
                            $project: { userDoc: 0 }
                        }
                    ],
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            }
        ];

        const [aggregationResult] = await SecurityEvent.aggregate(pipeline);
        const events = aggregationResult.paginatedResults;
        const total = aggregationResult.totalCount[0]?.count || 0;

        res.status(200).json({
            events,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        logger.error('security.get_events_error', { error: (error as Error).message });
        res.status(500).json({ message: 'Failed to fetch security events' });
    }
};

/**
 * Get aggregated security statistics
 */
export const getSecurityStats = async (req: Request, res: Response) => {
    try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Stats queries
        const [
            totalEvents,
            recentEvents,
            eventsByType,
            eventsBySeverity,
            highRiskIps
        ] = await Promise.all([
            SecurityEvent.countDocuments(),
            SecurityEvent.countDocuments({ createdAt: { $gte: oneDayAgo } }),
            SecurityEvent.aggregate([
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ]),
            SecurityEvent.aggregate([
                { $group: { _id: '$severity', count: { $sum: 1 } } }
            ]),
            // Find IPs with most high/critical events in last week
            SecurityEvent.aggregate([
                {
                    $match: {
                        createdAt: { $gte: oneWeekAgo },
                        severity: { $in: ['high', 'critical'] }
                    }
                },
                { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        res.status(200).json({
            overview: {
                totalEvents,
                recentEvents24h: recentEvents
            },
            byType: eventsByType.reduce((acc: any, curr: any) => ({ ...acc, [curr._id]: curr.count }), {}),
            bySeverity: eventsBySeverity.reduce((acc: any, curr: any) => ({ ...acc, [curr._id]: curr.count }), {}),
            topAttackingIps: highRiskIps.map((ip: any) => ({ ip: ip._id, count: ip.count }))
        });
    } catch (error) {
        logger.error('security.get_stats_error', { error: (error as Error).message });
        res.status(500).json({ message: 'Failed to fetch security stats' });
    }
};

/**
 * Export security logs to CSV
 */
export const exportSecurityLogs = async (req: Request, res: Response) => {
    try {
        const events = await SecurityEvent.find()
            .sort({ createdAt: -1 })
            .limit(10000) // Limit export size
            .populate('userId', 'email');

        const fields = ['createdAt', 'type', 'severity', 'ipAddress', 'userAgent', 'userId.email', 'details'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(events);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=security_logs.csv');
        return res.send(csv);
    } catch (error) {
        logger.error('security.export_error', { error: (error as Error).message });
        res.status(500).json({ message: 'Failed to export logs' });
    }
};

/**
 * Force logout a user (revoke all sessions)
 */
export const forceLogoutUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        // Invalidate all sessions for user
        const { Session } = await import('../models/Session');
        await Session.deleteMany({ userId });

        // Reset 2FA if requested? No, strict timeout maybe.
        // Also clear any refresh tokens if using them.

        logger.info('security.force_logout', { adminId: (req as any).user.id, targetUserId: userId });

        res.status(200).json({ message: 'User logged out from all devices' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to force logout' });
    }
};

/**
 * Stream security logs (NDJSON for SIEM integration)
 */
export const streamSecurityLogs = async (req: Request, res: Response) => {
    try {
        const after = req.query.after ? new Date(req.query.after as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);

        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const cursor = SecurityEvent.find({ createdAt: { $gt: after } })
            .sort({ createdAt: 1 }) // Oldest first for streaming
            .cursor();

        cursor.on('data', (doc) => {
            res.write(JSON.stringify(doc) + '\n');
        });

        cursor.on('end', () => {
            res.end();
        });

        cursor.on('error', (err) => {
            logger.error('security.stream_error', { error: err.message });
            res.end();
        });

    } catch (error) {
        logger.error('security.stream_init_error', { error: (error as Error).message });
        res.status(500).json({ message: 'Failed to stream logs' });
    }
};

/**
 * Block an IP address
 */
export const blockIp = async (req: Request, res: Response) => {
    try {
        const { ipAddress, reason } = req.body;
        if (!ipAddress) return res.status(400).json({ message: 'IP address is required' });

        await BlockedIp.findOneAndUpdate(
            { ipAddress },
            { ipAddress, reason, blockedBy: (req as any).user?.id },
            { upsert: true, new: true }
        );

        logger.warn('security.ip_blocked', { ipAddress, adminId: (req as any).user?.id, reason });
        res.status(200).json({ message: 'IP address blocked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to block IP' });
    }
};

/**
 * Unblock an IP address
 */
export const unblockIp = async (req: Request, res: Response) => {
    try {
        const { ipAddress } = req.body;
        if (!ipAddress) return res.status(400).json({ message: 'IP address is required' });

        await BlockedIp.findOneAndDelete({ ipAddress });

        logger.info('security.ip_unblocked', { ipAddress, adminId: (req as any).user?.id });
        res.status(200).json({ message: 'IP address unblocked successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to unblock IP' });
    }
};

/**
 * Get active user locations for map visualization
 */
export const getActiveUserLocations = async (req: Request, res: Response) => {
    try {
        const statusFilter = req.query.status as string || 'active';
        const queryMatch: any = { 'loginHistory.location.lat': { $exists: true, $ne: null } };
        
        if (statusFilter !== 'all') {
            queryMatch['status'] = statusFilter;
        }

        const locations = await User.aggregate([
            { $match: queryMatch },
            { $unwind: '$loginHistory' },
            { $match: { 'loginHistory.location.lat': { $exists: true, $ne: null } } },
            { $group: {
                _id: '$_id',
                lat: { $last: '$loginHistory.location.lat' },
                lon: { $last: '$loginHistory.location.lon' },
                city: { $last: '$loginHistory.location.city' },
                country: { $last: '$loginHistory.location.country' },
                size: { $sum: 0.1 } // relative size depending on logins
            }}
        ]);
        
        res.status(200).json(locations);
    } catch (error) {
        logger.error('security.locations_error', { error: (error as Error).message });
        res.status(500).json({ message: 'Failed to fetch user locations' });
    }
};
