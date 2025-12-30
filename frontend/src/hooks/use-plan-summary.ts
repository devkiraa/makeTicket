'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { authFetch, getApiUrl } from '@/lib/api';

export interface PlanSummary {
    plan: string;
    planName?: string;
    planDescription?: string;
    limits?: Record<string, number>;
    features?: Record<string, boolean>;
    usage?: Record<string, number>;
    themeColor?: string;
}

// Feature keys for type safety
export type FeatureKey =
    | 'customBranding'
    | 'removeMakeTicketBranding'
    | 'whiteLabel'
    | 'customDomain'
    | 'priorityEmail'
    | 'customEmailTemplates'
    | 'customSmtp'
    | 'basicAnalytics'
    | 'advancedAnalytics'
    | 'exportData'
    | 'realtimeDashboard'
    | 'googleFormsIntegration'
    | 'googleSheetsIntegration'
    | 'webhooks'
    | 'apiAccess'
    | 'zapierIntegration'
    | 'acceptPayments'
    | 'multiCurrency'
    | 'googleWalletPass'
    | 'appleWalletPass'
    | 'emailSupport'
    | 'prioritySupport'
    | 'dedicatedSupport'
    | 'phoneSupport'
    | 'slaGuarantee'
    | 'ssoIntegration'
    | 'auditLogs'
    | 'advancedSecurity'
    | 'waitlistManagement'
    | 'recurringEvents'
    | 'privateEvents'
    | 'eventDuplication'
    | 'bulkImport'
    | 'checkInApp'
    | 'qrScanning';

// Limit keys for type safety
export type LimitKey =
    | 'maxEventsPerMonth'
    | 'maxEventsTotal'
    | 'maxAttendeesPerEvent'
    | 'maxTotalAttendees'
    | 'maxTeamMembers'
    | 'maxCoordinatorsPerEvent'
    | 'maxEmailsPerMonth'
    | 'maxEmailTemplates'
    | 'maxTicketTemplates'
    | 'maxStorageMB'
    | 'maxFileUploadMB'
    | 'maxCustomFieldsPerEvent'
    | 'maxApiRequestsPerDay';

export interface UsePlanSummaryReturn {
    summary: PlanSummary | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    // Feature helpers
    hasFeature: (feature: FeatureKey) => boolean;
    isFeatureLocked: (feature: FeatureKey) => boolean;
    // Limit helpers
    getLimit: (limit: LimitKey) => number;
    getUsage: (limit: LimitKey) => number;
    isAtLimit: (limit: LimitKey) => boolean;
    getRemainingQuota: (limit: LimitKey) => number;
    getUsagePercent: (limit: LimitKey) => number;
    // Plan helpers
    isPaidPlan: boolean;
    isEnterprise: boolean;
    canUpgrade: boolean;
}

export function usePlanSummary(): UsePlanSummaryReturn {
    const [summary, setSummary] = useState<PlanSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await authFetch(`${getApiUrl()}/payment/plan-summary`);
            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(text || `Failed to load plan summary (${res.status})`);
            }

            const data = (await res.json()) as PlanSummary;
            setSummary(data);
        } catch (e: any) {
            setError(e?.message || 'Failed to load plan summary');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Feature check helpers
    const hasFeature = useCallback((feature: FeatureKey): boolean => {
        if (!summary?.features) return false;
        return summary.features[feature] === true;
    }, [summary]);

    const isFeatureLocked = useCallback((feature: FeatureKey): boolean => {
        if (!summary?.features) return true; // Assume locked if no data
        return summary.features[feature] !== true;
    }, [summary]);

    // Limit helpers
    const getLimit = useCallback((limit: LimitKey): number => {
        if (!summary?.limits) return 0;
        return summary.limits[limit] ?? 0;
    }, [summary]);

    const getUsage = useCallback((limit: LimitKey): number => {
        if (!summary?.usage) return 0;
        // Map limit keys to usage keys
        const usageKeyMap: Record<LimitKey, string> = {
            maxEventsPerMonth: 'eventsThisMonth',
            maxEventsTotal: 'eventsTotal',
            maxAttendeesPerEvent: 'attendeesThisEvent',
            maxTotalAttendees: 'attendeesTotal',
            maxTeamMembers: 'teamMembers',
            maxCoordinatorsPerEvent: 'coordinatorsThisEvent',
            maxEmailsPerMonth: 'emailsThisMonth',
            maxEmailTemplates: 'emailTemplates',
            maxTicketTemplates: 'ticketTemplates',
            maxStorageMB: 'storageMB',
            maxFileUploadMB: 'fileUploadMB',
            maxCustomFieldsPerEvent: 'customFieldsThisEvent',
            maxApiRequestsPerDay: 'apiRequestsToday'
        };
        return summary.usage[usageKeyMap[limit]] ?? 0;
    }, [summary]);

    const isAtLimit = useCallback((limit: LimitKey): boolean => {
        const limitValue = getLimit(limit);
        if (limitValue === -1) return false; // Unlimited
        const usage = getUsage(limit);
        return usage >= limitValue;
    }, [getLimit, getUsage]);

    const getRemainingQuota = useCallback((limit: LimitKey): number => {
        const limitValue = getLimit(limit);
        if (limitValue === -1) return -1; // Unlimited
        const usage = getUsage(limit);
        return Math.max(0, limitValue - usage);
    }, [getLimit, getUsage]);

    const getUsagePercent = useCallback((limit: LimitKey): number => {
        const limitValue = getLimit(limit);
        if (limitValue === -1) return 0; // Unlimited shows as 0%
        if (limitValue === 0) return 100; // Avoid division by zero
        const usage = getUsage(limit);
        return Math.min(100, Math.round((usage / limitValue) * 100));
    }, [getLimit, getUsage]);

    // Plan type helpers
    const isPaidPlan = useMemo(() => {
        return summary?.plan !== 'free';
    }, [summary]);

    const isEnterprise = useMemo(() => {
        return summary?.plan === 'enterprise';
    }, [summary]);

    const canUpgrade = useMemo(() => {
        return summary?.plan !== 'enterprise';
    }, [summary]);

    return {
        summary,
        loading,
        error,
        refresh: load,
        hasFeature,
        isFeatureLocked,
        getLimit,
        getUsage,
        isAtLimit,
        getRemainingQuota,
        getUsagePercent,
        isPaidPlan,
        isEnterprise,
        canUpgrade
    };
}
