'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Mail,
    Settings,
    Send,
    RefreshCw,
    Save,
    AlertCircle,
    UserPlus,
    Key,
    Sparkles,
    ShieldAlert,
    LogIn,
    Eye,
    Zap,
    Check,
    X,
    ChevronRight,
    ChevronDown,
    Globe,
    Building2,
    Edit3,
    CheckCircle2,
    XCircle,
    Clock,
    AtSign,
    Code,
    Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// System email types with their configurations
const SYSTEM_EMAIL_TYPES = [
    {
        key: 'welcomeEmail',
        label: 'Welcome Email',
        description: 'Sent when a new user signs up',
        icon: UserPlus,
        defaultSender: 'hello',
        color: 'indigo',
        subject: 'Welcome to {{platformName}}!'
    },
    {
        key: 'passwordReset',
        label: 'Password Reset',
        description: 'Password reset links',
        icon: Key,
        defaultSender: 'noreply',
        color: 'red',
        subject: 'Reset Your Password - {{platformName}}'
    },
    {
        key: 'hostUpgradeConfirmation',
        label: 'Host Upgrade',
        description: 'When user becomes a host',
        icon: Sparkles,
        defaultSender: 'hello',
        color: 'green',
        subject: 'Congratulations! You\'re now a Host'
    },
    {
        key: 'suspensionNotice',
        label: 'Suspension Notice',
        description: 'Account suspension alerts',
        icon: ShieldAlert,
        defaultSender: 'support',
        color: 'red',
        subject: 'Account Suspended - {{platformName}}'
    },
    {
        key: 'loginAlert',
        label: 'Login Alert',
        description: 'New login detection',
        icon: LogIn,
        defaultSender: 'security',
        color: 'blue',
        subject: 'New login detected - {{platformName}}'
    }
];

// Available sender addresses
const SENDER_OPTIONS = [
    { value: 'noreply', label: 'noreply@maketicket.app', description: 'No-reply address' },
    { value: 'hello', label: 'hello@maketicket.app', description: 'Welcome & friendly emails' },
    { value: 'support', label: 'support@maketicket.app', description: 'Support & help emails' },
    { value: 'info', label: 'info@maketicket.app', description: 'Informational emails' },
    { value: 'security', label: 'security@maketicket.app', description: 'Security alerts' }
];

interface EmailSettings {
    welcomeEmail: boolean;
    passwordReset: boolean;
    hostUpgradeConfirmation: boolean;
    suspensionNotice: boolean;
    loginAlert: boolean;
    dailyDigest: boolean;
    accountVerification: boolean;
    eventPublished: boolean;
}

interface EmailSenderConfig {
    welcomeEmail: string;
    passwordReset: string;
    hostUpgradeConfirmation: string;
    suspensionNotice: string;
    loginAlert: string;
}

interface SystemSettings {
    emailSettings: EmailSettings;
    emailSenderConfig?: EmailSenderConfig;
    emailTemplates?: Record<string, string>;
    platformName: string;
    supportEmail: string;
    useCustomDomain?: boolean;
    customDomainEmail?: string;
    customDomainName?: string;
}

interface EmailStats {
    overview: { total: number; today: number; thisWeek: number; thisMonth: number };
    zeptomail: { configured: boolean; fromEmail: string | null; stats: { total: number; sent: number; failed: number; today: number } };
}

