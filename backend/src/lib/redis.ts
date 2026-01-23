/**
 * Redis Client Module
 * Provides Redis connection with graceful fallback to in-memory storage
 */
import Redis from 'ioredis';
import { logger } from './logger';

// Redis connection status
let redisClient: Redis | null = null;
let isRedisConnected = false;

/**
 * Initialize Redis connection
 * Supports both REDIS_URL and separate REDIS_HOST/PORT/PASSWORD
 * Falls back gracefully if Redis is not available
 */
export const initRedis = async (): Promise<Redis | null> => {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = process.env.REDIS_PORT;
    const redisPassword = process.env.REDIS_PASSWORD;

    // Check if we have any Redis configuration
    if (!redisUrl && !redisHost) {
        logger.info('redis.skipped', {
            reason: 'No Redis configuration found (REDIS_URL or REDIS_HOST)',
            fallback: 'in-memory rate limiting'
        });
        return null;
    }

    try {
        // Configure Redis client
        if (redisUrl) {
            // Use URL-based connection
            redisClient = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.warn('redis.retry_exhausted', { attempts: times });
                        return null;
                    }
                    return Math.min(times * 100, 3000);
                },
                lazyConnect: true,
                enableReadyCheck: true,
                connectTimeout: 10000,
                tls: redisUrl.includes('upstash') ? {} : undefined
            });
        } else {
            // Use separate host/port/password (for Upstash and similar)
            redisClient = new Redis({
                host: redisHost,
                port: parseInt(redisPort || '6379', 10),
                password: redisPassword,
                maxRetriesPerRequest: 3,
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.warn('redis.retry_exhausted', { attempts: times });
                        return null;
                    }
                    return Math.min(times * 100, 3000);
                },
                lazyConnect: true,
                enableReadyCheck: true,
                connectTimeout: 10000,
                tls: {} // Upstash requires TLS
            });
        }

        // Event handlers
        redisClient.on('connect', () => {
            logger.info('redis.connecting', { host: redisHost || 'url-based' });
        });

        redisClient.on('ready', () => {
            isRedisConnected = true;
            logger.info('redis.connected', { status: 'ready' });
        });

        redisClient.on('error', (err) => {
            isRedisConnected = false;
            logger.error('redis.error', { error: err.message });
        });

        redisClient.on('close', () => {
            isRedisConnected = false;
            logger.warn('redis.disconnected', { reason: 'connection closed' });
        });

        // Attempt to connect
        await redisClient.connect();

        // Test the connection
        await redisClient.ping();

        return redisClient;
    } catch (error) {
        logger.warn('redis.connection_failed', {
            error: (error as Error).message,
            fallback: 'in-memory rate limiting'
        });
        redisClient = null;
        return null;
    }
};

/**
 * Get the Redis client instance
 */
export const getRedisClient = (): Redis | null => {
    return redisClient;
};

/**
 * Check if Redis is currently connected
 */
export const isRedisAvailable = (): boolean => {
    return isRedisConnected && redisClient !== null;
};

/**
 * Gracefully close Redis connection
 */
export const closeRedis = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        isRedisConnected = false;
        logger.info('redis.closed', { status: 'graceful shutdown' });
    }
};

/**
 * Store an auth code for OAuth token exchange
 * @param code - The authorization code
 * @param data - Data to associate with the code
 * @param ttlSeconds - Time to live in seconds (default 5 minutes)
 */
export const storeAuthCode = async (
    code: string,
    data: object,
    ttlSeconds: number = 300
): Promise<boolean> => {
    if (!redisClient || !isRedisConnected) {
        // Fallback: Use in-memory Map (only for single instance)
        authCodeStore.set(code, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
        return true;
    }

    try {
        await redisClient.setex(`authcode:${code}`, ttlSeconds, JSON.stringify(data));
        return true;
    } catch (error) {
        logger.error('redis.store_authcode_failed', { error: (error as Error).message });
        return false;
    }
};

/**
 * Retrieve and consume an auth code (one-time use)
 * @param code - The authorization code to retrieve
 */
export const consumeAuthCode = async (code: string): Promise<object | null> => {
    if (!redisClient || !isRedisConnected) {
        // Fallback: Use in-memory Map
        const entry = authCodeStore.get(code);
        if (!entry || entry.expiresAt < Date.now()) {
            authCodeStore.delete(code);
            return null;
        }
        authCodeStore.delete(code); // One-time use
        return entry.data;
    }

    try {
        const key = `authcode:${code}`;
        const data = await redisClient.get(key);
        if (!data) return null;

        // Delete immediately (one-time use)
        await redisClient.del(key);
        return JSON.parse(data);
    } catch (error) {
        logger.error('redis.consume_authcode_failed', { error: (error as Error).message });
        return null;
    }
};

// In-memory fallback for auth codes (single instance only)
const authCodeStore = new Map<string, { data: object; expiresAt: number }>();

// Cleanup expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of authCodeStore.entries()) {
        if (value.expiresAt < now) {
            authCodeStore.delete(key);
        }
    }
}, 60000); // Every minute
