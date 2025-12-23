'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Search, SearchCheck, Loader2, ChevronDown, Eye } from 'lucide-react';
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

    // View Details State
    const [selectedAttendee, setSelectedAttendee] = useState<any>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    useEffect(() => {
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

        fetchAttendees();
    }, [selectedEventId]);

    const filteredAttendees = attendees.filter(attendee =>
        attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attendee.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewDetails = (attendee: any) => {
        setSelectedAttendee(attendee);
        setIsSheetOpen(true);
    };

    if (loadingEvents) return (
        <div className="flex justify-center items-center h-96 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Attendees</h1>
                    <p className="text-slate-500">Manage registrations and check-ins per event.</p>
                </div>
                <Button variant="outline" className="border-slate-200 bg-white shadow-sm hover:bg-slate-50" disabled={attendees.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            {/* Selection Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full md:w-72">
                    <select
                        className="w-full h-10 pl-3 pr-8 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent appearance-none"
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
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email, or ticket ID"
                        className="pl-8 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={!selectedEventId}
                    />
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm min-h-[400px]">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{events.find(e => e._id === selectedEventId)?.title || 'Select an Event'}</CardTitle>
                            <CardDescription>
                                {loadingAttendees ? 'Loading list...' : (
                                    filteredAttendees.length !== attendees.length
                                        ? `Showing ${filteredAttendees.length} of ${attendees.length} attendees`
                                        : `${attendees.length} Total Attendees`
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loadingAttendees ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                            <p>Fetching attendees...</p>
                        </div>
                    ) : attendees.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                            <p className="mb-2">No attendees found for this event.</p>
                            <p className="text-sm">Share your event link to get started!</p>
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3">Ticket ID</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAttendees.map((attendee) => (
                                        <tr key={attendee.id} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-900">{attendee.name}</td>
                                            <td className="px-6 py-4">{attendee.email}</td>
                                            <td className="px-6 py-4 font-mono text-xs">{attendee.id.slice(-6)}...</td>
                                            <td className="px-6 py-4">
                                                {attendee.checkedIn ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        Checked In
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                                        Issued
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                                                    onClick={() => handleViewDetails(attendee)}
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
                                        <span className={`inline-block w-2 H-2 rounded-full ${selectedAttendee.checkedIn ? 'bg-green-500' : 'bg-indigo-500'}`} />
                                        <span className="font-medium text-slate-900">{selectedAttendee.checkedIn ? 'Checked In' : 'Ticket Issued'}</span>
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
                                <div>
                                    <h4 className="text-xs uppercase text-slate-500 font-semibold mb-1">Ticket ID</h4>
                                    <p className="font-mono text-sm text-slate-600">{selectedAttendee.id}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-slate-900 border-b pb-2">Form Responses</h3>
                                {Object.entries(selectedAttendee.formData || {}).length === 0 ? (
                                    <p className="text-slate-500 italic">No additional form data submitted.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {Object.entries(selectedAttendee.formData || {}).map(([key, value]: [string, any]) => (
                                            // Filter out internal fields if any, though usually formData is clean answers
                                            <div key={key}>
                                                <h4 className="text-sm font-medium text-slate-700 mb-1">{key}</h4>
                                                <div className="p-3 bg-white border border-slate-200 rounded-md text-sm text-slate-800">
                                                    {value?.toString() || '-'}
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
    )
}
