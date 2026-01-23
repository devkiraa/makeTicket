import express from 'express';
import { login, register, getProfile, forgotPassword, resetPassword, exchangeAuthCode } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';
import { authLimiter, passwordResetLimiter } from '../middleware/security';

export const authRouter = express.Router();

// Apply rate limiting to auth endpoints to prevent brute-force attacks
authRouter.post('/register', authLimiter, register);
authRouter.post('/login', authLimiter, login);
authRouter.get('/me', verifyToken, getProfile);
authRouter.post('/forgot-password', passwordResetLimiter, forgotPassword);
authRouter.post('/reset-password', authLimiter, resetPassword);

// OAuth auth code exchange (for secure token handoff from OAuth flow)
authRouter.post('/exchange-code', authLimiter, exchangeAuthCode);

// 2FA Routes
import { setup2FA, verify2FA, validate2FA, disable2FA } from '../controllers/authController';
authRouter.post('/2fa/setup', verifyToken, setup2FA);
authRouter.post('/2fa/verify', verifyToken, verify2FA);
authRouter.post('/2fa/validate', verifyToken, validate2FA);
authRouter.post('/2fa/disable', verifyToken, disable2FA);

