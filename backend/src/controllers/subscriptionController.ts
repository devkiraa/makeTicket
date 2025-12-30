import { Request, Response } from 'express';
import { Payment } from '../models/Payment';
import { Subscription, PLAN_CONFIGS } from '../models/Subscription';
import { User } from '../models/User';
import * as razorpayService from '../services/razorpayService';
import {
    getUserPlanSummary,
    checkCanCreateEvent,
    checkCanAddAttendee,
    getAllPlanConfigs,
    getUserPlan,
    checkFeatureAccess as checkPlanFeatureAccess
} from '../services/planLimitService';
import { generateInvoicePDF, generateInvoiceNumber, InvoiceData } from '../services/invoiceGenerator';
import crypto from 'crypto';
import path from 'path';

/**
 * Get Razorpay configuration (public key for frontend)
 */
export const getRazorpayConfig = async (req: Request, res: Response) => {
    try {
        res.json({
            keyId: razorpayService.getKeyId(),
            configured: razorpayService.isConfigured()
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to get Razorpay config', error: error.message });
    }
};

/**
 * Get user's current subscription
 */
export const getSubscription = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        let subscription = await Subscription.findOne({ userId });
        
        // Create default free subscription if none exists
        if (!subscription) {
            subscription = await Subscription.create({
                userId,
                plan: 'free',
                status: 'active',
                limits: PLAN_CONFIGS.free.limits
            });
        }

        res.json({
            subscription,
            planConfig: PLAN_CONFIGS[subscription.plan as keyof typeof PLAN_CONFIGS]
        });

    } catch (error: any) {
        console.error('Get subscription error:', error);
        res.status(500).json({ message: 'Failed to fetch subscription', error: error.message });
    }
};

/**
 * Get available plans
 */
export const getPlans = async (req: Request, res: Response) => {
    try {
        const plans = Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
            id: key,
            ...config
        }));

        res.json(plans);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch plans', error: error.message });
    }
};

/**
 * Create order to upgrade to paid plan
 */
