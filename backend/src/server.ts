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

// Log to File (Plain)
app.use(morgan('[:time] :method :status :response-time ms :url', { stream: accessLogStream }));

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 image uploads
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grabmypass')
    .then(() => console.log('🍃 MongoDB connected to GrabMyPass DB'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => res.send('GrabMyPass API Running'));
app.use('/api/auth', authRouter);
app.use('/api', apiRouter);
app.use('/api/admin', adminRouter);

// Start Server
app.listen(PORT, async () => {
    let publicIp = 'unknown';
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        publicIp = response.data.ip;
    } catch (e) {
        // ignore
    }

    figlet.text('GRABMYPASS-SERVER', {
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
Welcome to GrabMyPass-Server

Date:         ${new Date().toLocaleDateString()}
Time:         ${new Date().toLocaleTimeString()}
TimeStamp:    ${new Date().toISOString()}

HTTP server running on port ${PORT}
Your public IP address is: ${publicIp}
🔗 Local URL:  http://localhost:${PORT}
`);
    });
});

