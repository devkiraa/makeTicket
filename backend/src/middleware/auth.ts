import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { Session } from '../models/Session';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    // Support token from: cookies, Authorization header, or query param (for SSE)
    const token = req.cookies.auth_token || 
                  req.headers.authorization?.split(' ')[1] ||
                  req.query.token as string;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized - No Token' });
    }

    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');

        // Session validation is REQUIRED
        if (!decoded.sessionId) {
            return res.status(401).json({ message: 'Unauthorized - Session required. Please log in again.' });
        }

        const session = await Session.findById(decoded.sessionId);

        // Check if session exists and is valid
        if (!session) {
            return res.status(401).json({ message: 'Unauthorized - Session not found. Please log in again.' });
        }

        if (!session.isValid) {
            return res.status(401).json({ message: 'Unauthorized - Session has been terminated.' });
        }

        // Check if session is expired
        if (session.expiresAt < new Date()) {
            return res.status(401).json({ message: 'Unauthorized - Session expired. Please log in again.' });
        }

        // Update lastActiveAt (throttled to every 5 minutes to reduce DB writes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (session.lastActiveAt < fiveMinutesAgo) {
            await Session.findByIdAndUpdate(decoded.sessionId, { lastActiveAt: new Date() });
        }

        // @ts-ignore
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized - Invalid Token' });
    }
};

/**
 * Optional authentication middleware
 * Attaches user to request if valid token exists, but doesn't block if no token
 * Useful for routes that work for both guests and logged-in users
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.auth_token || 
                  req.headers.authorization?.split(' ')[1] ||
                  req.query.token as string;

    if (!token) {
        // No token - continue as guest
        return next();
    }

    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');

        if (decoded.sessionId) {
            const session = await Session.findById(decoded.sessionId);
            
            // If session is valid, attach user
            if (session && session.isValid && session.expiresAt > new Date()) {
                // @ts-ignore
                req.user = decoded;
            }
        }
        
        next();
    } catch (error) {
        // Invalid token - continue as guest (don't block the request)
        next();
    }
};
