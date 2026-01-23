'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Settings,
    Save,
    RotateCcw,
    Users,
    Calendar,
    Mail,
    CreditCard,
    Zap,
    Database,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Crown,
    Sparkles,
    Building2,
    User,
    Palette,
    Info,
    TrendingUp,
    BarChart3,
    Globe,
    Wallet,
    Headphones,
    Lock,
    CalendarCheck,
    ChevronRight,
    Edit3,
    Eye,
    Layers,
    Search,
    X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PlanLimits {
    maxEventsPerMonth: number;
    maxEventsTotal: number;
    maxAttendeesPerEvent: number;
    maxTotalAttendees: number;
    maxTeamMembers: number;
    maxCoordinatorsPerEvent: number;
    maxEmailsPerMonth: number;
    maxEmailTemplates: number;
    maxTicketTemplates: number;
    maxStorageMB: number;
    maxFileUploadMB: number;
    maxCustomFieldsPerEvent: number;
    maxApiRequestsPerDay: number;
}

interface PlanFeatures {
    customBranding: boolean;
    removeMakeTicketBranding: boolean;
    whiteLabel: boolean;
    customDomain: boolean;
    priorityEmail: boolean;
    customEmailTemplates: boolean;
    customSmtp: boolean;
    basicAnalytics: boolean;
    advancedAnalytics: boolean;
    exportData: boolean;
    realtimeDashboard: boolean;
    googleFormsIntegration: boolean;
    googleSheetsIntegration: boolean;
    webhooks: boolean;
    apiAccess: boolean;
    zapierIntegration: boolean;
    acceptPayments: boolean;
    multiCurrency: boolean;
    googleWalletPass: boolean;
    appleWalletPass: boolean;
    emailSupport: boolean;
    prioritySupport: boolean;
    dedicatedSupport: boolean;
    phoneSupport: boolean;
    slaGuarantee: boolean;
    ssoIntegration: boolean;
    auditLogs: boolean;
    advancedSecurity: boolean;
    waitlistManagement: boolean;
    recurringEvents: boolean;
    privateEvents: boolean;
    eventDuplication: boolean;
    bulkImport: boolean;
    checkInApp: boolean;
    qrScanning: boolean;
}

interface PlanConfig {
    _id?: string;
    planId: string;
    name: string;
    description: string;
    price: number | null;
    isActive: boolean;
    limits: PlanLimits;
    features: PlanFeatures;
    badge?: string;
    themeColor: string;
    displayOrder: number;
}

const PLAN_ICONS = {
    free: User,
    starter: Zap,
    pro: Crown,
    enterprise: Building2
};

const PLAN_GRADIENTS = {
    free: 'from-slate-500 to-slate-600',
    starter: 'from-emerald-500 to-teal-600',
    pro: 'from-indigo-500 to-purple-600',
    enterprise: 'from-amber-500 to-orange-600'
};

const LIMIT_LABELS: Record<keyof PlanLimits, { label: string; description: string; icon: typeof Calendar; category: string }> = {
    maxEventsPerMonth: { label: 'Events / Month', description: 'Max events per month (-1 = unlimited)', icon: Calendar, category: 'Events' },
    maxEventsTotal: { label: 'Total Events', description: 'Max total events ever (-1 = unlimited)', icon: Calendar, category: 'Events' },
    maxAttendeesPerEvent: { label: 'Attendees / Event', description: 'Max attendees per event', icon: Users, category: 'Events' },
    maxTotalAttendees: { label: 'Total Attendees', description: 'Across all events', icon: Users, category: 'Events' },
    maxTeamMembers: { label: 'Team Members', description: 'For collaboration', icon: Users, category: 'Team' },
    maxCoordinatorsPerEvent: { label: 'Coordinators / Event', description: 'Per event limit', icon: Users, category: 'Team' },
    maxEmailsPerMonth: { label: 'Emails / Month', description: 'Outbound emails', icon: Mail, category: 'Communication' },
    maxEmailTemplates: { label: 'Email Templates', description: 'Custom templates', icon: Mail, category: 'Communication' },
    maxTicketTemplates: { label: 'Ticket Designs', description: 'Custom ticket templates', icon: CreditCard, category: 'Design' },
    maxStorageMB: { label: 'Storage (MB)', description: 'Total storage', icon: Database, category: 'Storage' },
    maxFileUploadMB: { label: 'Max Upload (MB)', description: 'Per file limit', icon: Database, category: 'Storage' },
    maxCustomFieldsPerEvent: { label: 'Custom Fields', description: 'Form fields per event', icon: Settings, category: 'Customization' },
    maxApiRequestsPerDay: { label: 'API Calls / Day', description: 'Daily API limit', icon: Zap, category: 'API' }
};

