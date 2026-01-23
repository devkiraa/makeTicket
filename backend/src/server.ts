import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import figlet from 'figlet';
import { authRouter } from './routes/auth';
import { apiRouter } from './routes/api';
import { adminRouter } from './routes/admin';
import { addLogEntry, scheduleDailyBackup } from './services/logService';

import axios from 'axios';

// Import production-grade logging infrastructure
import { logger } from './lib/logger';
import { requestContextMiddleware } from './middleware/requestContext';
import { httpLoggingMiddleware } from './middleware/httpLogger';

// Import security middleware
import {
    helmetMiddleware,
    mongoSanitizeMiddleware,
    validateSecurityConfig
} from './middleware/security';

// Import Redis client
import { initRedis } from './lib/redis';

dotenv.config();

// ============================================================================
// Security Configuration Validation (fail-fast on missing critical config)
// ============================================================================
validateSecurityConfig();

// ============================================================================
// Initialize Redis for distributed rate limiting (optional - graceful fallback)
// ============================================================================
initRedis().then(client => {
    if (client) {
        logger.info('startup.redis_initialized', { status: 'connected' });
    } else {
        logger.info('startup.redis_skipped', { fallback: 'in-memory rate limiting' });
    }
}).catch(err => {
    logger.warn('startup.redis_failed', { error: err.message, fallback: 'in-memory rate limiting' });
});

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - needed to get real client IP behind Render/Vercel/nginx
// Must be set before any middleware reads req.ip
app.set('trust proxy', true);

import fs from 'fs';
import path from 'path';
import * as rfs from 'rotating-file-stream';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create a rotating write stream for structured logs
const accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // rotate daily
    path: logsDir
});

// ============================================================================
// Middleware Stack (order matters!)
// ============================================================================

// 1. Request context middleware MUST be first - generates trace IDs
app.use(requestContextMiddleware);

// 2. HTTP logging middleware (replaces morgan)
app.use(httpLoggingMiddleware);

// 3. Also write to rotating log file for backup/compliance
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;

        const clientIp = req.ip ||
            req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
            req.socket.remoteAddress ||
            'unknown';

        const forwardedFor = req.headers['x-forwarded-for']?.toString();
        const realIp = req.headers['x-real-ip']?.toString();
        const cfConnectingIp = req.headers['cf-connecting-ip']?.toString();
        const forwardedProto = req.headers['x-forwarded-proto']?.toString();
        const forwardedHost = req.headers['x-forwarded-host']?.toString();
        const forwardedPort = req.headers['x-forwarded-port']?.toString();
        const origin = req.headers['origin']?.toString();
        const referer = req.headers['referer']?.toString();

        const user = (req as any).user;
        const userId = user?.id || user?._id;
        const role = user?.role;
        const sessionId = user?.sessionId;
        const isImpersonated = !!user?.isImpersonated;
        const adminId = user?.adminId;

        const logLine = JSON.stringify({
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl || req.url,
            status: res.statusCode,
            duration_ms: duration,
            request_id: req.requestId,
            trace_id: req.traceId,
            user_id: userId ? String(userId) : undefined,
            session_id: sessionId ? String(sessionId) : undefined,
            role: role ? String(role) : undefined,
            is_impersonated: isImpersonated || undefined,
            admin_id: adminId ? String(adminId) : undefined,
            client_ip: clientIp,
            forwarded_for: forwardedFor,
            real_ip: realIp,
            cf_connecting_ip: cfConnectingIp,
            forwarded_proto: forwardedProto,
            forwarded_host: forwardedHost,
            forwarded_port: forwardedPort,
            origin,
            referer,
            user_agent: req.get('user-agent'),
        });
        accessLogStream.write(logLine + '\n');
        addLogEntry(logLine);
    });
    next();
});

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Security middlewares
app.use(helmetMiddleware);

// Stricter body limits for sensitive routes (Auth, Webhooks) - prevents large payload DoS
app.use('/api/auth', express.json({ limit: '500kb' }), express.urlencoded({ limit: '500kb', extended: true }));
app.use('/api/webhooks', express.json({ limit: '500kb' }), express.urlencoded({ limit: '500kb', extended: true }));

// Global fallback with larger limit for image uploads/events
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(mongoSanitizeMiddleware);
app.use(cookieParser());

