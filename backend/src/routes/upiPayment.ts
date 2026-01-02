import express from 'express';
import { verifyToken } from '../middleware/auth';
import { verifyAdminOrHost } from '../middleware/hostOrAdmin';
import {
    uploadPaymentProof,
    getPendingPayments,
    verifyPaymentManual,
    verifyPaymentAuto,
    verifyBulkPayments,
    upload
} from '../controllers/paymentController';

const router = express.Router();

// Upload payment proof (authenticated users)
router.post('/tickets/:ticketId/payment-proof', verifyToken, upload.single('screenshot'), uploadPaymentProof);

// Get pending payment verifications (admin/host)
router.get('/pending-payments', verifyToken, verifyAdminOrHost, getPendingPayments);

// Manual verification (admin/host)
router.post('/tickets/:ticketId/verify-manual', verifyToken, verifyAdminOrHost, verifyPaymentManual);

// Auto-verification via Cloudflare Worker (admin/host)
router.post('/tickets/:ticketId/verify-auto', verifyToken, verifyAdminOrHost, verifyPaymentAuto);

// Bulk Verification
router.post('/bulk-verify', verifyToken, verifyAdminOrHost, verifyBulkPayments);

export default router;
