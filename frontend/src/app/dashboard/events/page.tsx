'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Filter, Loader2, Calendar, MapPin, MoreHorizontal, ExternalLink, Edit2, Power, Eye } from 'lucide-react';

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [username, setUsername] = useState('');

    const fetchEvents = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            // Fetch Events
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/my`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setEvents(await res.json());
            }

            // Fetch User for Links
            const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                setUsername(userData.username);
            }

        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const toggleStatus = async (eventId: string, currentStatus: string) => {
        const token = localStorage.getItem('auth_token');
        const newStatus = currentStatus === 'active' ? 'closed' : 'active';

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/update/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                // Update local state
                setEvents(events.map(e => e._id === eventId ? { ...e, status: newStatus } : e));
            }
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Events</h1>
                    <p className="text-slate-500">View and manage all your events in one place.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm" onClick={() => router.push('/dashboard/events/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search events..."
                        className="pl-8 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="border-slate-200">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm min-h-[400px]">
                <CardHeader>
                    <CardTitle>All Events</CardTitle>
                    <CardDescription>
                        {loading
                            ? 'Loading events...'
                            : `A list of all events you have created. (${filteredEvents.length})`
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-20 text-indigo-600">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                            No events found. Create your first one!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredEvents.map((event) => {
                                const isPast = new Date(event.date) < new Date();
                                const status = event.status || (isPast ? 'closed' : 'active'); // Fallback logic

                                return (
                                    <div key={event._id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-14 w-14 rounded-lg flex flex-col items-center justify-center font-bold border shadow-sm ${status === 'active' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                <span className="text-xs uppercase font-semibold">{event.date ? new Date(event.date).toLocaleString('default', { month: 'short' }) : 'N/A'}</span>
                                                <span className="text-xl leading-none">{event.date ? new Date(event.date).getDate() : '--'}</span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                                    {event.title}
                                                    {username && (
                                                        <a href={`/${username}/${event.slug}`} target="_blank" className="text-slate-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </h3>
                                                <div className="flex items-center text-sm text-slate-500 gap-4 mt-1">
                                                    <span className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> {event.location || 'Online'}</span>
                                                    <span className="flex items-center"><Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border mr-2 
                                                ${status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    status === 'draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                {status === 'active' ? 'Active' : status === 'draft' ? 'Draft' : 'Closed'}
                                            </span>

                                            <div className="flex items-center border-l pl-2 gap-1 border-slate-200">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                                                    onClick={() => {
                                                        if (status === 'draft') {
                                                            router.push(`/dashboard/events/create?draftId=${event._id}`);
                                                        } else {
                                                            router.push(`/dashboard/events/${event._id}/edit`);
                                                        }
                                                    }}
                                                    title={status === 'draft' ? "Resume Editing" : "Edit Event"}
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-8 w-8 p-0 ${status === 'active' ? 'text-green-500 hover:text-red-500' : 'text-slate-400 hover:text-green-500'}`}
                                                    onClick={() => toggleStatus(event._id, status)}
                                                    title={status === 'active' ? 'Close Registration' : 'Activate Registration'}
                                                >
                                                    <Power className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
