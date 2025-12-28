import express from 'express';
import { verifyToken } from '../middleware/auth';
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
googleFormsRouter.get('/access', verifyToken, checkGoogleFormsAccess);
googleFormsRouter.get('/connect', verifyToken, getGoogleFormsConnectUrl);
googleFormsRouter.get('/list', verifyToken, listGoogleForms);
googleFormsRouter.get('/form/:formId', verifyToken, getGoogleForm);
googleFormsRouter.delete('/disconnect', verifyToken, disconnectGoogleForms);
