'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Loader2, CheckCircle2, XCircle, Calendar, MapPin, QrCode, Users, Edit, Download, Mail } from 'lucide-react';
import Link from 'next/link';

interface InviteDetails {
    email: string;
    name?: string;
    event: {
        title: string;
        date?: string;
        location?: string;
        description?: string;
    };
    invitedBy: {
        name?: string;
        email: string;
    };
    permissions: {
        canScanQR: boolean;
        canViewAttendees: boolean;
        canEditEvent: boolean;
        canExportData: boolean;
        canSendEmails: boolean;
    };
    expiresAt: string;
}

export default function CoordinatorInvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token as string;

    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        // Check if user is logged in
        const authToken = localStorage.getItem('auth_token');
        if (authToken) {
            setIsLoggedIn(true);
            // Fetch user email
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
                .then(res => res.json())
                .then(data => setUserEmail(data.email))
                .catch(console.error);
        }

        // Fetch invite details
        const fetchInvite = async () => {
            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/coordinators/invite/${token}`
                );
                const data = await res.json();
                if (res.ok) {
                    setInvite(data);
                } else {
                    setError(data.message || 'Invalid invitation');
                }
            } catch (err) {
                setError('Failed to load invitation details');
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchInvite();
    }, [token]);

    const handleAccept = async () => {
        setAccepting(true);
        try {
            const authToken = localStorage.getItem('auth_token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/coordinators/invite/${token}/accept`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const data = await res.json();
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => router.push('/dashboard/coordinator'), 2000);
            } else {
                setError(data.message || 'Failed to accept invitation');
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setAccepting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error && !invite) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Invitation Error</h2>
                        <p className="text-slate-500 mb-6">{error}</p>
                        <Link href="/">
                            <Button variant="outline">Go Home</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Welcome to the Team! 🎉</h2>
                        <p className="text-slate-500 mb-6">You're now a coordinator for {invite?.event.title}</p>
                        <p className="text-sm text-slate-400">Redirecting to your dashboard...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const emailMatch = userEmail.toLowerCase() === invite?.email.toLowerCase();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-12">
            <Link href="/" className="mb-8 flex items-center gap-2 group">
                <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-700 transition-colors">
                    <Ticket className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl text-slate-900 tracking-tight">MakeTicket</span>
            </Link>

            <Card className="w-full max-w-lg border-slate-200 bg-white shadow-xl overflow-hidden">
                {/* Event Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <p className="text-sm opacity-80 mb-2">You're invited to coordinate</p>
                    <h1 className="text-2xl font-bold mb-3">{invite?.event.title}</h1>
                    <div className="flex flex-wrap gap-4 text-sm opacity-90">
                        {invite?.event.date && (
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(invite.event.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </div>
                        )}
                        {invite?.event.location && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {invite.event.location}
                            </div>
                        )}
                    </div>
                </div>

                <CardContent className="p-6 space-y-6">
                    {/* Invited By */}
                    <div className="text-center border-b border-slate-100 pb-4">
                        <p className="text-sm text-slate-500">
                            Invited by <span className="font-semibold text-slate-700">{invite?.invitedBy.name || invite?.invitedBy.email}</span>
                        </p>
                    </div>

                    {/* Permissions */}
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-3">Your Permissions</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {invite?.permissions.canScanQR && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                    <QrCode className="w-4 h-4 text-indigo-600" />
                                    Scan QR Codes
                                </div>
                            )}
                            {invite?.permissions.canViewAttendees && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                    <Users className="w-4 h-4 text-indigo-600" />
                                    View Attendees
                                </div>
                            )}
                            {invite?.permissions.canEditEvent && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                    <Edit className="w-4 h-4 text-indigo-600" />
                                    Edit Event
                                </div>
                            )}
                            {invite?.permissions.canExportData && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                    <Download className="w-4 h-4 text-indigo-600" />
                                    Export Data
                                </div>
                            )}
                            {invite?.permissions.canSendEmails && (
                                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                    <Mail className="w-4 h-4 text-indigo-600" />
                                    Send Emails
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    {!isLoggedIn ? (
                        <div className="space-y-4">
                            <p className="text-center text-sm text-slate-500">
                                Please sign in with <span className="font-semibold">{invite?.email}</span> to accept this invitation
                            </p>
                            <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google?returnUrl=${encodeURIComponent(`/coordinator/invite/${token}`)}`}>
                                <Button className="w-full h-12 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Sign in with Google
                                </Button>
                            </a>
                        </div>
                    ) : emailMatch ? (
                        <Button
                            onClick={handleAccept}
                            disabled={accepting}
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                            {accepting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Accepting...
                                </>
                            ) : (
                                'Accept Invitation'
                            )}
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                                <p className="text-amber-800">
                                    You're signed in as <span className="font-semibold">{userEmail}</span>,
                                    but this invitation was sent to <span className="font-semibold">{invite?.email}</span>.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    localStorage.removeItem('auth_token');
                                    window.location.reload();
                                }}
                                className="w-full"
                            >
                                Sign out and use correct account
                            </Button>
                        </div>
                    )}

                    {/* Expiry Notice */}
                    {invite?.expiresAt && (
                        <p className="text-center text-xs text-slate-400">
                            This invitation expires on {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
