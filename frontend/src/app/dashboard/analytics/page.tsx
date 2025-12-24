'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    TrendingUp,
    TrendingDown,
    Users,
    IndianRupee,
    Calendar,
    Ticket,
    CheckCircle,
    AlertCircle,
    Loader2,
    BarChart3,
    FileText
} from 'lucide-react';

interface AnalyticsData {
    totalRevenue: number;
    totalTickets: number;
    checkedInTickets: number;
    activeEventsCount: number;
    draftEventsCount: number;
    closedEventsCount: number;
    totalEvents: number;
    checkInRate: number;
    eventStats: Array<{
        id: string;
        title: string;
        slug: string;
        date: string | null;
        status: string;
        ticketsSold: number;
        checkedIn: number;
        revenue: number;
    }>;
    registrationTrend: Array<{
        date: string;
        count: number;
    }>;
    recentRegistrations: Array<{
        id: string;
        eventTitle: string;
        date: string;
        amount: number;
    }>;
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error('Failed to fetch analytics', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    const formatINR = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short'
        });
    };

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                {/* Header */}
                <div className="space-y-2">
                    <div className="h-8 w-32 bg-slate-200 rounded" />
                    <div className="h-4 w-64 bg-slate-100 rounded" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 w-20 bg-slate-100 rounded" />
                                    <div className="h-6 w-16 bg-slate-200 rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                        <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
                        <div className="h-48 bg-slate-50 rounded" />
                    </div>
                    <div className="bg-white rounded-xl p-6 border border-slate-200">
                        <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
                        <div className="h-48 bg-slate-50 rounded" />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-slate-200">
                    <div className="p-6 border-b border-slate-100">
                        <div className="h-5 w-32 bg-slate-200 rounded" />
                    </div>
                    <div className="p-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex gap-4 py-3 border-b border-slate-50">
                                <div className="h-4 w-40 bg-slate-200 rounded" />
                                <div className="h-4 w-24 bg-slate-100 rounded" />
                                <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20 text-slate-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                <p>Failed to load analytics data</p>
            </div>
        );
    }

    // Calculate max for chart scaling
    const maxRegistrations = Math.max(...data.registrationTrend.map(d => d.count), 1);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
                <p className="text-slate-500">Deep dive into your event performance.</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium opacity-90">Total Revenue</CardTitle>
                        <IndianRupee className="h-5 w-5 opacity-80" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{formatINR(data.totalRevenue)}</div>
                        <p className="text-xs opacity-75 mt-1">Lifetime earnings</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Registrations</CardTitle>
                        <Ticket className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{data.totalTickets.toLocaleString('en-IN')}</div>
                        <p className="text-xs text-slate-500 mt-1">Across all events</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Check-in Rate</CardTitle>
                        <CheckCircle className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{data.checkInRate}%</div>
                        <p className="text-xs text-slate-500 mt-1">
                            {data.checkedInTickets} of {data.totalTickets} checked in
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Active Events</CardTitle>
                        <Calendar className="h-5 w-5 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{data.activeEventsCount}</div>
                        <div className="flex gap-3 text-xs mt-1">
                            <span className="text-amber-600">{data.draftEventsCount} drafts</span>
                            <span className="text-slate-400">{data.closedEventsCount} closed</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Registration Trend Chart */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900">Registration Trend</CardTitle>
                        <CardDescription>Last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-48 flex items-end gap-1">
                            {data.registrationTrend.slice(-14).map((day, i) => (
                                <div key={day.date} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                                        style={{
                                            height: `${Math.max((day.count / maxRegistrations) * 140, day.count > 0 ? 8 : 2)}px`
                                        }}
                                        title={`${day.date}: ${day.count} registrations`}
                                    />
                                    {i % 2 === 0 && (
                                        <span className="text-[10px] text-slate-400 mt-1 rotate-45 origin-left">
                                            {formatDate(day.date)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Event Breakdown */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900">Event Performance</CardTitle>
                        <CardDescription>Registrations by event</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.eventStats.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No events created yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-48 overflow-y-auto">
                                {data.eventStats.slice(0, 5).map((event, i) => {
                                    const maxTickets = data.eventStats[0]?.ticketsSold || 1;
                                    const percentage = Math.round((event.ticketsSold / maxTickets) * 100);
                                    return (
                                        <div key={event.id}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                                                    {event.title}
                                                </span>
                                                <span className="text-sm text-slate-500">
                                                    {event.ticketsSold} tickets
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium
                                                    ${event.status === 'active' ? 'bg-green-50 text-green-600' :
                                                        event.status === 'draft' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-slate-50 text-slate-500'}`}>
                                                    {event.status}
                                                </span>
                                                <span className="text-indigo-600 font-medium">{formatINR(event.revenue)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Registrations & Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Registrations */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900">Recent Registrations</CardTitle>
                        <CardDescription>Latest 5 ticket purchases</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.recentRegistrations.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No registrations yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.recentRegistrations.slice(0, 5).map((reg) => (
                                    <div key={reg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <Ticket className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{reg.eventTitle}</p>
                                                <p className="text-xs text-slate-500">
                                                    {new Date(reg.date).toLocaleString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`font-semibold ${reg.amount > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                            {reg.amount > 0 ? formatINR(reg.amount) : 'Free'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-slate-900">Quick Stats</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-indigo-600" />
                                <span className="text-sm text-slate-700">Total Events</span>
                            </div>
                            <span className="text-lg font-bold text-indigo-600">{data.totalEvents}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="text-sm text-slate-700">Checked In</span>
                            </div>
                            <span className="text-lg font-bold text-green-600">{data.checkedInTickets}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-amber-600" />
                                <span className="text-sm text-slate-700">Draft Events</span>
                            </div>
                            <span className="text-lg font-bold text-amber-600">{data.draftEventsCount}</span>
                        </div>

                        {data.totalTickets > 0 && (
                            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <IndianRupee className="w-5 h-5 text-slate-600" />
                                    <span className="text-sm text-slate-700">Avg. Ticket</span>
                                </div>
                                <span className="text-lg font-bold text-slate-700">
                                    {formatINR(Math.round(data.totalRevenue / data.totalTickets))}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
