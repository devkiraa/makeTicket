'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Mail,
    Plus,
    Loader2,
    CheckCircle2,
    XCircle,
    Trash2,
    AlertCircle,
    Send,
    Activity,
    TrendingUp,
    Zap,
    Shield,
    ExternalLink,
    MoreVertical,
    RefreshCw,
    Edit2,
    Globe,
    Save,
    Copy,
    ChevronRight,
    ChevronLeft,
    Check,
    ArrowRight,
    Settings,
    Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface EmailAccount {
    _id: string;
    email: string;
    name: string;
    provider: string;
    isActive: boolean;
    isVerified: boolean;
    customFromEmail?: string;
    customFromName?: string;
    stats?: {
        sent: number;
        opened: number;
        clicked: number;
    };
    lastUsed?: string;
}

function EmailSettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [toast, setToast] = useState<{ type: string; text: string } | null>(null);

    // Wizard State
    const [wizardOpen, setWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardAccount, setWizardAccount] = useState<EmailAccount | null>(null);
    const [domainName, setDomainName] = useState('');
    const [customEmail, setCustomEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [savingCustom, setSavingCustom] = useState(false);

    // Initial Load & OAuth Callback Handling
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success) {
            showToast('success', 'Gmail account connected successfully!');
            // Clean URL
            window.history.replaceState({}, '', '/dashboard/settings/emails');
        } else if (error) {
            showToast('error', 'Failed to connect Gmail account. Please try again.');
            window.history.replaceState({}, '', '/dashboard/settings/emails');
        }

        fetchAccounts();
    }, [searchParams]);

    const showToast = (type: string, text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error('Failed to fetch accounts', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectGmail = async () => {
        setIsConnecting(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/gmail/auth`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            showToast('error', 'Failed to initiate connection');
            setIsConnecting(false);
        }
    };

    const activateAccount = async (id: string) => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts/${id}/activate`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('success', 'Account activated successfully');
                fetchAccounts();
            }
        } catch (error) {
            showToast('error', 'Failed to activate account');
        }
    };

    const sentTestEmail = async (id: string) => {
        try {
            showToast('success', 'Sending test email...');
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts/${id}/test`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('success', 'Test email sent! Check your inbox.');
            } else {
                throw new Error('Failed');
            }
        } catch (error) {
            showToast('error', 'Failed to send test email');
        }
    };

    const deleteAccount = async (id: string) => {
        if (!confirm('Are you sure you want to remove this account?')) return;
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('success', 'Account removed successfully');
                fetchAccounts();
            }
        } catch (error) {
            showToast('error', 'Failed to remove account');
        }
    };

    // Wizard Functions
    const openCustomDomainWizard = (account: EmailAccount) => {
        setWizardAccount(account);
        setWizardStep(1);
        setDomainName(account.customFromEmail?.split('@')[1] || '');
        setCustomEmail(account.customFromEmail || '');
        setDisplayName(account.customFromName || '');
        setWizardOpen(true);
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const saveCustomDomain = async () => {
        if (!wizardAccount) return;

        setSavingCustom(true);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts/${wizardAccount._id}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        customFromEmail: customEmail || null,
                        customFromName: displayName || null
                    })
                }
            );

            if (res.ok) {
                showToast('success', '🎉 Custom domain configured successfully!');
                fetchAccounts();
                setWizardOpen(false);
                setWizardStep(1);
            } else {
                const data = await res.json();
                showToast('error', data.message || 'Failed to save settings');
            }
        } catch (err) {
            showToast('error', 'Failed to save settings');
        } finally {
            setSavingCustom(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Email Settings</h1>
                <p className="text-slate-500 mt-2 text-lg">Manage how your emails are sent and configured.</p>
            </div>

            {/* Account List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
                ) : accounts.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-200 shadow-none bg-slate-50/50">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                                <Mail className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">No Email Accounts</h3>
                            <p className="text-slate-500 max-w-sm mt-2 mb-6">Link a Gmail account to start sending tickets and notifications from your own address.</p>
                            <Button onClick={handleConnectGmail} disabled={isConnecting} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 h-auto text-base">
                                {isConnecting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                                Connect Gmail Account
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {accounts.map((account) => (
                            <div
                                key={account._id}
                                className={`flex items-center justify-between p-5 transition-colors rounded-xl border ${account.isActive ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Gmail Logo */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${account.isActive ? 'bg-gradient-to-br from-emerald-100 to-emerald-200 ring-2 ring-emerald-300 ring-offset-2' : 'bg-slate-100'}`}>
                                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-slate-900">{account.email}</p>
                                            {account.isActive && (
                                                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                                    Active
                                                </span>
                                            )}
                                            {account.isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            {account.customFromEmail ? (
                                                <span className="flex items-center gap-1 text-indigo-600 font-medium">
                                                    <Globe className="w-3 h-3" />
                                                    {account.customFromEmail}
                                                </span>
                                            ) : (
                                                <span>{account.name || 'Gmail Account'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {!account.isActive && (
                                        <Button variant="outline" size="sm" onClick={() => activateAccount(account._id)} className="text-slate-600">
                                            Activate
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => sentTestEmail(account._id)} className="text-slate-600">
                                        Test
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => openCustomDomainWizard(account)} className="text-indigo-600 border-indigo-100 hover:bg-indigo-50">
                                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => deleteAccount(account._id)} className="text-red-500 hover:bg-red-50 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-center mt-6">
                            <Button onClick={handleConnectGmail} disabled={isConnecting} className="bg-slate-900 hover:bg-slate-800 text-white">
                                {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                Add Another Account
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Domain Setup Wizard */}
            {wizardOpen && wizardAccount && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
                    <Card className="w-full max-w-2xl shadow-2xl my-4 animate-in fade-in zoom-in-95 duration-200">
                        <CardHeader className="pb-4 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <Globe className="w-5 h-5 text-indigo-600" />
                                        Custom Domain Setup
                                    </CardTitle>
                                    <CardDescription>
                                        Send emails from your own domain in 3 easy steps
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3].map((step) => (
                                        <div
                                            key={step}
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${wizardStep === step
                                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 ring-offset-2'
                                                : wizardStep > step
                                                    ? 'bg-emerald-500 text-white'
                                                    : 'bg-slate-100 text-slate-400'
                                                }`}
                                        >
                                            {wizardStep > step ? <Check className="w-4 h-4" /> : step}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {/* Step 1: Enter Domain */}
                            {wizardStep === 1 && (
                                <div className="space-y-6">
                                    <div className="text-center pb-2">
                                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                                            <Globe className="w-8 h-8 text-indigo-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">Enter Your Domain</h3>
                                        <p className="text-slate-500 text-sm">What domain do you want to send emails from?</p>
                                    </div>

                                    <div className="space-y-4 max-w-md mx-auto">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">Domain Name</label>
                                            <Input
                                                type="text"
                                                placeholder="yourdomain.com"
                                                value={domainName}
                                                onChange={(e) => {
                                                    setDomainName(e.target.value);
                                                    if (!customEmail || customEmail.endsWith('@' + domainName)) {
                                                        setCustomEmail('hello@' + e.target.value);
                                                    }
                                                }}
                                                className="h-11"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">Email Address (From)</label>
                                            <Input
                                                type="email"
                                                placeholder="hello@yourdomain.com"
                                                value={customEmail}
                                                onChange={(e) => setCustomEmail(e.target.value)}
                                                className="h-11"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-slate-700 block mb-1">Sender Name</label>
                                            <Input
                                                type="text"
                                                placeholder="My Events"
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button variant="outline" className="flex-1" onClick={() => setWizardOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                            onClick={() => setWizardStep(2)}
                                            disabled={!domainName || !customEmail}
                                        >
                                            Continue <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Cloudflare Setup */}
                            {wizardStep === 2 && (
                                <div className="space-y-6">
                                    <div className="text-center pb-2">
                                        <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-orange-100">
                                            <Settings className="w-8 h-8 text-orange-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">Cloudflare Setup</h3>
                                        <p className="text-slate-500 text-sm">Add these settings to your Cloudflare dashboard</p>
                                    </div>

                                    <div className="bg-slate-50 rounded-xl p-5 space-y-6 text-sm border border-slate-200">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-semibold text-slate-900">1. Enable Email Routing</h4>
                                                <a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center text-xs">
                                                    Open Cloudflare <ExternalLink className="w-3 h-3 ml-1" />
                                                </a>
                                            </div>
                                            <p className="text-slate-500">Go to Email → Email Routing → Enable</p>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-slate-900 mb-2">2. Create Email Address</h4>
                                            <p className="text-slate-500 mb-2">Route emails to your real Gmail:</p>
                                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-3">
                                                <code className="text-slate-700 flex-1">{customEmail} → {wizardAccount.email}</code>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(`${customEmail} -> ${wizardAccount.email}`, 'route')}>
                                                    {copied === 'route' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-slate-900 mb-2">3. Add SPF Record (DNS)</h4>
                                            <p className="text-slate-500 mb-2">Add this TXT record to authorize Gmail to send emails:</p>
                                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-3">
                                                <div className="flex-1 overflow-hidden">
                                                    <div className="text-xs text-slate-400 mb-0.5">TXT Record for @</div>
                                                    <code className="text-slate-700 text-xs sm:text-sm whitespace-nowrap">v=spf1 include:_spf.google.com include:_spf.mx.cloudflare.net ~all</code>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard('v=spf1 include:_spf.google.com include:_spf.mx.cloudflare.net ~all', 'spf')}>
                                                    {copied === 'spf' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" onClick={() => setWizardStep(1)}>
                                            <ChevronLeft className="w-4 h-4 mr-1" /> Back
                                        </Button>
                                        <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => setWizardStep(3)}>
                                            I've done this <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Gmail Setup */}
                            {wizardStep === 3 && (
                                <div className="space-y-6">
                                    <div className="text-center pb-2">
                                        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                                            <div className="w-8 h-8 rounded bg-white flex items-center justify-center shadow-sm">
                                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#EA4335" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">Gmail Setup</h3>
                                        <p className="text-slate-500 text-sm">Add your custom email as a Gmail alias</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="font-medium text-slate-900">1. Create App Password</p>
                                                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline text-xs flex items-center">
                                                    Open Google <ExternalLink className="w-3 h-3 ml-1" />
                                                </a>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="font-medium text-slate-900 mb-2">2. Add "Send mail as" in Gmail</p>
                                            <a href="https://mail.google.com/mail/u/0/#settings/accounts" target="_blank" rel="noopener noreferrer" className="block bg-white rounded-lg p-3 border border-slate-200 hover:border-indigo-300 transition-colors group">
                                                <p className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">Settings → Accounts → Send mail as → Add another email</p>
                                                <p className="text-xs text-slate-400 mt-1">Click to open Gmail settings</p>
                                            </a>
                                        </div>

                                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 shadow-inner">
                                            <p className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                                                <Key className="w-4 h-4 text-emerald-400" />
                                                Use these SMTP settings:
                                            </p>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2 border border-slate-600/50">
                                                    <span className="text-slate-300 font-medium">Server:</span>
                                                    <code className="text-emerald-400 font-mono select-all">smtp.gmail.com</code>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2 border border-slate-600/50">
                                                    <span className="text-slate-300 font-medium">Port:</span>
                                                    <code className="text-emerald-400 font-mono select-all">587</code>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2 border border-slate-600/50">
                                                    <span className="text-slate-300 font-medium">Username:</span>
                                                    <code className="text-emerald-400 font-mono select-all">{wizardAccount.email}</code>
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-700/50 rounded px-3 py-2 border border-slate-600/50">
                                                    <span className="text-slate-300 font-medium">Password:</span>
                                                    <code className="text-amber-400 font-mono select-all">Your App Password</code>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <Button variant="outline" onClick={() => setWizardStep(2)}>
                                            <ChevronLeft className="w-4 h-4 mr-1" /> Back
                                        </Button>
                                        <Button
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={saveCustomDomain}
                                            disabled={savingCustom}
                                        >
                                            {savingCustom ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                            ) : (
                                                <><CheckCircle2 className="w-4 h-4 mr-2" /> Complete Setup</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 z-50 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{toast.text}</span>
                </div>
            )}
        </div>
    );
}

export default function EmailSettingsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
            <EmailSettingsContent />
        </Suspense>
    );
}
