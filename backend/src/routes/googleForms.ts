import express from 'express';
import { verifyToken } from '../middleware/auth';
import { requireGoogleFormsIntegration } from '../middleware/planLimits';
import {
    checkGoogleFormsAccess,
    getGoogleFormsConnectUrl,
    googleFormsCallback,
    listGoogleForms,
    getGoogleForm,
    disconnectGoogleForms
} from '../controllers/googleFormsController';

export const googleFormsRouter = express.Router();

// Public callback route (no auth required - user ID is in state param)
googleFormsRouter.get('/callback', googleFormsCallback);

// Protected routes
googleFormsRouter.get('/access', verifyToken, requireGoogleFormsIntegration, checkGoogleFormsAccess);
googleFormsRouter.get('/connect', verifyToken, requireGoogleFormsIntegration, getGoogleFormsConnectUrl);
googleFormsRouter.get('/list', verifyToken, requireGoogleFormsIntegration, listGoogleForms);
googleFormsRouter.get('/form/:formId', verifyToken, requireGoogleFormsIntegration, getGoogleForm);
googleFormsRouter.delete('/disconnect', verifyToken, requireGoogleFormsIntegration, disconnectGoogleForms);
