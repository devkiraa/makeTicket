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
    Shield,
    Rocket,
    RefreshCcw,
    BarChart3,
    Users,
    CalendarDays,
    Mail,
    Palette,
    FileText,
    Eye
} from 'lucide-react';
import { useRazorpay } from '@/hooks/useRazorpay';

// Simple date formatter to avoid date-fns dependency
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

interface PlanUsage {
    plan: string;
    planName: string;
    planDescription?: string;
    limits: {
        maxEventsPerMonth: number;
        maxAttendeesPerEvent: number;
        maxTotalAttendeesPerMonth: number;
        maxCoordinatorsPerEvent: number;
        maxEmailTemplates: number;
        maxTicketTemplates: number;
        maxCustomFields: number;
        maxFileUploadSizeMB: number;
        maxStorageMB: number;
        emailsPerDay: number;
        emailsPerMonth: number;
        apiRequestsPerDay: number;
        apiRequestsPerMonth: number;
    };
    features: {
        emailNotifications: boolean;
        customBranding: boolean;
        advancedAnalytics: boolean;
        apiAccess: boolean;
        customEmailTemplates: boolean;
        customTicketTemplates: boolean;
        exportData: boolean;
        prioritySupport: boolean;
        [key: string]: boolean;
    };
    usage: {
        eventsThisMonth: number;
        eventsTotal: number;
        attendeesTotal: number;
        teamMembers: number;
        emailsThisMonth: number;
        emailTemplates: number;
        ticketTemplates: number;
        storageMB: number;
        apiRequestsToday: number;
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
        period: 'forever',
        description: 'Perfect for trying out MakeTicket',
        features: [
            { text: '50 attendees per event', included: true },
            { text: '2 events per month', included: true },
            { text: '1 team member', included: true },
            { text: 'Basic email notifications', included: true },
            { text: 'QR code tickets', included: true },
            { text: 'Custom email templates', included: false },
            { text: 'Export data', included: false },
            { text: 'Priority support', included: false },
        ],
        buttonText: 'Current Plan',
        popular: false,
        color: 'slate'
    },
    {
        id: 'starter',
        name: 'Starter',
        price: 49,
        period: '/month',
        description: 'Great for small events',
        features: [
            { text: '200 attendees per event', included: true },
            { text: '5 events per month', included: true },
            { text: '2 team members', included: true },
            { text: 'Email notifications', included: true },
            { text: 'Custom email templates', included: true },
            { text: 'Export attendee data', included: true },
            { text: 'Custom branding', included: false },
            { text: 'Advanced analytics', included: false },
        ],
        buttonText: 'Upgrade to Starter',
        popular: false,
        color: 'blue'
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 499,
        period: '/month',
        description: 'For growing organizers',
        features: [
            { text: '1,000 attendees per event', included: true },
            { text: 'Unlimited events', included: true },
            { text: '10 team members', included: true },
            { text: 'Priority email delivery', included: true },
            { text: 'Custom branding', included: true },
            { text: 'Advanced analytics', included: true },
            { text: 'Custom email templates', included: true },
            { text: 'Export data & reports', included: true },
        ],
        buttonText: 'Upgrade to Pro',
        popular: true,
        color: 'indigo'
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: -1, // Custom pricing
        period: '',
        description: 'For large organizations',
        features: [
            { text: 'Unlimited attendees', included: true },
            { text: 'Unlimited events', included: true },
            { text: 'Unlimited team members', included: true },
            { text: 'Dedicated support manager', included: true },
            { text: 'Full API access', included: true },
            { text: 'White-label solution', included: true },
            { text: 'SLA guarantee (99.9%)', included: true },
            { text: 'Custom integrations', included: true },
        ],
        buttonText: 'Contact Sales',
        popular: false,
        color: 'purple'
    }
];

