import { Request, Response } from 'express';
import { getSystemStats } from './adminController';
import { User } from '../models/User';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';

// Fully mock models
jest.mock('../models/User', () => ({
    User: {
        countDocuments: jest.fn().mockResolvedValue(100),
        find: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    select: jest.fn().mockResolvedValue([])
                })
            })
        })
    }
}));
jest.mock('../models/Event', () => ({
    Event: {
        countDocuments: jest.fn().mockResolvedValue(50)
    }
}));
jest.mock('../models/Ticket', () => ({
    Ticket: {
        countDocuments: jest.fn().mockResolvedValue(200)
    }
}));
jest.mock('../models/AuditLog', () => ({
    AuditLog: {
        countDocuments: jest.fn().mockResolvedValue(10)
    }
}));
jest.mock('../models/SecurityEvent', () => ({
    SecurityEvent: {
        countDocuments: jest.fn().mockResolvedValue(5)
    }
}));
jest.mock('../models/EmailLog', () => ({
    EmailLog: {
        countDocuments: jest.fn().mockResolvedValue(500)
    }
}));
jest.mock('../models/Session', () => ({
    Session: {
        countDocuments: jest.fn().mockResolvedValue(50)
    }
}));
jest.mock('../models/Payment', () => ({
    Payment: {
        countDocuments: jest.fn().mockResolvedValue(30),
        aggregate: jest.fn().mockResolvedValue([{ total: 1000 }])
    }
}));

// Mock external dependencies
jest.mock('../lib/redis', () => ({
    getCache: jest.fn().mockResolvedValue(null),
    setCache: jest.fn().mockResolvedValue(true)
}));
jest.mock('../lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() }
}));

describe('Admin Controller', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    describe('getSystemStats', () => {
        it('should return system stats successfully', async () => {
            await getSystemStats(mockReq as Request, mockRes as Response);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                stats: expect.objectContaining({
                    totalUsers: 100,
                    totalEvents: 50,
                    totalTickets: 200,
                    activeEvents: 50
                }),
                recentUsers: expect.any(Array)
            }));
        });

        it('should handle errors gracefully', async () => {
            (User.countDocuments as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

            await getSystemStats(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Failed to fetch system stats' });
        });
    });
});
