'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    Mail,
    Plus,
    Loader2,
    CheckCircle2,
    XCircle,
    Trash2,
    AlertCircle,
    Send
} from 'lucide-react';

interface EmailAccount {
    _id: string;
    email: string;
    name?: string;
    provider: string;
    isActive: boolean;
    isVerified: boolean;
    emailsSent: number;
    createdAt: string;
}

export default function EmailSettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [connecting, setConnecting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Check for success/error from OAuth callback
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success) {
            setMessage({ type: 'success', text: 'Gmail account connected successfully!' });
            // Clear URL params
            window.history.replaceState({}, '', '/dashboard/settings/emails');
        } else if (error) {
            setMessage({ type: 'error', text: 'Failed to connect Gmail account. Please try again.' });
            window.history.replaceState({}, '', '/dashboard/settings/emails');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (err) {
            console.error('Failed to fetch accounts', err);
        } finally {
            setLoading(false);
        }
    };

    const connectGmail = async () => {
        setConnecting(true);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/gmail/auth`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (res.ok) {
                const { url } = await res.json();
                // Redirect to Gmail OAuth
                window.location.href = url;
            } else {
                setMessage({ type: 'error', text: 'Failed to start Gmail authentication' });
                setConnecting(false);
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Something went wrong' });
            setConnecting(false);
        }
    };

    const setActive = async (accountId: string) => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts/${accountId}/activate`,
                {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (res.ok) {
                setMessage({ type: 'success', text: 'Email account activated' });
                fetchAccounts();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to activate account' });
        }
    };

    const deleteAccount = async (accountId: string) => {
        if (!confirm('Are you sure you want to remove this email account?')) return;

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts/${accountId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (res.ok) {
                setMessage({ type: 'success', text: 'Email account removed' });
                fetchAccounts();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to remove account' });
        }
    };

    const [sendingTestId, setSendingTestId] = useState<string | null>(null);

    const sendTestEmail = async (accountId: string) => {
        setSendingTestId(accountId);
        setMessage({ type: '', text: '' });

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/accounts/${accountId}/test`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: `Test email sent to ${data.sentTo}! Check your inbox.` });
                fetchAccounts(); // Refresh to update email count
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to send test email' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to send test email' });
        } finally {
            setSendingTestId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings" className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Email Accounts</h1>
                        <p className="text-slate-500">Connect Gmail accounts to send event emails</p>
                    </div>
                </div>
                <Button
                    onClick={connectGmail}
                    disabled={connecting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                >
                    {connecting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                    ) : (
                        <><Plus className="w-4 h-4 mr-2" /> Connect Gmail</>
                    )}
                </Button>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Info Card */}
            <Card className="bg-indigo-50 border-indigo-100">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-100 rounded-lg">
                            <Mail className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-indigo-900">How it works</h3>
                            <p className="text-sm text-indigo-700 mt-1">
                                Connect your Gmail account to send registration confirmation emails, reminders,
                                and updates to your event attendees. Emails will be sent from your connected
                                Gmail address, giving them a personal touch.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Accounts List */}
            <Card>
                <CardHeader>
                    <CardTitle>Connected Accounts</CardTitle>
                    <CardDescription>
                        {accounts.length === 0
                            ? 'No email accounts connected yet'
                            : `${accounts.length} account${accounts.length > 1 ? 's' : ''} connected`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center py-12">
                            <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="font-semibold text-slate-900 mb-2">No accounts connected</h3>
                            <p className="text-slate-500 text-sm mb-4">
                                Connect a Gmail account to start sending emails to your attendees
                            </p>
                            <Button onClick={connectGmail} disabled={connecting}>
                                <Plus className="w-4 h-4 mr-2" /> Connect Gmail
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {accounts.map((account) => (
                                <div
                                    key={account._id}
                                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${account.isActive
                                        ? 'border-green-200 bg-green-50'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${account.isActive ? 'bg-green-100' : 'bg-slate-100'
                                            }`}>
                                            <svg className={`w-6 h-6 ${account.isActive ? 'text-green-600' : 'text-slate-500'}`} viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-slate-900">{account.email}</p>
                                                {account.isActive && (
                                                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                                {account.isVerified && (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">
                                                {account.name || 'Gmail'} • {account.emailsSent} emails sent
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => sendTestEmail(account._id)}
                                            disabled={sendingTestId === account._id}
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                        >
                                            {sendingTestId === account._id ? (
                                                <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Sending...</>
                                            ) : (
                                                <><Send className="w-4 h-4 mr-1" /> Send Test</>
                                            )}
                                        </Button>
                                        {!account.isActive && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setActive(account._id)}
                                            >
                                                Set Active
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteAccount(account._id)}
                                            className="text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Email Templates Link */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Email Templates</h3>
                                <p className="text-sm text-slate-500">Create and manage email templates for your events</p>
                            </div>
                        </div>
                        <Link href="/dashboard/settings/email-templates">
                            <Button variant="outline">
                                Manage Templates
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
