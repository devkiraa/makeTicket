import express from 'express';
import { cancelTicket } from '../controllers/waitlistController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// Route for attendees to cancel their ticket, triggering waitlist promotion
router.post('/tickets/:ticketId/cancel', verifyToken, cancelTicket);

export default router;
