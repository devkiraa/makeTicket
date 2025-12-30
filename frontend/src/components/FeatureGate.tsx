'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { usePlanSummary, FeatureKey, LimitKey } from '@/hooks/use-plan-summary';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles, AlertTriangle } from 'lucide-react';

interface FeatureGateProps {
    /** Feature key to check */
    feature?: FeatureKey;
    /** Limit key to check (for quota-based gating) */
    limit?: LimitKey;
    /** Content to render when feature is available */
    children: ReactNode;
    /** Custom fallback when feature is locked (overrides default) */
    fallback?: ReactNode;
    /** Show inline lock badge instead of replacing content */
    mode?: 'replace' | 'badge' | 'disable' | 'hide';
    /** Custom message for the upgrade prompt */
    upgradeMessage?: string;
    /** Hide the upgrade button */
    hideUpgradeButton?: boolean;
    /** Callback when user tries to use locked feature */
    onLocked?: () => void;
}

const FEATURE_NAMES: Record<FeatureKey, string> = {
    customBranding: 'Custom Branding',
    removeMakeTicketBranding: 'Remove Branding',
    whiteLabel: 'White Label',
    customDomain: 'Custom Domain',
    priorityEmail: 'Priority Email Delivery',
    customEmailTemplates: 'Custom Email Templates',
    customSmtp: 'Custom SMTP',
    basicAnalytics: 'Basic Analytics',
    advancedAnalytics: 'Advanced Analytics',
    exportData: 'Data Export',
    realtimeDashboard: 'Realtime Dashboard',
    googleFormsIntegration: 'Google Forms Integration',
    googleSheetsIntegration: 'Google Sheets Integration',
    webhooks: 'Webhooks',
    apiAccess: 'API Access',
    zapierIntegration: 'Zapier Integration',
    acceptPayments: 'Accept Payments',
    multiCurrency: 'Multi-Currency',
    googleWalletPass: 'Google Wallet Pass',
    appleWalletPass: 'Apple Wallet Pass',
    emailSupport: 'Email Support',
    prioritySupport: 'Priority Support',
    dedicatedSupport: 'Dedicated Support',
    phoneSupport: 'Phone Support',
    slaGuarantee: 'SLA Guarantee',
    ssoIntegration: 'SSO Integration',
    auditLogs: 'Audit Logs',
    advancedSecurity: 'Advanced Security',
    waitlistManagement: 'Waitlist Management',
    recurringEvents: 'Recurring Events',
    privateEvents: 'Private Events',
    eventDuplication: 'Event Duplication',
    bulkImport: 'Bulk Import',
    checkInApp: 'Check-in App',
    qrScanning: 'QR Scanning'
};

const LIMIT_NAMES: Record<LimitKey, string> = {
    maxEventsPerMonth: 'events this month',
    maxEventsTotal: 'total events',
    maxAttendeesPerEvent: 'attendees per event',
    maxTotalAttendees: 'total attendees',
    maxTeamMembers: 'team members',
    maxCoordinatorsPerEvent: 'coordinators per event',
    maxEmailsPerMonth: 'emails this month',
    maxEmailTemplates: 'email templates',
    maxTicketTemplates: 'ticket templates',
    maxStorageMB: 'storage',
    maxFileUploadMB: 'file upload size',
    maxCustomFieldsPerEvent: 'custom fields per event',
    maxApiRequestsPerDay: 'API requests today'
};

