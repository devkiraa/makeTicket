'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Calendar,
    Plus,
    Ticket,
    TrendingUp,
    Search,
    MoreHorizontal,
    MapPin,
    Loader2
} from 'lucide-react';

export default function Dashboard() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ totalRevenue: 0, totalTickets: 0, activeEventsCount: 0, totalEvents: 0 });
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Fetch Profile
                const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, { headers });
                if (profileRes.ok) setProfile(await profileRes.json());

                // 2. Fetch Stats
                const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/stats`, { headers });
                if (statsRes.ok) setStats(await statsRes.json());

                // 3. Fetch Events
                const eventsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/my`, { headers });
                if (eventsRes.ok) setEvents(await eventsRes.json());

            } catch (error) {
                console.error("Error loading dashboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return (
        <div className="flex custom-h-screen items-center justify-center text-indigo-600">
            <Loader2 className="w-10 h-10 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8">
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

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                            <span className="text-green-600 font-bold">₹</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">₹{stats.totalRevenue.toLocaleString()}.00</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            <TrendingUp className="h-3 w-3 mr-1" />Lifetime Earnings
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-600">Tickets Sold</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <Ticket className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.totalTickets}</div>
                        <p className="text-xs text-green-600 flex items-center mt-1">
                            Across {stats.totalEvents} events
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-600">Active Events</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{stats.activeEventsCount}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            Upcoming events
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Events List */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Recent Events</CardTitle>
                            <CardDescription>Manage your upcoming and past events.</CardDescription>
                        </div>
                        <div className="relative w-64 hidden md:block">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input placeholder="Search events..." className="pl-8 bg-slate-50 border-slate-200" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {events.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                No events found. Create your first one!
                            </div>
                        ) : (
                            events.map((event) => (
                                <div key={event._id || event.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-indigo-50 flex flex-col items-center justify-center text-indigo-700 font-bold border border-indigo-100">
                                            <span className="text-xs uppercase">{event.date ? new Date(event.date).toLocaleString('default', { month: 'short' }) : 'N/A'}</span>
                                            <span className="text-lg leading-none">{event.date ? new Date(event.date).getDate() : '--'}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{event.title}</h3>
                                            <div className="flex items-center text-xs text-slate-500 gap-3 mt-1">
                                                <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {event.location || 'Online'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${new Date(event.date) > new Date() ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}>
                                            {new Date(event.date) > new Date() ? 'Active' : 'Ended'}
                                        </span>
                                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
