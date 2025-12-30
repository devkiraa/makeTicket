'use client';

import React, { useState, useEffect } from 'react';
import { 
    CreditCard, 
    Crown, 
    Check, 
    X, 
    Zap, 
    Building2, 
    Calendar,
    Download,
    ChevronRight,
    AlertCircle,
    Loader2,
    History,
    Shield
} from 'lucide-react';
import { useRazorpay } from '@/hooks/useRazorpay';

// Simple date formatter to avoid date-fns dependency
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

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

interface PaymentHistory {
    _id: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    plan: string;
    razorpayPaymentId?: string;
    invoiceUrl?: string;
}

const PLANS = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        description: 'Perfect for getting started',
        features: [
            { text: '100 attendees per event', included: true },
            { text: '3 events per month', included: true },
            { text: '1 team member', included: true },
            { text: 'Basic email notifications', included: true },
            { text: 'Standard support', included: true },
            { text: 'Custom branding', included: false },
            { text: 'Priority email delivery', included: false },
            { text: 'Advanced analytics', included: false },
            { text: 'API access', included: false },
        ],
        buttonText: 'Current Plan',
        popular: false
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 999,
        description: 'Best for growing teams',
        features: [
            { text: '1,000 attendees per event', included: true },
            { text: 'Unlimited events', included: true },
            { text: '10 team members', included: true },
            { text: 'Priority email delivery', included: true },
            { text: 'Priority support', included: true },
            { text: 'Custom branding', included: true },
            { text: 'Advanced analytics', included: true },
            { text: 'Custom email templates', included: true },
            { text: 'Export data', included: true },
        ],
        buttonText: 'Upgrade to Pro',
        popular: true
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: -1, // Custom pricing
        description: 'For large organizations',
        features: [
            { text: 'Unlimited attendees', included: true },
            { text: 'Unlimited events', included: true },
            { text: 'Unlimited team members', included: true },
            { text: 'Dedicated email IPs', included: true },
            { text: 'Dedicated support manager', included: true },
            { text: 'Custom branding', included: true },
            { text: 'Full API access', included: true },
            { text: 'SLA guarantee', included: true },
            { text: 'Custom integrations', included: true },
        ],
        buttonText: 'Contact Sales',
        popular: false
    }
];

