import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { SystemSettings } from '../models/SystemSettings';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../lib/logger';

// Log directory path
const logsDir = path.join(process.cwd(), 'logs');

// In-memory log buffer for real-time streaming
const logBuffer: string[] = [];
const MAX_BUFFER_SIZE = 500;

// SSE clients for real-time updates
const sseClients: Map<string, any> = new Map();

// Add log to buffer and broadcast to clients
export const addLogEntry = (logLine: string) => {
    logBuffer.unshift(logLine);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
        logBuffer.pop();
    }
    // Broadcast to all connected SSE clients
    broadcastLog(logLine);
};

// Broadcast log to all SSE clients
const broadcastLog = (logLine: string) => {
    sseClients.forEach((client, id) => {
        try {
            client.write(`data: ${JSON.stringify({ type: 'log', data: logLine })}\n\n`);
        } catch (error) {
            logger.warn('sse.broadcast_failed', { client_id: id });
            sseClients.delete(id);
        }
    });
};

// Register SSE client
export const registerSSEClient = (clientId: string, res: any) => {
    sseClients.set(clientId, res);
    logger.debug('sse.client_connected', { client_id: clientId, total_clients: sseClients.size });
};

// Unregister SSE client
export const unregisterSSEClient = (clientId: string) => {
    sseClients.delete(clientId);
    logger.debug('sse.client_disconnected', { client_id: clientId, total_clients: sseClients.size });
};

// Get buffered logs
export const getBufferedLogs = () => logBuffer;

// Get logs from file
export const getLogsFromFile = (filename: string = 'access.log', lines: number = 100): string[] => {
    const logPath = path.join(logsDir, filename);
    
    if (!fs.existsSync(logPath)) {
        return [];
    }

    const data = fs.readFileSync(logPath, 'utf8');
    return data.split('\n').filter(Boolean).reverse().slice(0, lines);
};

