'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    ArrowLeft,
    Calendar,
    MapPin,
    Users,
    Download,
    Search,
    Loader2,
    CheckCircle,
    ExternalLink,
    Copy,
    IndianRupee,
    Eye,
    Table2,
    RefreshCw,
    Unlink,
    Link as LinkIcon
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { CoordinatorManager } from '@/components/CoordinatorManager';

interface Attendee {
    id: string;
    name: string;
    email: string;
    eventName: string;
    status: string;
    checkedIn: boolean;
    formData: Record<string, any>;
}

interface EventData {
    _id: string;
    title: string;
    slug: string;
    description: string;
    date: string | null;
    location: string;
    price: number;
    status: string;
    formSchema: Array<{
        id: string;
        label: string;
        type: string;
        required: boolean;
        placeholder?: string;
        options?: string[];
    }>;
}

export default function EventDetailPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params?.id as string;

    const [event, setEvent] = useState<EventData | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [username, setUsername] = useState('');

    // Detail Sheet
    const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Google Sheets Integration
    const [hasSheetsAccess, setHasSheetsAccess] = useState(false);
    const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
    const [creatingSheet, setCreatingSheet] = useState(false);
    const [checkingSheetsAccess, setCheckingSheetsAccess] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                // Fetch all events and find this one
                const eventsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/my`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (eventsRes.ok) {
                    const events = await eventsRes.json();
                    const found = events.find((e: any) => e._id === eventId);
                    if (found) setEvent(found);
                }

                // Fetch attendees
                const attendeesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${eventId}/attendees`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (attendeesRes.ok) {
                    setAttendees(await attendeesRes.json());
                }

                // Fetch username for links
                const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (userRes.ok) {
                    const userData = await userRes.json();
                    setUsername(userData.username);
                }

                // Check Google Sheets access
                const sheetsAccessRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/access`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (sheetsAccessRes.ok) {
                    const sheetsData = await sheetsAccessRes.json();
                    setHasSheetsAccess(sheetsData.hasSheetsAccess || false);
                }
                setCheckingSheetsAccess(false);

                // Check if event has linked spreadsheet
                const sheetInfoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-sheets/events/${eventId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (sheetInfoRes.ok) {
                    const sheetInfo = await sheetInfoRes.json();
                    setSpreadsheetUrl(sheetInfo.spreadsheetUrl || null);
                }
            } catch (error) {
                console.error('Failed to fetch event data', error);
            } finally {
                setLoading(false);
            }
        };

        if (eventId) fetchData();
    }, [eventId]);

    // Google Sheets functions
    const connectGoogleSheets = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-sheets/connect?eventId=${eventId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Failed to get connect URL', error);
        }
    };

    const createSpreadsheet = async () => {
        const token = localStorage.getItem('auth_token');
        setCreatingSheet(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-sheets/events/${eventId}/create`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (res.ok) {
                const data = await res.json();
                setSpreadsheetUrl(data.spreadsheetUrl);
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to create spreadsheet');
            }
        } catch (error) {
            console.error('Failed to create spreadsheet', error);
        } finally {
            setCreatingSheet(false);
        }
    };

    const unlinkSpreadsheet = async () => {
        if (!confirm('Are you sure you want to unlink the spreadsheet? The spreadsheet will not be deleted.')) return;

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-sheets/events/${eventId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            if (res.ok) {
                setSpreadsheetUrl(null);
            }
        } catch (error) {
            console.error('Failed to unlink spreadsheet', error);
        }
    };

    const filteredAttendees = attendees.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Get all unique form field labels for table headers
    const formLabels = event?.formSchema?.map(f => f.label) || [];

    // Export to CSV
    const exportCSV = () => {
        if (!event || attendees.length === 0) return;

        // Headers: Name, Email, Status, ...formLabels
        const headers = ['Name', 'Email', 'Status', ...formLabels];
        const rows = attendees.map(a => {
            const row = [
                a.name,
                a.email,
                a.checkedIn ? 'Checked In' : 'Registered',
                ...formLabels.map(label => {
                    const value = a.formData[label] ?? '';
                    // Handle arrays (checkboxes)
                    if (Array.isArray(value)) return value.join('; ');
                    return String(value).replace(/,/g, ';'); // Escape commas
                })
            ];
            return row.map(cell => `"${cell}"`).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${event.slug}-attendees.csv`;
        link.click();
    };

    const copyEventLink = () => {
        const url = `${window.location.origin}/${username}/${event?.slug}`;
        navigator.clipboard.writeText(url);
        alert('Event link copied!');
    };

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                {/* Back button and title skeleton */}
                <div>
                    <div className="h-8 w-32 bg-slate-200 rounded mb-4" />
                    <div className="h-8 w-64 bg-slate-200 rounded" />
                    <div className="flex items-center gap-4 mt-3">
                        <div className="h-4 w-32 bg-slate-100 rounded" />
                        <div className="h-4 w-24 bg-slate-100 rounded" />
                        <div className="h-5 w-16 bg-slate-100 rounded-full" />
                    </div>
                </div>

                {/* Stats skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white p-4 rounded-lg border border-slate-200">
                            <div className="flex justify-between">
                                <div className="space-y-2">
                                    <div className="h-4 w-24 bg-slate-100 rounded" />
                                    <div className="h-7 w-16 bg-slate-200 rounded" />
                                </div>
                                <div className="h-8 w-8 bg-slate-100 rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Form fields skeleton */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <div className="h-5 w-28 bg-slate-200 rounded mb-2" />
                    <div className="h-4 w-64 bg-slate-100 rounded mb-6" />
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-4 bg-slate-50 rounded-lg">
                                <div className="h-3 w-12 bg-slate-200 rounded mb-2" />
                                <div className="h-5 w-24 bg-slate-200 rounded" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Table skeleton */}
                <div className="bg-white rounded-lg border border-slate-200">
                    <div className="p-6 border-b border-slate-100 flex justify-between">
                        <div>
                            <div className="h-5 w-28 bg-slate-200 rounded mb-2" />
                            <div className="h-4 w-48 bg-slate-100 rounded" />
                        </div>
                        <div className="flex gap-3">
                            <div className="h-9 w-48 bg-slate-100 rounded" />
                            <div className="h-9 w-28 bg-slate-100 rounded" />
                        </div>
                    </div>
                    <div className="p-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex gap-4 py-3 border-b border-slate-50">
                                <div className="h-4 w-8 bg-slate-100 rounded" />
                                <div className="h-4 w-32 bg-slate-200 rounded" />
                                <div className="h-4 w-40 bg-slate-100 rounded" />
                                <div className="h-5 w-20 bg-slate-100 rounded-full ml-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-500">Event not found</p>
                <Button variant="link" onClick={() => router.push('/dashboard/events')}>
                    Back to Events
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8 overflow-x-hidden">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <Button
                        variant="ghost"
                        className="mb-4 text-slate-500 hover:text-slate-700 -ml-3"
                        onClick={() => router.push('/dashboard/events')}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Events
                    </Button>
                    <h1 className="text-2xl font-bold text-slate-900">{event.title}</h1>
                    <div className="flex items-center gap-4 mt-2 text-slate-500">
                        {event.date && (
                            <span className="flex items-center text-sm">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(event.date).toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </span>
                        )}
                        <span className="flex items-center text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            {event.location || 'Online'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium
                            ${event.status === 'active' ? 'bg-green-50 text-green-700' :
                                event.status === 'draft' ? 'bg-amber-50 text-amber-700' :
                                    'bg-slate-100 text-slate-500'}`}>
                            {event.status}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyEventLink} className="border-slate-200">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                    </Button>
                    {username && event.status === 'active' && (
                        <a href={`/${username}/${event.slug}`} target="_blank">
                            <Button variant="outline" size="sm" className="border-slate-200">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Page
                            </Button>
                        </a>
                    )}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-slate-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Total Registrations</p>
                                <p className="text-2xl font-bold text-slate-900">{attendees.length}</p>
                            </div>
                            <Users className="w-8 h-8 text-indigo-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Checked In</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {attendees.filter(a => a.checkedIn).length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Ticket Price</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {event.price > 0 ? `₹${event.price}` : 'Free'}
                                </p>
                            </div>
                            <IndianRupee className="w-8 h-8 text-amber-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Form Fields</p>
                                <p className="text-2xl font-bold text-slate-900">{event.formSchema?.length || 0}</p>
                            </div>
                            <svg className="w-8 h-8 text-purple-500 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Form Schema Preview */}
            {event.formSchema && event.formSchema.length > 0 && (
                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Form Fields</CardTitle>
                        <CardDescription>These are the questions attendees fill when registering</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {event.formSchema.map((field, i) => (
                                <div key={field.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-xs text-slate-400 font-medium">Field {i + 1}</span>
                                            <h4 className="font-medium text-slate-900 mt-1">{field.label}</h4>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                            ${field.type === 'text' ? 'bg-blue-50 text-blue-600' :
                                                field.type === 'email' ? 'bg-green-50 text-green-600' :
                                                    field.type === 'select' ? 'bg-purple-50 text-purple-600' :
                                                        field.type === 'radio' ? 'bg-amber-50 text-amber-600' :
                                                            field.type === 'textarea' ? 'bg-pink-50 text-pink-600' :
                                                                'bg-slate-100 text-slate-600'}`}>
                                            {field.type}
                                        </span>
                                    </div>
                                    {field.required && (
                                        <span className="text-xs text-red-500 mt-1 inline-block">Required</span>
                                    )}
                                    {field.options && field.options.length > 0 && (
                                        <div className="mt-2 text-xs text-slate-500">
                                            Options: {field.options.join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Coordinators Section */}
            <CoordinatorManager eventId={eventId} />

            {/* Google Sheets Integration */}
            <Card className="border-slate-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Table2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Google Sheets Integration</CardTitle>
                                <CardDescription>Automatically sync registrations to a Google Sheet</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {checkingSheetsAccess ? (
                        <div className="flex items-center gap-2 text-slate-500">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Checking connection...
                        </div>
                    ) : spreadsheetUrl ? (
                        // Spreadsheet is linked
                        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-green-900">Spreadsheet Connected</p>
                                    <p className="text-sm text-green-700">New registrations will be added automatically</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href={spreadsheetUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="bg-white">
                                        <ExternalLink className="w-4 h-4 mr-1" />
                                        Open Sheet
                                    </Button>
                                </a>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={unlinkSpreadsheet}
                                    className="text-slate-500 hover:text-red-600"
                                >
                                    <Unlink className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ) : !hasSheetsAccess ? (
                        // Need to connect Google
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                                Connect your Google account to automatically save registrations to a spreadsheet,
                                just like Google Forms does.
                            </p>
                            <Button
                                onClick={connectGoogleSheets}
                                variant="outline"
                                className="bg-white border-green-200 text-green-700 hover:bg-green-50"
                            >
                                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Connect Google Sheets
                            </Button>
                        </div>
                    ) : (
                        // Has access, can create spreadsheet
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                                Create a Google Sheet for this event. All registrations will be automatically added as new rows.
                            </p>
                            <Button
                                onClick={createSpreadsheet}
                                disabled={creatingSheet}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {creatingSheet ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Table2 className="w-4 h-4 mr-2" />
                                        Create Spreadsheet
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Attendees Table */}
            <Card className="border-slate-200 w-full min-w-0">
                <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <CardTitle className="text-lg">Registrations</CardTitle>
                            <CardDescription>All attendees with their form responses</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search..."
                                    className="pl-8 w-64 bg-white border-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportCSV}
                                disabled={attendees.length === 0}
                                className="border-slate-200"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {attendees.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg m-6">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No registrations yet</p>
                            <p className="text-sm mt-1">Share your event link to get started!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto" style={{ maxWidth: 'calc(100vw - 300px)' }}>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="px-4 py-3 font-semibold text-slate-700">#</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Name</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Email</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
                                        {formLabels.map(label => (
                                            <th key={label} className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                                                {label}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 font-semibold text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAttendees.map((attendee, index) => (
                                        <tr key={attendee.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">{attendee.name}</td>
                                            <td className="px-4 py-3 text-slate-600">{attendee.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium
                                                    ${attendee.checkedIn ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
                                                    {attendee.checkedIn ? 'Checked In' : 'Registered'}
                                                </span>
                                            </td>
                                            {formLabels.map(label => (
                                                <td key={label} className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                                                    {Array.isArray(attendee.formData[label])
                                                        ? attendee.formData[label].join(', ')
                                                        : attendee.formData[label] || '-'}
                                                </td>
                                            ))}
                                            <td className="px-4 py-3">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                                                    onClick={() => {
                                                        setSelectedAttendee(attendee);
                                                        setIsSheetOpen(true);
                                                    }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Attendee Details</SheetTitle>
                        <SheetDescription>
                            Full registration information for {selectedAttendee?.name}
                        </SheetDescription>
                    </SheetHeader>

                    {selectedAttendee && (
                        <div className="mt-8 space-y-6">
                            <div className="grid gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <h4 className="text-xs uppercase text-slate-500 font-semibold mb-1">Status</h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-block w-2 h-2 rounded-full ${selectedAttendee.checkedIn ? 'bg-green-500' : 'bg-indigo-500'}`} />
                                        <span className="font-medium text-slate-900">
                                            {selectedAttendee.checkedIn ? 'Checked In' : 'Ticket Issued'}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-xs uppercase text-slate-500 font-semibold mb-1">Name</h4>
                                        <p className="font-medium text-slate-900">{selectedAttendee.name}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs uppercase text-slate-500 font-semibold mb-1">Email</h4>
                                        <p className="font-medium text-slate-900 break-all">{selectedAttendee.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">Form Responses</h3>
                                {Object.entries(selectedAttendee.formData || {}).length === 0 ? (
                                    <p className="text-slate-500 italic">No additional form data submitted.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(selectedAttendee.formData || {}).map(([key, value]) => (
                                            <div key={key}>
                                                <h4 className="text-sm font-medium text-slate-700 mb-1">{key}</h4>
                                                <div className="p-3 bg-white border border-slate-200 rounded-md text-sm text-slate-800">
                                                    {Array.isArray(value) ? value.join(', ') : value?.toString() || '-'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
