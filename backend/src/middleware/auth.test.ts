import { Request, Response, NextFunction } from 'express';
import { verifyToken, optionalAuth, requireAdmin } from './auth';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');
jest.mock('../models/Session', () => ({
    Session: {
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn()
    }
}));

import { Session } from '../models/Session';

describe('Auth Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            headers: {},
            cookies: {},
            query: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        nextFunction = jest.fn();
        process.env.JWT_SECRET = 'test-secret';
    });

    describe('verifyToken', () => {
        it('should return 401 if no token provided', async () => {
            await verifyToken(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized - No Token' });
        });

        it('should return 401 if token is invalid', async () => {
            mockReq.cookies = { auth_token: 'invalid-token' };
            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid token'); });

            await verifyToken(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized - Invalid Token' });
        });

        it('should return 401 if token has no sessionId', async () => {
            mockReq.headers = { authorization: 'Bearer valid-token' };
            const decodedToken = { id: 'user-id' }; // No sessionId

            (jwt.verify as jest.Mock).mockReturnValue(decodedToken);

            await verifyToken(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized - Session required. Please log in again.' });
        });

        it('should return 401 if session is invalid or expired', async () => {
            mockReq.cookies = { auth_token: 'valid-token' };
            const decodedToken = { id: 'user-id', sessionId: 'session-id' };

            (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
            (Session.findById as jest.Mock).mockResolvedValue({ isValid: false });

            await verifyToken(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Unauthorized - Session has been terminated.' });
        });

        it('should call next if valid token and session', async () => {
            mockReq.headers = { authorization: 'Bearer valid-token' };
            const decodedToken = { id: 'user-id', sessionId: 'session-id' };

            (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
            // Valid session, expires in the future, last active recently
            (Session.findById as jest.Mock).mockResolvedValue({
                isValid: true,
                expiresAt: new Date(Date.now() + 100000),
                lastActiveAt: new Date()
            });

            await verifyToken(mockReq as Request, mockRes as Response, nextFunction);

            expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
            expect(nextFunction).toHaveBeenCalled();
            // @ts-ignore
            expect(mockReq.user).toBeDefined();
        });
    });

    describe('optionalAuth', () => {
        it('should call next without user if no token', async () => {
            await optionalAuth(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            // @ts-ignore
            expect(mockReq.user).toBeUndefined();
        });

        it('should call next with user if valid token', async () => {
             mockReq.headers = { authorization: 'Bearer valid-token' };
            const decodedToken = { id: 'user-id', sessionId: 'session-id' };

            (jwt.verify as jest.Mock).mockReturnValue(decodedToken);
            (Session.findById as jest.Mock).mockResolvedValue({
                isValid: true,
                expiresAt: new Date(Date.now() + 100000)
            });

            await optionalAuth(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            // @ts-ignore
            expect(mockReq.user).toBeDefined();
        });

         it('should call next without user if token is invalid', async () => {
             mockReq.headers = { authorization: 'Bearer invalid-token' };
            (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('Invalid'); });

            await optionalAuth(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            // @ts-ignore
            expect(mockReq.user).toBeUndefined();
        });
    });

    describe('requireAdmin', () => {
        it('should call next if user is admin', () => {
            // @ts-ignore
            mockReq.user = { role: 'admin' };

            requireAdmin(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should return 403 if user is not admin', () => {
            // @ts-ignore
            mockReq.user = { role: 'user' };

            requireAdmin(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden - Admin Access Required' });
        });

        it('should return 403 if no user', () => {
            requireAdmin(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Forbidden - Admin Access Required' });
        });
    });
});
