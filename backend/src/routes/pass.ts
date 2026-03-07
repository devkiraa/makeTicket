import express from 'express';
import { createPass, getHostPasses, purchasePass } from '../controllers/passController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// Protected routes for organizers
router.post('/', verifyToken, createPass);
router.get('/host', verifyToken, getHostPasses);

// Public/Attendee route to purchase a pass
router.post('/:passId/purchase', purchasePass); // Add verifyToken if required for attendees

export default router;
