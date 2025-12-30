'use client';

import { useState, useCallback } from 'react';

interface RazorpayConfig {
    keyId: string;
    configured: boolean;
}

interface UpgradeOrderResponse {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    plan: string;
    planName: string;
    prefill: {
        name: string;
        email: string;
        contact: string;
    };
}

interface PaymentVerifyResponse {
    success: boolean;
    message: string;
    subscription?: {
        plan: string;
        status: string;
        validUntil: string;
    };
}

interface Subscription {
    plan: string;
    status: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    limits: {
        maxAttendeesPerEvent: number;
        maxEvents: number;
        maxTeamMembers: number;
        customBranding: boolean;
        priorityEmail: boolean;
        advancedAnalytics: boolean;
        apiAccess: boolean;
        customEmailTemplates: boolean;
        exportData: boolean;
    };
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill: {
        name: string;
        email: string;
        contact: string;
    };
    theme: {
        color: string;
    };
    handler: (response: RazorpayResponse) => void;
    modal?: {
        ondismiss?: () => void;
    };
}

interface RazorpayResponse {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
}

declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => {
            open: () => void;
            on: (event: string, callback: () => void) => void;
        };
    }
}

export function useRazorpay() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    // Load Razorpay script
    const loadScript = useCallback((): Promise<boolean> => {
        return new Promise((resolve) => {
            if (document.getElementById('razorpay-script')) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.id = 'razorpay-script';
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    }, []);

    // Get Razorpay config
    const getConfig = useCallback(async (): Promise<RazorpayConfig | null> => {
        try {
            const res = await fetch(`${API_URL}/payment/config`);
            if (res.ok) {
                return await res.json();
            }
            return null;
        } catch (err) {
            console.error('Failed to get Razorpay config:', err);
            return null;
        }
    }, [API_URL]);

    // Get current subscription
    const getSubscription = useCallback(async (): Promise<Subscription | null> => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return null;

            const res = await fetch(`${API_URL}/payment/subscription`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                return data.subscription;
            }
            return null;
        } catch (err) {
            console.error('Failed to get subscription:', err);
            return null;
        }
    }, [API_URL]);

    // Create upgrade order
    const createUpgradeOrder = useCallback(async (plan: string): Promise<UpgradeOrderResponse | null> => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setError('Please login to upgrade');
                return null;
            }

            const res = await fetch(`${API_URL}/payment/upgrade`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Failed to create upgrade order');
                return null;
            }

            return data;
        } catch {
            setError('Failed to create upgrade order');
            return null;
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    // Verify payment
    const verifyPayment = useCallback(async (
        razorpay_order_id: string,
        razorpay_payment_id: string,
        razorpay_signature: string
    ): Promise<PaymentVerifyResponse | null> => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setError('Please login to verify payment');
                return null;
            }

            const res = await fetch(`${API_URL}/payment/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Payment verification failed');
                return null;
            }

            return data;
        } catch {
            setError('Payment verification failed');
            return null;
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    // Open Razorpay checkout for upgrade
    const openUpgradeCheckout = useCallback(async (
        plan: string,
        onSuccess: (subscription: PaymentVerifyResponse['subscription']) => void,
        onError: (error: string) => void,
        onDismiss?: () => void
    ) => {
        // Load script first
        const scriptLoaded = await loadScript();
        if (!scriptLoaded) {
            onError('Failed to load payment gateway. Please refresh and try again.');
            return;
        }

        // Create order
        const orderData = await createUpgradeOrder(plan);
        if (!orderData) {
            onError(error || 'Failed to create order');
            return;
        }

        const options: RazorpayOptions = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            name: 'MakeTicket',
            description: `Upgrade to ${orderData.planName} Plan`,
            order_id: orderData.orderId,
            prefill: orderData.prefill,
            theme: {
                color: '#6366f1' // Indigo
            },
            handler: async (response: RazorpayResponse) => {
                // Verify payment
                const verifyResult = await verifyPayment(
                    response.razorpay_order_id,
                    response.razorpay_payment_id,
                    response.razorpay_signature
                );

                if (verifyResult?.success && verifyResult.subscription) {
                    onSuccess(verifyResult.subscription);
                } else {
                    onError(verifyResult?.message || 'Payment verification failed');
                }
            },
            modal: {
                ondismiss: () => {
                    if (onDismiss) onDismiss();
                }
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    }, [loadScript, createUpgradeOrder, verifyPayment, error]);

    // Cancel subscription
    const cancelSubscription = useCallback(async (reason?: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setError('Please login');
                return false;
            }

            const res = await fetch(`${API_URL}/payment/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || 'Failed to cancel subscription');
                return false;
            }

            return true;
        } catch {
            setError('Failed to cancel subscription');
            return false;
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    return {
        loading,
        error,
        setError,
        loadScript,
        getConfig,
        getSubscription,
        createUpgradeOrder,
        verifyPayment,
        openUpgradeCheckout,
        cancelSubscription
    };
}

