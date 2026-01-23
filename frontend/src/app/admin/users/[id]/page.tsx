'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import {
    ArrowLeft,
    Mail,
    Shield,
    Activity,
    Clock,
    User as UserIcon,
    Ban,
    UserCheck,
    Ghost,
    Globe,
    Smartphone,
    Laptop,
    Ticket,
    Calendar,
    MapPin,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Loader2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserDetail {
    _id: string;
    email: string;
    username?: string;
    name?: string;
    role: 'admin' | 'host' | 'user';
    status: 'active' | 'suspended';
    createdAt: string;
    avatar?: string;
    plan?: string;
    lastLogin?: string;
    lastLoginIp?: string;
    loginCount?: number;
    eventsCount?: number;
    ticketsCount?: number;
    isTwoFactorEnabled?: boolean;
    resetRequestsCount?: number;
    resetRequestsDate?: string;
    lastResetRequestAt?: string;
}

interface ActivityItem {
    id: string;
    type: 'login' | 'event_created' | 'ticket_purchased';
    title: string;
    details: string;
    timestamp: string;
}

interface EventItem {
    _id: string;
    title: string;
    slug: string;
    date: string | null;
    location: string;
    status: string;
    createdAt: string;
}

interface LoginSession {
    _id: string;
    ipAddress: string;
    userAgent: string;
    browser: string;
    os: string;
    deviceType: string;
    method: string;
    createdAt: string;
    isValid: boolean;
}

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const userId = params?.id as string;

    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Data States
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [activityPage, setActivityPage] = useState(1);
    const [activityHasMore, setActivityHasMore] = useState(false);
    const [activityLoading, setActivityLoading] = useState(false);

    const [events, setEvents] = useState<EventItem[]>([]);
    const [eventsPage, setEventsPage] = useState(1);
    const [eventsTotalPages, setEventsTotalPages] = useState(1);
    const [eventsLoading, setEventsLoading] = useState(false);

    const [loginHistory, setLoginHistory] = useState<LoginSession[]>([]);
    const [loginPage, setLoginPage] = useState(1);
    const [loginTotalPages, setLoginTotalPages] = useState(1);
    const [loginLoading, setLoginLoading] = useState(false);

    // Modal States
    const [suspensionModalOpen, setSuspensionModalOpen] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');

    const fetchUser = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch user');
            setUser(await res.json());
        } catch (error) {
            toast({ title: "Error", description: "Failed to load user", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [userId, toast]);

    const fetchActivity = useCallback(async (page: number, append = false) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        setActivityLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${userId}/activity?page=${page}&limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (append) {
                    setActivity(prev => [...prev, ...data.activity]);
                } else {
                    setActivity(data.activity);
                }
                setActivityHasMore(data.hasMore);
                setActivityPage(data.page);
            }
        } finally {
            setActivityLoading(false);
        }
    }, [userId]);

    const fetchEvents = useCallback(async (page: number) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        setEventsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${userId}/events?page=${page}&limit=9`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setEvents(data.events);
                setEventsTotalPages(data.pages);
                setEventsPage(data.page);
            }
        } finally {
            setEventsLoading(false);
        }
    }, [userId]);

    const fetchLoginHistory = useCallback(async (page: number) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        setLoginLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${userId}/login-history?page=${page}&limit=10`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLoginHistory(data.sessions || []);
                setLoginTotalPages(data.pages);
                setLoginPage(data.page);
            }
        } finally {
            setLoginLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchUser();
            fetchActivity(1);
            fetchEvents(1);
            fetchLoginHistory(1);
        }
    }, [userId, fetchUser, fetchActivity, fetchEvents, fetchLoginHistory]);

    // Handle Pagination
    const loadMoreActivity = () => {
        const nextPage = activityPage + 1;
        fetchActivity(nextPage, true);
    };

    const handleImpersonate = async () => {
        const token = localStorage.getItem('auth_token');
        setActionLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${userId}/impersonate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Impersonation failed');
            const data = await res.json();
            localStorage.setItem('auth_token', data.token);
            window.location.href = '/dashboard';
        } catch (error) {
            toast({ title: "Error", description: "Failed to impersonate user", variant: "destructive" });
            setActionLoading(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!user) return;
        const token = localStorage.getItem('auth_token');
        const newStatus = user.status === 'active' ? 'suspended' : 'active';
        setActionLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus, reason: suspensionReason })
            });

            if (!res.ok) throw new Error('Status update failed');

            setUser({ ...user, status: newStatus });
            setSuspensionModalOpen(false);
            setSuspensionReason('');
            toast({ title: "Success", description: `User ${newStatus === 'active' ? 'activated' : 'suspended'}` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } finally {
            setActionLoading(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'login': return <Globe className="w-4 h-4 text-blue-500" />;
            case 'event_created': return <Calendar className="w-4 h-4 text-purple-500" />;
            case 'ticket_purchased': return <Ticket className="w-4 h-4 text-green-500" />;
            default: return <Activity className="w-4 h-4 text-slate-500" />;
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 p-6">
                <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="h-32 w-full bg-slate-200 rounded animate-pulse" />
            </div>
        );
    }

    if (!user) return <div className="p-10 text-center">User not found</div>;

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-6">
            {/* Header */}
            <div>
                <Button
                    variant="ghost"
                    className="mb-4 text-slate-500 hover:text-slate-700 -ml-3"
                    onClick={() => router.push('/dashboard/admin/users')}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Users
                </Button>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-sm overflow-hidden text-2xl font-bold text-slate-400">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                (user.name || user.email || 'U').charAt(0).toUpperCase()
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                {user.name || 'Unnamed User'}
                                {user.status === 'suspended' && (
                                    <Badge variant="destructive" className="text-sm font-medium">Suspended</Badge>
                                )}
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 mt-1">
                                <Mail className="w-4 h-4" /> {user.email}
                                {user.username && <span className="text-slate-300">•</span>}
                                {user.username && <span>@{user.username}</span>}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Badge variant="outline" className="capitalize bg-slate-50">
                                    {user.role}
                                </Badge>
                                <Badge variant="outline" className={`capitalize ${user.plan === 'enterprise' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50'}`}>
                                    {user.plan || 'Free'} Plan
                                </Badge>
                                {user.isTwoFactorEnabled && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                        <Shield className="w-3 h-3" /> 2FA Enabled
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={handleImpersonate}
                            disabled={actionLoading || user.role === 'admin'}
                        >
                            <Ghost className="w-4 h-4 mr-2" />
                            Impersonate
                        </Button>

                        {user.status === 'active' ? (
                            <Button
                                variant="destructive"
                                onClick={() => setSuspensionModalOpen(true)}
                                disabled={actionLoading || user.role === 'admin'}
                            >
                                <Ban className="w-4 h-4 mr-2" />
                                Suspend User
                            </Button>
                        ) : (
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={handleToggleStatus}
                                disabled={actionLoading}
                            >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Activate User
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Last Login</CardDescription>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {user.lastLogin ? (
                                <>
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    {new Date(user.lastLogin).toLocaleDateString()}
                                </>
                            ) : 'Never'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500">
                            {user.lastLoginIp ? `IP: ${user.lastLoginIp}` : 'No IP recorded'}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Login Count</CardDescription>
                        <CardTitle className="text-lg">{user.loginCount || 0}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500">Total sessions</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Events Created</CardDescription>
                        <CardTitle className="text-lg">{user.eventsCount || 0}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500">Hosted events</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Member Since</CardDescription>
                        <CardTitle className="text-lg">
                            {new Date(user.createdAt).toLocaleDateString()}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500">
                            {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Password Resets (Today)</CardDescription>
                        <CardTitle className="text-lg">
                            {user.resetRequestsCount || 0} / 2
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-slate-500">
                            Last: {user.lastResetRequestAt ? new Date(user.lastResetRequestAt).toLocaleString() : 'Never'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Details */}
            <Tabs defaultValue="activity" className="w-full">
                <TabsList>
                    <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                    <TabsTrigger value="login-history">Login History</TabsTrigger>
                    <TabsTrigger value="events">Events</TabsTrigger>
                </TabsList>

                {/* ACTIVITY TAB */}
                <TabsContent value="activity" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Log</CardTitle>
                            <CardDescription>Recent actions performed by this user</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                {activity.map((item) => (
                                    <div key={`${item.type}-${item.id}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                            {getActivityIcon(item.type)}
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded bg-white border border-slate-100 shadow-sm">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-slate-900">{item.title}</div>
                                                <time className="font-caveat font-medium text-indigo-500 text-xs">{new Date(item.timestamp).toLocaleDateString()}</time>
                                            </div>
                                            <div className="text-slate-500 text-sm">{item.details}</div>
                                        </div>
                                    </div>
                                ))}
                                {activity.length === 0 && !activityLoading && (
                                    <div className="text-center py-10 text-slate-500">No recent activity</div>
                                )}
                            </div>

                            {/* Pagination/Load More */}
                            <div className="mt-8 text-center">
                                {activityLoading && <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />}
                                {!activityLoading && activityHasMore && (
                                    <Button variant="outline" onClick={loadMoreActivity}>Load More Activity</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* LOGIN HISTORY TAB */}
                <TabsContent value="login-history" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Login Sessions</CardTitle>
                            <CardDescription>History of device logins</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3">Device/OS</th>
                                            <th className="px-6 py-3">Browser</th>
                                            <th className="px-6 py-3">IP Address</th>
                                            <th className="px-6 py-3">Time</th>
                                            <th className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loginLoading && loginHistory.length === 0 ? (
                                            <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
                                        ) : loginHistory.map((session) => (
                                            <tr key={session._id} className="bg-white border-b hover:bg-slate-50">
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    {session.deviceType === 'mobile' ? <Smartphone className="w-4 h-4 text-slate-400" /> : <Laptop className="w-4 h-4 text-slate-400" />}
                                                    {session.os || 'Unknown OS'}
                                                </td>
                                                <td className="px-6 py-4">{session.browser || 'Unknown'}</td>
                                                <td className="px-6 py-4 font-mono text-xs">{session.ipAddress}</td>
                                                <td className="px-6 py-4">
                                                    {new Date(session.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={session.isValid ? 'outline' : 'secondary'} className={session.isValid ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                                        {session.isValid ? 'Active' : 'Expired'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                        {!loginLoading && loginHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="text-center py-10 text-slate-500">No login history found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {loginTotalPages > 1 && (
                                <div className="flex items-center justify-end p-4 gap-2 border-t text-sm">
                                    <span className="text-slate-500 mr-2">Page {loginPage} of {loginTotalPages}</span>
                                    <Button
                                        variant="outline" size="icon"
                                        onClick={() => fetchLoginHistory(loginPage - 1)}
                                        disabled={loginPage <= 1 || loginLoading}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline" size="icon"
                                        onClick={() => fetchLoginHistory(loginPage + 1)}
                                        disabled={loginPage >= loginTotalPages || loginLoading}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* EVENTS TAB */}
                <TabsContent value="events" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Managed Events</CardTitle>
                            <CardDescription>Events hosted by this user</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {eventsLoading && events.length === 0 ? (
                                <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" /></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {events.map(event => (
                                        <div key={event._id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors flex flex-col justify-between h-full">
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-semibold text-lg line-clamp-1" title={event.title}>{event.title}</h3>
                                                    <Badge variant="outline" className={event.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100'}>
                                                        {event.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-slate-500 mb-2 flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {event.date ? new Date(event.date).toLocaleDateString() : 'No date'}
                                                </div>
                                                <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" />
                                                    {event.location || 'Online'}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                                                <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => window.open(`/${user.username}/${event.slug}`, '_blank')}>
                                                    <ExternalLink className="w-3 h-3" /> View
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {events.length === 0 && (
                                        <div className="col-span-full text-center py-10 text-slate-500">
                                            No events found for this user.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {eventsTotalPages > 1 && (
                                <div className="flex items-center justify-end pt-6 gap-2 text-sm">
                                    <span className="text-slate-500 mr-2">Page {eventsPage} of {eventsTotalPages}</span>
                                    <Button
                                        variant="outline" size="icon"
                                        onClick={() => fetchEvents(eventsPage - 1)}
                                        disabled={eventsPage <= 1 || eventsLoading}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="outline" size="icon"
                                        onClick={() => fetchEvents(eventsPage + 1)}
                                        disabled={eventsPage >= eventsTotalPages || eventsLoading}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Suspension Dialog */}
            <Dialog open={suspensionModalOpen} onOpenChange={setSuspensionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Suspend User</DialogTitle>
                        <DialogDescription>
                            Prevent this user from logging in. Their existing sessions will be terminated.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <label className="text-sm font-medium mb-1 block">Reason for suspension (optional)</label>
                        <Input
                            value={suspensionReason}
                            onChange={(e) => setSuspensionReason(e.target.value)}
                            placeholder="e.g. Violation of terms"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSuspensionModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleToggleStatus} disabled={actionLoading}>
                            Suspend User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