export default function BillingPage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [planUsage, setPlanUsage] = useState<PlanUsage | null>(null);
    const [loadingSubscription, setLoadingSubscription] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [loadingUsage, setLoadingUsage] = useState(true);
    const [upgrading, setUpgrading] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [renewing, setRenewing] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const {
        loading,
        error,
        setError,
        getSubscription,
        openUpgradeCheckout,
        cancelSubscription,
        renewSubscription
    } = useRazorpay();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        loadSubscription();
        loadPaymentHistory();
        loadPlanUsage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadPlanUsage = async () => {
        setLoadingUsage(true);
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const res = await fetch(`${API_URL}/payment/plan-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPlanUsage(data);
            }
        } catch (err) {
            console.error('Failed to load plan usage:', err);
        } finally {
            setLoadingUsage(false);
        }
    };

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
                // Handle both array and object response formats
                const payments = Array.isArray(data) ? data : (data.payments || []);
                setPaymentHistory(payments);
            }
        } catch (err) {
            console.error('Failed to load payment history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleViewInvoice = async (paymentId: string) => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const res = await fetch(`${API_URL}/payment/invoice/${paymentId}?view=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            } else {
                // Check if response is JSON before parsing
                const contentType = res.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    const errorData = await res.json();
                    console.error('Failed to view receipt:', errorData);
                }
                setError('Failed to view receipt. Please try again.');
            }
        } catch (err) {
            console.error('Failed to view receipt:', err);
            setError('Failed to view receipt. Please try again.');
        }
    };

    const handleDownloadInvoice = async (paymentId: string) => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            const res = await fetch(`${API_URL}/payment/invoice/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Extract filename from Content-Disposition header or use default
                const contentDisposition = res.headers.get('Content-Disposition');
                const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
                a.download = filenameMatch ? filenameMatch[1] : `MakeTicket_Receipt_${paymentId}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                // Check if response is JSON before parsing
                const contentType = res.headers.get('content-type');
                if (contentType?.includes('application/json')) {
                    const errorData = await res.json();
                    console.error('Failed to download receipt:', errorData);
                }
                setError('Failed to download receipt. Please try again.');
            }
        } catch (err) {
            console.error('Failed to download receipt:', err);
            setError('Failed to download receipt. Please try again.');
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
            setCancelReason('');
            loadSubscription();
        }
        setCancelling(false);
    };

    const handleRenewSubscription = async () => {
        setRenewing(true);
        setError(null);
        const success = await renewSubscription();
        if (success) {
            setSuccessMessage('Your subscription has been renewed successfully! Your plan is now active again.');
            loadSubscription();
        }
        setRenewing(false);
    };

    const getPlanIcon = (planId: string) => {
        switch (planId) {
            case 'free':
                return <Zap className="h-6 w-6 text-gray-600" />;
            case 'starter':
                return <Rocket className="h-6 w-6 text-blue-500" />;
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

                    {/* Renew Subscription Button - Show when cancelled but not expired */}
                    {subscription?.plan !== 'free' && subscription?.status === 'cancelled' && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Subscription cancelled
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        You&apos;ll continue to have access until {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'the end of your billing period'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleRenewSubscription}
                                    disabled={renewing}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                                >
                                    {renewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                                    Renew Subscription
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Plan Usage Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Plan Usage
                    </h2>

                    {loadingUsage ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : planUsage ? (
                        <div className="space-y-6">
                            {/* Usage Progress Bars */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Events This Month */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <CalendarDays className="h-4 w-4" />
                                            Events This Month
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {planUsage.usage.eventsThisMonth} / {planUsage.limits.maxEventsPerMonth === -1 ? '∞' : planUsage.limits.maxEventsPerMonth}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div
                                            className={`h-2.5 rounded-full transition-all ${planUsage.limits.maxEventsPerMonth === -1 ? 'bg-green-500' :
                                                    (planUsage.usage.eventsThisMonth / planUsage.limits.maxEventsPerMonth) > 0.9 ? 'bg-red-500' :
                                                        (planUsage.usage.eventsThisMonth / planUsage.limits.maxEventsPerMonth) > 0.7 ? 'bg-yellow-500' : 'bg-indigo-600'
                                                }`}
                                            style={{
                                                width: planUsage.limits.maxEventsPerMonth === -1
                                                    ? '100%'
                                                    : `${Math.min((planUsage.usage.eventsThisMonth / planUsage.limits.maxEventsPerMonth) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Total Attendees */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Users className="h-4 w-4" />
                                            Total Attendees
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {planUsage.usage.attendeesTotal} / {planUsage.limits.maxTotalAttendeesPerMonth === -1 ? '∞' : planUsage.limits.maxTotalAttendeesPerMonth}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div
                                            className={`h-2.5 rounded-full transition-all ${planUsage.limits.maxTotalAttendeesPerMonth === -1 ? 'bg-green-500' :
                                                    (planUsage.usage.attendeesTotal / planUsage.limits.maxTotalAttendeesPerMonth) > 0.9 ? 'bg-red-500' :
                                                        (planUsage.usage.attendeesTotal / planUsage.limits.maxTotalAttendeesPerMonth) > 0.7 ? 'bg-yellow-500' : 'bg-indigo-600'
                                                }`}
                                            style={{
                                                width: planUsage.limits.maxTotalAttendeesPerMonth === -1
                                                    ? '100%'
                                                    : `${Math.min((planUsage.usage.attendeesTotal / planUsage.limits.maxTotalAttendeesPerMonth) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Email Templates */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Mail className="h-4 w-4" />
                                            Email Templates
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {planUsage.usage.emailTemplates} / {planUsage.limits.maxEmailTemplates === -1 ? '∞' : planUsage.limits.maxEmailTemplates}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div
                                            className={`h-2.5 rounded-full transition-all ${planUsage.limits.maxEmailTemplates === -1 ? 'bg-green-500' :
                                                    (planUsage.usage.emailTemplates / planUsage.limits.maxEmailTemplates) > 0.9 ? 'bg-red-500' :
                                                        (planUsage.usage.emailTemplates / planUsage.limits.maxEmailTemplates) > 0.7 ? 'bg-yellow-500' : 'bg-indigo-600'
                                                }`}
                                            style={{
                                                width: planUsage.limits.maxEmailTemplates === -1
                                                    ? '100%'
                                                    : `${Math.min((planUsage.usage.emailTemplates / planUsage.limits.maxEmailTemplates) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Ticket Templates */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <FileText className="h-4 w-4" />
                                            Ticket Templates
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {planUsage.usage.ticketTemplates} / {planUsage.limits.maxTicketTemplates === -1 ? '∞' : planUsage.limits.maxTicketTemplates}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div
                                            className={`h-2.5 rounded-full transition-all ${planUsage.limits.maxTicketTemplates === -1 ? 'bg-green-500' :
                                                    (planUsage.usage.ticketTemplates / planUsage.limits.maxTicketTemplates) > 0.9 ? 'bg-red-500' :
                                                        (planUsage.usage.ticketTemplates / planUsage.limits.maxTicketTemplates) > 0.7 ? 'bg-yellow-500' : 'bg-indigo-600'
                                                }`}
                                            style={{
                                                width: planUsage.limits.maxTicketTemplates === -1
                                                    ? '100%'
                                                    : `${Math.min((planUsage.usage.ticketTemplates / planUsage.limits.maxTicketTemplates) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Coordinators */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Users className="h-4 w-4" />
                                            Team Members
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {planUsage.usage.teamMembers} / {planUsage.limits.maxCoordinatorsPerEvent === -1 ? '∞' : planUsage.limits.maxCoordinatorsPerEvent}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div
                                            className={`h-2.5 rounded-full transition-all ${planUsage.limits.maxCoordinatorsPerEvent === -1 ? 'bg-green-500' :
                                                    (planUsage.usage.teamMembers / planUsage.limits.maxCoordinatorsPerEvent) > 0.9 ? 'bg-red-500' :
                                                        (planUsage.usage.teamMembers / planUsage.limits.maxCoordinatorsPerEvent) > 0.7 ? 'bg-yellow-500' : 'bg-indigo-600'
                                                }`}
                                            style={{
                                                width: planUsage.limits.maxCoordinatorsPerEvent === -1
                                                    ? '100%'
                                                    : `${Math.min((planUsage.usage.teamMembers / planUsage.limits.maxCoordinatorsPerEvent) * 100, 100)}%`
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Key Features */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Available Features</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className={`flex items-center gap-2 text-sm ${planUsage.features.customBranding ? 'text-green-600' : 'text-gray-400'}`}>
                                        {planUsage.features.customBranding ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        <span>Custom Branding</span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm ${planUsage.features.advancedAnalytics ? 'text-green-600' : 'text-gray-400'}`}>
                                        {planUsage.features.advancedAnalytics ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        <span>Advanced Analytics</span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm ${planUsage.features.apiAccess ? 'text-green-600' : 'text-gray-400'}`}>
                                        {planUsage.features.apiAccess ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        <span>API Access</span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm ${planUsage.features.exportData ? 'text-green-600' : 'text-gray-400'}`}>
                                        {planUsage.features.exportData ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        <span>Export Data</span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm ${planUsage.features.customEmailTemplates ? 'text-green-600' : 'text-gray-400'}`}>
                                        {planUsage.features.customEmailTemplates ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        <span>Custom Email Templates</span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm ${planUsage.features.customTicketTemplates ? 'text-green-600' : 'text-gray-400'}`}>
                                        {planUsage.features.customTicketTemplates ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        <span>Custom Ticket Templates</span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm ${planUsage.features.prioritySupport ? 'text-green-600' : 'text-gray-400'}`}>
                                        {planUsage.features.prioritySupport ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        <span>Priority Support</span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-sm ${planUsage.features.emailNotifications ? 'text-green-600' : 'text-gray-400'}`}>
                                        {planUsage.features.emailNotifications ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                        <span>Email Notifications</span>
                                    </div>
                                </div>
                            </div>

                            {/* Upgrade CTA if on free */}
                            {planUsage.plan === 'free' && (
                                <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div>
                                            <p className="font-medium text-indigo-900 dark:text-indigo-200">Need more capacity?</p>
                                            <p className="text-sm text-indigo-700 dark:text-indigo-300">Upgrade your plan to unlock more events, attendees, and premium features.</p>
                                        </div>
                                        <button
                                            onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
                                        >
                                            <Zap className="h-4 w-4" />
                                            View Plans
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400">Unable to load usage information.</p>
                    )}
                </div>

                {/* Plans */}
                <div className="mb-8" id="plans-section">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                        Available Plans
                    </h2>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {PLANS.map((plan) => {
                            const isCurrentPlan = subscription?.plan === plan.id;
                            const planOrder = ['free', 'starter', 'pro', 'enterprise'];
                            const currentPlanIndex = planOrder.indexOf(subscription?.plan || 'free');
                            const thisPlanIndex = planOrder.indexOf(plan.id);
                            const canUpgrade = !isCurrentPlan && thisPlanIndex > currentPlanIndex;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 p-6 ${plan.popular
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
                                                <span className={`text-sm ${feature.included
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
                                        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isCurrentPlan
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
                                                {payment.currency === 'INR' ? '₹' : payment.currency} {(payment.amount / 100).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'captured' || payment.status === 'completed'
                                                        ? 'bg-green-100 text-green-800'
                                                        : payment.status === 'failed'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {payment.status === 'captured' ? 'Paid' : payment.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => handleViewInvoice(payment._id)}
                                                        className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 inline-flex items-center gap-1 text-sm cursor-pointer"
                                                        title="View Receipt"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadInvoice(payment._id)}
                                                        className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        title="Download Receipt"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Download
                                                    </button>
                                                </div>
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
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Cancel Subscription
                            </h3>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Are you sure you want to cancel your <span className="font-medium capitalize">{subscription?.plan}</span> subscription?
                        </p>

                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>What happens next:</strong>
                            </p>
                            <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                                <li>• You&apos;ll keep access until {subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : 'end of billing period'}</li>
                                <li>• After that, you&apos;ll be moved to the Free plan</li>
                                <li>• You can renew anytime before the period ends</li>
                            </ul>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Help us improve - Why are you cancelling? (optional)
                            </label>
                            <select
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
                            >
                                <option value="">Select a reason...</option>
                                <option value="Too expensive">Too expensive</option>
                                <option value="Not using it enough">Not using it enough</option>
                                <option value="Missing features">Missing features I need</option>
                                <option value="Found alternative">Found an alternative</option>
                                <option value="Technical issues">Technical issues</option>
                                <option value="Temporary - will return">Just temporary, will return later</option>
                                <option value="Other">Other</option>
                            </select>
                            {cancelReason === 'Other' && (
                                <textarea
                                    placeholder="Please tell us more..."
                                    onChange={(e) => setCancelReason(e.target.value || 'Other')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                    rows={2}
                                />
                            )}
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setCancelReason('');
                                }}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
                            >
                                Keep Subscription
                            </button>
                            <button
                                onClick={handleCancelSubscription}
                                disabled={cancelling}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                            >
                                {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
