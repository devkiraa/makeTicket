import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || '',
    key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

interface CreateOrderOptions {
    amount: number; // Amount in rupees (will be converted to paise)
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
}

interface OrderResponse {
    id: string;
    entity: string;
    amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    receipt: string;
    status: string;
    attempts: number;
    notes: Record<string, string>;
    created_at: number;
}

/**
 * Create a Razorpay order
 */
export const createOrder = async (options: CreateOrderOptions): Promise<OrderResponse> => {
    const orderOptions = {
        amount: Math.round(options.amount * 100), // Convert to paise
        currency: options.currency || 'INR',
        receipt: options.receipt,
        notes: options.notes || {}
    };

    const order = await razorpay.orders.create(orderOptions);
    return order as OrderResponse;
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPaymentSignature = (
    orderId: string,
    paymentId: string,
    signature: string
): boolean => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
        throw new Error('RAZORPAY_KEY_SECRET not configured');
    }

    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
};

/**
 * Fetch payment details from Razorpay
 */
export const fetchPayment = async (paymentId: string) => {
    return await razorpay.payments.fetch(paymentId);
};

/**
 * Fetch order details from Razorpay
 */
export const fetchOrder = async (orderId: string) => {
    return await razorpay.orders.fetch(orderId);
};

/**
 * Create a refund
 */
export const createRefund = async (paymentId: string, amount?: number, notes?: Record<string, string>) => {
    const refundOptions: any = {};
    if (amount) {
        refundOptions.amount = Math.round(amount * 100); // Convert to paise
    }
    if (notes) {
        refundOptions.notes = notes;
    }

    return await razorpay.payments.refund(paymentId, refundOptions);
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (
    body: string,
    signature: string,
    webhookSecret: string
): boolean => {
    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
};

/**
 * Get Razorpay key ID (for frontend)
 */
export const getKeyId = (): string => {
    return process.env.RAZORPAY_KEY_ID || '';
};

/**
 * Check if Razorpay is configured
 */
export const isConfigured = (): boolean => {
    return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
};

export default razorpay;
