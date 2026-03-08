import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

// Mock Redis BEFORE anything else is imported
jest.mock('../lib/redis', () => ({
    initRedis: jest.fn().mockResolvedValue(null),
    getRedisClient: jest.fn().mockReturnValue(null),
    isRedisAvailable: jest.fn().mockReturnValue(false),
    storeAuthCode: jest.fn().mockResolvedValue(true),
    consumeAuthCode: jest.fn().mockResolvedValue({ token: 'mock' })
}));

jest.mock('../lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() }
}));

// Import the actual routers
import { apiRouter } from './api';
import { adminRouter } from './admin';
import externalRouter from './external';
import { User } from '../models/User';
import { Session } from '../models/Session';

describe('Route Security Integration Tests', () => {
    let mongoServer: MongoMemoryServer;
    let app: express.Express;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        process.env.JWT_SECRET = 'test-secret';
        process.env.NODE_ENV = 'test';

        app = express();
        app.use(express.json());
        app.use(require('cookie-parser')());
        app.use('/api', apiRouter);
        app.use('/api/admin', adminRouter);
        app.use('/api/v1', externalRouter);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    afterEach(async () => {
        await User.deleteMany({});
        await Session.deleteMany({});
    });

    describe('Unauthenticated Access to Protected Routes', () => {
        const protectedApiEndpoints = [
            { method: 'get', path: '/api/auth/me' },
            { method: 'patch', path: '/api/auth/me' },
            { method: 'get', path: '/api/auth/sessions' },
            { method: 'post', path: '/api/events' },
            { method: 'get', path: '/api/events/my' },
            { method: 'get', path: '/api/events/check-slug' },
            { method: 'patch', path: '/api/events/update/123' },
            { method: 'delete', path: '/api/events/123' },
            { method: 'post', path: '/api/events/123/toggle-pause' },
            { method: 'get', path: '/api/events/123/attendees' },
            { method: 'get', path: '/api/events/123/coordinators' },
            { method: 'get', path: '/api/events/123/pending-tickets' },
            { method: 'post', path: '/api/tickets/123/approve' },
            { method: 'post', path: '/api/tickets/123/reject' },
            { method: 'post', path: '/api/validate' },
            { method: 'get', path: '/api/dashboard/stats' },
            { method: 'get', path: '/api/dashboard/attendees' },
            { method: 'post', path: '/api/coordinators' },
            { method: 'patch', path: '/api/coordinators/123' },
            { method: 'delete', path: '/api/coordinators/123' },
            { method: 'post', path: '/api/scan/check-in' },
            { method: 'get', path: '/api/email/gmail/auth' },
            { method: 'get', path: '/api/email/accounts' },
            { method: 'post', path: '/api/email/templates' },
            { method: 'get', path: '/api/email/logs' },
            { method: 'post', path: '/api/ticket-templates' },
            { method: 'get', path: '/api/ticket-templates' },
            { method: 'get', path: '/api/notifications' },
            { method: 'get', path: '/api/contacts' },
            { method: 'post', path: '/api/contacts/sync' },
            { method: 'get', path: '/api/api-keys' },
            { method: 'post', path: '/api/api-keys' }
        ];

        protectedApiEndpoints.forEach(({ method, path }) => {
            it(`should reject unauthenticated ${method.toUpperCase()} ${path} with 401`, async () => {
                const response = await (request(app) as any)[method](path);
                expect(response.status).toBe(401);
                expect(response.body).toHaveProperty('message', 'Unauthorized - No Token');
            });
        });

        const adminEndpoints = [
            { method: 'get', path: '/api/admin/stats' },
            { method: 'get', path: '/api/admin/server-status' },
            { method: 'get', path: '/api/admin/logs' },
            { method: 'delete', path: '/api/admin/logs' },
            { method: 'get', path: '/api/admin/users' },
            { method: 'get', path: '/api/admin/sessions' },
            { method: 'get', path: '/api/admin/settings' },
            { method: 'get', path: '/api/admin/email/stats' },
            { method: 'get', path: '/api/admin/revenue/stats' },
            { method: 'get', path: '/api/admin/plans' },
            { method: 'get', path: '/api/admin/email-templates' },
            { method: 'get', path: '/api/admin/security/events' },
            { method: 'get', path: '/api/admin/api-keys' }
        ];

        adminEndpoints.forEach(({ method, path }) => {
            it(`should reject unauthenticated admin ${method.toUpperCase()} ${path} with 401`, async () => {
                const response = await (request(app) as any)[method](path);
                expect(response.status).toBe(401);
                expect(response.body).toHaveProperty('message', 'Unauthorized - No Token');
            });
        });

        const externalApiEndpoints = [
            { method: 'get', path: '/api/v1/stats/overview' },
            { method: 'get', path: '/api/v1/stats/events' },
            { method: 'get', path: '/api/v1/stats/registrations' },
            { method: 'get', path: '/api/v1/events' },
            { method: 'get', path: '/api/v1/events/123' },
            { method: 'get', path: '/api/v1/events/123/registrations' },
            { method: 'get', path: '/api/v1/events/123/registrations/456' },
            { method: 'get', path: '/api/v1/me' }
        ];

        externalApiEndpoints.forEach(({ method, path }) => {
            it(`should reject unauthorized external ${method.toUpperCase()} ${path} with 401 API Key Missing`, async () => {
                const response = await (request(app) as any)[method](path);
                expect(response.status).toBe(401);
                expect(response.body).toEqual({ success: false, error: 'API key is missing' });
            });
        });
    });

    describe('Authenticated Role-Based Access Control', () => {
        let userToken: string;
        let adminToken: string;
        let userId: string;

        beforeEach(async () => {
            // Create regular user session
            const user = await User.create({ email: 'user@example.com', password: 'password123', username: 'user', role: 'user' });
            userId = user._id.toString();
            const session1 = await Session.create({ userId: user._id, sessionToken: 'token1', userAgent: 'test', ipAddress: '127.0.0.1', expiresAt: new Date(Date.now() + 1000000) });
            userToken = jwt.sign({ id: user._id, email: user.email, role: 'user', sessionId: session1._id }, process.env.JWT_SECRET!);

            // Create admin user session
            const admin = await User.create({ email: 'admin@example.com', password: 'password123', username: 'admin', role: 'admin' });
            const session2 = await Session.create({ userId: admin._id, sessionToken: 'token2', userAgent: 'test', ipAddress: '127.0.0.1', expiresAt: new Date(Date.now() + 1000000) });
            adminToken = jwt.sign({ id: admin._id, email: admin.email, role: 'admin', sessionId: session2._id }, process.env.JWT_SECRET!);
        });

        it('should block regular user from accessing Admin Routes (403 Forbidden)', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('message', 'Forbidden - Admin Access Required');
        });

        it('should allow Admin to access Admin Routes', async () => {
            const response = await request(app)
                .get('/api/admin/stats')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).not.toBe(403);
            expect(response.status).not.toBe(401);
        });

        it('should allow regular user to access their own profile', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${userToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('email', 'user@example.com');
        });
    });
});