export default function BillingPage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [loadingSubscription, setLoadingSubscription] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const { 
        loading, 
        error, 
        setError, 
        getSubscription, 
        openUpgradeCheckout,
        cancelSubscription 
    } = useRazorpay();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        loadSubscription();
        loadPaymentHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadSubscription = async () => {
        setLoadingSubscription(true);
        const sub = await getSubscription();
        if (sub) {
            setSubscription(sub);
        }
        setLoadingSubscription(false);
    };

    const loadPaymentHistory = async () => {
        setLoadingHistory(true);
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const res = await fetch(`${API_URL}/payment/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPaymentHistory(data.payments || []);
            }
        } catch (err) {
            console.error('Failed to load payment history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleUpgrade = async (planId: string) => {
        if (planId === 'enterprise') {
            // Open contact sales page
            window.open('/contact?subject=Enterprise%20Plan', '_blank');
            return;
        }

        if (planId === 'free' || planId === subscription?.plan) {
            return;
        }

        setUpgrading(true);
        setError(null);
        setSuccessMessage('');

        openUpgradeCheckout(
            planId,
            () => {
                setSuccessMessage(`Successfully upgraded to ${planId.charAt(0).toUpperCase() + planId.slice(1)} plan!`);
                loadSubscription();
                loadPaymentHistory();
                setUpgrading(false);
            },
            (errorMsg) => {
                setError(errorMsg);
                setUpgrading(false);
            },
            () => {
                setUpgrading(false);
            }
        );
    };

    const handleCancelSubscription = async () => {
        setCancelling(true);
        const success = await cancelSubscription(cancelReason);
        if (success) {
            setSuccessMessage('Your subscription has been cancelled. You will continue to have access until the end of your billing period.');
            setShowCancelModal(false);
            loadSubscription();
        }
        setCancelling(false);
    };

    const getPlanIcon = (planId: string) => {
        switch (planId) {
            case 'free':
                return <Zap className="h-6 w-6 text-gray-600" />;
            case 'pro':
                return <Crown className="h-6 w-6 text-yellow-500" />;
            case 'enterprise':
                return <Building2 className="h-6 w-6 text-purple-600" />;
            default:
                return <Zap className="h-6 w-6" />;
        }
    };

    const formatPrice = (price: number) => {
        if (price === -1) return 'Custom';
        if (price === 0) return 'Free';
        return `₹${price}`;
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
            expired: 'bg-gray-100 text-gray-800',
            pending: 'bg-yellow-100 text-yellow-800'
        };
        return styles[status] || styles.pending;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Billing & Subscription
                    </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        Manage your subscription and view payment history
                    </p>
                </div>

                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="text-green-800">{successMessage}</span>
                        <button onClick={() => setSuccessMessage('')} className="ml-auto text-green-600 hover:text-green-800">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-red-800">{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* Current Subscription Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-indigo-600" />
                        Current Subscription
                    </h2>
                    
                    {loadingSubscription ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : subscription ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    {getPlanIcon(subscription.plan)}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                                            {subscription.plan} Plan
                                        </h3>
                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(subscription.status)}`}>
                                            {subscription.status}
                                        </span>
                                    </div>
                                </div>
                                
                                {subscription.currentPeriodEnd && subscription.plan !== 'free' && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {subscription.status === 'active' 
                                                ? `Renews on ${formatDate(subscription.currentPeriodEnd)}`
                                                : `Expires on ${formatDate(subscription.currentPeriodEnd)}`
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Plan Limits</h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-gray-600 dark:text-gray-400">Max Attendees/Event:</div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {subscription.limits.maxAttendeesPerEvent === -1 ? 'Unlimited' : subscription.limits.maxAttendeesPerEvent}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-400">Team Members:</div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {subscription.limits.maxTeamMembers === -1 ? 'Unlimited' : subscription.limits.maxTeamMembers}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-400">Custom Branding:</div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {subscription.limits.customBranding ? 'Yes' : 'No'}
                                    </div>
                                    <div className="text-gray-600 dark:text-gray-400">Priority Email:</div>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {subscription.limits.priorityEmail ? 'Yes' : 'No'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400">Unable to load subscription details.</p>
                    )}
                    
                    {/* Cancel Subscription Button */}
                    {subscription?.plan !== 'free' && subscription?.status === 'active' && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                                Cancel Subscription
                            </button>
                        </div>
                    )}
                </div>

                {/* Plans */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Available Plans
                    </h2>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        {PLANS.map((plan) => {
                            const isCurrentPlan = subscription?.plan === plan.id;
                            const canUpgrade = !isCurrentPlan && plan.id !== 'free' && (subscription?.plan === 'free' || plan.id === 'enterprise');
                            
                            return (
                                <div
                                    key={plan.id}
                                    className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 p-6 ${
                                        plan.popular 
                                            ? 'border-indigo-500 shadow-lg' 
                                            : isCurrentPlan
                                                ? 'border-green-500'
                                                : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    {plan.popular && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                            Most Popular
                                        </span>
                                    )}
                                    {isCurrentPlan && (
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                            Current Plan
                                        </span>
                                    )}
                                    
                                    <div className="flex items-center gap-2 mb-2">
                                        {getPlanIcon(plan.id)}
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {plan.name}
                                        </h3>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                            {formatPrice(plan.price)}
                                        </span>
                                        {plan.price > 0 && (
                                            <span className="text-gray-500 dark:text-gray-400">/month</span>
                                        )}
                                    </div>
                                    
                                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                                        {plan.description}
                                    </p>
                                    
                                    <ul className="space-y-3 mb-6">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-2">
                                                {feature.included ? (
                                                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                ) : (
                                                    <X className="h-5 w-5 text-gray-300 flex-shrink-0" />
                                                )}
                                                <span className={`text-sm ${
                                                    feature.included 
                                                        ? 'text-gray-700 dark:text-gray-300' 
                                                        : 'text-gray-400 dark:text-gray-500'
                                                }`}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    
                                    <button
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={isCurrentPlan || (loading || upgrading)}
                                        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                                            isCurrentPlan
                                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                                : plan.popular
                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                    : plan.id === 'enterprise'
                                                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {(loading || upgrading) && canUpgrade ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                {isCurrentPlan ? 'Current Plan' : plan.buttonText}
                                                {canUpgrade && <ChevronRight className="h-4 w-4" />}
                                            </>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Payment History */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <History className="h-5 w-5 text-indigo-600" />
                        Payment History
                    </h2>
                    
                    {loadingHistory ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : paymentHistory.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Date</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Plan</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Amount</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Invoice</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentHistory.map((payment) => (
                                        <tr key={payment._id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                                                {formatDate(payment.createdAt)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300 capitalize">
                                                {payment.plan} Plan
                                            </td>
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900 dark:text-white">
                                                {payment.currency === 'INR' ? '₹' : payment.currency} {payment.amount}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                    payment.status === 'captured' || payment.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : payment.status === 'failed'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {payment.status === 'captured' ? 'Paid' : payment.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {payment.invoiceUrl ? (
                                                    <a 
                                                        href={payment.invoiceUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 text-sm"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Download
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-600 dark:text-gray-400">No payment history yet</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                Your payments will appear here after your first upgrade
                            </p>
                        </div>
                    )}
                </div>

                {/* FAQ Section */}
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Frequently Asked Questions
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Can I upgrade or downgrade at any time?</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Yes, you can upgrade your plan at any time. When upgrading, you&apos;ll be charged the prorated amount for the remainder of your billing period.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">What happens when I cancel?</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                When you cancel, you&apos;ll continue to have access to Pro features until the end of your current billing period. After that, your account will revert to the Free plan.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Is my payment information secure?</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Yes! We use Razorpay, a PCI-DSS compliant payment processor. Your card details are never stored on our servers.
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Do you offer refunds?</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                We offer a 7-day money-back guarantee. If you&apos;re not satisfied with Pro within the first 7 days, contact us for a full refund.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Subscription Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            Cancel Subscription
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Are you sure you want to cancel your subscription? You&apos;ll lose access to Pro features at the end of your billing period.
                        </p>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Reason for cancellation (optional)
                            </label>
                            <textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Tell us why you&apos;re leaving..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                rows={3}
                            />
                        </div>
                        
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Keep Subscription
                            </button>
                            <button
                                onClick={handleCancelSubscription}
                                disabled={cancelling}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                                Cancel Subscription
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
