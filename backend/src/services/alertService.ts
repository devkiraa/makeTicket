/**
 * Security Alert Service
 * Sends real-time alerts for critical security events via webhooks
 */
import { logger } from '../lib/logger';

interface AlertPayload {
    type: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    description: string;
    details?: Record<string, any>;
    timestamp?: Date;
}

/**
 * Send alert to Discord webhook
 */
const sendDiscordAlert = async (payload: AlertPayload): Promise<boolean> => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return false;

    const colorMap = {
        critical: 0xFF0000, // Red
        high: 0xFF6600,     // Orange
        medium: 0xFFCC00,   // Yellow
        low: 0x00CC00       // Green
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: `🚨 ${payload.title}`,
                    description: payload.description,
                    color: colorMap[payload.type],
                    fields: payload.details ? Object.entries(payload.details).map(([name, value]) => ({
                        name,
                        value: String(value).substring(0, 256),
                        inline: true
                    })) : [],
                    timestamp: (payload.timestamp || new Date()).toISOString(),
                    footer: { text: 'MakeTicket Security' }
                }]
            })
        });

        return response.ok;
    } catch (error) {
        logger.error('alert.discord_failed', { error: (error as Error).message });
        return false;
    }
};

/**
 * Send alert to Slack webhook
 */
const sendSlackAlert = async (payload: AlertPayload): Promise<boolean> => {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return false;

    const emojiMap = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                blocks: [
                    {
                        type: 'header',
                        text: { type: 'plain_text', text: `${emojiMap[payload.type]} ${payload.title}` }
                    },
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: payload.description }
                    },
                    ...(payload.details ? [{
                        type: 'section',
                        fields: Object.entries(payload.details).slice(0, 10).map(([key, value]) => ({
                            type: 'mrkdwn',
                            text: `*${key}:* ${String(value).substring(0, 100)}`
                        }))
                    }] : []),
                    {
                        type: 'context',
                        elements: [{
                            type: 'mrkdwn',
                            text: `🕐 ${(payload.timestamp || new Date()).toISOString()}`
                        }]
                    }
                ]
            })
        });

        return response.ok;
    } catch (error) {
        logger.error('alert.slack_failed', { error: (error as Error).message });
        return false;
    }
};

/**
 * Send security alert to all configured channels
 */
export const sendSecurityAlert = async (payload: AlertPayload): Promise<void> => {
    const results = await Promise.allSettled([
        sendDiscordAlert(payload),
        sendSlackAlert(payload)
    ]);

    const success = results.some(r => r.status === 'fulfilled' && r.value === true);

    logger.info('alert.sent', {
        type: payload.type,
        title: payload.title,
        discordSent: results[0].status === 'fulfilled' && results[0].value,
        slackSent: results[1].status === 'fulfilled' && results[1].value
    });

    if (!success && (process.env.DISCORD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL)) {
        logger.warn('alert.all_channels_failed', { type: payload.type, title: payload.title });
    }
};

/**
 * Alert for brute-force attack detection
 */
export const alertBruteForceAttack = async (details: {
    targetEmail?: string;
    targetUserId?: string;
    ipAddress: string;
    attemptCount: number;
}): Promise<void> => {
    await sendSecurityAlert({
        type: 'high',
        title: 'Brute-Force Attack Detected',
        description: `Multiple failed login attempts detected from a single IP address.`,
        details: {
            'IP Address': details.ipAddress,
            'Target': details.targetEmail || details.targetUserId || 'Unknown',
            'Attempts': details.attemptCount
        }
    });
};

/**
 * Alert for rate limit exceeded
 */
export const alertRateLimitExceeded = async (details: {
    endpoint: string;
    ipAddress: string;
    userId?: string;
}): Promise<void> => {
    await sendSecurityAlert({
        type: 'medium',
        title: 'Rate Limit Exceeded',
        description: `Excessive requests blocked from IP.`,
        details: {
            'Endpoint': details.endpoint,
            'IP Address': details.ipAddress,
            'User ID': details.userId || 'N/A'
        }
    });
};

/**
 * Alert for suspicious payment activity
 */
export const alertSuspiciousPayment = async (details: {
    eventId: string;
    ticketId: string;
    utrNumber: string;
    reason: string;
}): Promise<void> => {
    await sendSecurityAlert({
        type: 'high',
        title: 'Suspicious Payment Activity',
        description: `Potential payment fraud detected.`,
        details: {
            'Event ID': details.eventId,
            'Ticket ID': details.ticketId,
            'UTR': details.utrNumber,
            'Reason': details.reason
        }
    });
};

/**
 * Alert for account compromise
 */
export const alertAccountCompromise = async (details: {
    userId: string;
    email: string;
    reason: string;
}): Promise<void> => {
    await sendSecurityAlert({
        type: 'critical',
        title: 'Potential Account Compromise',
        description: `Suspicious activity detected on user account.`,
        details: {
            'User ID': details.userId,
            'Email': details.email,
            'Reason': details.reason
        }
    });
};

/**
 * Alert for system security event
 */
export const alertSystemSecurity = async (title: string, description: string, details?: Record<string, any>): Promise<void> => {
    await sendSecurityAlert({
        type: 'critical',
        title,
        description,
        details
    });
};
