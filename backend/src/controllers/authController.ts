import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import axios from 'axios';
import crypto from 'crypto';

import { Session } from '../models/Session';

// helper to create session
const createSession = async (userId: string, req: Request) => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown';
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

    const session = await Session.create({
        userId,
        userAgent,
        ipAddress,
        expiresAt
    });

    return session;
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create User
        const user = await User.create({
            email,
            password: hashedPassword,
            role: role || 'host'
        });

        res.status(201).json({ message: 'User created successfully', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

// Google Auth Redirect
export const googleAuthRedirect = (req: Request, res: Response) => {
    const returnUrl = req.query.returnUrl || '/dashboard';

    // Create state to preserve return URL and prevent CSRF
    // In production, sign this state
    const state = Buffer.from(JSON.stringify({ returnUrl })).toString('base64');

    const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
        return res.status(500).send("Google Auth not configured (Missing Client ID)");
    }

    const scope = 'email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}`;

    res.redirect(url);
};

export const googleAuthCallback = async (req: Request, res: Response) => {
    const { code, state } = req.query;

    if (!code) return res.status(400).send('No code provided');

    try {
        // Decode state
        let returnUrl = '/';
        if (state) {
            try {
                const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
                if (decodedState.returnUrl) returnUrl = decodedState.returnUrl;
            } catch (e) {
                console.error("Failed to decode state", e);
            }
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google/callback`;

        if (!clientId || !clientSecret) {
            return res.status(500).send("Google Auth not configured (Missing ID/Secret)");
        }

        // Exchange code for tokens
        const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
        });

        const { access_token } = tokenRes.data;

        // Get User Profile
        const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const profile = profileRes.data;

        // Find or Create User
        let user = await User.findOne({ email: profile.email });

        if (!user) {
            // Create new user
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 12);

            user = await User.create({
                email: profile.email,
                password: hashedPassword,
                googleId: profile.id,
                avatar: profile.picture, // Save Google Avatar
                role: 'host' // Default role
            });
        } else {
            // Update googleId and avatar if missing
            let updates: any = {};
            if (!user.googleId) updates.googleId = profile.id;
            // Always update avatar if it's currently from Google (matches old one) or if missing? 
            // For now, let's only set it if it's missing to respect user changes, 
            // OR if the user is logging in with Google we might want to sync their latest pic?
            // Let's just set it if missing for now to be safe.
            if (!user.avatar) updates.avatar = profile.picture;

            if (Object.keys(updates).length > 0) {
                user = await User.findByIdAndUpdate(user._id, updates, { new: true });
            }
        }

        // Create Session
        const session = await createSession(user!._id.toString(), req);

        // Generate JWT
        const token = jwt.sign(
            { email: user!.email, id: user!._id, role: user!.role, sessionId: session._id },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1d' }
        );

        // Redirect to Frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Append token to return URL
        // If returnUrl already has query params, append with &
        const separator = returnUrl.includes('?') ? '&' : '?';
        const finalUrl = `${frontendUrl}${returnUrl}${separator}token=${token}`;

        res.redirect(finalUrl);

    } catch (err: any) {
        console.error("Google Auth Error:", err?.response?.data || err.message);
        res.status(500).send("Authentication Failed");
    }
};

// Check Username Availability
export const checkUsernameAvailability = async (req: Request, res: Response) => {
    try {
        const { username } = req.query;
        if (!username || typeof username !== 'string') return res.status(400).send('Invalid username');

        const user = await User.findOne({ username });
        res.json({ available: !user });
    } catch (error) {
        res.status(500).json({ message: 'Error checking username', error });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { avatar, banner, name, username, password, newPassword, socials } = req.body;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (avatar !== undefined) user.avatar = avatar;
        if (banner !== undefined) user.banner = banner;
        if (name !== undefined) user.name = name;
        if (socials !== undefined) user.socials = socials;

        if (username !== undefined && username !== user.username) {
            // Check uniqueness
            const existing = await User.findOne({ username });
            if (existing) return res.status(400).json({ message: 'Username already taken' });
            user.username = username;
        }

        if (newPassword) {
            // If setting a new password
            // Optionally check old 'password' if currently set? 
            // If user logged in via Google, they might not have a password. 
            // If they have a password, we should verify it.
            if (user.password && !user.googleId) {
                if (!password) return res.status(400).json({ message: 'Current password required' });
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);
            user.password = hashedPassword;
        }

        await user.save();

        // Return updated user without password
        const updatedUser = user.toObject();
        // @ts-ignore
        delete updatedUser.password;

        res.status(200).json({ message: 'Profile updated', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update profile', error });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: 'Invalid credentials' });

        // Create Session
        const session = await createSession(user._id.toString(), req);

        const token = jwt.sign(
            { email: user.email, id: user._id, role: user.role, sessionId: session._id },
            process.env.JWT_SECRET || 'test_secret',
            { expiresIn: '1d' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(200).json({ result: user, token });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
};

export const getProfile = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Get event count
        // Need to import Event from '../models/Event' at the top, handling separately
        const eventCount = await import('../models/Event').then(m => m.Event.countDocuments({ hostId: userId }));

        res.status(200).json({
            ...user.toObject(),
            hostedEvents: eventCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch profile', error });
    }
};

export const getSessions = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const currentSessionId = req.user.sessionId;

        const sessions = await Session.find({ userId }).sort({ createdAt: -1 }).limit(10);

        const formattedSessions = sessions.map(session => ({
            id: session._id,
            userAgent: session.userAgent,
            ipAddress: session.ipAddress,
            lastActiveAt: session.lastActiveAt,
            isCurrent: session._id.toString() === currentSessionId,
            isValid: session.isValid
        }));

        res.status(200).json(formattedSessions);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch sessions', error });
    }
};

export const revokeSession = async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        // @ts-ignore
        const userId = req.user.id;

        // Verify ownership
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) return res.status(404).json({ message: 'Session not found' });

        session.isValid = false;
        await session.save();

        res.status(200).json({ message: 'Session revoked' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to revoke session', error });
    }
};
