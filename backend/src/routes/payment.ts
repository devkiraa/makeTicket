import express from 'express';
import { verifyToken } from '../middleware/auth';
import {
    getPlanSummary,
    getSubscription,
    getPaymentHistory,
    createUpgradeOrder,
    verifyPayment,
    handleWebhook,
    cancelSubscription,
    downloadInvoice
} from '../controllers/subscriptionController';

const router = express.Router();

// Plan & Subscription Info
router.get('/plan-summary', verifyToken, getPlanSummary);
router.get('/subscription', verifyToken, getSubscription);
router.get('/history', verifyToken, getPaymentHistory);

// Payment Operations
router.post('/create-order', verifyToken, createUpgradeOrder);
router.post('/verify', verifyToken, verifyPayment);
router.post('/cancel-subscription', verifyToken, cancelSubscription);

// Webhooks (no auth - verified by signature)
router.post('/webhook', handleWebhook);

// Invoice Download
router.get('/invoice/:paymentId', verifyToken, downloadInvoice);

export default router;