const FEATURE_CATEGORIES: Record<string, { icon: typeof Calendar; features: string[] }> = {
    'Branding': { icon: Palette, features: ['customBranding', 'removeMakeTicketBranding', 'whiteLabel', 'customDomain'] },
    'Email': { icon: Mail, features: ['priorityEmail', 'customEmailTemplates', 'customSmtp'] },
    'Analytics': { icon: BarChart3, features: ['basicAnalytics', 'advancedAnalytics', 'exportData', 'realtimeDashboard'] },
    'Integrations': { icon: Globe, features: ['googleFormsIntegration', 'googleSheetsIntegration', 'webhooks', 'apiAccess', 'zapierIntegration'] },
    'Payments': { icon: CreditCard, features: ['acceptPayments', 'multiCurrency'] },
    'Wallet Passes': { icon: Wallet, features: ['googleWalletPass', 'appleWalletPass'] },
    'Support': { icon: Headphones, features: ['emailSupport', 'prioritySupport', 'dedicatedSupport', 'phoneSupport', 'slaGuarantee'] },
    'Security': { icon: Lock, features: ['ssoIntegration', 'auditLogs', 'advancedSecurity'] },
    'Event Features': { icon: CalendarCheck, features: ['waitlistManagement', 'recurringEvents', 'privateEvents', 'eventDuplication', 'bulkImport', 'checkInApp', 'qrScanning'] }
};

