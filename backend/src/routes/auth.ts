import express from 'express';
import { login, register, getProfile, forgotPassword, resetPassword } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

export const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', verifyToken, getProfile);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

// 2FA Routes
import { setup2FA, verify2FA, validate2FA, disable2FA } from '../controllers/authController';
authRouter.post('/2fa/setup', verifyToken, setup2FA);
authRouter.post('/2fa/verify', verifyToken, verify2FA);
authRouter.post('/2fa/validate', verifyToken, validate2FA);
authRouter.post('/2fa/disable', verifyToken, disable2FA);
