'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Mail,
    Settings,
    Send,
    Check,
    X,
    RefreshCw,
    Save,
    AlertCircle,
    UserPlus,
    Key,
    Sparkles,
    Bell,
    ShieldAlert,
    LogIn,
    Eye,
    TrendingUp,
    BarChart3,
    Zap,
    Clock,
    CheckCircle2,
    XCircle,
    Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemSettings {
    _id: string;
    systemEmail: {
        enabled: boolean;
        accountId: string | null;
        fromName: string;
        fromEmail: string;
    };
    emailSettings: {
        welcomeEmail: boolean;
        accountVerification: boolean;
        passwordReset: boolean;
        hostUpgradeConfirmation: boolean;
        eventPublished: boolean;
        dailyDigest: boolean;
        loginAlert: boolean;
        suspensionNotice: boolean;
    };
    platformName: string;
    supportEmail: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
}

interface EmailAccount {
    _id: string;
    email: string;
    name: string;
    provider: string;
    userId?: { name: string; email: string };
}

interface EmailStats {
    overview: {
        total: number;
        today: number;
        thisWeek: number;
        thisMonth: number;
    };
    byProvider: Record<string, number>;
    byStatus: Record<string, number>;
    byType: { _id: string; count: number }[];
    recentEmails: {
        _id: string;
        toEmail: string;
        subject: string;
        type: string;
        status: string;
        provider: string;
        createdAt: string;
    }[];
    last7Days: {
        _id: string;
        sent: number;
        failed: number;
        total: number;
    }[];
    zeptomail: {
        configured: boolean;
        fromEmail: string | null;
        fromName: string | null;
        stats: {
            total: number;
            sent: number;
            failed: number;
            today: number;
        };
    };
    gmail: {
        stats: {
            total: number;
            sent: number;
            failed: number;
            today: number;
        };
    };
}

interface ZeptoMailCredits {
    configured: boolean;
    fromEmail?: string;
    fromName?: string;
    mailAgents?: any;
    stats?: any;
    message?: string;
    error?: string;
}

