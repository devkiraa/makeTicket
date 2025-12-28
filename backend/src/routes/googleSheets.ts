import express from 'express';
import { verifyToken } from '../middleware/auth';
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
googleSheetsRouter.get('/access', verifyToken, checkSheetsAccess);
googleSheetsRouter.get('/connect', verifyToken, getGoogleSheetsConnectUrl);

// Event-specific routes
googleSheetsRouter.post('/events/:eventId/create', verifyToken, createEventSpreadsheet);
googleSheetsRouter.get('/events/:eventId', verifyToken, getEventSpreadsheet);
googleSheetsRouter.delete('/events/:eventId', verifyToken, unlinkSpreadsheet);
googleSheetsRouter.post('/events/:eventId/sync', verifyToken, syncRegistrationsToSheet);
