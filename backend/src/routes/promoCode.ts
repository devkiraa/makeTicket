import express from 'express';
import {
    createPromoCode,
    getEventPromoCodes,
    validatePromoCode,
    togglePromoCodeStatus
} from '../controllers/promoCodeController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// Public route for attendees to check promo codes
router.post('/validate', validatePromoCode);

// Protected routes for organizers
router.post('/', verifyToken, createPromoCode);
router.get('/event/:eventId', verifyToken, getEventPromoCodes);
router.patch('/:id/toggle', verifyToken, togglePromoCodeStatus);

export default router;