// Static file serving with signed URL protection for sensitive directories
import { requireSignedUrl } from './middleware/signedUrl';
app.use('/uploads', requireSignedUrl, express.static(path.join(process.cwd(), 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/maketicket')
    .then(() => logger.info('database.connected', { database: 'maketicket', provider: 'MongoDB Atlas' }))
    .catch((err) => logger.error('database.connection_failed', { error: err.message }, err));

// Routes
app.get('/', (req, res) => {
    const apiInfo = {
        name: 'MakeTicket API',
        version: '1.0.0',
        description: 'Event ticketing platform API - Create events, generate QR code tickets, manage registrations, and scan attendees.',
        status: 'operational',
        timestamp: new Date().toISOString(),
        documentation: 'https://maketicket.app/api-docs',
        website: 'https://maketicket.app',
        support: 'support@maketicket.app',
        endpoints: {
            auth: {
                base: '/api/auth',
                description: 'Authentication and user management',
                routes: [
                    { method: 'POST', path: '/register', description: 'Create a new user account' },
                    { method: 'POST', path: '/login', description: 'Authenticate and get access token' },
                    { method: 'POST', path: '/logout', description: 'Invalidate current session' },
                    { method: 'GET', path: '/me', description: 'Get current user profile' },
                    { method: 'POST', path: '/forgot-password', description: 'Request password reset' },
                    { method: 'POST', path: '/reset-password', description: 'Reset password with token' },
                    { method: 'GET', path: '/google', description: 'Google OAuth login' }
                ]
            },
            events: {
                base: '/api/events',
                description: 'Event management',
                routes: [
                    { method: 'GET', path: '/', description: 'List all events' },
                    { method: 'POST', path: '/', description: 'Create a new event' },
                    { method: 'GET', path: '/:id', description: 'Get event details' },
                    { method: 'PUT', path: '/:id', description: 'Update an event' },
                    { method: 'DELETE', path: '/:id', description: 'Delete an event' },
                    { method: 'GET', path: '/:id/attendees', description: 'Get event attendees' },
                    { method: 'POST', path: '/:id/register', description: 'Register for an event' }
                ]
            },
            tickets: {
                base: '/api/tickets',
                description: 'Ticket management and validation',
                routes: [
                    { method: 'GET', path: '/:id', description: 'Get ticket details' },
                    { method: 'POST', path: '/validate', description: 'Validate a ticket QR code' },
                    { method: 'POST', path: '/check-in', description: 'Check in an attendee' },
                    { method: 'GET', path: '/wallet/:id', description: 'Get Apple/Google Wallet pass' }
                ]
            },
            users: {
                base: '/api/users',
                description: 'User profile management',
                routes: [
                    { method: 'GET', path: '/:username', description: 'Get public user profile' },
                    { method: 'PUT', path: '/profile', description: 'Update user profile' }
                ]
            },
            integrations: {
                google_forms: {
                    base: '/api/google-forms',
                    description: 'Google Forms integration for importing registrations'
                },
                google_sheets: {
                    base: '/api/google-sheets',
                    description: 'Google Sheets integration for attendee import/export'
                }
            }
        },
        rateLimit: {
            requests: '100 requests per 15 minutes',
            note: 'Rate limits may vary by endpoint and plan'
        },
        authentication: {
            type: 'Bearer Token',
            header: 'Authorization: Bearer <token>',
            note: 'Obtain token via /api/auth/login'
        },
        contact: {
            support: 'support@maketicket.app',
            security: 'security@maketicket.app',
            legal: 'legal@maketicket.app'
        },
        links: {
            website: 'https://maketicket.app',
            documentation: 'https://maketicket.app/api-docs',
            status: 'https://maketicket.app/status',
            privacy: 'https://maketicket.app/privacy',
            terms: 'https://maketicket.app/terms'
        }
    };

    // Check Accept header for JSON or HTML response
    const acceptHeader = req.headers.accept || '';

    if (acceptHeader.includes('text/html')) {
        // Return a nice HTML page for browser visits
        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MakeTicket API</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .card {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        .header { text-align: center; margin-bottom: 40px; }
        .logo { font-size: 48px; margin-bottom: 10px; }
        h1 { color: #1a1a2e; font-size: 32px; margin-bottom: 8px; }
        .version { 
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        .status {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 14px;
            margin-top: 16px;
        }
        .status::before { content: '●'; margin-right: 8px; }
        .description { color: #64748b; font-size: 18px; margin: 20px 0; line-height: 1.6; }
        .section { margin-top: 32px; }
        .section-title { 
            color: #1a1a2e;
            font-size: 20px;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
        }
        .endpoint-group { margin-bottom: 24px; }
        .endpoint-base { 
            font-family: monospace;
            background: #f1f5f9;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            color: #6366f1;
            margin-bottom: 8px;
            display: inline-block;
        }
        .endpoint-desc { color: #64748b; font-size: 14px; margin-bottom: 12px; }
        .routes { margin-left: 16px; }
        .route {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
            font-size: 14px;
        }
        .method {
            font-family: monospace;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            width: 60px;
            text-align: center;
            margin-right: 12px;
        }
        .method.get { background: #dbeafe; color: #1d4ed8; }
        .method.post { background: #dcfce7; color: #16a34a; }
        .method.put { background: #fef3c7; color: #d97706; }
        .method.delete { background: #fee2e2; color: #dc2626; }
        .path { font-family: monospace; color: #334155; margin-right: 16px; min-width: 200px; }
        .route-desc { color: #64748b; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
        .info-box {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        .info-box h4 { color: #334155; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-box p { color: #64748b; font-size: 14px; }
        .info-box a { color: #6366f1; text-decoration: none; }
        .info-box a:hover { text-decoration: underline; }
        .info-box code { 
            font-family: monospace;
            background: #e2e8f0;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 13px;
        }
        .links { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 32px; justify-content: center; }
        .link {
            padding: 12px 24px;
            background: #6366f1;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background 0.2s;
        }
        .link:hover { background: #4f46e5; }
        .link.secondary { background: #f1f5f9; color: #334155; }
        .link.secondary:hover { background: #e2e8f0; }
        .footer { text-align: center; margin-top: 32px; color: #94a3b8; font-size: 14px; }
        @media (max-width: 600px) {
            .route { flex-direction: column; align-items: flex-start; gap: 4px; }
            .path { min-width: auto; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="logo">🎫</div>
                <h1>MakeTicket API</h1>
                <span class="version">v1.0.0</span>
                <div><span class="status">Operational</span></div>
                <p class="description">Event ticketing platform API - Create events, generate QR code tickets, manage registrations, and scan attendees.</p>
            </div>

            <div class="section">
                <h3 class="section-title">🔐 Authentication</h3>
                <div class="info-grid">
                    <div class="info-box">
                        <h4>Auth Type</h4>
                        <p>Bearer Token</p>
                    </div>
                    <div class="info-box">
                        <h4>Header</h4>
                        <p><code>Authorization: Bearer &lt;token&gt;</code></p>
                    </div>
                    <div class="info-box">
                        <h4>Get Token</h4>
                        <p>POST <code>/api/auth/login</code></p>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">📡 API Endpoints</h3>
                
                <div class="endpoint-group">
                    <div class="endpoint-base">/api/auth</div>
                    <div class="endpoint-desc">Authentication and user management</div>
                    <div class="routes">
                        <div class="route"><span class="method post">POST</span><span class="path">/register</span><span class="route-desc">Create a new user account</span></div>
                        <div class="route"><span class="method post">POST</span><span class="path">/login</span><span class="route-desc">Authenticate and get access token</span></div>
                        <div class="route"><span class="method get">GET</span><span class="path">/me</span><span class="route-desc">Get current user profile</span></div>
                        <div class="route"><span class="method get">GET</span><span class="path">/google</span><span class="route-desc">Google OAuth login</span></div>
                    </div>
                </div>

                <div class="endpoint-group">
                    <div class="endpoint-base">/api/events</div>
                    <div class="endpoint-desc">Event management</div>
                    <div class="routes">
                        <div class="route"><span class="method get">GET</span><span class="path">/</span><span class="route-desc">List all events</span></div>
                        <div class="route"><span class="method post">POST</span><span class="path">/</span><span class="route-desc">Create a new event</span></div>
                        <div class="route"><span class="method get">GET</span><span class="path">/:id</span><span class="route-desc">Get event details</span></div>
                        <div class="route"><span class="method put">PUT</span><span class="path">/:id</span><span class="route-desc">Update an event</span></div>
                        <div class="route"><span class="method delete">DELETE</span><span class="path">/:id</span><span class="route-desc">Delete an event</span></div>
                        <div class="route"><span class="method post">POST</span><span class="path">/:id/register</span><span class="route-desc">Register for an event</span></div>
                    </div>
                </div>

                <div class="endpoint-group">
                    <div class="endpoint-base">/api/tickets</div>
                    <div class="endpoint-desc">Ticket management and validation</div>
                    <div class="routes">
                        <div class="route"><span class="method get">GET</span><span class="path">/:id</span><span class="route-desc">Get ticket details</span></div>
                        <div class="route"><span class="method post">POST</span><span class="path">/validate</span><span class="route-desc">Validate a ticket QR code</span></div>
                        <div class="route"><span class="method post">POST</span><span class="path">/check-in</span><span class="route-desc">Check in an attendee</span></div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3 class="section-title">📧 Contact</h3>
                <div class="info-grid">
                    <div class="info-box">
                        <h4>Support</h4>
                        <p><a href="mailto:support@maketicket.app">support@maketicket.app</a></p>
                    </div>
                    <div class="info-box">
                        <h4>Security</h4>
                        <p><a href="mailto:security@maketicket.app">security@maketicket.app</a></p>
                    </div>
                    <div class="info-box">
                        <h4>Rate Limit</h4>
                        <p>100 requests / 15 min</p>
                    </div>
                </div>
            </div>

            <div class="links">
                <a href="https://maketicket.app" class="link">🌐 Website</a>
                <a href="https://maketicket.app/api-docs" class="link">📖 Documentation</a>
                <a href="https://maketicket.app/status" class="link secondary">📊 Status</a>
                <a href="https://maketicket.app/privacy" class="link secondary">🔒 Privacy</a>
            </div>

            <div class="footer">
                <p>© ${new Date().getFullYear()} MakeTicket. All rights reserved.</p>
                <p style="margin-top: 8px;">Server Time: ${new Date().toISOString()}</p>
            </div>
        </div>
    </div>
</body>
</html>
        `);
    } else {
        // Return JSON for API clients
        res.json(apiInfo);
    }
});
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.use('/api/admin', adminRouter);

// Google Forms Integration
import { googleFormsRouter } from './routes/googleForms';
app.use('/api/google-forms', googleFormsRouter);

// Google Sheets Integration
import { googleSheetsRouter } from './routes/googleSheets';
app.use('/api/google-sheets', googleSheetsRouter);

// Payment Integration (Razorpay)
import paymentRouter from './routes/payment';
app.use('/api/payment', paymentRouter);

// UPI Payment Verification (separate from Razorpay billing)
import upiPaymentRouter from './routes/upiPayment';
app.use('/api/payment-verification', upiPaymentRouter);

// Support Tickets
import supportRouter from './routes/support';
app.use('/api/support', supportRouter);

// External API (v1) - Public API with API key authentication
import externalRouter from './routes/external';
app.use('/api/v1', externalRouter);

// Import keep-alive status tracker
import { updateKeepAliveStatus } from './controllers/adminController';

// Health check endpoint for keep-alive
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Keep-alive self-ping function (prevents Render free tier from spinning down)
const startKeepAlive = () => {
    const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
    const PING_INTERVAL = 10 * 60 * 1000; // 10 minutes

    // Only run in production to save resources locally
    if (process.env.NODE_ENV !== 'production') {
        logger.debug('keepalive.disabled', { reason: 'development_mode' });
        return;
    }

    const ping = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/health`);
            updateKeepAliveStatus(true);
            logger.debug('keepalive.ping_success', {
                status: response.data.status,
                uptime_seconds: Math.floor(response.data.uptime)
            });
        } catch (error: any) {
            updateKeepAliveStatus(false);
            logger.error('keepalive.ping_failed', { error: error.message }, error);
        }
    };

    // Initial ping after 1 minute
    setTimeout(ping, 60 * 1000);

    // Then ping every 10 minutes
    setInterval(ping, PING_INTERVAL);

    logger.info('keepalive.started', {
        target_url: `${BACKEND_URL}/health`,
        interval_minutes: PING_INTERVAL / 60000
    });
};

// Start Server
app.listen(PORT, async () => {
    let publicIp = 'unknown';
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        publicIp = response.data.ip;
    } catch (e) {
        // ignore
    }

    figlet.text('MAKETICKET-SERVER', {
        font: 'Slant',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        width: 120,
        whitespaceBreak: true
    }, (err, data) => {
        if (err) {
            logger.error('server.banner_failed', { error: err.message });
            return;
        }

        // Only show ASCII banner in development
        if (process.env.NODE_ENV !== 'production') {
            console.log(data);
            console.log(`
Welcome to MakeTicket-Server

Date:         ${new Date().toLocaleDateString()}
Time:         ${new Date().toLocaleTimeString()}
TimeStamp:    ${new Date().toISOString()}

HTTP server running on port ${PORT}
Your public IP address is: ${publicIp}
🔗 Local URL:  http://localhost:${PORT}
`);
        }

        // Structured server startup log
        logger.info('server.started', {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            public_ip: publicIp,
            local_url: `http://localhost:${PORT}`,
            node_version: process.version,
            platform: process.platform,
        });

        // Schedule daily log backup to Google Drive
        scheduleDailyBackup();

        // Start keep-alive to prevent Render free tier spin-down
        startKeepAlive();
    });
});

