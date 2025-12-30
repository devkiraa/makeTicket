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
    renewSubscription,
    checkFeatureAccess,
    getPlanSummary,
    checkEventLimit,
    checkAttendeeLimit,
    getAvailablePlans
} from '../controllers/subscriptionController';

const router = express.Router();

// Public routes
router.get('/config', getRazorpayConfig);
router.get('/plans', getPlans);
router.get('/plans/available', getAvailablePlans); // Get plans with admin-configured limits

// Webhook route (no auth - uses signature verification)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes - require authentication
router.get('/subscription', verifyToken, getSubscription);
router.post('/upgrade', verifyToken, createUpgradeOrder);
router.post('/verify', verifyToken, verifyPayment);
router.get('/history', verifyToken, getPaymentHistory);
router.post('/cancel', verifyToken, cancelSubscription);
router.post('/renew', verifyToken, renewSubscription);
router.get('/feature/:feature', verifyToken, checkFeatureAccess);

// Plan limits checking routes
router.get('/plan-summary', verifyToken, getPlanSummary);
router.get('/limits/events', verifyToken, checkEventLimit);
router.get('/limits/attendees/:eventId', verifyToken, checkAttendeeLimit);

export default router;
