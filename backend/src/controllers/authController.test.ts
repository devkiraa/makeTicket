import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { register, login } from './authController';
import { User } from '../models/User';
import { Session } from '../models/Session';

// Fully mock models and dependencies to avoid Express/Supertest hanging
jest.mock('../models/User');
jest.mock('../models/Session', () => ({
    Session: {
        create: jest.fn().mockResolvedValue({ _id: 'mock-session-id' })
    }
}));
jest.mock('../models/SecurityEvent');
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn().mockReturnValue('mock-jwt-token')
}));
jest.mock('../services/loginNotificationService', () => ({
    isAccountLocked: jest.fn().mockReturnValue({ locked: false }),
    recordFailedLogin: jest.fn().mockResolvedValue({ locked: false, lockoutMinutes: 0 }),
    resetFailedLogins: jest.fn().mockResolvedValue(true),
    checkAndNotifyNewDevice: jest.fn().mockResolvedValue(true)
}));
jest.mock('../services/anomalyService', () => ({
    checkLoginAnomaly: jest.fn().mockResolvedValue(true),
    recordLoginHistory: jest.fn().mockResolvedValue(true)
}));
jest.mock('../utils/security', () => ({
    createSignedState: jest.fn().mockReturnValue('mocked-state'),
    verifySignedState: jest.fn().mockReturnValue({ returnUrl: '/' }),
    generateAuthCode: jest.fn().mockReturnValue('mocked-auth-code')
}));
jest.mock('../lib/redis', () => ({
    storeAuthCode: jest.fn().mockResolvedValue(true),
    consumeAuthCode: jest.fn().mockResolvedValue({ token: 'mocked-jwt' })
}));
jest.mock('../lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('Auth Controller (Unit)', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            body: {},
            headers: { 'user-agent': 'jest-test-agent' },
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' } as any,
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn(),
            cookie: jest.fn()
        };
        process.env.JWT_SECRET = 'test-secret';
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123', name: 'Test User' };
            (User.findOne as jest.Mock).mockResolvedValueOnce(null); // email not taken
            (User.findOne as jest.Mock).mockResolvedValueOnce(null); // username not taken
            (User.create as jest.Mock).mockResolvedValue({ _id: 'new-user-id' });

            await register(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User created successfully',
                userId: 'new-user-id',
                username: 'test'
            });
        });

        it('should return 400 if email is already taken', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123' };
            (User.findOne as jest.Mock).mockResolvedValueOnce({ email: 'test@example.com' });

            await register(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'User already exists' });
        });
    });

    describe('login', () => {
        it('should login successfully and set cookie', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123' };
            const hashedPassword = await bcrypt.hash('password123', 10);

            const mockUser = {
                _id: 'mock-user-id',
                email: 'test@example.com',
                password: hashedPassword,
                role: 'user',
                status: 'active'
            };

            (User.findOne as jest.Mock).mockResolvedValue(mockUser);
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockUser);

            await login(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.cookie).toHaveBeenCalledWith('auth_token', 'mock-jwt-token', expect.any(Object));
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                token: 'mock-jwt-token'
            }));
        });

        it('should return 401 for invalid password', async () => {
            mockReq.body = { email: 'test@example.com', password: 'wrongpassword' };
            const hashedPassword = await bcrypt.hash('password123', 10);

            (User.findOne as jest.Mock).mockResolvedValue({
                _id: 'mock-user-id',
                email: 'test@example.com',
                password: hashedPassword,
                status: 'active'
            });

            await login(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid email or password' });
        });
    });
});
