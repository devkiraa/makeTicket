import { Request, Response } from 'express';
import { ApiKey } from '../models/ApiKey';
import { ApiLog } from '../models/ApiLog';
import { logger } from '../lib/logger';

/**
 * Get user's API keys
 */
export const getUserApiKeys = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;

        const apiKeys = await ApiKey.find({ ownerId: userId })
            .select('-hashedKey')
            .sort({ createdAt: -1 });

        res.json({
            apiKeys: apiKeys.map(key => ({
                id: key._id,
                name: key.name,
                keyPrefix: key.keyPrefix,
                permissions: key.permissions,
                rateLimit: key.rateLimit,
                isActive: key.isActive,
                usageCount: key.usageCount,
                lastUsedAt: key.lastUsedAt,
                expiresAt: key.expiresAt,
                createdAt: key.createdAt
            }))
        });
    } catch (error: any) {
        logger.error('api_key.get_user_keys_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch API keys' });
    }
};

/**
 * Create a new API key for user
 */
export const createUserApiKey = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        if (!name) {
            return res.status(400).json({ message: 'API key name is required' });
        }

        // Check user's API key limit (max 5 for regular users)
        const existingCount = await ApiKey.countDocuments({ ownerId: userId });
        if (existingCount >= 5) {
            return res.status(400).json({
                message: 'API key limit reached. You can have a maximum of 5 API keys.'
            });
        }

        // Generate key
        const { key, prefix, hash } = (ApiKey as any).generateKey();

        const apiKey = await ApiKey.create({
            name,
            keyPrefix: prefix,
            hashedKey: hash,
            ownerId: userId,
            ownerType: 'user',
            permissions: ['read:events', 'read:registrations', 'read:analytics', 'read:tickets'],
            rateLimit: 60, // 60 requests per minute for users
            ipWhitelist: []
        });

        logger.info('api_key.user_created', { userId, keyPrefix: prefix, name });

        res.status(201).json({
            message: 'API key created successfully',
            apiKey: {
                id: apiKey._id,
                name: apiKey.name,
                key: key, // Only shown once!
                keyPrefix: prefix,
                permissions: apiKey.permissions,
                rateLimit: apiKey.rateLimit,
                createdAt: apiKey.createdAt
            },
            warning: 'Save this API key securely. It will not be shown again!'
        });
    } catch (error: any) {
        logger.error('api_key.user_create_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to create API key' });
    }
};

/**
 * Update user's API key (name only)
 */
export const updateUserApiKey = async (req: Request, res: Response) => {
    try {
        const { keyId } = req.params;
        const { name } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        const apiKey = await ApiKey.findOne({ _id: keyId, ownerId: userId });
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        if (name) {
            apiKey.name = name;
        }

        await apiKey.save();

        res.json({
            message: 'API key updated successfully',
            apiKey: {
                id: apiKey._id,
                name: apiKey.name,
                keyPrefix: apiKey.keyPrefix,
                updatedAt: apiKey.updatedAt
            }
        });
    } catch (error: any) {
        logger.error('api_key.user_update_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to update API key' });
    }
};

/**
 * Regenerate (rotate) user's API key
 */
export const regenerateUserApiKey = async (req: Request, res: Response) => {
    try {
        const { keyId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const apiKey = await ApiKey.findOne({ _id: keyId, ownerId: userId });
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        // Generate new key
        const { key, prefix, hash } = (ApiKey as any).generateKey();

        apiKey.keyPrefix = prefix;
        apiKey.hashedKey = hash;
        apiKey.usageCount = 0;
        await apiKey.save();

        logger.info('api_key.user_regenerated', { userId, keyPrefix: prefix });

        res.json({
            message: 'API key regenerated successfully',
            apiKey: {
                id: apiKey._id,
                name: apiKey.name,
                key: key, // New key - only shown once!
                keyPrefix: prefix
            },
            warning: 'Your old API key is now invalid. Save this new key securely!'
        });
    } catch (error: any) {
        logger.error('api_key.user_regenerate_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to regenerate API key' });
    }
};

/**
 * Delete user's API key
 */
export const deleteUserApiKey = async (req: Request, res: Response) => {
    try {
        const { keyId } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const apiKey = await ApiKey.findOne({ _id: keyId, ownerId: userId });
        if (!apiKey) {
            return res.status(404).json({ message: 'API key not found' });
        }

        await ApiKey.findByIdAndDelete(keyId);

        logger.info('api_key.user_deleted', { userId, keyPrefix: apiKey.keyPrefix });

        res.json({ message: 'API key deleted successfully' });
    } catch (error: any) {
        logger.error('api_key.user_delete_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to delete API key' });
    }
};

/**
 * Get API key usage statistics
 */
export const getUserApiKeyUsage = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;

        const stats = await ApiKey.aggregate([
            { $match: { ownerId: userId } },
            {
                $group: {
                    _id: null,
                    totalKeys: { $sum: 1 },
                    activeKeys: { $sum: { $cond: ['$isActive', 1, 0] } },
                    totalRequests: { $sum: '$usageCount' }
                }
            }
        ]);

        const keys = await ApiKey.find({ ownerId: userId })
            .select('name keyPrefix usageCount lastUsedAt')
            .sort({ usageCount: -1 });

        res.json({
            overview: stats[0] || { totalKeys: 0, activeKeys: 0, totalRequests: 0 },
            keys: keys.map(k => ({
                name: k.name,
                keyPrefix: k.keyPrefix,
                requests: k.usageCount,
                lastUsed: k.lastUsedAt
            }))
        });
    } catch (error: any) {
        logger.error('api_key.user_usage_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch usage statistics' });
    }
};

/**
 * Get detailed logs for user's API calls
 */
export const getUserApiLogs = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        const limit = parseInt(req.query.limit as string) || 50;

        const logs = await ApiLog.find({ ownerId: userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('apiKeyId', 'name keyPrefix');

        res.json({
            logs: logs.map(l => ({
                id: l._id,
                apiKeyName: (l.apiKeyId as any)?.name || 'Unknown Key',
                apiKeyPrefix: (l.apiKeyId as any)?.keyPrefix || '••••',
                method: l.method,
                url: l.url,
                statusCode: l.statusCode,
                duration: l.duration,
                ipAddress: l.ipAddress,
                timestamp: l.timestamp
            }))
        });
    } catch (error: any) {
        logger.error('api_key.get_logs_failed', { error: error.message });
        res.status(500).json({ message: 'Failed to fetch API logs' });
    }
};