export const createUpgradeOrder = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { plan } = req.body;

        // Validate plan
        if (!['starter', 'pro'].includes(plan)) {
            return res.status(400).json({ message: 'Invalid plan. Please choose Starter or Pro.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check current subscription
        const currentSub = await Subscription.findOne({ userId });
        if (currentSub !== null && currentSub.plan === plan && currentSub.status === 'active') {
            return res.status(400).json({ message: `You are already on the ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan` });
        }

        // Get plan config
        const planConfig = PLAN_CONFIGS[plan as keyof typeof PLAN_CONFIGS];
        if (!planConfig || !planConfig.price) {
            return res.status(400).json({ message: 'Plan configuration not found' });
        }

        const receipt = `${plan}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Create Razorpay order
        const order = await razorpayService.createOrder({
            amount: planConfig.price,
            currency: 'INR',
            receipt: receipt,
            notes: {
                userId: userId,
                plan: plan,
                userEmail: user.email
            }
        });

        // Store payment record
        await Payment.create({
            razorpayOrderId: order.id,
            userId: userId,
            amount: order.amount,
            currency: order.currency,
            status: 'created',
            type: 'subscription',
            plan: plan,
            receipt: receipt,
            notes: order.notes,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes expiry
        });

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: razorpayService.getKeyId(),
            plan: plan,
            planName: planConfig.name,
            prefill: {
                name: user.name || '',
                email: user.email,
                contact: ''
            }
        });

    } catch (error: any) {
        console.error('Create upgrade order error:', error);
        res.status(500).json({ message: 'Failed to create order', error: error.message });
    }
};

/**
 * Verify payment and activate subscription
 */
export const verifyPayment = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature 
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment verification parameters' });
        }

        // Find payment record
        const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id, userId });
        if (!payment) {
            return res.status(404).json({ message: 'Payment order not found' });
        }

        if (payment.status === 'paid') {
            return res.status(400).json({ message: 'Payment already verified' });
        }

        // Verify signature
        const isValid = razorpayService.verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            payment.status = 'failed';
            payment.failedAt = new Date();
            await payment.save();
            return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
        }

        // Fetch payment details from Razorpay
        const paymentDetails = await razorpayService.fetchPayment(razorpay_payment_id);

        // Update payment record
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.status = 'paid';
        payment.paidAt = new Date();
        payment.method = paymentDetails.method;
        payment.bank = paymentDetails.bank;
        payment.wallet = paymentDetails.wallet;
        payment.vpa = paymentDetails.vpa;
        await payment.save();

        // Activate/Update subscription
        const planConfig = PLAN_CONFIGS[payment.plan as keyof typeof PLAN_CONFIGS];
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription

        await Subscription.findOneAndUpdate(
            { userId },
            {
                userId,
                plan: payment.plan,
                status: 'active',
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                limits: planConfig.limits,
                lastPaymentId: razorpay_payment_id,
                lastPaymentDate: now,
                lastPaymentAmount: payment.amount / 100
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Payment verified! Your Pro plan is now active.',
            subscription: {
                plan: payment.plan,
                status: 'active',
                validUntil: periodEnd
            }
        });

    } catch (error: any) {
        console.error('Verify payment error:', error);
        res.status(500).json({ message: 'Payment verification failed', error: error.message });
    }
};

/**
 * Handle Razorpay webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'] as string;

        // Verify webhook signature if secret is configured
        if (webhookSecret && signature) {
            const isValid = razorpayService.verifyWebhookSignature(
                JSON.stringify(req.body),
                signature,
                webhookSecret
            );
            if (!isValid) {
                return res.status(400).json({ message: 'Invalid webhook signature' });
            }
        }

        const { event, payload } = req.body;

        switch (event) {
            case 'payment.captured':
                const capturedPayment = await Payment.findOne({ 
                    razorpayOrderId: payload.payment.entity.order_id 
                });
                if (capturedPayment && capturedPayment.status !== 'paid') {
                    capturedPayment.status = 'paid';
                    capturedPayment.razorpayPaymentId = payload.payment.entity.id;
                    capturedPayment.paidAt = new Date();
                    capturedPayment.method = payload.payment.entity.method;
                    await capturedPayment.save();
                }
                break;

            case 'payment.failed':
                const failedPayment = await Payment.findOne({ 
                    razorpayOrderId: payload.payment.entity.order_id 
                });
                if (failedPayment) {
                    failedPayment.status = 'failed';
                    failedPayment.failedAt = new Date();
                    await failedPayment.save();
                }
                break;

            case 'subscription.cancelled':
                // Handle subscription cancellation
                const cancelledSub = await Subscription.findOne({
                    razorpaySubscriptionId: payload.subscription.entity.id
                });
                if (cancelledSub) {
                    cancelledSub.status = 'cancelled';
                    cancelledSub.cancelledAt = new Date();
                    await cancelledSub.save();
                }
                break;

            default:
                console.log('Unhandled webhook event:', event);
        }

        res.json({ received: true });

    } catch (error: any) {
        console.error('Webhook error:', error);
        res.status(500).json({ message: 'Webhook processing failed', error: error.message });
    }
};

/**
 * Get payment history
 */
export const getPaymentHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const payments = await Payment.find({ userId, status: 'paid' })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(payments);

    } catch (error: any) {
        console.error('Get payment history error:', error);
        res.status(500).json({ message: 'Failed to fetch payment history', error: error.message });
    }
};

/**
 * Download invoice PDF for a specific payment
 */
export const downloadInvoice = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { paymentId } = req.params;

        // Find the payment
        const payment = await Payment.findOne({ _id: paymentId, userId, status: 'paid' });
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get plan details
        const planName = payment.plan ? payment.plan.charAt(0).toUpperCase() + payment.plan.slice(1) : 'Subscription';
        const planConfig = payment.plan ? PLAN_CONFIGS[payment.plan as keyof typeof PLAN_CONFIGS] : null;
        
        // Calculate amounts (stored in paise, convert to rupees)
        // As an individual seller (not GST registered), no tax breakdown required
        const amountInRupees = payment.amount / 100;

        // Generate invoice number
        const invoiceNumber = generateInvoiceNumber(
            payment.razorpayPaymentId || payment._id.toString(),
            payment.paidAt || payment.createdAt
        );

        // Build invoice data
        const invoiceData: InvoiceData = {
            invoiceNumber,
            invoiceDate: payment.paidAt || payment.createdAt,
            
            company: {
                name: 'MakeTicket',
                address: [
                    'Kiran S',
                    'Pathanamthitta, Kerala',
                    'India - 689691'
                ],
                email: 'kiran@maketicket.app',
                phone: '9446565036',
                website: 'https://maketicket.app',
                logo: path.join(__dirname, '../../../frontend/public/logo.png'),
                // No GST - Individual seller not registered under GST
            },
            
            customer: {
                name: user.name || user.email.split('@')[0],
                email: user.email,
            },
            
            payment: {
                method: payment.method || 'Online Payment',
                transactionId: payment.razorpayPaymentId || payment._id.toString(),
                status: 'Paid',
                paidAt: payment.paidAt || payment.createdAt
            },
            
            items: [
                {
                    description: `${planName} Plan Subscription - Monthly`,
                    quantity: 1,
                    unitPrice: amountInRupees,
                    amount: amountInRupees,
                }
            ],
            
            subtotal: amountInRupees,
            // No tax - Individual seller not registered under GST
            total: amountInRupees,
            currency: payment.currency || 'INR',
            
            notes: `Payment receipt for ${planName} Plan subscription. Thank you for choosing MakeTicket!`,
            terms: [
                'This is a payment receipt for digital services.',
                'Subscription auto-renews unless cancelled before the end of the billing period.',
                'Refund requests must be submitted within 7 days of payment.',
                'For any inquiries, please contact support@maketicket.in',
                'Subject to the Terms of Service available at maketicket.in/terms'
            ]
        };

        // Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData);

        // Check if user wants to view in browser or download
        const viewInBrowser = req.query.view === 'true';
        const filename = `MakeTicket_Receipt_${invoiceNumber}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', pdfBuffer.length);
        
        if (viewInBrowser) {
            // View in browser (inline)
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        } else {
            // Download as attachment
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }

        // Send PDF
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('Download invoice error:', error);
        res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
    }
};

/**
 * Cancel subscription (downgrade to free)
 */
export const cancelSubscription = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { reason } = req.body;

        const subscription = await Subscription.findOne({ userId });
        if (!subscription) {
            return res.status(404).json({ message: 'No subscription found' });
        }

        if (subscription.plan === 'free') {
            return res.status(400).json({ message: 'You are already on the free plan' });
        }

        if (subscription.status === 'cancelled') {
            return res.status(400).json({ message: 'Subscription is already cancelled' });
        }

        // Mark as cancelled - will downgrade at period end
        subscription.status = 'cancelled';
        subscription.cancelledAt = new Date();
        subscription.cancelReason = reason || 'User requested cancellation';
        await subscription.save();

        res.json({
            success: true,
            message: 'Subscription cancelled successfully. You will continue to have access until the end of your billing period.',
            subscription: {
                plan: subscription.plan,
                status: 'cancelled',
                validUntil: subscription.currentPeriodEnd,
                cancelledAt: subscription.cancelledAt
            }
        });

    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        res.status(500).json({ message: 'Failed to cancel subscription', error: error.message });
    }
};