const formatFeatureName = (feature: string): string => {
    return feature
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

const formatLimitValue = (value: number): string => {
    if (value === -1) return '∞';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
};

export default function PlanConfigPage() {
    const [plans, setPlans] = useState<PlanConfig[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<string>('free');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [featureSearch, setFeatureSearch] = useState('');
    const { toast } = useToast();

    const fetchPlans = useCallback(async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/plans`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch plans');
            const data = await res.json();
            setPlans(data.configs);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load plan configurations', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const currentPlan = plans.find(p => p.planId === selectedPlan);

    const updatePlanField = (field: string, value: string | number | boolean | null) => {
        setPlans(prev => prev.map(p =>
            p.planId === selectedPlan ? { ...p, [field]: value } : p
        ));
        setHasChanges(true);
    };

    const updateLimit = (limitKey: keyof PlanLimits, value: number) => {
        setPlans(prev => prev.map(p =>
            p.planId === selectedPlan
                ? { ...p, limits: { ...p.limits, [limitKey]: value } }
                : p
        ));
        setHasChanges(true);
    };

    const updateFeature = (featureKey: keyof PlanFeatures, value: boolean) => {
        setPlans(prev => prev.map(p =>
            p.planId === selectedPlan
                ? { ...p, features: { ...p.features, [featureKey]: value } }
                : p
        ));
        setHasChanges(true);
    };

    const setAllFeatures = (value: boolean) => {
        setPlans(prev => prev.map(p => {
            if (p.planId !== selectedPlan) return p;
            const nextFeatures = { ...p.features };
            (Object.keys(nextFeatures) as (keyof PlanFeatures)[]).forEach(key => {
                nextFeatures[key] = value;
            });
            return { ...p, features: nextFeatures };
        }));
        setHasChanges(true);
    };

    const savePlan = async () => {
        if (!currentPlan) return;
        setSaving(true);

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/plans/${selectedPlan}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: currentPlan.name,
                    description: currentPlan.description,
                    price: currentPlan.price,
                    isActive: currentPlan.isActive,
                    badge: currentPlan.badge,
                    themeColor: currentPlan.themeColor,
                    limits: currentPlan.limits,
                    features: currentPlan.features
                })
            });

            if (!res.ok) throw new Error('Failed to save');

            toast({ title: 'Saved', description: `${currentPlan.name} plan updated successfully` });
            setHasChanges(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save plan configuration', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const resetPlan = async () => {
        if (!confirm('Reset this plan to default settings? This cannot be undone.')) return;

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/plans/${selectedPlan}/reset`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to reset');

            toast({ title: 'Reset', description: 'Plan configuration reset to defaults' });
            fetchPlans();
            setHasChanges(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to reset plan configuration', variant: 'destructive' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-slate-500">Loading plan configurations...</p>
                </div>
            </div>
        );
    }

    const orderedPlans = [...plans].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    const enabledFeaturesCount = currentPlan ? Object.values(currentPlan.features).filter(Boolean).length : 0;
    const totalFeaturesCount = currentPlan ? Object.keys(currentPlan.features).length : 0;

    // Filter features based on search
    const filteredCategories = Object.entries(FEATURE_CATEGORIES).map(([category, data]) => ({
        category,
        icon: data.icon,
        features: data.features.filter(f =>
            featureSearch === '' || formatFeatureName(f).toLowerCase().includes(featureSearch.toLowerCase())
        )
    })).filter(c => c.features.length > 0);

    return (
        <TooltipProvider>
            <div className="space-y-8">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                                    <Layers className="h-6 w-6 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold text-white">Plan Configuration</h1>
                            </div>
                            <p className="text-slate-300 max-w-xl">
                                Configure limits, features, and pricing for each subscription tier. Changes affect all users on that plan.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {hasChanges && (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 px-3 py-1.5">
                                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Unsaved changes
                                </Badge>
                            )}
                            <Button
                                variant="outline"
                                onClick={resetPlan}
                                disabled={saving}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                            <Button
                                onClick={savePlan}
                                disabled={saving || !hasChanges}
                                className="bg-white text-slate-900 hover:bg-slate-100"
                            >
                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Plan Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {orderedPlans.map((plan) => {
                        const Icon = PLAN_ICONS[plan.planId as keyof typeof PLAN_ICONS] || Settings;
                        const gradient = PLAN_GRADIENTS[plan.planId as keyof typeof PLAN_GRADIENTS] || 'from-slate-500 to-slate-600';
                        const isSelected = selectedPlan === plan.planId;
                        const enabledCount = Object.values(plan.features).filter(Boolean).length;

                        return (
                            <div
                                key={plan.planId}
                                onClick={() => setSelectedPlan(plan.planId)}
                                className={`
                                    group relative cursor-pointer rounded-xl border-2 transition-all duration-300
                                    ${isSelected
                                        ? 'border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-500/10'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                    }
                                `}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-3 left-4">
                                        <Badge className={`bg-gradient-to-r ${gradient} text-white border-0 shadow-lg`}>
                                            {plan.badge}
                                        </Badge>
                                    </div>
                                )}

                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        {isSelected && (
                                            <div className="p-1 bg-indigo-500 rounded-full">
                                                <CheckCircle2 className="h-4 w-4 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-lg text-slate-900 mb-1">{plan.name}</h3>
                                    <p className="text-2xl font-bold text-slate-900 mb-3">
                                        {plan.price === null ? (
                                            <span className="text-base font-medium text-slate-500">Custom pricing</span>
                                        ) : plan.price === 0 ? (
                                            'Free'
                                        ) : (
                                            <>₹{plan.price}<span className="text-sm font-normal text-slate-500">/mo</span></>
                                        )}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-1.5">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    <span>{enabledCount} features</span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>Features enabled</TooltipContent>
                                        </Tooltip>
                                        <span className={`h-2 w-2 rounded-full ${plan.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <span>{plan.isActive ? 'Active' : 'Inactive'}</span>
                                    </div>
                                </div>

                                <div className={`
                                    px-5 py-3 border-t rounded-b-xl transition-colors
                                    ${isSelected ? 'bg-indigo-100/50 border-indigo-200' : 'bg-slate-50 border-slate-100'}
                                `}>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-600">Click to configure</span>
                                        <ChevronRight className={`h-4 w-4 transition-transform ${isSelected ? 'rotate-90 text-indigo-500' : 'text-slate-400 group-hover:translate-x-1'}`} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {currentPlan && (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                            <TabsList className="bg-slate-100/80 p-1 h-auto">
                                <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Eye className="h-4 w-4" />
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Settings className="h-4 w-4" />
                                    General
                                </TabsTrigger>
                                <TabsTrigger value="limits" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <TrendingUp className="h-4 w-4" />
                                    Limits
                                </TabsTrigger>
                                <TabsTrigger value="features" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Sparkles className="h-4 w-4" />
                                    Features
                                </TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span>Editing:</span>
                                <Badge
                                    variant="outline"
                                    className="font-semibold"
                                    style={{ borderColor: currentPlan.themeColor, color: currentPlan.themeColor }}
                                >
                                    {currentPlan.name} Plan
                                </Badge>
                            </div>
                        </div>

                        {/* Overview Tab */}
                        <TabsContent value="overview" className="space-y-6 mt-0">
                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 rounded-lg">
                                                <Sparkles className="h-5 w-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">{enabledFeaturesCount}/{totalFeaturesCount}</p>
                                                <p className="text-xs text-slate-500">Features Enabled</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 rounded-lg">
                                                <Calendar className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">
                                                    {formatLimitValue(currentPlan.limits.maxEventsPerMonth)}
                                                </p>
                                                <p className="text-xs text-slate-500">Events/Month</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 rounded-lg">
                                                <Users className="h-5 w-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">
                                                    {formatLimitValue(currentPlan.limits.maxAttendeesPerEvent)}
                                                </p>
                                                <p className="text-xs text-slate-500">Attendees/Event</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-100 rounded-lg">
                                                <Mail className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-slate-900">
                                                    {formatLimitValue(currentPlan.limits.maxEmailsPerMonth)}
                                                </p>
                                                <p className="text-xs text-slate-500">Emails/Month</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Comparison Table */}
                            <Card>
                                <CardHeader className="border-b bg-slate-50/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-slate-600" />
                                                Plan Comparison
                                            </CardTitle>
                                            <CardDescription>Compare limits across all plans</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b bg-slate-50/80">
                                                    <th className="text-left p-4 font-semibold text-slate-700">Limit</th>
                                                    {orderedPlans.map((plan) => {
                                                        const Icon = PLAN_ICONS[plan.planId as keyof typeof PLAN_ICONS] || Settings;
                                                        return (
                                                            <th key={plan.planId} className="p-4 text-center min-w-[120px]">
                                                                <div className={`
                                                                    inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg
                                                                    ${selectedPlan === plan.planId ? 'bg-indigo-100' : ''}
                                                                `}>
                                                                    <Icon className="h-4 w-4" style={{ color: plan.themeColor }} />
                                                                    <span className="font-semibold text-slate-900">{plan.name}</span>
                                                                </div>
                                                            </th>
                                                        );
                                                    })}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {Object.entries(LIMIT_LABELS).map(([key, config]) => {
                                                    const Icon = config.icon;
                                                    return (
                                                        <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-1.5 bg-slate-100 rounded-md">
                                                                        <Icon className="h-4 w-4 text-slate-500" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-medium text-slate-900">{config.label}</span>
                                                                        <p className="text-xs text-slate-500">{config.description}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {orderedPlans.map((plan) => {
                                                                const value = plan.limits[key as keyof PlanLimits];
                                                                const isSelectedPlan = selectedPlan === plan.planId;
                                                                return (
                                                                    <td key={`${plan.planId}_${key}`} className={`p-4 text-center ${isSelectedPlan ? 'bg-indigo-50/50' : ''}`}>
                                                                        {value === -1 ? (
                                                                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
                                                                                <Sparkles className="h-3 w-3 mr-1" />
                                                                                Unlimited
                                                                            </Badge>
                                                                        ) : (
                                                                            <span className="font-semibold text-slate-900">{formatLimitValue(value)}</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Features Matrix */}
                            <Card>
                                <CardHeader className="border-b bg-slate-50/50">
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-slate-600" />
                                        Feature Matrix
                                    </CardTitle>
                                    <CardDescription>Feature availability across plans</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {Object.entries(FEATURE_CATEGORIES).map(([category, data]) => {
                                        const CategoryIcon = data.icon;
                                        return (
                                            <div key={category} className="border-b last:border-b-0">
                                                <div className="px-4 py-3 bg-slate-50/80 flex items-center gap-2">
                                                    <CategoryIcon className="h-4 w-4 text-slate-500" />
                                                    <span className="font-semibold text-slate-700">{category}</span>
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                    {data.features.map((feature) => (
                                                        <div key={feature} className="flex items-center hover:bg-slate-50/50 transition-colors">
                                                            <div className="flex-1 p-4 text-sm text-slate-700">
                                                                {formatFeatureName(feature)}
                                                            </div>
                                                            {orderedPlans.map((plan) => {
                                                                const enabled = plan.features[feature as keyof PlanFeatures];
                                                                const isSelectedPlan = selectedPlan === plan.planId;
                                                                return (
                                                                    <div
                                                                        key={`${feature}_${plan.planId}`}
                                                                        className={`w-[120px] p-4 text-center ${isSelectedPlan ? 'bg-indigo-50/50' : ''}`}
                                                                    >
                                                                        {enabled ? (
                                                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                                                                        ) : (
                                                                            <XCircle className="h-5 w-5 text-slate-300 mx-auto" />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* General Settings Tab */}
                        <TabsContent value="general" className="mt-0">
                            <Card>
                                <CardHeader className="border-b bg-slate-50/50">
                                    <CardTitle className="flex items-center gap-2">
                                        <Edit3 className="h-5 w-5 text-slate-600" />
                                        {currentPlan.name} Plan Settings
                                    </CardTitle>
                                    <CardDescription>Basic configuration and display settings</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-slate-700">Plan Name</Label>
                                            <Input
                                                value={currentPlan.name}
                                                onChange={(e) => updatePlanField('name', e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700">Price (₹/month)</Label>
                                            <Input
                                                type="number"
                                                value={currentPlan.price ?? ''}
                                                placeholder="Leave empty for custom pricing"
                                                onChange={(e) => updatePlanField('price', e.target.value ? Number(e.target.value) : null)}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2 lg:col-span-2">
                                            <Label className="text-slate-700">Description</Label>
                                            <Input
                                                value={currentPlan.description}
                                                onChange={(e) => updatePlanField('description', e.target.value)}
                                                placeholder="Brief description of this plan..."
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700">Badge Text</Label>
                                            <Input
                                                value={currentPlan.badge || ''}
                                                placeholder="e.g., Most Popular, Best Value"
                                                onChange={(e) => updatePlanField('badge', e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-700">Theme Color</Label>
                                            <div className="flex gap-3">
                                                <div className="relative">
                                                    <Input
                                                        type="color"
                                                        value={currentPlan.themeColor}
                                                        onChange={(e) => updatePlanField('themeColor', e.target.value)}
                                                        className="w-20 h-11 p-1 cursor-pointer"
                                                    />
                                                </div>
                                                <Input
                                                    value={currentPlan.themeColor}
                                                    onChange={(e) => updatePlanField('themeColor', e.target.value)}
                                                    className="flex-1 h-11 font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-xl ${currentPlan.isActive ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                                                    {currentPlan.isActive ? (
                                                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                                    ) : (
                                                        <XCircle className="h-6 w-6 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">Plan Status</p>
                                                    <p className="text-sm text-slate-500">
                                                        {currentPlan.isActive
                                                            ? 'Active - Users can subscribe to this plan'
                                                            : 'Inactive - Hidden from new subscriptions'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch
                                                checked={currentPlan.isActive}
                                                onCheckedChange={(checked) => updatePlanField('isActive', checked)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Limits Tab */}
                        <TabsContent value="limits" className="mt-0">
                            <Card>
                                <CardHeader className="border-b bg-slate-50/50">
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-slate-600" />
                                        Usage Limits
                                    </CardTitle>
                                    <CardDescription>Set numeric limits for {currentPlan.name} plan. Use -1 for unlimited.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6">
                                    {/* Group limits by category */}
                                    {['Events', 'Team', 'Communication', 'Design', 'Storage', 'Customization', 'API'].map((category) => {
                                        const categoryLimits = Object.entries(LIMIT_LABELS).filter(([, config]) => config.category === category);
                                        if (categoryLimits.length === 0) return null;

                                        return (
                                            <div key={category} className="mb-8 last:mb-0">
                                                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                                    <span className="h-1 w-4 rounded-full bg-indigo-500" />
                                                    {category}
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {categoryLimits.map(([key, config]) => {
                                                        const Icon = config.icon;
                                                        const value = currentPlan.limits[key as keyof PlanLimits];
                                                        return (
                                                            <div
                                                                key={key}
                                                                className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <div className="p-1.5 bg-white rounded-md shadow-sm">
                                                                        <Icon className="h-4 w-4 text-slate-600" />
                                                                    </div>
                                                                    <Label className="font-medium text-slate-700">{config.label}</Label>
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <Info className="h-3.5 w-3.5 text-slate-400" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{config.description}</TooltipContent>
                                                                    </Tooltip>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        type="number"
                                                                        value={value}
                                                                        onChange={(e) => updateLimit(key as keyof PlanLimits, Number(e.target.value))}
                                                                        min={-1}
                                                                        className="h-10"
                                                                    />
                                                                    {value === -1 && (
                                                                        <Badge className="bg-emerald-100 text-emerald-700 border-0 whitespace-nowrap">
                                                                            <Sparkles className="h-3 w-3 mr-1" />
                                                                            Unlimited
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* Features Tab */}
                        <TabsContent value="features" className="mt-0 space-y-6">
                            {/* Bulk Actions & Search */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="relative w-full sm:w-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search features..."
                                        value={featureSearch}
                                        onChange={(e) => setFeatureSearch(e.target.value)}
                                        className="pl-9 w-full sm:w-64 h-10"
                                    />
                                    {featureSearch && (
                                        <button
                                            onClick={() => setFeatureSearch('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2"
                                        >
                                            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">
                                        {enabledFeaturesCount}/{totalFeaturesCount} enabled
                                    </span>
                                    <div className="h-4 w-px bg-slate-300" />
                                    <Button variant="outline" size="sm" onClick={() => setAllFeatures(false)}>
                                        Disable All
                                    </Button>
                                    <Button size="sm" onClick={() => setAllFeatures(true)}>
                                        Enable All
                                    </Button>
                                </div>
                            </div>

                            {/* Feature Categories */}
                            {filteredCategories.map(({ category, icon: CategoryIcon, features }) => (
                                <Card key={category}>
                                    <CardHeader className="py-4 border-b bg-slate-50/50">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CategoryIcon className="h-5 w-5 text-slate-600" />
                                            {category}
                                            <Badge variant="outline" className="ml-2">
                                                {features.filter(f => currentPlan.features[f as keyof PlanFeatures]).length}/{features.length}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {features.map((feature) => {
                                                const isEnabled = currentPlan.features[feature as keyof PlanFeatures];
                                                return (
                                                    <div
                                                        key={feature}
                                                        className={`
                                                            flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer
                                                            ${isEnabled
                                                                ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                                                                : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                                                            }
                                                        `}
                                                        onClick={() => updateFeature(feature as keyof PlanFeatures, !isEnabled)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`
                                                                p-2 rounded-lg transition-colors
                                                                ${isEnabled ? 'bg-emerald-100' : 'bg-slate-200'}
                                                            `}>
                                                                {isEnabled ? (
                                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                ) : (
                                                                    <XCircle className="h-4 w-4 text-slate-400" />
                                                                )}
                                                            </div>
                                                            <span className={`font-medium ${isEnabled ? 'text-slate-900' : 'text-slate-600'}`}>
                                                                {formatFeatureName(feature)}
                                                            </span>
                                                        </div>
                                                        <Switch
                                                            checked={isEnabled}
                                                            onCheckedChange={(checked) => updateFeature(feature as keyof PlanFeatures, checked)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {filteredCategories.length === 0 && (
                                <div className="text-center py-12">
                                    <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500">No features match your search</p>
                                    <Button variant="link" onClick={() => setFeatureSearch('')}>
                                        Clear search
                                    </Button>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </TooltipProvider>
    );
}
