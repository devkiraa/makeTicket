'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Calendar,
    MapPin,
    Users,
    CheckCircle2,
    Scan
} from 'lucide-react';

interface CoordinatedEvent {
    coordinatorId: string;
    permissions: {
        canScanQR: boolean;
        canViewAttendees: boolean;
        canEditEvent: boolean;
        canExportData: boolean;
        canSendEmails: boolean;
    };
    event: {
        id: string;
        title: string;
        date?: string;
        location?: string;
        status: string;
        host: {
            name?: string;
            email: string;
            avatar?: string;
        };
        stats: {
            totalAttendees: number;
            checkedIn: number;
            maxRegistrations: number;
        };
    };
}

export default function CoordinatorDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<CoordinatedEvent[]>([]);

    useEffect(() => {
        const fetchEvents = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/coordinators/my-events`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                }
            } catch (err) {
                console.error('Failed to fetch coordinated events', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [router]);

    // Calculate total stats
    const totalStats = events.reduce((acc, item) => ({
        totalAttendees: acc.totalAttendees + item.event.stats.totalAttendees,
        checkedIn: acc.checkedIn + item.event.stats.checkedIn
    }), { totalAttendees: 0, checkedIn: 0 });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Loading events...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Summary */}
            {events.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-3xl font-bold text-slate-900">{events.length}</p>
                            <p className="text-xs text-slate-500 mt-1">Events</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-emerald-600">{totalStats.checkedIn}</p>
                            <p className="text-xs text-slate-500 mt-1">Checked In</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-slate-400">{totalStats.totalAttendees}</p>
                            <p className="text-xs text-slate-500 mt-1">Total Attendees</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Section Header */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900">Your Events</h2>
                <p className="text-slate-500 text-sm">Manage check-ins for assigned events</p>
            </div>

            {/* Events List */}
            {events.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <Users className="w-7 h-7 text-slate-400" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-1">No Events Yet</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                        You haven't been assigned as a coordinator for any events yet.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((item) => {
                        const checkedInPercent = item.event.stats.totalAttendees > 0
                            ? Math.round((item.event.stats.checkedIn / item.event.stats.totalAttendees) * 100)
                            : 0;
                        const isToday = item.event.date &&
                            new Date(item.event.date).toDateString() === new Date().toDateString();

                        return (
                            <div
                                key={item.coordinatorId}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                            >
                                <div className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Title */}
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-semibold text-slate-900 truncate">
                                                    {item.event.title}
                                                </h3>
                                                {isToday && (
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                                                        Today
                                                    </span>
                                                )}
                                                {item.event.status === 'active' && !isToday && (
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                                                        Active
                                                    </span>
                                                )}
                                            </div>

                                            {/* Meta Info */}
                                            <div className="flex flex-wrap gap-3 text-sm text-slate-500 mb-3">
                                                {item.event.date && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(item.event.date).toLocaleDateString('en-IN', {
                                                            weekday: 'short',
                                                            day: 'numeric',
                                                            month: 'short'
                                                        })}
                                                    </div>
                                                )}
                                                {item.event.location && (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span className="truncate max-w-[120px]">{item.event.location}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Host */}
                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                <span>by</span>
                                                {item.event.host.avatar ? (
                                                    <img
                                                        src={item.event.host.avatar}
                                                        alt={item.event.host.name || ''}
                                                        className="w-4 h-4 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-500">
                                                        {(item.event.host.name?.[0] || item.event.host.email[0]).toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="text-slate-500">{item.event.host.name || item.event.host.email}</span>
                                            </div>
                                        </div>

                                        {/* Action */}
                                        {item.permissions.canScanQR && (
                                            <Link href={`/coordinator/scan/${item.event.id}`}>
                                                <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                                                    <Scan className="w-4 h-4 mr-1.5" />
                                                    Scan
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Stats Footer */}
                                <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-slate-600">
                                                    {item.event.stats.totalAttendees}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-emerald-600 font-medium">
                                                    {item.event.stats.checkedIn}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-medium text-slate-500">{checkedInPercent}%</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 transition-all duration-500"
                                            style={{ width: `${checkedInPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
