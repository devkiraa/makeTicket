import { User } from '../models/User';
import { SecurityEvent } from '../models/SecurityEvent';
import { getLocation, calculateDistance, calculateSpeed, GeoLocation } from './geoService';
import { logger } from '../lib/logger';

interface AnomalyResult {
    isAnomaly: boolean;
    reason?: string;
    risk: 'low' | 'medium' | 'high' | 'critical';
    details?: any;
}

/**
 * Check for login anomalies (Impossible Travel, High Velocity)
 */
export const checkLoginAnomaly = async (userId: string, ipAddress: string, userAgent: string): Promise<AnomalyResult> => {
    try {
        const user = await User.findById(userId);
        if (!user) return { isAnomaly: false, risk: 'low' };

        const currentLocation = getLocation(ipAddress);
        const now = new Date();

        // 1. High Velocity Check (Rate Limit) -> Handled mostly by middleware, but we check successful logins here
        // Check last few logins in history
        const recentLogins = user.loginHistory
            ? user.loginHistory.filter((l: any) => l.timestamp && (now.getTime() - new Date(l.timestamp).getTime() < 5 * 60 * 1000)) // 5 mins
            : [];

        if (recentLogins.length > 5) {
            await SecurityEvent.create({
                type: 'anomaly_detected',
                severity: 'medium',
                userId,
                ipAddress,
                userAgent,
                details: { reason: 'high_velocity_login', count: recentLogins.length }
            });
            return { isAnomaly: true, reason: 'High Login Velocity', risk: 'medium' };
        }

        // 2. Impossible Travel Check
        if (currentLocation && user.loginHistory && user.loginHistory.length > 0) {
            // Get last login with valid location
            const lastLogin = user.loginHistory.slice().reverse().find((l: any) => l.location && l.location.lat != null && l.location.lon != null && l.timestamp);

            if (lastLogin && lastLogin.location) {
                const lastTime = new Date(lastLogin.timestamp!).getTime();
                const timeDiff = now.getTime() - lastTime;

                // Only check if time diff is significant enough (e.g. > 5 mins) to avoid noise from rapid VPN switches or glitches
                if (timeDiff > 5 * 60 * 1000 && lastLogin.location.lat != null && lastLogin.location.lon != null) {
                    const distKm = calculateDistance(
                        lastLogin.location.lat,
                        lastLogin.location.lon,
                        currentLocation.ll[0],
                        currentLocation.ll[1]
                    );

                    const speed = calculateSpeed(distKm, timeDiff); // km/h

                    // Speed limit: 800 km/h (Jet plane avg) -> allow some buffer e.g. 1000 km/h for approximation errors
                    if (speed > 1000) {
                        const details = {
                            reason: 'impossible_travel',
                            from: { city: lastLogin.location.city, country: lastLogin.location.country },
                            to: { city: currentLocation.city, country: currentLocation.country },
                            distanceKm: Math.round(distKm),
                            speedKmH: Math.round(speed),
                            timeDiffMinutes: Math.round(timeDiff / 60000)
                        };

                        await SecurityEvent.create({
                            type: 'anomaly_detected',
                            severity: 'high',
                            userId,
                            ipAddress,
                            userAgent,
                            details
                        });

                        logger.warn('anomaly.impossible_travel', { userId, ...details });

                        return { isAnomaly: true, reason: 'Impossible Travel Detected', risk: 'high', details };
                    }
                }
            }
        }

        return { isAnomaly: false, risk: 'low' };

    } catch (error) {
        logger.error('anomaly.check_error', { error: (error as Error).message });
        return { isAnomaly: false, risk: 'low' }; // Fail safe
    }
};

/**
 * Record login history for future checks
 */
export const recordLoginHistory = async (userId: string, ipAddress: string, userAgent: string) => {
    try {
        const location = getLocation(ipAddress);
        const loginRecord = {
            ipAddress,
            userAgent,
            timestamp: new Date(),
            location: location ? {
                lat: location.ll[0],
                lon: location.ll[1],
                city: location.city,
                country: location.country
            } : undefined
        };

        await User.findByIdAndUpdate(userId, {
            $push: {
                loginHistory: {
                    $each: [loginRecord],
                    $slice: -20 // Keep last 20 records
                }
            }
        });
    } catch (error) {
        logger.error('anomaly.record_history_error', { error: (error as Error).message });
    }
};
