import express from 'express';
import { login, register, getProfile } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

export const authRouter = express.Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', verifyToken, getProfile);
