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
    Eye
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";

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
            } catch (error) {
                console.error('Failed to fetch event data', error);
            } finally {
                setLoading(false);
            }
        };

        if (eventId) fetchData();
    }, [eventId]);

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
            <div className="flex justify-center items-center h-96 text-indigo-600">
                <Loader2 className="w-8 h-8 animate-spin" />
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
        <div className="space-y-8">
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

            {/* Attendees Table */}
            <Card className="border-slate-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
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
                <CardContent>
                    {attendees.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">No registrations yet</p>
                            <p className="text-sm mt-1">Share your event link to get started!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
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
