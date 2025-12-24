'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Download,
    Search,
    Loader2,
    ChevronDown,
    Eye,
    Mail,
    UserCheck,
    UserX,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Filter,
    MoreHorizontal,
    Trash2,
    Send,
    Copy
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"

export default function AttendeesPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [attendees, setAttendees] = useState<any[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [loadingAttendees, setLoadingAttendees] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'checked' | 'pending'>('all');
    const [visibleCount, setVisibleCount] = useState(10);

    // View Details State
    const [selectedAttendee, setSelectedAttendee] = useState<any>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Action States
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Fetch Events List on Mount
    useEffect(() => {
        const fetchEvents = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/my`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setEvents(data);
                    if (data.length > 0) {
                        setSelectedEventId(data[0]._id);
                    }
                }
            } catch (error) {
                console.error("Error fetching events", error);
            } finally {
                setLoadingEvents(false);
            }
        };
        fetchEvents();
    }, []);

    // Fetch Attendees when Selected Event Changes
    const fetchAttendees = async () => {
        if (!selectedEventId) {
            setAttendees([]);
            return;
        };

        setLoadingAttendees(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${selectedEventId}/attendees`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAttendees(data);
            }
        } catch (error) {
            console.error("Error fetching attendees", error);
        } finally {
            setLoadingAttendees(false);
        }
    };

    useEffect(() => {
        fetchAttendees();
    }, [selectedEventId]);

    // Filtered attendees
    const filteredAttendees = attendees.filter(attendee => {
        const matchesSearch =
            attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            attendee.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'checked' && attendee.checkedIn) ||
            (statusFilter === 'pending' && !attendee.checkedIn);

        return matchesSearch && matchesStatus;
    });

    // Paginated attendees
    const visibleAttendees = filteredAttendees.slice(0, visibleCount);
    const hasMore = visibleCount < filteredAttendees.length;

    // Reset visible count when filters change
    useEffect(() => {
        setVisibleCount(10);
    }, [searchTerm, statusFilter, selectedEventId]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 10);
    };

    // Stats
    const totalAttendees = attendees.length;
    const checkedInCount = attendees.filter(a => a.checkedIn).length;
    const pendingCount = totalAttendees - checkedInCount;
    const checkedInPercent = totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0;

    const handleViewDetails = (attendee: any) => {
        setSelectedAttendee(attendee);
        setIsSheetOpen(true);
    };

    const handleExportCSV = () => {
        if (attendees.length === 0) return;

        const headers = ['Name', 'Email', 'Ticket ID', 'Status', 'Registered At'];
        const rows = attendees.map(a => [
            a.name,
            a.email,
            a.id,
            a.checkedIn ? 'Checked In' : 'Pending',
            a.registeredAt ? new Date(a.registeredAt).toLocaleString() : '-'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendees-${selectedEventId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleResendEmail = async (attendeeId: string) => {
        setActionLoading(attendeeId);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/tickets/${attendeeId}/resend`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (res.ok) {
                setMessage({ type: 'success', text: 'Email resent successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to resend email' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Network error' });
        } finally {
            setActionLoading(null);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleCopyTicketId = (id: string) => {
        navigator.clipboard.writeText(id);
        setMessage({ type: 'success', text: 'Ticket ID copied!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    };

    if (loadingEvents) return (
        <div className="space-y-8 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-7 w-28 bg-slate-200 rounded" />
                    <div className="h-4 w-64 bg-slate-100 rounded" />
                </div>
                <div className="h-10 w-28 bg-slate-200 rounded" />
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                        <div className="h-4 w-20 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 flex gap-8">
                    <div className="h-4 w-8 bg-slate-200 rounded" />
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-4 w-40 bg-slate-200 rounded" />
                    <div className="h-4 w-24 bg-slate-200 rounded ml-auto" />
                </div>
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="px-4 py-4 flex gap-8 border-t border-slate-100">
                        <div className="h-4 w-8 bg-slate-100 rounded" />
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                        <div className="h-4 w-48 bg-slate-100 rounded" />
                        <div className="h-5 w-20 bg-slate-100 rounded-full ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Attendees</h1>
                    <p className="text-slate-500">Manage registrations and check-ins per event.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 bg-white"
                        onClick={fetchAttendees}
                        disabled={loadingAttendees}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loadingAttendees ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        className="border-slate-200 bg-white shadow-sm hover:bg-slate-50"
                        disabled={attendees.length === 0}
                        onClick={handleExportCSV}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{totalAttendees}</p>
                                <p className="text-xs text-slate-500">Total Attendees</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{checkedInCount}</p>
                                <p className="text-xs text-slate-500">Checked In</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
                                <p className="text-xs text-slate-500">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{checkedInPercent}%</p>
                                <p className="text-xs text-slate-500">Check-in Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full md:w-72">
                    <select
                        className="w-full h-10 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent appearance-none"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                    >
                        {events.length === 0 && <option value="">No events found</option>}
                        {events.map(event => (
                            <option key={event._id} value={event._id}>
                                {event.title}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email, or ticket ID..."
                        className="pl-9 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={!selectedEventId}
                    />
                </div>

                {/* Status Filter */}
                <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setStatusFilter('checked')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'checked'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        Checked In
                    </button>
                    <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === 'pending'
                            ? 'bg-amber-500 text-white'
                            : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        Pending
                    </button>
                </div>
            </div>

            {/* Attendees Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{events.find(e => e._id === selectedEventId)?.title || 'Select an Event'}</CardTitle>
                            <CardDescription>
                                {loadingAttendees ? 'Loading list...' : (
                                    `Showing ${visibleAttendees.length} of ${filteredAttendees.length} attendees` +
                                    (filteredAttendees.length !== attendees.length ? ` (${attendees.length} total)` : '')
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingAttendees ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                            <p>Fetching attendees...</p>
                        </div>
                    ) : attendees.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 mx-6 mb-6 border-2 border-dashed border-slate-100 rounded-lg">
                            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p className="font-medium mb-1">No attendees yet</p>
                            <p className="text-sm">Share your event link to get registrations!</p>
                        </div>
                    ) : filteredAttendees.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p className="font-medium">No matching attendees</p>
                            <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium">Attendee</th>
                                        <th className="px-6 py-3 text-left font-medium">Ticket ID</th>
                                        <th className="px-6 py-3 text-left font-medium">Registered</th>
                                        <th className="px-6 py-3 text-left font-medium">Status</th>
                                        <th className="px-6 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visibleAttendees.map((attendee) => (
                                        <tr key={attendee.id} className="bg-white hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">{attendee.name}</p>
                                                    <p className="text-slate-500 text-xs">{attendee.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                                                        {attendee.id.slice(-8).toUpperCase()}
                                                    </code>
                                                    <button
                                                        onClick={() => handleCopyTicketId(attendee.id)}
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {attendee.registeredAt
                                                    ? new Date(attendee.registeredAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : '-'
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                {attendee.checkedIn ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Checked In
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                        <Clock className="w-3 h-3" />
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                                                        onClick={() => handleViewDetails(attendee)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                                        onClick={() => handleResendEmail(attendee.id)}
                                                        disabled={actionLoading === attendee.id}
                                                        title="Resend Email"
                                                    >
                                                        {actionLoading === attendee.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Send className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Load More Button */}
                            {hasMore && (
                                <div className="p-4 text-center border-t border-slate-100">
                                    <Button
                                        variant="outline"
                                        onClick={handleLoadMore}
                                        className="border-slate-200"
                                    >
                                        <ChevronDown className="w-4 h-4 mr-2" />
                                        Load More ({filteredAttendees.length - visibleCount} remaining)
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Attendee Details Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Attendee Details</SheetTitle>
                        <SheetDescription>
                            Full registration information
                        </SheetDescription>
                    </SheetHeader>

                    {selectedAttendee && (
                        <div className="mt-6 space-y-6">
                            {/* Status Badge */}
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedAttendee.checkedIn ? 'bg-emerald-100' : 'bg-amber-100'
                                    }`}>
                                    {selectedAttendee.checkedIn ? (
                                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                    ) : (
                                        <Clock className="w-6 h-6 text-amber-600" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-slate-900">{selectedAttendee.name}</p>
                                    <p className={`text-sm font-medium ${selectedAttendee.checkedIn ? 'text-emerald-600' : 'text-amber-600'
                                        }`}>
                                        {selectedAttendee.checkedIn ? 'Checked In' : 'Pending Check-in'}
                                    </p>
                                </div>
                            </div>

                            {/* Info Cards */}
                            <div className="grid gap-3">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs uppercase text-slate-500 font-medium mb-1">Email</p>
                                    <p className="text-slate-900 break-all">{selectedAttendee.email}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs uppercase text-slate-500 font-medium mb-1">Ticket ID</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-sm font-mono text-slate-900">{selectedAttendee.id}</code>
                                        <button
                                            onClick={() => handleCopyTicketId(selectedAttendee.id)}
                                            className="text-slate-400 hover:text-slate-600"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {selectedAttendee.registeredAt && (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs uppercase text-slate-500 font-medium mb-1">Registered At</p>
                                        <p className="text-slate-900">
                                            {new Date(selectedAttendee.registeredAt).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                                {selectedAttendee.checkedInAt && (
                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="text-xs uppercase text-emerald-600 font-medium mb-1">Checked In At</p>
                                        <p className="text-emerald-900">
                                            {new Date(selectedAttendee.checkedInAt).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Form Responses */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">Form Responses</h3>
                                {Object.entries(selectedAttendee.formData || {}).length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">No additional form data submitted.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(selectedAttendee.formData || {}).map(([key, value]: [string, any]) => (
                                            <div key={key} className="p-3 bg-white border border-slate-200 rounded-lg">
                                                <p className="text-xs font-medium text-slate-500 mb-1">{key}</p>
                                                <p className="text-slate-900">{value?.toString() || '-'}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-slate-200">
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => handleResendEmail(selectedAttendee.id)}
                                    disabled={actionLoading === selectedAttendee.id}
                                >
                                    {actionLoading === selectedAttendee.id ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4 mr-2" />
                                    )}
                                    Resend Confirmation Email
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Toast Message */}
            {message.text && (
                <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 ${message.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
                    }`}>
                    {message.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {message.text}
                </div>
            )}
        </div>
    )
}
