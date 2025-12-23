import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { Session } from '../models/Session';

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized - No Token' });
    }

    try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');

        // Check Session Validity if sessionId is present
        if (decoded.sessionId) {
            const session = await Session.findById(decoded.sessionId);
            if (!session || !session.isValid) {
                return res.status(401).json({ message: 'Unauthorized - Session Invalid or Expired' });
            }
            // Optional: Update lastActiveAt (debounced in real app)
            // await Session.findByIdAndUpdate(decoded.sessionId, { lastActiveAt: new Date() });
        }

        // @ts-ignore
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized - Invalid Token' });
    }
};