// Get available log files
export const getAvailableLogFiles = (): { name: string; size: number; modified: Date }[] => {
    if (!fs.existsSync(logsDir)) {
        return [];
    }

    return fs.readdirSync(logsDir)
        .filter(f => f.endsWith('.log'))
        .map(f => {
            const stats = fs.statSync(path.join(logsDir, f));
            return {
                name: f,
                size: stats.size,
                modified: stats.mtime
            };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());
};

// Search logs
export const searchLogs = (query: string, filename: string = 'access.log'): string[] => {
    const logPath = path.join(logsDir, filename);
    
    if (!fs.existsSync(logPath)) {
        return [];
    }

    const data = fs.readFileSync(logPath, 'utf8');
    const queryLower = query.toLowerCase();
    
    return data.split('\n')
        .filter(line => line.toLowerCase().includes(queryLower))
        .reverse()
        .slice(0, 200);
};

// Clear logs
export const clearLogs = (filename: string = 'access.log'): boolean => {
    const logPath = path.join(logsDir, filename);
    
    try {
        fs.writeFileSync(logPath, '');
        logBuffer.length = 0; // Clear buffer too
        logger.info('logs.cleared', { filename });
        return true;
    } catch (error: any) {
        logger.error('logs.clear_failed', { filename, error: error.message }, error);
        return false;
    }
};

// ==================== GOOGLE DRIVE INTEGRATION ====================

interface DriveConfig {
    enabled: boolean;
    folderId?: string;
    accessToken?: string;
    refreshToken?: string;
}

// Get Drive OAuth URL for admin
export const getDriveAuthUrl = (adminId: string): string => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/logs/drive/callback`
    );

    const scopes = [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent',
        state: `drive_logs_${adminId}`
    });
};

// Handle Drive OAuth callback
export const handleDriveCallback = async (code: string, adminId: string) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/admin/logs/drive/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    // Save to system settings
    const settings = await (SystemSettings as any).getSettings();
    settings.logBackup = {
        enabled: true,
        provider: 'google_drive',
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        lastBackup: null,
        backupFrequency: '4x_daily'
    };
    await settings.save();

    // Create MakeTicket-Logs folder in Drive
    const folderId = await createLogsFolderInDrive(tokens.access_token!, tokens.refresh_token!);
    
    if (folderId) {
        settings.logBackup.folderId = folderId;
        await settings.save();
    }

    return { email, folderId };
};

type LogWindow = {
    start: Date;
    end: Date;
    dateKey: string; // YYYY-MM-DD (based on window start)
    label: string;   // e.g. 00-06, 06-12, 12-18, 18-24
};

const SLOT_HOURS = [0, 6, 12, 18] as const;

const toDateKey = (d: Date) => d.toISOString().split('T')[0];

const floorToSlotBoundary = (d: Date): Date => {
    const hour = d.getHours();
    const slotStart = [...SLOT_HOURS].filter(h => h <= hour).pop() ?? 0;
    const floored = new Date(d);
    floored.setHours(slotStart, 0, 0, 0);
    return floored;
};

const nextSlotBoundary = (d: Date): Date => {
    const hour = d.getHours();
    const next = [...SLOT_HOURS].find(h => h > hour);
    const t = new Date(d);
    if (next === undefined) {
        // next day 00:00
        t.setDate(t.getDate() + 1);
        t.setHours(0, 0, 0, 0);
        return t;
    }
    t.setHours(next, 0, 0, 0);
    return t;
};

const getWindowLabel = (start: Date, end: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const startH = start.getHours();
    const endH = end.getHours();
    // endH can be 0 at midnight; represent as 24 for the 18-24 window
    const prettyEnd = (endH === 0 && end.getDate() !== start.getDate()) ? 24 : endH;
    return `${pad(startH)}-${pad(prettyEnd)}`;
};

const getCurrentSlotWindow = (now: Date): LogWindow => {
    const start = floorToSlotBoundary(now);
    const end = nextSlotBoundary(now);
    return {
        start,
        end,
        dateKey: toDateKey(start),
        label: getWindowLabel(start, end),
    };
};

const getPreviousCompletedSlotWindow = (now: Date): LogWindow => {
    // Upload the last completed 6-hour window ending at the most recent boundary
    const end = floorToSlotBoundary(now);
    const start = new Date(end);
    start.setHours(start.getHours() - 6);
    return {
        start,
        end,
        dateKey: toDateKey(start),
        label: getWindowLabel(start, end),
    };
};

const filterLogContentToWindow = (logContent: string, window: LogWindow): string => {
    const lines = logContent.split('\n').filter(Boolean);
    const startMs = window.start.getTime();
    const endMs = window.end.getTime();

    const selected: string[] = [];
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            const ts = parsed?.timestamp;
            if (typeof ts !== 'string') continue;
            const ms = Date.parse(ts);
            if (Number.isNaN(ms)) continue;
            if (ms >= startMs && ms < endMs) {
                selected.push(line);
            }
        } catch {
            // ignore non-JSON lines
        }
    }

    return selected.length ? selected.join('\n') + '\n' : '';
};

// Create logs folder in Google Drive
const createLogsFolderInDrive = async (accessToken: string, refreshToken: string): Promise<string | null> => {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Check if folder already exists
        const existingFolder = await drive.files.list({
            q: "name='MakeTicket-Logs' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)'
        });

        if (existingFolder.data.files && existingFolder.data.files.length > 0) {
            return existingFolder.data.files[0].id!;
        }

        // Create folder
        const folder = await drive.files.create({
            requestBody: {
                name: 'MakeTicket-Logs',
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id'
        });

        return folder.data.id!;
    } catch (error: any) {
        logger.error('drive.folder_creation_failed', { error: error.message }, error);
        return null;
    }
};

// Upload logs to Google Drive
export const uploadLogsToDrive = async (): Promise<{ success: boolean; fileId?: string; error?: string }> => {
    try {
        const settings = await (SystemSettings as any).getSettings();
        
        if (!settings.logBackup?.enabled || settings.logBackup.provider !== 'google_drive') {
            return { success: false, error: 'Google Drive backup not configured' };
        }

        const { accessToken, refreshToken, folderId } = settings.logBackup;

        if (!accessToken || !refreshToken || !folderId) {
            return { success: false, error: 'Missing Drive credentials' };
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

        // Refresh token if needed
        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                settings.logBackup.accessToken = tokens.access_token;
                if (tokens.refresh_token) {
                    settings.logBackup.refreshToken = tokens.refresh_token;
                }
                await settings.save();
            }
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        // Read current log file
        const logPath = path.join(logsDir, 'access.log');
        if (!fs.existsSync(logPath)) {
            return { success: false, error: 'No log file found' };
        }

        const rawLogContent = fs.readFileSync(logPath, 'utf8');

        // Manual backups upload the current slot window (e.g. 06-12)
        const window = getCurrentSlotWindow(new Date());
        const logContent = filterLogContentToWindow(rawLogContent, window);
        const filename = `logs-${window.dateKey}-${window.label}.log`;

        // Check if today's file already exists
        const existingFile = await drive.files.list({
            q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id)'
        });

        let fileId: string;

        if (existingFile.data.files && existingFile.data.files.length > 0) {
            // Update existing file
            fileId = existingFile.data.files[0].id!;
            await drive.files.update({
                fileId,
                media: {
                    mimeType: 'text/plain',
                    body: logContent
                }
            });
        } else {
            // Create new file
            const file = await drive.files.create({
                requestBody: {
                    name: filename,
                    parents: [folderId]
                },
                media: {
                    mimeType: 'text/plain',
                    body: logContent
                },
                fields: 'id'
            });
            fileId = file.data.id!;
        }

        // Update last backup time
        settings.logBackup.lastBackup = new Date();
        await settings.save();

        logger.info('drive.upload_success', { file_id: fileId, filename });
        return { success: true, fileId };
    } catch (error: any) {
        logger.error('drive.upload_failed', { error: error.message }, error);
        return { success: false, error: error.message };
    }
};

// Get backup status
export const getBackupStatus = async () => {
    const settings = await (SystemSettings as any).getSettings();
    
    if (!settings.logBackup) {
        return { enabled: false };
    }

    return {
        enabled: settings.logBackup.enabled,
        provider: settings.logBackup.provider,
        email: settings.logBackup.email,
        lastBackup: settings.logBackup.lastBackup,
        backupFrequency: settings.logBackup.backupFrequency,
        hasFolderId: !!settings.logBackup.folderId
    };
};

// Disconnect Drive
export const disconnectDrive = async () => {
    const settings = await (SystemSettings as any).getSettings();
    settings.logBackup = {
        enabled: false,
        provider: null,
        email: null,
        accessToken: null,
        refreshToken: null,
        folderId: null,
        lastBackup: null
    };
    await settings.save();
    return true;
};

// Schedule daily backup (call this from server.ts or a cron job)
export const scheduleDailyBackup = () => {
    // Run backup 4x/day aligned to 00:00, 06:00, 12:00, 18:00.
    // Each run uploads the PREVIOUS completed 6-hour window.
    const now = new Date();
    const nextBoundary = nextSlotBoundary(now);
    const msUntilNext = nextBoundary.getTime() - now.getTime();

    const run = () => {
        const window = getPreviousCompletedSlotWindow(new Date());
        uploadLogsToDriveWindow(window).then(result => {
            logger.info('backup.window_completed', {
                success: result.success,
                file_id: result.fileId,
                error: result.error,
                window: { start: window.start.toISOString(), end: window.end.toISOString(), label: window.label }
            });
        });
    };

    setTimeout(() => {
        run();
        setInterval(run, 6 * 60 * 60 * 1000);
    }, msUntilNext);

    logger.info('backup.scheduled', { minutes_until_next: Math.round(msUntilNext / 1000 / 60) });
};

const uploadLogsToDriveWindow = async (window: LogWindow): Promise<{ success: boolean; fileId?: string; error?: string }> => {
    try {
        const settings = await (SystemSettings as any).getSettings();

        if (!settings.logBackup?.enabled || settings.logBackup.provider !== 'google_drive') {
            return { success: false, error: 'Google Drive backup not configured' };
        }

        const { accessToken, refreshToken, folderId } = settings.logBackup;

        if (!accessToken || !refreshToken || !folderId) {
            return { success: false, error: 'Missing Drive credentials' };
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

        oauth2Client.on('tokens', async (tokens) => {
            if (tokens.access_token) {
                settings.logBackup.accessToken = tokens.access_token;
                if (tokens.refresh_token) {
                    settings.logBackup.refreshToken = tokens.refresh_token;
                }
                await settings.save();
            }
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });

        const logPath = path.join(logsDir, 'access.log');
        if (!fs.existsSync(logPath)) {
            return { success: false, error: 'No log file found' };
        }

        const rawLogContent = fs.readFileSync(logPath, 'utf8');
        const logContent = filterLogContentToWindow(rawLogContent, window);
        const filename = `logs-${window.dateKey}-${window.label}.log`;

        const existingFile = await drive.files.list({
            q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id)'
        });

        let fileId: string;
        if (existingFile.data.files && existingFile.data.files.length > 0) {
            fileId = existingFile.data.files[0].id!;
            await drive.files.update({
                fileId,
                media: {
                    mimeType: 'text/plain',
                    body: logContent
                }
            });
        } else {
            const file = await drive.files.create({
                requestBody: {
                    name: filename,
                    parents: [folderId]
                },
                media: {
                    mimeType: 'text/plain',
                    body: logContent
                },
                fields: 'id'
            });
            fileId = file.data.id!;
        }

        settings.logBackup.lastBackup = new Date();
        await settings.save();

        logger.info('drive.upload_success', { file_id: fileId, filename });
        return { success: true, fileId };
    } catch (error: any) {
        logger.error('drive.upload_failed', { error: error.message }, error);
        return { success: false, error: error.message };
    }
};
