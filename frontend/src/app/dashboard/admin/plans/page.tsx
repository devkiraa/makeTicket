'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Settings,
    Save,
    RotateCcw,
    Users,
    Calendar,
    Mail,
    CreditCard,
    Zap,
    Shield,
    Database,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Crown,
    Sparkles,
    Building2,
    User
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

const LIMIT_LABELS: Record<keyof PlanLimits, { label: string; description: string; icon: any }> = {
    maxEventsPerMonth: { label: 'Events per Month', description: 'Maximum events created per month (-1 = unlimited)', icon: Calendar },
    maxEventsTotal: { label: 'Total Events', description: 'Maximum total events ever (-1 = unlimited)', icon: Calendar },
    maxAttendeesPerEvent: { label: 'Attendees per Event', description: 'Maximum attendees per event (-1 = unlimited)', icon: Users },
    maxTotalAttendees: { label: 'Total Attendees', description: 'Maximum total attendees across all events', icon: Users },
    maxTeamMembers: { label: 'Team Members', description: 'Maximum team members for collaboration', icon: Users },
    maxCoordinatorsPerEvent: { label: 'Coordinators per Event', description: 'Maximum coordinators per event', icon: Users },
    maxEmailsPerMonth: { label: 'Emails per Month', description: 'Maximum emails sent per month', icon: Mail },
    maxEmailTemplates: { label: 'Email Templates', description: 'Maximum custom email templates', icon: Mail },
    maxTicketTemplates: { label: 'Ticket Templates', description: 'Maximum custom ticket templates', icon: CreditCard },
    maxStorageMB: { label: 'Storage (MB)', description: 'Maximum storage in megabytes', icon: Database },
    maxFileUploadMB: { label: 'File Upload Size (MB)', description: 'Maximum file upload size', icon: Database },
    maxCustomFieldsPerEvent: { label: 'Custom Fields', description: 'Maximum custom fields per event form', icon: Settings },
    maxApiRequestsPerDay: { label: 'API Requests/Day', description: 'Maximum API requests per day', icon: Zap }
};

const FEATURE_CATEGORIES = {
    'Branding': ['customBranding', 'removeMakeTicketBranding', 'whiteLabel', 'customDomain'],
    'Email': ['priorityEmail', 'customEmailTemplates', 'customSmtp'],
    'Analytics': ['basicAnalytics', 'advancedAnalytics', 'exportData', 'realtimeDashboard'],
    'Integrations': ['googleFormsIntegration', 'googleSheetsIntegration', 'webhooks', 'apiAccess', 'zapierIntegration'],
    'Payments': ['acceptPayments', 'multiCurrency'],
    'Wallet Passes': ['googleWalletPass', 'appleWalletPass'],
    'Support': ['emailSupport', 'prioritySupport', 'dedicatedSupport', 'phoneSupport', 'slaGuarantee'],
    'Security': ['ssoIntegration', 'auditLogs', 'advancedSecurity'],
    'Event Features': ['waitlistManagement', 'recurringEvents', 'privateEvents', 'eventDuplication', 'bulkImport', 'checkInApp', 'qrScanning']
};

