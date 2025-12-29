import express from 'express';
import { login, register, getProfile, forgotPassword, resetPassword } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

export const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', verifyToken, getProfile);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
