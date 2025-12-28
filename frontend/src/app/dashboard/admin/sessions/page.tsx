'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    RefreshCw,
    Monitor,
    Smartphone,
    Tablet,
    Globe,
    Clock,
    LogOut,
    Search,
    Users,
    Shield,
    ChevronLeft,
    ChevronRight,
    AlertTriangle
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Session {
    _id: string;
    userId: {
        _id: string;
        name?: string;
        email: string;
        avatar?: string;
        role: string;
    };
    sessionToken: string;
    userAgent: string;
    ipAddress: string;
    deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    browser: string;
    os: string;
    country?: string;
    city?: string;
    isValid: boolean;
    lastActiveAt: string;
    loginMethod: 'email' | 'google' | 'impersonate';
    createdAt: string;
}

export default function SessionsPage() {
    const { toast } = useToast();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [uniqueUsersOnline, setUniqueUsersOnline] = useState(0);
    const [search, setSearch] = useState('');

    const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [terminatingAll, setTerminatingAll] = useState(false);

    const fetchSessions = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/sessions?page=${page}&limit=15`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions);
                setTotal(data.total);
                setPages(data.pages);
                setUniqueUsersOnline(data.uniqueUsersOnline);
            }
        } catch (error) {
            console.error('Failed to fetch sessions', error);
            toast({ title: "Error", description: "Failed to load sessions", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [page]);

    const handleTerminateSession = async () => {
        if (!selectedSession) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/sessions/${selectedSession._id}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (res.ok) {
                toast({ title: "Success", description: "Session terminated" });
                setTerminateDialogOpen(false);
                fetchSessions();
            } else {
                throw new Error('Failed');
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to terminate session", variant: "destructive" });
        }
    };

    const handleTerminateAllForUser = async (userId: string) => {
        const token = localStorage.getItem('auth_token');
        setTerminatingAll(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${userId}/sessions`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (res.ok) {
                const data = await res.json();
                toast({ title: "Success", description: `Terminated ${data.terminatedCount} sessions` });
                fetchSessions();
            } else {
                throw new Error('Failed');
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to terminate sessions", variant: "destructive" });
        } finally {
            setTerminatingAll(false);
        }
    };

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case 'mobile': return <Smartphone className="h-5 w-5 text-blue-500" />;
            case 'tablet': return <Tablet className="h-5 w-5 text-purple-500" />;
            case 'desktop': return <Monitor className="h-5 w-5 text-green-500" />;
            default: return <Globe className="h-5 w-5 text-slate-400" />;
        }
    };

    const getLoginMethodBadge = (method: string) => {
        const styles: Record<string, string> = {
            'email': 'bg-blue-50 text-blue-700 border-blue-200',
            'google': 'bg-red-50 text-red-700 border-red-200',
            'impersonate': 'bg-amber-50 text-amber-700 border-amber-200'
        };
        return (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[method] || 'bg-slate-50 text-slate-600'}`}>
                {method}
            </span>
        );
    };

    const timeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const formatIpAddress = (ip: string) => {
        if (!ip) return 'Unknown';
        // Handle IPv6 localhost
        if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1 (localhost)';
        // Remove IPv6 prefix from IPv4
        if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
        return ip;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Active Sessions</h1>
                    <p className="text-slate-500">Monitor and manage all active user sessions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchSessions} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-green-50">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Users Online</p>
                                <p className="text-2xl font-bold text-slate-900">{uniqueUsersOnline}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-blue-50">
                                <Monitor className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Active Sessions</p>
                                <p className="text-2xl font-bold text-slate-900">{total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-purple-50">
                                <Shield className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Avg. Sessions/User</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {uniqueUsersOnline > 0 ? (total / uniqueUsersOnline).toFixed(1) : '0'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sessions Table */}
            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b">
                    <CardTitle>Session List</CardTitle>
                    <CardDescription>All currently active sessions across the platform</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Device</th>
                                    <th className="px-6 py-4 font-medium">IP Address</th>
                                    <th className="px-6 py-4 font-medium">Login Method</th>
                                    <th className="px-6 py-4 font-medium">Last Active</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && sessions.length === 0 ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-10 bg-slate-100 rounded-lg w-48" /></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded w-32" /></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded w-28" /></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-16" /></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                                            <td className="px-6 py-4"><div className="ml-auto h-8 bg-slate-100 rounded w-20" /></td>
                                        </tr>
                                    ))
                                ) : sessions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                            No active sessions found.
                                        </td>
                                    </tr>
                                ) : (
                                    sessions.map((session) => (
                                        <tr key={session._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase shrink-0">
                                                        {session.userId?.avatar ? (
                                                            <img src={session.userId.avatar} className="h-full w-full rounded-full object-cover" alt="" />
                                                        ) : (
                                                            (session.userId?.name || session.userId?.email || 'U').substring(0, 2)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{session.userId?.name || 'Unknown User'}</div>
                                                        <div className="text-xs text-slate-500">{session.userId?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {getDeviceIcon(session.deviceType)}
                                                    <div>
                                                        <div className="text-sm text-slate-900">{session.browser}</div>
                                                        <div className="text-xs text-slate-500">{session.os}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm text-slate-600 font-mono">{formatIpAddress(session.ipAddress)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getLoginMethodBadge(session.loginMethod)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Clock className="h-4 w-4" />
                                                    <span className="text-sm">{timeAgo(session.lastActiveAt)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => {
                                                        setSelectedSession(session);
                                                        setTerminateDialogOpen(true);
                                                    }}
                                                >
                                                    <LogOut className="h-4 w-4 mr-1" />
                                                    Terminate
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                <div className="p-4 border-t flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        Showing <b>{sessions.length}</b> of <b>{total}</b> active sessions
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-slate-600">
                            Page {page} of {pages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === pages}
                            onClick={() => setPage(page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Terminate Session Dialog */}
            <Dialog open={terminateDialogOpen} onOpenChange={setTerminateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Terminate Session
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to terminate this session? The user will be logged out immediately.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSession && (
                        <div className="py-4 space-y-2">
                            <p><b>User:</b> {selectedSession.userId?.email}</p>
                            <p><b>Device:</b> {selectedSession.browser} on {selectedSession.os}</p>
                            <p><b>IP:</b> {selectedSession.ipAddress}</p>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setTerminateDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleTerminateSession}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Terminate Session
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