const formatFeatureName = (feature: string): string => {
    return feature
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

export default function PlanConfigPage() {
    const [plans, setPlans] = useState<PlanConfig[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<string>('free');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
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

    const updatePlanField = (field: string, value: any) => {
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

            toast({ title: 'Saved', description: `${currentPlan.name} plan configuration saved successfully` });
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
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const PlanIcon = PLAN_ICONS[selectedPlan as keyof typeof PLAN_ICONS] || Settings;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Plan Configuration</h1>
                    <p className="text-slate-500">Configure limits and features for each subscription plan</p>
                </div>
                <div className="flex items-center gap-3">
                    {hasChanges && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Unsaved changes
                        </Badge>
                    )}
                    <Button variant="outline" onClick={resetPlan} disabled={saving}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset to Defaults
                    </Button>
                    <Button onClick={savePlan} disabled={saving || !hasChanges}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Plan Selector */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {plans.map((plan) => {
                    const Icon = PLAN_ICONS[plan.planId as keyof typeof PLAN_ICONS] || Settings;
                    const isSelected = selectedPlan === plan.planId;
                    return (
                        <Card 
                            key={plan.planId}
                            className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                            onClick={() => setSelectedPlan(plan.planId)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: `${plan.themeColor}20` }}
                                    >
                                        <Icon className="h-5 w-5" style={{ color: plan.themeColor }} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{plan.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {plan.price === null ? 'Custom' : plan.price === 0 ? 'Free' : `₹${plan.price}/mo`}
                                        </p>
                                    </div>
                                </div>
                                {plan.badge && (
                                    <Badge className="mt-2 text-xs" style={{ backgroundColor: plan.themeColor }}>
                                        {plan.badge}
                                    </Badge>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {currentPlan && (
                <Tabs defaultValue="general" className="space-y-6">
                    <TabsList className="bg-slate-100">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="limits">Limits</TabsTrigger>
                        <TabsTrigger value="features">Features</TabsTrigger>
                    </TabsList>

                    {/* General Settings Tab */}
                    <TabsContent value="general">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PlanIcon className="h-5 w-5" style={{ color: currentPlan.themeColor }} />
                                    {currentPlan.name} Plan Settings
                                </CardTitle>
                                <CardDescription>Basic configuration for this plan</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Plan Name</Label>
                                        <Input 
                                            value={currentPlan.name}
                                            onChange={(e) => updatePlanField('name', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Price (₹/month)</Label>
                                        <Input 
                                            type="number"
                                            value={currentPlan.price ?? ''}
                                            placeholder="Leave empty for custom pricing"
                                            onChange={(e) => updatePlanField('price', e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Description</Label>
                                        <Input 
                                            value={currentPlan.description}
                                            onChange={(e) => updatePlanField('description', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Badge Text</Label>
                                        <Input 
                                            value={currentPlan.badge || ''}
                                            placeholder="e.g., Most Popular"
                                            onChange={(e) => updatePlanField('badge', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Theme Color</Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                type="color"
                                                value={currentPlan.themeColor}
                                                onChange={(e) => updatePlanField('themeColor', e.target.value)}
                                                className="w-16 h-10 p-1"
                                            />
                                            <Input 
                                                value={currentPlan.themeColor}
                                                onChange={(e) => updatePlanField('themeColor', e.target.value)}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                    <div>
                                        <p className="font-medium">Plan Active</p>
                                        <p className="text-sm text-slate-500">Allow new subscriptions to this plan</p>
                                    </div>
                                    <Switch 
                                        checked={currentPlan.isActive}
                                        onCheckedChange={(checked) => updatePlanField('isActive', checked)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Limits Tab */}
                    <TabsContent value="limits">
                        <Card>
                            <CardHeader>
                                <CardTitle>Usage Limits</CardTitle>
                                <CardDescription>Set numeric limits for this plan. Use -1 for unlimited.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Object.entries(LIMIT_LABELS).map(([key, config]) => {
                                        const Icon = config.icon;
                                        const value = currentPlan.limits[key as keyof PlanLimits];
                                        return (
                                            <div key={key} className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4 text-slate-500" />
                                                    <Label>{config.label}</Label>
                                                </div>
                                                <Input 
                                                    type="number"
                                                    value={value}
                                                    onChange={(e) => updateLimit(key as keyof PlanLimits, Number(e.target.value))}
                                                    min={-1}
                                                />
                                                <p className="text-xs text-slate-500">{config.description}</p>
                                                {value === -1 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        <Sparkles className="h-3 w-3 mr-1" />
                                                        Unlimited
                                                    </Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Features Tab */}
                    <TabsContent value="features">
                        <div className="space-y-6">
                            {Object.entries(FEATURE_CATEGORIES).map(([category, features]) => (
                                <Card key={category}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{category}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {features.map((feature) => (
                                                <div 
                                                    key={feature}
                                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {currentPlan.features[feature as keyof PlanFeatures] ? (
                                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                        ) : (
                                                            <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                                                        )}
                                                        <span className="text-sm">{formatFeatureName(feature)}</span>
                                                    </div>
                                                    <Switch
                                                        checked={currentPlan.features[feature as keyof PlanFeatures]}
                                                        onCheckedChange={(checked) => updateFeature(feature as keyof PlanFeatures, checked)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
