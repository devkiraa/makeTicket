'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import {
    Calendar,
    Plus,
    Ticket,
    TrendingUp,
    Search,
    MoreHorizontal,
    MapPin,
    Users,
    QrCode,
    Mail,
    Clock,
    ArrowRight,
    CheckCircle2,
    Eye,
    Settings,
    Copy,
    ExternalLink
} from 'lucide-react';

export default function Dashboard() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ totalRevenue: 0, totalTickets: 0, activeEventsCount: 0, totalEvents: 0, checkedInToday: 0 });
    const [profile, setProfile] = useState<any>(null);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Check for token from URL first (OAuth callback)
            const params = new URLSearchParams(window.location.search);
            const tokenFromUrl = params.get('token');

            if (tokenFromUrl) {
                localStorage.setItem('auth_token', tokenFromUrl);
                // Clean URL without reload
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // Small delay to ensure token is saved if coming from OAuth
            await new Promise(resolve => setTimeout(resolve, 100));

            const token = localStorage.getItem('auth_token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch all data in parallel
                const [profileRes, statsRes, eventsRes, notificationsRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/stats`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/my`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/notifications?limit=5`, { headers })
                ]);

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setProfile(profileData);

                    // Redirect users with 'user' role to the user dashboard
                    if (profileData.role === 'user') {
                        router.push('/dashboard/user');
                        return;
                    }
                }
                if (statsRes.ok) setStats(await statsRes.json());
                if (eventsRes.ok) setEvents(await eventsRes.json());
                if (notificationsRes.ok) {
                    const data = await notificationsRes.json();
                    setRecentActivity(data.notifications || []);
                }

            } catch (error) {
                console.error("Error loading dashboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [router]);

    const copyEventLink = (slug: string) => {
        const url = `${window.location.origin}/e/${slug}`;
        navigator.clipboard.writeText(url);
    };

    const formatTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (loading) return <DashboardSkeleton />;

    // Split events into upcoming and past
    const upcomingEvents = events.filter(e => new Date(e.date) > new Date()).slice(0, 3);
    const recentEvents = events.slice(0, 5);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.name || profile?.username || profile?.email?.split('@')[0] || 'Host'}</h1>
                    <p className="text-slate-500">Here's what's happening with your events today.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={() => router.push('/dashboard/events/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                </Button>
            </div>

            {/* Stats Grid - Enhanced */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                                <p className="text-2xl font-bold text-slate-900">₹{stats.totalRevenue?.toLocaleString() || 0}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
                                <span className="text-white font-bold text-xl">₹</span>
                            </div>
                        </div>
                        <p className="text-xs text-green-600 flex items-center mt-3">
                            <TrendingUp className="h-3 w-3 mr-1" />Lifetime Earnings
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Tickets Sold</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.totalTickets || 0}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-200">
                                <Ticket className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Across {stats.totalEvents || 0} events
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Active Events</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.activeEventsCount || 0}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center shadow-lg shadow-purple-200">
                                <Calendar className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Upcoming events
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Check-ins Today</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.checkedInToday || 0}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                                <QrCode className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Scanned today
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => router.push('/dashboard/events/create')}
                    className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors group"
                >
                    <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-slate-900">Create Event</p>
                        <p className="text-xs text-slate-500">New event</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/attendees')}
                    className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
                >
                    <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-slate-900">Attendees</p>
                        <p className="text-xs text-slate-500">View all</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/settings/emails')}
                    className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group"
                >
                    <div className="h-10 w-10 rounded-lg bg-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-slate-900">Email Setup</p>
                        <p className="text-xs text-slate-500">Configure</p>
                    </div>
                </button>

                <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="flex items-center gap-3 p-4 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors group"
                >
                    <div className="h-10 w-10 rounded-lg bg-slate-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Settings className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-semibold text-slate-900">Settings</p>
                        <p className="text-xs text-slate-500">Account</p>
                    </div>
                </button>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Events List - Takes 2 columns */}
                <Card className="border-slate-200 shadow-sm lg:col-span-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Your Events</CardTitle>
                                <CardDescription>Manage your upcoming and past events.</CardDescription>
                            </div>
                            <div className="relative w-48 hidden md:block">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <Input placeholder="Search..." className="pl-8 bg-slate-50 border-slate-200 h-9" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentEvents.length === 0 ? (
                                <div className="text-center py-12">
                                    <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="font-semibold text-slate-900 mb-2">No events yet</h3>
                                    <p className="text-slate-500 text-sm mb-4">Create your first event to get started</p>
                                    <Button onClick={() => router.push('/dashboard/events/create')}>
                                        <Plus className="w-4 h-4 mr-2" /> Create Event
                                    </Button>
                                </div>
                            ) : (
                                recentEvents.map((event) => (
                                    <div
                                        key={event._id || event.id}
                                        className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
                                        onClick={() => router.push(`/dashboard/events/${event._id}`)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center text-white font-bold shadow-lg">
                                                <span className="text-[10px] uppercase opacity-80">{event.date ? new Date(event.date).toLocaleString('default', { month: 'short' }) : 'N/A'}</span>
                                                <span className="text-lg leading-none">{event.date ? new Date(event.date).getDate() : '--'}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{event.title}</h3>
                                                <div className="flex items-center text-xs text-slate-500 gap-3 mt-1">
                                                    <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {event.location || 'Online'}</span>
                                                    <span className="flex items-center"><Ticket className="h-3 w-3 mr-1" /> {event.ticketCount || 0} tickets</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${new Date(event.date) > new Date()
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {new Date(event.date) > new Date() ? 'Active' : 'Ended'}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); copyEventLink(event.slug); }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                                                title="Copy event link"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </button>
                                            <Link
                                                href={`/e/${event.slug}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                                                target="_blank"
                                                title="View public page"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {events.length > 5 && (
                            <div className="mt-4 text-center">
                                <Button variant="outline" onClick={() => router.push('/dashboard/events')}>
                                    View All Events <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Upcoming Events Mini Calendar */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-600" /> Upcoming
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {upcomingEvents.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No upcoming events</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map((event) => (
                                        <Link
                                            key={event._id}
                                            href={`/dashboard/events/${event._id}`}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex flex-col items-center justify-center text-indigo-700 text-xs font-bold">
                                                <span className="text-[8px] uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                                <span className="leading-none">{new Date(event.date).getDate()}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 text-sm truncate">{event.title}</p>
                                                <p className="text-xs text-slate-500">{new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" /> Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">No recent activity</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentActivity.map((activity) => (
                                        <div key={activity._id} className="flex items-start gap-3">
                                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs ${activity.type === 'registration' ? 'bg-green-500' :
                                                activity.type === 'check_in' ? 'bg-blue-500' : 'bg-slate-400'
                                                }`}>
                                                {activity.type === 'registration' ? <Ticket className="w-3 h-3" /> :
                                                    activity.type === 'check_in' ? <QrCode className="w-3 h-3" /> :
                                                        <Eye className="w-3 h-3" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-900 truncate">{activity.message}</p>
                                                <p className="text-xs text-slate-400">{formatTimeAgo(activity.createdAt)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