/**
 * Renew/Reactivate a cancelled subscription
 */
export const renewSubscription = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const subscription = await Subscription.findOne({ userId });
        if (!subscription) {
            return res.status(404).json({ message: 'No subscription found' });
        }

        if (subscription.plan === 'free') {
            return res.status(400).json({ message: 'Cannot renew a free plan. Please upgrade instead.' });
        }

        if (subscription.status === 'active') {
            return res.status(400).json({ message: 'Subscription is already active' });
        }

        // Check if subscription hasn't expired yet
        const now = new Date();
        if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < now) {
            return res.status(400).json({ 
                message: 'Subscription has expired. Please create a new subscription.',
                expired: true
            });
        }

        // Reactivate the subscription
        subscription.status = 'active';
        subscription.cancelledAt = undefined;
        subscription.cancelReason = undefined;
        await subscription.save();

        res.json({
            success: true,
            message: 'Subscription renewed successfully! Your plan is now active again.',
            subscription: {
                plan: subscription.plan,
                status: 'active',
                validUntil: subscription.currentPeriodEnd
            }
        });

    } catch (error: any) {
        console.error('Renew subscription error:', error);
        res.status(500).json({ message: 'Failed to renew subscription', error: error.message });
    }
};

/**
 * Check if user has access to a feature
 */
export const checkFeatureAccess = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { feature } = req.params;

        const result = await checkPlanFeatureAccess(userId, feature);
        res.json({
            hasAccess: result.allowed,
            plan: await getUserPlan(userId),
            message: result.message
        });

    } catch (error: any) {
        res.status(500).json({ message: 'Failed to check feature access', error: error.message });
    }
};

/**
 * Get user's plan summary with usage stats
 */
export const getPlanSummary = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const summary = await getUserPlanSummary(userId);
        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to get plan summary', error: error.message });
    }
};

/**
 * Check if user can create an event (with remaining count)
 */
export const checkEventLimit = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const result = await checkCanCreateEvent(userId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to check event limit', error: error.message });
    }
};

/**
 * Check if event can accept more attendees
 */
export const checkAttendeeLimit = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { eventId } = req.params;
        const result = await checkCanAddAttendee(userId, eventId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to check attendee limit', error: error.message });
    }
};

/**
 * Get all available plans with dynamic config
 */
export const getAvailablePlans = async (req: Request, res: Response) => {
    try {
        const configs = await getAllPlanConfigs();
        res.json(configs);
    } catch (error: any) {
        res.status(500).json({ message: 'Failed to fetch plans', error: error.message });
    }
};