export default function SystemEmailSettingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [connecting, setConnecting] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');

    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [emailAccountInfo, setEmailAccountInfo] = useState<EmailAccount | null>(null);
    const [availableAccounts, setAvailableAccounts] = useState<EmailAccount[]>([]);
    const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [zeptoCredits, setZeptoCredits] = useState<ZeptoMailCredits | null>(null);
    const [loadingCredits, setLoadingCredits] = useState(false);
    const [zeptoTestEmail, setZeptoTestEmail] = useState('');
    const [testingZepto, setTestingZepto] = useState(false);

    const fetchSettings = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(data.settings);
                setEmailAccountInfo(data.emailAccountInfo);
                setAvailableAccounts(data.availableEmailAccounts || []);
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const fetchEmailStats = async () => {
        setLoadingStats(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/email/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEmailStats(data);
            }
        } catch (error) {
            console.error('Failed to load email stats:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    const fetchZeptoCredits = async () => {
        setLoadingCredits(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/email/zeptomail/credits`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setZeptoCredits(data);
        } catch (error) {
            console.error('Failed to load ZeptoMail credits:', error);
        } finally {
            setLoadingCredits(false);
        }
    };

    useEffect(() => {
        // Check for OAuth callback params
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const error = params.get('error');
        const email = params.get('email');

        if (success === 'true') {
            toast({
                title: '✅ Gmail Connected!',
                description: email ? `${email} is now your system email account` : 'System email is now configured'
            });
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (error) {
            const errorMessages: Record<string, string> = {
                'no_code': 'No authorization code received from Google',
                'no_admin': 'Admin session expired. Please log in again.',
                'no_email': 'Could not get email from Google account',
                'callback_failed': 'Failed to connect Gmail. Please try again.'
            };
            toast({
                title: 'Connection Failed',
                description: errorMessages[error] || 'Unknown error occurred',
                variant: 'destructive'
            });
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        fetchSettings();
        fetchEmailStats();
        fetchZeptoCredits();
    }, []);

    const connectGmail = async () => {
        setConnecting(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/system-email/auth-url`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { url } = await res.json();
                window.location.href = url; // Redirect to Google OAuth
            } else {
                toast({ title: 'Error', description: 'Failed to get auth URL', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to initiate Gmail connection', variant: 'destructive' });
        } finally {
            setConnecting(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                toast({ title: 'Success', description: 'Settings saved successfully' });
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testEmail) {
            toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
            return;
        }
        setTesting(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/settings/test-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ recipientEmail: testEmail })
            });
            const data = await res.json();
            if (res.ok) {
                toast({ title: 'Success', description: 'Test email sent!' });
            } else {
                toast({ title: 'Error', description: data.message || 'Failed to send test email', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to send test email', variant: 'destructive' });
        } finally {
            setTesting(false);
        }
    };

    const handleZeptoMailTest = async () => {
        if (!zeptoTestEmail) {
            toast({ title: 'Error', description: 'Please enter an email address', variant: 'destructive' });
            return;
        }
        setTestingZepto(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/email/zeptomail/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ recipientEmail: zeptoTestEmail })
            });
            const data = await res.json();
            if (res.ok) {
                toast({ 
                    title: '⚡ ZeptoMail Test Sent!', 
                    description: `Check ${zeptoTestEmail} for the test email` 
                });
                // Refresh stats after sending
                fetchEmailStats();
            } else {
                toast({ 
                    title: 'ZeptoMail Error', 
                    description: data.message || data.error || 'Failed to send test email', 
                    variant: 'destructive' 
                });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to send ZeptoMail test', variant: 'destructive' });
        } finally {
            setTestingZepto(false);
        }
    };

    const updateSystemEmail = (field: string, value: string | boolean) => {
        if (!settings) return;
        setSettings({
            ...settings,
            systemEmail: { ...settings.systemEmail, [field]: value }
        });
    };

    const updateEmailSetting = (field: string, value: boolean) => {
        if (!settings) return;
        setSettings({
            ...settings,
            emailSettings: { ...settings.emailSettings, [field]: value }
        });
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-purple-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    const platformName = settings?.platformName || 'MakeTicket';

    // Full email template previews
    const emailTemplates: Record<string, string> = {
        welcomeEmail: `
            <div style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">Welcome to ${platformName}!</h1>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>John Doe</strong>,</p>
                        <p>Thank you for joining ${platformName}! We're excited to have you on board.</p>
                        <p>With ${platformName}, you can:</p>
                        <ul style="color: #64748b;">
                            <li>Discover and register for amazing events</li>
                            <li>Keep track of your tickets in one place</li>
                            <li>Create and host your own events</li>
                        </ul>
                        <p style="text-align: center;">
                            <a href="#" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Get Started</a>
                        </p>
                        <p style="color: #64748b; font-size: 14px;">If you have any questions, feel free to reach out to our support team.</p>
                    </div>
                    <div style="padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px;">
                        <p>© 2025 ${platformName}. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `,
        passwordReset: `
            <div style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: #EF4444; color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0;">🔐 Password Reset Request</h1>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>John Doe</strong>,</p>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        <p style="text-align: center;">
                            <a href="#" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
                        </p>
                        <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0; color: #92400E; font-size: 14px;">
                            ⚠️ This link will expire in 30 minutes. If you didn't request this reset, please ignore this email.
                        </div>
                        <p style="color: #64748b; font-size: 14px;">For security, this request was received from your account. If you didn't make this request, your password is still safe.</p>
                    </div>
                    <div style="padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px;">
                        <p>© 2025 ${platformName}. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `,
        hostUpgradeConfirmation: `
            <div style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0;">🎉 Congratulations, Host!</h1>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>John Doe</strong>,</p>
                        <p>Great news! Your account has been upgraded to Host status. You can now create and manage your own events!</p>
                        <div style="background: #F0FDF4; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #059669;">What you can do now:</h3>
                            <ul style="color: #374151; margin-bottom: 0;">
                                <li>Create and manage events</li>
                                <li>Customize registration forms</li>
                                <li>Manage attendees and check-ins</li>
                                <li>Send custom email confirmations</li>
                                <li>View analytics and reports</li>
                            </ul>
                        </div>
                        <p style="text-align: center;">
                            <a href="#" style="display: inline-block; background: #10B981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
                        </p>
                    </div>
                    <div style="padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px;">
                        <p>© 2025 ${platformName}. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `,
        suspensionNotice: `
            <div style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: #DC2626; color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0;">⚠️ Account Suspended</h1>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>John Doe</strong>,</p>
                        <p>Your account on ${platformName} has been suspended.</p>
                        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 15px; margin: 20px 0;">
                            <strong>Reason:</strong> Violation of terms of service
                        </div>
                        <p>If you believe this was a mistake, please contact our support team at <a href="mailto:support@example.com">support@example.com</a>.</p>
                    </div>
                    <div style="padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px;">
                        <p>© 2025 ${platformName}. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `,
        loginAlert: `
            <div style="font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: #3B82F6; color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0;">🔔 New Login Detected</h1>
                    </div>
                    <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>John Doe</strong>,</p>
                        <p>We detected a new login to your ${platformName} account:</p>
                        <div style="background: #EFF6FF; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <p style="margin: 5px 0;"><strong>Time:</strong> December 28, 2025 at 9:00 PM</p>
                            <p style="margin: 5px 0;"><strong>IP Address:</strong> 192.168.1.100</p>
                            <p style="margin: 5px 0;"><strong>Device:</strong> Chrome on Windows</p>
                        </div>
                        <p style="color: #64748b; font-size: 14px;">If this was you, you can safely ignore this email. If you didn't log in, please secure your account immediately.</p>
                    </div>
                    <div style="padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px;">
                        <p>© 2025 ${platformName}. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `
    };

    const emailToggles = [
        { key: 'welcomeEmail', label: 'Welcome Email', description: 'Send when a new user signs up', icon: UserPlus, hasPreview: true },
        { key: 'passwordReset', label: 'Password Reset', description: 'Send password reset links', icon: Key, hasPreview: true },
        { key: 'hostUpgradeConfirmation', label: 'Host Upgrade', description: 'Send when user becomes a host', icon: Sparkles, hasPreview: true },
        { key: 'suspensionNotice', label: 'Suspension Notice', description: 'Send when account is suspended', icon: ShieldAlert, hasPreview: true },
        { key: 'loginAlert', label: 'Login Alert', description: 'Send on new login detection', icon: LogIn, hasPreview: true },
        { key: 'dailyDigest', label: 'Daily Digest', description: 'Daily summary for hosts', icon: Bell, hasPreview: false },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Email Settings</h1>
                    <p className="text-slate-500">Configure emails for account actions, notifications, and more.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => { fetchSettings(); fetchEmailStats(); fetchZeptoCredits(); }}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading || loadingStats || loadingCredits ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'settings' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Settings
                </button>
                <button
                    onClick={() => setActiveTab('stats')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'stats' 
                            ? 'bg-white text-slate-900 shadow-sm' 
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <BarChart3 className="h-4 w-4 inline mr-2" />
                    Statistics
                </button>
            </div>

            {activeTab === 'stats' ? (
                /* Email Statistics Tab */
                <div className="space-y-6">
                    {/* ZeptoMail Account Status */}
                    {emailStats?.zeptomail?.configured ? (
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <Zap className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">ZeptoMail Active</h3>
                                        <p className="text-orange-100 text-sm">
                                            Sending from {emailStats.zeptomail.fromEmail}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold">{emailStats.zeptomail.stats.total}</p>
                                        <p className="text-orange-100 text-sm">Total Sent</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-3xl font-bold">{emailStats.zeptomail.stats.today}</p>
                                        <p className="text-orange-100 text-sm">Today</p>
                                    </div>
                                    <a 
                                        href="https://zeptomail.zoho.in/zem/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        View Dashboard →
                                    </a>
                                </div>
                            </div>
                            {/* Mail Agent Info */}
                            {zeptoCredits?.mailAgents && (
                                <div className="mt-4 pt-4 border-t border-white/20">
                                    <div className="flex flex-wrap gap-4 text-sm">
                                        {Array.isArray(zeptoCredits.mailAgents) && zeptoCredits.mailAgents.map((agent: any, idx: number) => (
                                            <div key={idx} className="bg-white/10 px-3 py-2 rounded-lg">
                                                <p className="font-medium">{agent.mailagent_name || agent.name || 'Mail Agent'}</p>
                                                <p className="text-orange-100 text-xs">
                                                    {agent.email_address || agent.from_email || 'No email configured'}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                                        <AlertCircle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">ZeptoMail Not Configured</h3>
                                        <p className="text-slate-200 text-sm">
                                            Add ZEPTOMAIL_TOKEN to your .env file to enable high-deliverability emails
                                        </p>
                                    </div>
                                </div>
                                <a 
                                    href="https://zeptomail.zoho.in/zem/" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Get Started →
                                </a>
                            </div>
                        </div>
                    )}

                    {/* ZeptoMail Test Email */}
                    {emailStats?.zeptomail?.configured && (
                        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-orange-700">
                                    <Zap className="h-5 w-5" />
                                    Test ZeptoMail
                                </CardTitle>
                                <CardDescription>
                                    Send a test email to verify your ZeptoMail configuration is working correctly
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        type="email"
                                        placeholder="Enter recipient email address..."
                                        value={zeptoTestEmail}
                                        onChange={(e) => setZeptoTestEmail(e.target.value)}
                                        className="flex-1 border-orange-200 focus-visible:ring-orange-500"
                                    />
                                    <Button 
                                        onClick={handleZeptoMailTest}
                                        disabled={testingZepto || !zeptoTestEmail}
                                        className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                                    >
                                        {testingZepto ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Send Test Email
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500 mt-3">
                                    📧 This will send a test email from <span className="font-medium">{emailStats.zeptomail.fromEmail}</span> via ZeptoMail
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Overview Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border-slate-200">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <Mail className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{emailStats?.overview.total || 0}</p>
                                        <p className="text-sm text-slate-500">Total Sent</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                        <Clock className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{emailStats?.overview.today || 0}</p>
                                        <p className="text-sm text-slate-500">Today</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{emailStats?.overview.thisWeek || 0}</p>
                                        <p className="text-sm text-slate-500">This Week</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <BarChart3 className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-slate-900">{emailStats?.overview.thisMonth || 0}</p>
                                        <p className="text-sm text-slate-500">This Month</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Provider Comparison */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* ZeptoMail Stats */}
                        <Card className="border-orange-200 bg-orange-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between text-orange-700">
                                    <span className="flex items-center gap-2">
                                        <Zap className="h-5 w-5" />
                                        ZeptoMail
                                    </span>
                                    <a 
                                        href="https://zeptomail.zoho.in/zem/" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs bg-orange-100 hover:bg-orange-200 px-2 py-1 rounded transition-colors"
                                    >
                                        Check Credits →
                                    </a>
                                </CardTitle>
                                <CardDescription>Primary transactional email provider (System emails)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-lg p-4 border border-orange-100">
                                        <p className="text-3xl font-bold text-orange-600">{emailStats?.zeptomail?.stats.sent || 0}</p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-green-500" /> Delivered
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-orange-100">
                                        <p className="text-3xl font-bold text-red-600">{emailStats?.zeptomail?.stats.failed || 0}</p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <XCircle className="h-3 w-3 text-red-500" /> Failed
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-orange-100 col-span-2">
                                        <p className="text-xl font-bold text-slate-900">{emailStats?.zeptomail?.stats.today || 0}</p>
                                        <p className="text-sm text-slate-500">Emails Today</p>
                                    </div>
                                </div>
                                {emailStats?.zeptomail?.configured && (
                                    <div className="mt-4 p-3 bg-white rounded-lg border border-orange-100">
                                        <p className="text-xs text-slate-500">Sender Address</p>
                                        <p className="font-medium text-slate-900">{emailStats.zeptomail.fromName} &lt;{emailStats.zeptomail.fromEmail}&gt;</p>
                                    </div>
                                )}
                                <p className="text-xs text-slate-400 mt-3 text-center">
                                    💡 Credit balance available in ZeptoMail Dashboard
                                </p>
                            </CardContent>
                        </Card>

                        {/* Gmail Stats */}
                        <Card className="border-blue-200 bg-blue-50/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-blue-700">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Gmail (Fallback)
                                </CardTitle>
                                <CardDescription>OAuth-based email provider (User ticket emails)</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                                        <p className="text-3xl font-bold text-blue-600">{emailStats?.gmail?.stats.sent || 0}</p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <CheckCircle2 className="h-3 w-3 text-green-500" /> Delivered
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                                        <p className="text-3xl font-bold text-red-600">{emailStats?.gmail?.stats.failed || 0}</p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <XCircle className="h-3 w-3 text-red-500" /> Failed
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-blue-100 col-span-2">
                                        <p className="text-xl font-bold text-slate-900">{emailStats?.gmail?.stats.today || 0}</p>
                                        <p className="text-sm text-slate-500">Emails Today</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* By Status */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-indigo-600" />
                                Delivery Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <span className="font-medium text-emerald-700">{emailStats?.byStatus?.sent || 0} Sent</span>
                                </div>
                                <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="font-medium text-red-700">{emailStats?.byStatus?.failed || 0} Failed</span>
                                </div>
                                <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full">
                                    <Clock className="h-4 w-4 text-amber-600" />
                                    <span className="font-medium text-amber-700">{emailStats?.byStatus?.pending || 0} Pending</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-full">
                                    <AlertCircle className="h-4 w-4 text-slate-600" />
                                    <span className="font-medium text-slate-700">{emailStats?.byStatus?.bounced || 0} Bounced</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Emails */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-indigo-600" />
                                Recent Emails
                            </CardTitle>
                            <CardDescription>Latest email activity</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {emailStats?.recentEmails && emailStats.recentEmails.length > 0 ? (
                                <div className="space-y-2">
                                    {emailStats.recentEmails.map((email) => (
                                        <div key={email._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    email.status === 'sent' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                                }`}>
                                                    {email.status === 'sent' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-slate-900 truncate">{email.toEmail}</p>
                                                    <p className="text-sm text-slate-500 truncate">{email.subject}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`text-xs px-2 py-1 rounded-full ${
                                                    email.provider === 'zeptomail' 
                                                        ? 'bg-orange-100 text-orange-700' 
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {email.provider === 'zeptomail' ? 'ZeptoMail' : 'Gmail'}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(email.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    <Mail className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                    <p>No emails sent yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
            /* Settings Tab */
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Email Account Configuration */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-indigo-600" />
                            System Email Account
                        </CardTitle>
                        <CardDescription>
                            Configure the Gmail account used for sending system emails (welcome, password reset, etc.)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                            <div>
                                <Label htmlFor="email-enabled" className="font-medium">Enable System Emails</Label>
                                <p className="text-sm text-slate-500">Turn on/off all system email sending</p>
                            </div>
                            <Switch
                                id="email-enabled"
                                checked={settings?.systemEmail?.enabled || false}
                                onCheckedChange={(checked) => updateSystemEmail('enabled', checked)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Email Account</Label>
                            <Select
                                value={settings?.systemEmail?.accountId || ''}
                                onValueChange={(value: string) => updateSystemEmail('accountId', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an email account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableAccounts.length === 0 ? (
                                        <SelectItem value="" disabled>No email accounts available</SelectItem>
                                    ) : (
                                        availableAccounts.map((account) => (
                                            <SelectItem key={account._id} value={account._id}>
                                                {account.email} ({account.userId?.name || 'Unknown'})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Connect Gmail Button */}
                        <div className="pt-2">
                            {emailAccountInfo ? (
                                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <Check className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-green-800">{emailAccountInfo.email}</p>
                                            <p className="text-xs text-green-600">Connected & Active</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={connectGmail}
                                        disabled={connecting}
                                    >
                                        {connecting ? 'Connecting...' : 'Change Account'}
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    className="w-full h-12 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm"
                                    onClick={connectGmail}
                                    disabled={connecting}
                                >
                                    <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    {connecting ? 'Connecting...' : 'Connect Gmail Account'}
                                </Button>
                            )}
                            <p className="text-xs text-slate-500 mt-2 text-center">
                                Connect a Gmail account to send system emails (welcome, password reset, etc.)
                            </p>
                        </div>
                        {/* Custom Domain Settings */}
                        <div className="pt-4 border-t">
                            <div className="flex items-center gap-2 mb-3">
                                <Settings className="h-4 w-4 text-slate-500" />
                                <Label className="font-medium">Custom Domain Settings</Label>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">
                                Customize the sender name and email address for system emails
                            </p>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>From Name</Label>
                                    <Input
                                        placeholder="MakeTicket"
                                        value={settings?.systemEmail?.fromName || ''}
                                        onChange={(e) => updateSystemEmail('fromName', e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400">Display name in recipient's inbox</p>
                                </div>

                                <div className="space-y-2">
                                    <Label>From Email Address</Label>
                                    <Input
                                        placeholder="noreply@yourdomain.com"
                                        value={settings?.systemEmail?.fromEmail || ''}
                                        onChange={(e) => updateSystemEmail('fromEmail', e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400">Custom sender email (optional)</p>
                                </div>
                            </div>

                            {settings?.systemEmail?.fromEmail && (
                                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                                        <div className="text-xs text-amber-800">
                                            <p className="font-medium">Custom Domain Requirements</p>
                                            <p className="mt-1">
                                                To use a custom email address, you must configure your domain's DNS with proper
                                                SPF, DKIM, and DMARC records. Without proper setup, emails may be marked as spam
                                                or rejected. Gmail's "Send mail as" feature must also be configured.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Support Email</Label>
                            <Input
                                placeholder="support@example.com"
                                value={settings?.supportEmail || ''}
                                onChange={(e) => setSettings(s => s ? { ...s, supportEmail: e.target.value } : s)}
                            />
                            <p className="text-xs text-slate-500">Shown in suspension and error emails for user support</p>
                        </div>

                        {/* Test Email */}
                        <div className="pt-4 border-t">
                            <Label className="mb-2 block">Test System Email</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="test@example.com"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    onClick={handleTestEmail}
                                    disabled={testing || !settings?.systemEmail?.enabled || !settings?.systemEmail?.accountId}
                                >
                                    <Send className="h-4 w-4 mr-2" />
                                    {testing ? 'Sending...' : 'Test'}
                                </Button>
                            </div>
                            {(!settings?.systemEmail?.enabled || !settings?.systemEmail?.accountId) && (
                                <p className="text-xs text-amber-600 mt-2">Enable system emails and select an account first</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Email Toggles */}
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-indigo-600" />
                            Email Types
                        </CardTitle>
                        <CardDescription>
                            Choose which system emails to send
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {emailToggles.map((toggle) => {
                            const Icon = toggle.icon;
                            const isEnabled = settings?.emailSettings?.[toggle.key as keyof typeof settings.emailSettings] || false;
                            return (
                                <div
                                    key={toggle.key}
                                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${isEnabled ? 'bg-green-50' : 'bg-slate-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900">{toggle.label}</p>
                                            <p className="text-xs text-slate-500">{toggle.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {toggle.hasPreview && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                onClick={() => setPreviewTemplate(toggle.key)}
                                                title={`Preview ${toggle.label}`}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <Switch
                                            checked={isEnabled}
                                            onCheckedChange={(checked) => updateEmailSetting(toggle.key, checked)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Platform Settings */}
                <Card className="border-slate-200 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Platform Settings</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Platform Name</Label>
                                <Input
                                    placeholder="MakeTicket"
                                    value={settings?.platformName || ''}
                                    onChange={(e) => setSettings(s => s ? { ...s, platformName: e.target.value } : s)}
                                />
                                <p className="text-xs text-slate-500">Used in email templates and branding</p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                                <div>
                                    <Label className="font-medium text-amber-900">Maintenance Mode</Label>
                                    <p className="text-sm text-amber-700">Block new registrations and logins</p>
                                </div>
                                <Switch
                                    checked={settings?.maintenanceMode || false}
                                    onCheckedChange={(checked) => setSettings(s => s ? { ...s, maintenanceMode: checked } : s)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            )}

            {/* Template Preview Modal */}
            <Dialog open={!!previewTemplate} onOpenChange={(open: boolean) => !open && setPreviewTemplate(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5 text-indigo-600" />
                            {previewTemplate && emailToggles.find(t => t.key === previewTemplate)?.label} Template Preview
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                        {previewTemplate && emailTemplates[previewTemplate] && (
                            <div
                                className="border rounded-lg overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: emailTemplates[previewTemplate] }}
                            />
                        )}
                        <p className="text-xs text-slate-500 mt-4 text-center">
                            This is how the email will appear in recipients' inboxes.
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
