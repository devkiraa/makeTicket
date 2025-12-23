'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Ticket,
    Loader2,
    ArrowLeft,
    Calendar,
    MapPin,
    Users,
    QrCode,
    CheckCircle2,
    Search,
    Eye,
    Download
} from 'lucide-react';

interface Attendee {
    id: string;
    name: string;
    email: string;
    status: string;
    checkedIn: boolean;
    formData: Record<string, any>;
}

interface EventInfo {
    id: string;
    title: string;
    date?: string;
    location?: string;
    status: string;
    host: {
        name?: string;
        email: string;
    };
    stats: {
        totalAttendees: number;
        checkedIn: number;
        maxRegistrations: number;
    };
}

interface CoordinatorRole {
    coordinatorId: string;
    permissions: {
        canScanQR: boolean;
        canViewAttendees: boolean;
        canEditEvent: boolean;
        canExportData: boolean;
        canSendEmails: boolean;
    };
    event: EventInfo;
}

export default function CoordinatorEventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params?.eventId as string;

    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<CoordinatorRole | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                // Get my coordinated events to find this one
                const eventsRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/coordinators/my-events`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                if (eventsRes.ok) {
                    const events = await eventsRes.json();
                    const currentEvent = events.find((e: CoordinatorRole) => e.event.id === eventId);

                    if (currentEvent) {
                        setRole(currentEvent);

                        // If can view attendees, fetch them
                        if (currentEvent.permissions.canViewAttendees) {
                            const attendeesRes = await fetch(
                                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${eventId}/attendees`,
                                { headers: { 'Authorization': `Bearer ${token}` } }
                            );

                            if (attendeesRes.ok) {
                                const attendeesData = await attendeesRes.json();
                                setAttendees(attendeesData);
                            }
                        }
                    } else {
                        setError('Event not found or you do not have access');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch event data', err);
                setError('Failed to load event data');
            } finally {
                setLoading(false);
            }
        };

        if (eventId) {
            fetchData();
        }
    }, [eventId, router]);

    const filteredAttendees = attendees.filter(a =>
        a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (error || !role) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                        <p className="text-slate-500 mb-4">{error || 'You do not have access to this event'}</p>
                        <Link href="/dashboard/coordinator">
                            <Button variant="outline">Back to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const event = role.event;
    const permissions = role.permissions;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard/coordinator" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            <div className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-indigo-600" />
                                <span className="font-semibold text-slate-900">Coordinator View</span>
                            </div>
                        </div>
                        {permissions.canScanQR && (
                            <Link href={`/coordinator/scan/${eventId}`}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700">
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Scan QR
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Event Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${event.status === 'active' ? 'bg-white/20' : 'bg-white/10'
                            }`}>
                            {event.status}
                        </span>
                    </div>
                    <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
                    <div className="flex flex-wrap gap-6 text-white/90">
                        {event.date && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(event.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </div>
                        )}
                        {event.location && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-white/70 mt-4">
                        Hosted by {event.host.name || event.host.email}
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Total Attendees</p>
                                    <p className="text-3xl font-bold text-slate-900">{event.stats.totalAttendees}</p>
                                </div>
                                <Users className="w-10 h-10 text-indigo-500/30" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Checked In</p>
                                    <p className="text-3xl font-bold text-green-600">{event.stats.checkedIn}</p>
                                </div>
                                <CheckCircle2 className="w-10 h-10 text-green-500/30" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Remaining</p>
                                    <p className="text-3xl font-bold text-amber-600">
                                        {event.stats.totalAttendees - event.stats.checkedIn}
                                    </p>
                                </div>
                                <QrCode className="w-10 h-10 text-amber-500/30" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Your Permissions / Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Your Permissions</CardTitle>
                        <CardDescription>Actions you can perform for this event</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Scan QR Codes */}
                            <div className={`relative p-4 rounded-xl border-2 transition-all ${permissions.canScanQR
                                    ? 'border-indigo-200 bg-indigo-50 cursor-pointer hover:border-indigo-400'
                                    : 'border-slate-100 bg-slate-50 opacity-50'
                                }`}
                                onClick={() => permissions.canScanQR && router.push(`/coordinator/scan/${eventId}`)}
                            >
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${permissions.canScanQR ? 'bg-indigo-100' : 'bg-slate-200'
                                    }`}>
                                    <QrCode className={`w-6 h-6 ${permissions.canScanQR ? 'text-indigo-600' : 'text-slate-400'}`} />
                                </div>
                                <h3 className={`font-semibold mb-1 ${permissions.canScanQR ? 'text-slate-900' : 'text-slate-400'}`}>
                                    Scan QR Codes
                                </h3>
                                <p className="text-xs text-slate-500">Check-in attendees</p>
                                {permissions.canScanQR && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                )}
                            </div>

                            {/* View Attendees */}
                            <div className={`relative p-4 rounded-xl border-2 transition-all ${permissions.canViewAttendees
                                    ? 'border-purple-200 bg-purple-50'
                                    : 'border-slate-100 bg-slate-50 opacity-50'
                                }`}>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${permissions.canViewAttendees ? 'bg-purple-100' : 'bg-slate-200'
                                    }`}>
                                    <Users className={`w-6 h-6 ${permissions.canViewAttendees ? 'text-purple-600' : 'text-slate-400'}`} />
                                </div>
                                <h3 className={`font-semibold mb-1 ${permissions.canViewAttendees ? 'text-slate-900' : 'text-slate-400'}`}>
                                    View Attendees
                                </h3>
                                <p className="text-xs text-slate-500">See attendee list</p>
                                {permissions.canViewAttendees && (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                )}
                            </div>

                            {/* Edit Event */}
                            <div className={`relative p-4 rounded-xl border-2 transition-all ${permissions.canEditEvent
                                    ? 'border-amber-200 bg-amber-50 cursor-pointer hover:border-amber-400'
                                    : 'border-slate-100 bg-slate-50 opacity-50'
                                }`}>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${permissions.canEditEvent ? 'bg-amber-100' : 'bg-slate-200'
                                    }`}>
                                    <Eye className={`w-6 h-6 ${permissions.canEditEvent ? 'text-amber-600' : 'text-slate-400'}`} />
                                </div>
                                <h3 className={`font-semibold mb-1 ${permissions.canEditEvent ? 'text-slate-900' : 'text-slate-400'}`}>
                                    Edit Event
                                </h3>
                                <p className="text-xs text-slate-500">Modify event details</p>
                                {permissions.canEditEvent ? (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="absolute top-3 right-3">
                                        <span className="text-xs text-slate-400">Not allowed</span>
                                    </div>
                                )}
                            </div>

                            {/* Export Data */}
                            <div className={`relative p-4 rounded-xl border-2 transition-all ${permissions.canExportData
                                    ? 'border-green-200 bg-green-50 cursor-pointer hover:border-green-400'
                                    : 'border-slate-100 bg-slate-50 opacity-50'
                                }`}>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${permissions.canExportData ? 'bg-green-100' : 'bg-slate-200'
                                    }`}>
                                    <Download className={`w-6 h-6 ${permissions.canExportData ? 'text-green-600' : 'text-slate-400'}`} />
                                </div>
                                <h3 className={`font-semibold mb-1 ${permissions.canExportData ? 'text-slate-900' : 'text-slate-400'}`}>
                                    Export Data
                                </h3>
                                <p className="text-xs text-slate-500">Download attendees</p>
                                {permissions.canExportData ? (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="absolute top-3 right-3">
                                        <span className="text-xs text-slate-400">Not allowed</span>
                                    </div>
                                )}
                            </div>

                            {/* Send Emails */}
                            <div className={`relative p-4 rounded-xl border-2 transition-all ${permissions.canSendEmails
                                    ? 'border-rose-200 bg-rose-50 cursor-pointer hover:border-rose-400'
                                    : 'border-slate-100 bg-slate-50 opacity-50'
                                }`}>
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${permissions.canSendEmails ? 'bg-rose-100' : 'bg-slate-200'
                                    }`}>
                                    <svg className={`w-6 h-6 ${permissions.canSendEmails ? 'text-rose-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                    </svg>
                                </div>
                                <h3 className={`font-semibold mb-1 ${permissions.canSendEmails ? 'text-slate-900' : 'text-slate-400'}`}>
                                    Send Emails
                                </h3>
                                <p className="text-xs text-slate-500">Email attendees</p>
                                {permissions.canSendEmails ? (
                                    <div className="absolute top-3 right-3">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="absolute top-3 right-3">
                                        <span className="text-xs text-slate-400">Not allowed</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Attendees List */}
                {permissions.canViewAttendees && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Attendees</CardTitle>
                                    <CardDescription>View and manage event attendees</CardDescription>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search attendees..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 w-64"
                                        />
                                    </div>
                                    {permissions.canExportData && (
                                        <Button variant="outline" size="sm">
                                            <Download className="w-4 h-4 mr-2" />
                                            Export
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredAttendees.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                    <p>No attendees found</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Name</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Email</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-600">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAttendees.map((attendee) => (
                                                <tr key={attendee.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                                {attendee.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <span className="font-medium text-slate-900">{attendee.name || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-500">{attendee.email}</td>
                                                    <td className="py-3 px-4">
                                                        {attendee.checkedIn ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                Checked In
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                                Registered
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* No Permission Message */}
                {!permissions.canViewAttendees && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Eye className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">View Permission Required</h3>
                            <p className="text-slate-500">
                                You don't have permission to view the attendee list for this event.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
