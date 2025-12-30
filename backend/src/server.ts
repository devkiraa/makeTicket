import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import figlet from 'figlet';
import { authRouter } from './routes/auth';
import { apiRouter } from './routes/api';
import { adminRouter } from './routes/admin';
import { addLogEntry, scheduleDailyBackup } from './services/logService';

import axios from 'axios';
import chalk from 'chalk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

import fs from 'fs';
import path from 'path';
import * as rfs from 'rotating-file-stream';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Middleware
// Create a rotating write stream
const accessLogStream = rfs.createStream('access.log', {
    interval: '1d', // rotate daily
    path: logsDir
});

// Plain tokens for file
morgan.token('time', () => new Date().toLocaleString());

// Colored tokens for console
morgan.token('c-time', () => chalk.gray(`[${new Date().toLocaleString()}]`));
morgan.token('c-method', (req) => {
    const method = req.method;
    const colors: { [key: string]: any } = {
        'GET': chalk.cyan,
        'POST': chalk.blueBright,
        'PUT': chalk.magenta,
        'PATCH': chalk.yellow,
        'DELETE': chalk.red,
        'OPTIONS': chalk.gray
    };
    const coloredMethod = (colors[method!] || chalk.white).bold(method);
    return coloredMethod.padEnd(16); // Padding for alignment (including ANSI codes length)
});

// Create a version of the color logic that handles the padding correctly since ANSI codes mess up .padEnd()
const getColoredMethod = (method: string) => {
    const colors: { [key: string]: any } = {
        'GET': chalk.cyan,
        'POST': chalk.blueBright,
        'PUT': chalk.magenta,
        'PATCH': chalk.yellow,
        'DELETE': chalk.red,
        'OPTIONS': chalk.gray
    };
    const methodStr = method.padEnd(7);
    return (colors[method] || chalk.white).bold(methodStr);
};

morgan.token('c-method-aligned', (req) => getColoredMethod(req.method!));

morgan.token('c-status', (req, res) => {
    const status = res.statusCode;
    const color = status >= 500 ? chalk.red : status >= 400 ? chalk.yellow : status >= 300 ? chalk.cyan : status >= 200 ? chalk.green : chalk.white;
    return color.bold(status.toString());
});

morgan.token('c-time-ms', (req, res, digits) => {
    const time = (morgan as any)['response-time'](req, res, digits);
    const timeStr = `${time} ms`.padStart(10);
    return chalk.italic.gray(timeStr);
});

morgan.token('c-url', (req: any) => chalk.gray(req.originalUrl || req.url));

// Log to Console (Colored & Aligned)
app.use(morgan(':c-time :c-method-aligned :c-status :c-time-ms :c-url', {
    skip: (req) => req.method === 'OPTIONS' // Skip noisy preflight requests
}));

// Log to File (Plain) and add to real-time buffer
const logFormat = '[:time] :method :status :response-time ms :url';
app.use(morgan(logFormat, { 
    stream: {
        write: (message: string) => {
            // Write to file
            accessLogStream.write(message);
            // Add to real-time buffer (trim newline)
            addLogEntry(message.trim());
        }
    }
}));

// Trust proxy - needed to get real client IP behind Render/Vercel/nginx
app.set('trust proxy', true);

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/maketicket')
    .then(() => console.log('🍃 MongoDB connected to MakeTicket DB'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

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
            console.log('Something went wrong...');
            console.dir(err);
            return;
        }
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
        
        // Schedule daily log backup to Google Drive
        scheduleDailyBackup();
    });
});