/**
 * FeatureGate component for gating UI based on plan features/limits.
 * 
 * IMPORTANT: This is for UX purposes only. The backend MUST also enforce
 * these restrictions to prevent bypassing via API calls.
 * 
 * Usage:
 * ```tsx
 * <FeatureGate feature="acceptPayments">
 *   <PriceInput />
 * </FeatureGate>
 * 
 * <FeatureGate feature="advancedAnalytics" mode="badge">
 *   <AnalyticsChart />
 * </FeatureGate>
 * 
 * <FeatureGate limit="maxEventsPerMonth" mode="disable">
 *   <Button>Create Event</Button>
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
    feature,
    limit,
    children,
    fallback,
    mode = 'replace',
    upgradeMessage,
    hideUpgradeButton = false,
    onLocked
}: FeatureGateProps) {
    const router = useRouter();
    const { isFeatureLocked, isAtLimit, loading, summary } = usePlanSummary();

    // Determine if gated
    const isLocked = feature ? isFeatureLocked(feature) : false;
    const isOverLimit = limit ? isAtLimit(limit) : false;
    const isGated = isLocked || isOverLimit;

    // Handle click when locked (for disable mode)
    const handleLockedClick = () => {
        onLocked?.();
    };

    // Get display name for the feature/limit
    const getGatedName = () => {
        if (feature) return FEATURE_NAMES[feature] || feature;
        if (limit) return LIMIT_NAMES[limit] || limit;
        return 'This feature';
    };

    // Get upgrade message
    const getMessage = () => {
        if (upgradeMessage) return upgradeMessage;
        if (isOverLimit && limit) {
            return `You've reached your ${LIMIT_NAMES[limit]} limit.`;
        }
        return `${getGatedName()} is not available on your current plan.`;
    };

    // Loading state - show children but potentially disabled
    if (loading) {
        if (mode === 'hide') return null;
        return <>{children}</>;
    }

    // Not gated - show children
    if (!isGated) {
        return <>{children}</>;
    }

    // Custom fallback provided
    if (fallback) {
        return <>{fallback}</>;
    }

    // Different modes for gated content
    switch (mode) {
        case 'hide':
            return null;

        case 'badge':
            return (
                <div className="relative">
                    <div className="opacity-50 pointer-events-none select-none">
                        {children}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 backdrop-blur-[1px] rounded-lg">
                        <div className="flex flex-col items-center gap-2 p-4 text-center">
                            <div className="p-2 bg-amber-100 rounded-full">
                                <Lock className="h-5 w-5 text-amber-600" />
                            </div>
                            <p className="text-sm font-medium text-slate-700 max-w-xs">
                                {getMessage()}
                            </p>
                            {!hideUpgradeButton && summary?.plan !== 'enterprise' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-1 gap-1.5 bg-white"
                                    onClick={() => router.push('/dashboard/billing')}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Upgrade Plan
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            );

        case 'disable':
            return (
                <div
                    className="opacity-60 cursor-not-allowed"
                    onClick={handleLockedClick}
                    title={getMessage()}
                >
                    <div className="pointer-events-none">
                        {children}
                    </div>
                </div>
            );

        case 'replace':
        default:
            return (
                <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 text-center">
                    <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-full mb-4">
                        <Lock className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        {getGatedName()}
                    </h3>
                    <p className="text-sm text-slate-600 mb-4 max-w-sm mx-auto">
                        {getMessage()}
                    </p>
                    {!hideUpgradeButton && summary?.plan !== 'enterprise' && (
                        <Button
                            className="gap-2"
                            onClick={() => router.push('/dashboard/billing')}
                        >
                            <Sparkles className="h-4 w-4" />
                            Upgrade to Unlock
                        </Button>
                    )}
                </div>
            );
    }
}

/**
 * Hook-based check for use in event handlers and conditionals.
 * Use this when you need programmatic checks rather than component gating.
 */
export function useFeatureCheck() {
    const { isFeatureLocked, isAtLimit, hasFeature, summary, canUpgrade } = usePlanSummary();

    const checkFeature = (feature: FeatureKey): { allowed: boolean; message: string } => {
        const locked = isFeatureLocked(feature);
        return {
            allowed: !locked,
            message: locked
                ? `${FEATURE_NAMES[feature]} is not available on your ${summary?.planName || 'current'} plan.`
                : ''
        };
    };

    const checkLimit = (limit: LimitKey): { allowed: boolean; message: string } => {
        const atLimit = isAtLimit(limit);
        return {
            allowed: !atLimit,
            message: atLimit
                ? `You've reached your ${LIMIT_NAMES[limit]} limit.`
                : ''
        };
    };

    return {
        checkFeature,
        checkLimit,
        hasFeature,
        isFeatureLocked,
        isAtLimit,
        canUpgrade,
        plan: summary?.plan
    };
}

/**
 * Inline lock badge for form fields
 */
export function LockedBadge({ 
    feature, 
    limit,
    className = ''
}: { 
    feature?: FeatureKey; 
    limit?: LimitKey;
    className?: string;
}) {
    const { isFeatureLocked, isAtLimit } = usePlanSummary();
    const router = useRouter();

    const isGated = (feature && isFeatureLocked(feature)) || (limit && isAtLimit(limit));

    if (!isGated) return null;

    const name = feature ? FEATURE_NAMES[feature] : limit ? LIMIT_NAMES[limit] : '';

    return (
        <button
            type="button"
            onClick={() => router.push('/dashboard/billing')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full hover:bg-amber-100 transition-colors ${className}`}
            title={`Upgrade to unlock ${name}`}
        >
            <Lock className="h-3 w-3" />
            <span>Upgrade</span>
        </button>
    );
}

/**
 * Alert banner for when user is approaching or at a limit
 */
export function LimitWarning({
    limit,
    showAt = 80,
    className = ''
}: {
    limit: LimitKey;
    showAt?: number;
    className?: string;
}) {
    const { getUsagePercent, isAtLimit, getLimit, getUsage, getRemainingQuota } = usePlanSummary();
    const router = useRouter();

    const percent = getUsagePercent(limit);
    const atLimit = isAtLimit(limit);
    const limitValue = getLimit(limit);
    const usage = getUsage(limit);
    const remaining = getRemainingQuota(limit);

    // Don't show for unlimited
    if (limitValue === -1) return null;

    // Don't show if below threshold
    if (percent < showAt && !atLimit) return null;

    const isWarning = !atLimit;
    const name = LIMIT_NAMES[limit];

    return (
        <div className={`
            flex items-start gap-3 p-4 rounded-lg border
            ${atLimit
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }
            ${className}
        `}>
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${atLimit ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                    {atLimit
                        ? `You've reached your ${name} limit`
                        : `You're approaching your ${name} limit`
                    }
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                    {usage} / {limitValue} used
                    {!atLimit && ` (${remaining} remaining)`}
                </p>
            </div>
            <Button
                size="sm"
                variant={atLimit ? 'default' : 'outline'}
                className="flex-shrink-0"
                onClick={() => router.push('/dashboard/billing')}
            >
                Upgrade
            </Button>
        </div>
    );
}
