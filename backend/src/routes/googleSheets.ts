import express from 'express';
import { verifyToken } from '../middleware/auth';
import { requireGoogleSheetsIntegration } from '../middleware/planLimits';
import {
    checkSheetsAccess,
    getGoogleSheetsConnectUrl,
    googleSheetsCallback,
    createEventSpreadsheet,
    getEventSpreadsheet,
    unlinkSpreadsheet,
    syncRegistrationsToSheet
} from '../controllers/googleSheetsController';

export const googleSheetsRouter = express.Router();

// Public callback route (no auth required - user ID is in state param)
googleSheetsRouter.get('/callback', googleSheetsCallback);

// Protected routes
googleSheetsRouter.get('/access', verifyToken, requireGoogleSheetsIntegration, checkSheetsAccess);
googleSheetsRouter.get('/connect', verifyToken, requireGoogleSheetsIntegration, getGoogleSheetsConnectUrl);

// Event-specific routes
googleSheetsRouter.post('/events/:eventId/create', verifyToken, requireGoogleSheetsIntegration, createEventSpreadsheet);
googleSheetsRouter.get('/events/:eventId', verifyToken, requireGoogleSheetsIntegration, getEventSpreadsheet);
googleSheetsRouter.delete('/events/:eventId', verifyToken, requireGoogleSheetsIntegration, unlinkSpreadsheet);
googleSheetsRouter.post('/events/:eventId/sync', verifyToken, requireGoogleSheetsIntegration, syncRegistrationsToSheet);
