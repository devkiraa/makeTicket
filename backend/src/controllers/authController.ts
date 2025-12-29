import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import axios from 'axios';
import crypto from 'crypto';

import { Session } from '../models/Session';

// Helper to parse user agent
const parseUserAgent = (userAgent: string) => {
    let browser = 'Unknown';
    let os = 'Unknown';
    let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';

    // Detect browser
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edg/')) browser = 'Edge';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS') || userAgent.includes('Macintosh')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // Detect device type
    if (userAgent.includes('Mobile') || userAgent.includes('Android') && !userAgent.includes('Tablet')) {
        deviceType = 'mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
        deviceType = 'tablet';
    } else if (userAgent.includes('Windows') || userAgent.includes('Macintosh') || userAgent.includes('Linux')) {
        deviceType = 'desktop';
    }

    return { browser, os, deviceType };
};

// helper to create session
const createSession = async (userId: string, req: Request, loginMethod: 'email' | 'google' | 'impersonate' = 'email') => {
    const userAgent = req.headers['user-agent'] || 'Unknown';

    // Get IP address - check multiple sources
    let ipAddress =
        req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
        req.headers['x-real-ip']?.toString() ||
        req.ip ||
        req.socket.remoteAddress ||
        'Unknown';

    // Clean up IPv6 localhost
    if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
        ipAddress = '127.0.0.1 (localhost)';
    }
    // Remove IPv6 prefix from IPv4 addresses
    if (ipAddress.startsWith('::ffff:')) {
        ipAddress = ipAddress.replace('::ffff:', '');
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const { browser, os, deviceType } = parseUserAgent(userAgent);

    const session = await Session.create({
        userId,
        sessionToken,
        userAgent,
        ipAddress,
        browser,
        os,
        deviceType,
        loginMethod,
        expiresAt
    });

    return session;
};

// Helper to download image and convert to base64
const downloadImageAsBase64 = async (url: string): Promise<string | null> => {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 5000
        });
        const contentType = response.headers['content-type'] || 'image/jpeg';
        const base64 = Buffer.from(response.data, 'binary').toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (error) {
        console.error('Failed to download avatar image:', error);
        return null;
    }
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, role, name } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate username from email prefix
        let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        let username = baseUsername;

        // Check if username is already taken, if so append random numbers
        let usernameExists = await User.findOne({ username });
        let attempts = 0;
        while (usernameExists && attempts < 10) {
            username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
            usernameExists = await User.findOne({ username });
            attempts++;
        }

        // Create User
        const user = await User.create({
            email,
            password: hashedPassword,
            username,
            name: name || baseUsername,
            role: role || 'host'
        });

        res.status(201).json({ message: 'User created successfully', userId: user._id, username });
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

            // Generate unique username
            let baseUsername = profile.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            if (baseUsername.length < 3) baseUsername = 'user' + baseUsername;
            let username = baseUsername;
            let counter = 1;

            // Simple collision check (limit retries to avoid infinite loop)
            while ((await User.findOne({ username })) && counter < 100) {
                username = `${baseUsername}${counter}`;
                counter++;
            }
            // Fallback if super crowded (very unlikely)
            if (await User.findOne({ username })) {
                username = `${baseUsername}${Date.now()}`;
            }

            // Download the avatar image and convert to base64
            const avatarBase64 = await downloadImageAsBase64(profile.picture);

            user = await User.create({
                email: profile.email,
                username: username,
                name: profile.name, // Save Google name
                password: hashedPassword,
                googleId: profile.id,
                googleAvatar: profile.picture, // Store Google avatar URL for reference
                avatar: avatarBase64 || profile.picture, // Store base64 or fallback to URL
                role: 'user' // Default role for new signups
            });

            // Send welcome email to new users (async, don't wait)
            import('../services/systemEmailService').then(({ sendWelcomeEmail }) => {
                const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
                sendWelcomeEmail(profile.email, profile.name || profile.email.split('@')[0], loginUrl)
                    .catch((err: any) => console.log('Welcome email failed:', err.message));
            });
        } else {
            // Update googleId and googleAvatar (always keep in sync with Google)
            let updates: any = {
                googleAvatar: profile.picture // Always update Google avatar URL for reference
            };
            if (!user.googleId) updates.googleId = profile.id;
            // Only set name if missing
            if (!user.name && profile.name) updates.name = profile.name;
            // Set avatar to Google picture if:
            // 1. User doesn't have an avatar, OR
            // 2. User's current avatar is a Google URL (not a custom data:image upload)
            const isGoogleAvatar = user.avatar?.includes('googleusercontent.com');
            const hasNoAvatar = !user.avatar;
            const isNotBase64 = !user.avatar?.startsWith('data:');

            if (hasNoAvatar || isGoogleAvatar || (isNotBase64 && user.googleId)) {
                // Download and store as base64
                const avatarBase64 = await downloadImageAsBase64(profile.picture);
                if (avatarBase64) {
                    updates.avatar = avatarBase64;
                }
            }

            if (Object.keys(updates).length > 0) {
                user = await User.findByIdAndUpdate(user._id, updates, { new: true });
            }
        }

        // Create Session
        const session = await createSession(user!._id.toString(), req, 'google');

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

        let user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ message: 'Invalid credentials' });

        // Check if user is suspended
        // @ts-ignore
        if (user.status === 'suspended') {
            return res.status(403).json({
                message: 'Your account has been suspended.',
                // @ts-ignore
                reason: user.suspensionReason
            });
        }

        // Auto-generate username if not set
        // @ts-ignore
        if (!user.username) {
            let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            if (baseUsername.length < 3) baseUsername = 'user' + baseUsername;
            let username = baseUsername;
            let counter = 1;

            while ((await User.findOne({ username })) && counter < 100) {
                username = `${baseUsername}${counter}`;
                counter++;
            }
            if (await User.findOne({ username })) {
                username = `${baseUsername}${Date.now()}`;
            }

            user = await User.findByIdAndUpdate(user._id, { username }, { new: true });
        }

        // Create Session
        const session = await createSession(user!._id.toString(), req, 'email');

        const token = jwt.sign(
            { email: user!.email, id: user!._id, role: user!.role, sessionId: session._id },
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
        const user = await User.findById(userId).select('-password -smtpConfig');

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

// Forgot Password - Send Reset Email
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return success to prevent email enumeration attacks
        if (!user) {
            return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Token expires in 30 minutes
        const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);

        // Save hashed token to database
        user.resetToken = hashedToken;
        user.resetTokenExpiry = resetTokenExpiry;
        await user.save();

        // Build reset URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        // Send password reset email
        try {
            const { sendPasswordResetEmail } = await import('../services/systemEmailService');
            await sendPasswordResetEmail(
                email,
                user.name || email.split('@')[0],
                resetUrl,
                30 // expiry in minutes
            );
            console.log(`✅ Password reset email sent to ${email}`);
        } catch (emailError: any) {
            console.error('Failed to send password reset email:', emailError.message);
            // Don't fail the request if email fails - user can try again
        }

        res.status(200).json({
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
    } catch (error: any) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
};

// Reset Password - Verify Token and Update Password
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, email, password } = req.body;

        if (!token || !email || !password) {
            return res.status(400).json({ message: 'Token, email, and new password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // Find user with valid token
        const user = await User.findOne({
            email: email.toLowerCase(),
            resetToken: hashedToken,
            resetTokenExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired reset link. Please request a new password reset.'
            });
        }

        // Hash new password and save
        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();

        // Invalidate all existing sessions for security
        await Session.updateMany({ userId: user._id }, { isValid: false });

        res.status(200).json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error: any) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
};
