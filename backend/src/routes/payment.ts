import express from 'express';
import { verifyToken } from '../middleware/auth';
import {
    getRazorpayConfig,
    getSubscription,
    getPlans,
    createUpgradeOrder,
    verifyPayment,
    handleWebhook,
    getPaymentHistory,
    cancelSubscription,
    checkFeatureAccess
} from '../controllers/subscriptionController';

const router = express.Router();

// Public routes
router.get('/config', getRazorpayConfig);
router.get('/plans', getPlans);

// Webhook route (no auth - uses signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes - require authentication
router.get('/subscription', verifyToken, getSubscription);
router.post('/upgrade', verifyToken, createUpgradeOrder);
router.post('/verify', verifyToken, verifyPayment);
router.get('/history', verifyToken, getPaymentHistory);
router.post('/cancel', verifyToken, cancelSubscription);
router.get('/feature/:feature', verifyToken, checkFeatureAccess);

export default router;
