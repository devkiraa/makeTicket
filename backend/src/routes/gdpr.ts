import express from 'express';
import { verifyToken } from '../middleware/auth';
import {
    requestDataDeletion,
    confirmDeletion,
    exportUserData
} from '../controllers/gdprController';

export const gdprRouter = express.Router();

// All routes require authentication
gdprRouter.use(verifyToken);

// Right to Erasure
gdprRouter.post('/delete-account/request', requestDataDeletion);
gdprRouter.post('/delete-account/confirm', confirmDeletion);

// Right to Access
gdprRouter.get('/export-data', exportUserData);