// Default email templates
const getDefaultTemplates = (platformName: string): Record<string, string> => ({
    welcomeEmail: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px 30px; text-align: center; }
        .header img { height: 50px; margin-bottom: 15px; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; color: #333; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://maketicket.app/logo.png" alt="${platformName}" />
            <h1>Welcome to ${platformName}!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{userName}}</strong>,</p>
            <p>Thank you for joining ${platformName}! We're excited to have you on board.</p>
            <p>With ${platformName}, you can:</p>
            <ul style="color: #64748b;">
                <li>Discover and register for amazing events</li>
                <li>Keep track of your tickets in one place</li>
                <li>Create and host your own events</li>
            </ul>
            <p style="text-align: center;">
                <a href="{{loginUrl}}" class="btn">Get Started</a>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
    passwordReset: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: #EF4444; color: white; padding: 30px; text-align: center; }
        .header img { height: 50px; margin-bottom: 15px; }
        .content { padding: 30px; color: #333; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .warning { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0; color: #92400E; font-size: 14px; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://maketicket.app/logo.png" alt="${platformName}" />
            <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{userName}}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="{{resetUrl}}" class="btn">Reset Password</a>
            </p>
            <div class="warning">
                ⚠️ This link will expire in {{expiryMinutes}} minutes. If you didn't request this reset, please ignore this email.
            </div>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
    hostUpgradeConfirmation: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
        .header img { height: 50px; margin-bottom: 15px; }
        .content { padding: 30px; color: #333; }
        .btn { display: inline-block; background: #10B981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .feature-box { background: #F0FDF4; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://maketicket.app/logo.png" alt="${platformName}" />
            <h1>🎉 Congratulations, Host!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{userName}}</strong>,</p>
            <p>Great news! Your account has been upgraded to Host status. You can now create and manage your own events!</p>
            <div class="feature-box">
                <h3 style="margin-top: 0; color: #059669;">What you can do now:</h3>
                <ul style="color: #374151; margin-bottom: 0;">
                    <li>Create unlimited events</li>
                    <li>Customize registration forms</li>
                    <li>Manage attendees and check-ins</li>
                    <li>Send custom email confirmations</li>
                    <li>View analytics and reports</li>
                </ul>
            </div>
            <p style="text-align: center;">
                <a href="{{dashboardUrl}}" class="btn">Go to Dashboard</a>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
    suspensionNotice: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: #DC2626; color: white; padding: 30px; text-align: center; }
        .header img { height: 50px; margin-bottom: 15px; }
        .content { padding: 30px; color: #333; }
        .reason-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://maketicket.app/logo.png" alt="${platformName}" />
            <h1>⚠️ Account Suspended</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{userName}}</strong>,</p>
            <p>Your account on ${platformName} has been suspended.</p>
            <div class="reason-box">
                <strong>Reason:</strong> {{reason}}
            </div>
            <p>If you believe this was a mistake, please contact our support team at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
    loginAlert: `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: #3B82F6; color: white; padding: 30px; text-align: center; }
        .header img { height: 50px; margin-bottom: 15px; }
        .content { padding: 30px; color: #333; }
        .info-box { background: #EFF6FF; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://maketicket.app/logo.png" alt="${platformName}" />
            <h1>🔔 New Login Detected</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{userName}}</strong>,</p>
            <p>We detected a new login to your ${platformName} account:</p>
            <div class="info-box">
                <p style="margin: 5px 0;"><strong>Time:</strong> {{loginTime}}</p>
                <p style="margin: 5px 0;"><strong>IP Address:</strong> {{ipAddress}}</p>
                <p style="margin: 5px 0;"><strong>Device:</strong> {{device}}</p>
            </div>
            <p style="color: #64748b; font-size: 14px;">If this was you, you can safely ignore this email. If you didn't log in, please secure your account immediately.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
});

export default function SystemEmailPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [emailStats, setEmailStats] = useState<EmailStats | null>(null);
    const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
    const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});
    const [testingEmails, setTestingEmails] = useState<Record<string, boolean>>({});
    const [testRecipient, setTestRecipient] = useState('');

    // Initialize sender config with defaults if not set
    const getSenderConfig = (): EmailSenderConfig => {
        return settings?.emailSenderConfig || {
            welcomeEmail: 'hello',
            passwordReset: 'noreply',
            hostUpgradeConfirmation: 'hello',
            suspensionNotice: 'support',
            loginAlert: 'security'
        };
    };

    const platformName = settings?.platformName || 'MakeTicket';
    const defaultTemplates = getDefaultTemplates(platformName);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const [settingsRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/admin/settings`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/admin/email/stats`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            if (settingsRes.ok) {
                const data = await settingsRes.json();
                setSettings(data.settings);
            }
            if (statsRes.ok) {
                const data = await statsRes.json();
                setEmailStats(data);
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load settings', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        const token = localStorage.getItem('auth_token');
        try {
            // Merge edited templates with settings
            const updatedSettings = {
                ...settings,
                emailTemplates: { ...settings.emailTemplates, ...editedTemplates }
            };

            const res = await fetch(`${API_URL}/admin/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(updatedSettings)
            });
            if (res.ok) {
                setSettings(updatedSettings);
                toast({ title: 'Saved!', description: 'Email settings updated successfully' });
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async (emailType: string) => {
        if (!testRecipient) {
            toast({ title: 'Enter Email', description: 'Please enter a recipient email address', variant: 'destructive' });
            return;
        }
        setTestingEmails(prev => ({ ...prev, [emailType]: true }));
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_URL}/admin/email/test-type`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ emailType, recipientEmail: testRecipient })
            });
            const data = await res.json();
            if (res.ok) {
                toast({ title: '✓ Test Email Sent!', description: `${SYSTEM_EMAIL_TYPES.find(t => t.key === emailType)?.label} sent to ${testRecipient}` });
            } else {
                toast({ title: 'Failed', description: data.message || 'Could not send test email', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to send test email', variant: 'destructive' });
        } finally {
            setTestingEmails(prev => ({ ...prev, [emailType]: false }));
        }
    };

    const updateEmailSetting = (key: string, value: boolean) => {
        if (!settings) return;
        setSettings({
            ...settings,
            emailSettings: { ...settings.emailSettings, [key]: value }
        });
    };

    const updateSenderConfig = (emailType: string, sender: string) => {
        if (!settings) return;
        setSettings({
            ...settings,
            emailSenderConfig: { ...getSenderConfig(), [emailType]: sender }
        });
    };

    const getTemplate = (key: string) => {
        return editedTemplates[key] || settings?.emailTemplates?.[key] || defaultTemplates[key] || '';
    };

    const updateTemplate = (key: string, value: string) => {
        setEditedTemplates(prev => ({ ...prev, [key]: value }));
    };

    const resetTemplate = (key: string) => {
        setEditedTemplates(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Emails</h1>
                    <p className="text-slate-500 mt-1">Configure automated emails sent via ZeptoMail</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={loadData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* ZeptoMail Status Banner */}
            <Card className={`border-2 ${emailStats?.zeptomail?.configured ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`h-14 w-14 rounded-xl flex items-center justify-center ${emailStats?.zeptomail?.configured ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                <Zap className="h-7 w-7" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-slate-900">
                                    ZeptoMail {emailStats?.zeptomail?.configured ? 'Connected' : 'Not Configured'}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {emailStats?.zeptomail?.configured
                                        ? `Sending from ${emailStats.zeptomail.fromEmail}`
                                        : 'Add ZEPTOMAIL_TOKEN to your .env file'}
                                </p>
                            </div>
                        </div>
                        {emailStats?.zeptomail?.configured && (
                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-600">{emailStats.zeptomail.stats.sent}</p>
                                    <p className="text-xs text-slate-500">Delivered</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-red-500">{emailStats.zeptomail.stats.failed}</p>
                                    <p className="text-xs text-slate-500">Failed</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-900">{emailStats.zeptomail.stats.today}</p>
                                    <p className="text-xs text-slate-500">Today</p>
                                </div>
                                <a
                                    href="https://zeptomail.zoho.in/zem/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors"
                                >
                                    View Dashboard →
                                </a>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Test Recipient Input */}
            <Card className="border-slate-200">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-slate-400" />
                            <Label className="text-sm font-medium text-slate-700">Test Recipient:</Label>
                        </div>
                        <Input
                            type="email"
                            placeholder="Enter email address for testing..."
                            value={testRecipient}
                            onChange={(e) => setTestRecipient(e.target.value)}
                            className="max-w-md"
                        />
                        <p className="text-xs text-slate-500">This email will receive all test emails</p>
                    </div>
                </CardContent>
            </Card>

            {/* Domain Configuration */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-indigo-600" />
                        Sender Domain Configuration
                    </CardTitle>
                    <CardDescription>
                        Choose whether to send emails from MakeTicket's domain or your own custom domain
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* MakeTicket Domain Option */}
                        <div
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${!settings?.useCustomDomain
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                            onClick={() => setSettings(s => s ? { ...s, useCustomDomain: false } : s)}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${!settings?.useCustomDomain ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <Zap className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-900">MakeTicket Domain</h4>
                                        <Badge className="bg-green-100 text-green-700 border-green-200">Recommended</Badge>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Send emails from @maketicket.app with pre-configured DNS
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {SENDER_OPTIONS.slice(0, 3).map(opt => (
                                            <span key={opt.value} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                {opt.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {!settings?.useCustomDomain && (
                                    <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                                )}
                            </div>
                        </div>

                        {/* Custom Domain Option */}
                        <div
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${settings?.useCustomDomain
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 hover:border-slate-300'
                                }`}
                            onClick={() => setSettings(s => s ? { ...s, useCustomDomain: true } : s)}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${settings?.useCustomDomain ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-slate-900">Custom Domain</h4>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Use your own domain (requires DNS configuration)
                                    </p>
                                    {settings?.useCustomDomain && (
                                        <div className="mt-3 space-y-2">
                                            <Input
                                                placeholder="noreply@yourdomain.com"
                                                value={settings?.customDomainEmail || ''}
                                                onChange={(e) => setSettings(s => s ? { ...s, customDomainEmail: e.target.value } : s)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <Input
                                                placeholder="Your Company Name"
                                                value={settings?.customDomainName || ''}
                                                onChange={(e) => setSettings(s => s ? { ...s, customDomainName: e.target.value } : s)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    )}
                                </div>
                                {settings?.useCustomDomain && (
                                    <CheckCircle2 className="h-5 w-5 text-indigo-500" />
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Email Types Configuration */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">System Email Types</h2>
                    <p className="text-sm text-slate-500">Click to expand and customize each email</p>
                </div>

                {SYSTEM_EMAIL_TYPES.map((emailType) => {
                    const Icon = emailType.icon;
                    const isEnabled = settings?.emailSettings?.[emailType.key as keyof EmailSettings] || false;
                    const isExpanded = expandedEmail === emailType.key;
                    const currentSender = getSenderConfig()[emailType.key as keyof EmailSenderConfig] || emailType.defaultSender;
                    const senderInfo = SENDER_OPTIONS.find(s => s.value === currentSender);

                    return (
                        <Card key={emailType.key} className={`border-2 transition-all ${isEnabled ? 'border-green-200' : 'border-slate-200'}`}>
                            {/* Header - Always Visible */}
                            <div
                                className={`p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                                onClick={() => setExpandedEmail(isExpanded ? null : emailType.key)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center transition-colors ${isEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-slate-900">{emailType.label}</h4>
                                                {isEnabled ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-slate-500 border-slate-300">Disabled</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">{emailType.description}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                From: {senderInfo?.label || currentSender}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={isEnabled}
                                            onCheckedChange={(checked) => {
                                                updateEmailSetting(emailType.key, checked);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        {isExpanded ? (
                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="h-5 w-5 text-slate-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <CardContent className="border-t bg-white">
                                    {/* Sender Selection & Actions */}
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b">
                                        <div className="flex items-center gap-3">
                                            <Label className="text-sm font-medium">Sender Address:</Label>
                                            <select
                                                value={currentSender}
                                                onChange={(e) => updateSenderConfig(emailType.key, e.target.value)}
                                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                                                disabled={settings?.useCustomDomain}
                                            >
                                                {SENDER_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleTestEmail(emailType.key)}
                                                disabled={testingEmails[emailType.key] || !testRecipient || !emailStats?.zeptomail?.configured}
                                            >
                                                {testingEmails[emailType.key] ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Send className="h-4 w-4 mr-2" />
                                                )}
                                                Send Test
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Preview/Edit Tabs */}
                                    <div className="pt-4">
                                        <div className="flex gap-2 mb-4">
                                            <button
                                                onClick={() => setActiveTab('preview')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'preview'
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                <Eye className="h-4 w-4" />
                                                Preview
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('edit')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'edit'
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                            >
                                                <Code className="h-4 w-4" />
                                                Edit HTML
                                            </button>
                                            {editedTemplates[emailType.key] && (
                                                <button
                                                    onClick={() => resetTemplate(emailType.key)}
                                                    className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center gap-2"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                    Reset to Default
                                                </button>
                                            )}
                                        </div>

                                        {activeTab === 'preview' ? (
                                            <div className="border rounded-lg overflow-hidden bg-slate-50">
                                                {/* Email Header Preview */}
                                                <div className="p-3 bg-slate-100 border-b text-sm">
                                                    <p><strong>From:</strong> {senderInfo?.label || currentSender}</p>
                                                    <p><strong>Subject:</strong> {emailType.subject.replace('{{platformName}}', platformName)}</p>
                                                </div>
                                                {/* Email Body Preview */}
                                                <div className="p-4">
                                                    <iframe
                                                        srcDoc={getTemplate(emailType.key)}
                                                        className="w-full h-[400px] border-0 bg-white rounded"
                                                        title={`${emailType.label} Preview`}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                                    <p className="font-medium mb-1">Available Variables:</p>
                                                    <p className="text-xs">
                                                        {`{{userName}}, {{platformName}}, {{loginUrl}}, {{resetUrl}}, {{dashboardUrl}}, {{supportEmail}}, {{reason}}, {{loginTime}}, {{ipAddress}}, {{device}}, {{expiryMinutes}}`}
                                                    </p>
                                                </div>
                                                <textarea
                                                    value={getTemplate(emailType.key)}
                                                    onChange={(e) => updateTemplate(emailType.key, e.target.value)}
                                                    className="w-full h-[400px] p-4 font-mono text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                    placeholder="Enter HTML template..."
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Mail className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{emailStats?.overview?.total || 0}</p>
                                <p className="text-sm text-slate-500">Total Sent</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{emailStats?.zeptomail?.stats?.sent || 0}</p>
                                <p className="text-sm text-slate-500">Delivered</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <XCircle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{emailStats?.zeptomail?.stats?.failed || 0}</p>
                                <p className="text-sm text-slate-500">Failed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{emailStats?.overview?.today || 0}</p>
                                <p className="text-sm text-slate-500">Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
