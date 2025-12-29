'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Loader2, Calendar, MapPin, Users, QrCode, ChevronRight, CheckCircle2 } from 'lucide-react';

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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="flex items-center gap-2">
                                <div className="bg-indigo-600 p-2 rounded-lg">
                                    <Ticket className="h-5 w-5 text-white" />
                                </div>
                                <span className="font-bold text-xl text-slate-900">MakeTicket</span>
                            </Link>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-600 font-medium">Coordinator Dashboard</span>
                        </div>
                        <Link href="/dashboard">
                            <Button variant="outline" size="sm">
                                Back to Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Events You're Coordinating</h1>
                    <p className="text-slate-500">Manage check-ins and attendees for events you've been assigned to</p>
                </div>

                {events.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Events Yet</h3>
                            <p className="text-slate-500 mb-4">
                                You haven't been assigned as a coordinator for any events yet.
                            </p>
                            <p className="text-sm text-slate-400">
                                Event hosts can invite you via email to coordinate their events.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {events.map((item) => (
                            <Card key={item.coordinatorId} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-slate-900">
                                                    {item.event.title}
                                                </h3>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.event.status === 'active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {item.event.status}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                                                {item.event.date && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(item.event.date).toLocaleDateString('en-US', {
                                                            weekday: 'short',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                )}
                                                {item.event.location && (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-4 h-4" />
                                                        {item.event.location}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    {item.event.stats.totalAttendees} attendees
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    {item.event.stats.checkedIn} checked in
                                                </div>
                                            </div>

                                            {/* Host Info */}
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <span>Hosted by</span>
                                                <div className="flex items-center gap-2">
                                                    {item.event.host.avatar ? (
                                                        <img
                                                            src={item.event.host.avatar}
                                                            alt={item.event.host.name || ''}
                                                            className="w-5 h-5 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                                                            {(item.event.host.name?.[0] || item.event.host.email[0]).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-slate-600">{item.event.host.name || item.event.host.email}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            {item.permissions.canScanQR && (
                                                <Link href={`/coordinator/scan/${item.event.id}`}>
                                                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                                                        <QrCode className="w-4 h-4 mr-2" />
                                                        Scan QR
                                                    </Button>
                                                </Link>
                                            )}
                                            {item.permissions.canViewAttendees && (
                                                <Link href={`/coordinator/event/${item.event.id}`}>
                                                    <Button variant="outline">
                                                        View Details
                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                    </Button>
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
