/**
 * Login Notification Service
 * Detects new devices/locations and sends email notifications
 */
import { User } from '../models/User';
import { generateDeviceHash } from '../utils/encryption';
import { logger } from '../lib/logger';

interface LoginContext {
    userId: string;
    userAgent: string;
    ipAddress: string;
    location?: string;
}

/**
 * Check if this is a new device and send notification if so
 */
export const checkAndNotifyNewDevice = async (context: LoginContext): Promise<{ isNewDevice: boolean }> => {
    try {
        const { userId, userAgent, ipAddress, location } = context;
        const deviceHash = generateDeviceHash(userAgent, ipAddress);

        const user = await User.findById(userId);
        if (!user) {
            return { isNewDevice: false };
        }

        // Check if device is known
        const knownDevices = user.knownDevices || [];
        const existingDevice = knownDevices.find((d: any) => d.deviceHash === deviceHash);

        if (existingDevice) {
            // Update last seen
            await User.findByIdAndUpdate(userId, {
                $set: {
                    'knownDevices.$[elem].lastSeen': new Date(),
                    'knownDevices.$[elem].ipAddress': ipAddress
                }
            }, {
                arrayFilters: [{ 'elem.deviceHash': deviceHash }]
            });

            return { isNewDevice: false };
        }

        // New device detected - add to known devices
        const newDevice = {
            deviceHash,
            userAgent: userAgent.substring(0, 200), // Limit length
            lastSeen: new Date(),
            ipAddress,
            location: location || 'Unknown'
        };

        await User.findByIdAndUpdate(userId, {
            $push: {
                knownDevices: {
                    $each: [newDevice],
                    $slice: -10 // Keep only last 10 devices
                }
            }
        });

        // Send notification email
        await sendLoginNotificationEmail(user, newDevice);

        logger.info('login.new_device_detected', {
            userId,
            deviceHash,
            ipAddress
        });

        return { isNewDevice: true };
    } catch (error) {
        logger.error('login.notification_error', { error: (error as Error).message });
        return { isNewDevice: false };
    }
};

/**
 * Send email notification for new device login
 */
const sendLoginNotificationEmail = async (user: any, device: any): Promise<void> => {
    const email = user.email;
    const name = user.name || email.split('@')[0];
    const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Parse browser from user agent
    let browser = 'Unknown Browser';
    if (device.userAgent.includes('Chrome')) browser = 'Chrome';
    else if (device.userAgent.includes('Firefox')) browser = 'Firefox';
    else if (device.userAgent.includes('Safari')) browser = 'Safari';
    else if (device.userAgent.includes('Edge')) browser = 'Microsoft Edge';

    // Parse OS from user agent
    let os = 'Unknown OS';
    if (device.userAgent.includes('Windows')) os = 'Windows';
    else if (device.userAgent.includes('Mac')) os = 'macOS';
    else if (device.userAgent.includes('Linux')) os = 'Linux';
    else if (device.userAgent.includes('Android')) os = 'Android';
    else if (device.userAgent.includes('iPhone') || device.userAgent.includes('iPad')) os = 'iOS';

    const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">🔐 New Login Detected</h1>
            </div>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
                <p style="color: #334155; font-size: 16px; margin-bottom: 20px;">
                    Hi ${name},<br><br>
                    We noticed a new login to your MakeTicket account from a device we don't recognize.
                </p>
                
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b; width: 40%;">📱 Device:</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${browser} on ${os}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">📍 IP Address:</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${device.ipAddress}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">🕐 Time:</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${loginTime}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">🌍 Location:</td>
                            <td style="padding: 8px 0; color: #0f172a; font-weight: 500;">${device.location || 'Unknown'}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>⚠️ If this wasn't you:</strong><br>
                        Someone may have access to your account. Please change your password immediately and enable two-factor authentication.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'https://maketicket.app'}/dashboard/settings/security" 
                       style="display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        Review Security Settings
                    </a>
                </div>
                
                <p style="color: #64748b; font-size: 12px; margin-top: 30px; text-align: center;">
                    This is an automated security notification from MakeTicket.<br>
                    You received this email because a new device accessed your account.
                </p>
            </div>
        </div>
    `;

    try {
        // Use the loginAlert template from system email service
        const { sendLoginAlertEmail } = await import('./systemEmailService');
        await sendLoginAlertEmail(
            email,
            name,
            loginTime,
            device.ipAddress,
            `${browser} on ${os}`
        );
    } catch (error) {
        logger.error('login.notification_email_failed', {
            userId: user._id,
            error: (error as Error).message
        });
    }
};

/**
 * Get lockout duration in milliseconds based on lockout level
 */
export const getLockoutDuration = (level: number): number => {
    const durations = [
        0,              // Level 0: No lockout
        5 * 60 * 1000,  // Level 1: 5 minutes
        15 * 60 * 1000, // Level 2: 15 minutes
        60 * 60 * 1000, // Level 3: 1 hour
        24 * 60 * 60 * 1000 // Level 4: 24 hours
    ];
    return durations[Math.min(level, durations.length - 1)];
};

/**
 * Check if account is currently locked
 */
export const isAccountLocked = (user: any): { locked: boolean; remainingMs?: number } => {
    if (!user.lockoutUntil) {
        return { locked: false };
    }

    const now = Date.now();
    const lockoutEnd = new Date(user.lockoutUntil).getTime();

    if (now < lockoutEnd) {
        return { locked: true, remainingMs: lockoutEnd - now };
    }

    return { locked: false };
};

/**
 * Record failed login attempt with escalating lockout
 */
export const recordFailedLogin = async (userId: string): Promise<{ locked: boolean; lockoutMinutes?: number }> => {
    const user = await User.findById(userId);
    if (!user) return { locked: false };

    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const MAX_ATTEMPTS = 5;

    if (failedAttempts >= MAX_ATTEMPTS) {
        // Escalate lockout level
        const newLevel = Math.min((user.lockoutLevel || 0) + 1, 4);
        const lockoutDuration = getLockoutDuration(newLevel);
        const lockoutUntil = new Date(Date.now() + lockoutDuration);

        await User.findByIdAndUpdate(userId, {
            failedLoginAttempts: 0,
            lockoutLevel: newLevel,
            lockoutUntil,
            lastFailedLogin: new Date()
        });

        logger.warn('login.account_locked', {
            userId,
            lockoutLevel: newLevel,
            lockoutMinutes: lockoutDuration / 60000
        });

        return { locked: true, lockoutMinutes: lockoutDuration / 60000 };
    }

    await User.findByIdAndUpdate(userId, {
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: new Date()
    });

    return { locked: false };
};

/**
 * Reset failed login attempts on successful login
 */
export const resetFailedLogins = async (userId: string): Promise<void> => {
    await User.findByIdAndUpdate(userId, {
        failedLoginAttempts: 0,
        lockoutLevel: 0,
        lockoutUntil: null
    });
};
