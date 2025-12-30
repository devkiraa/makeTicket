'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Filter, Loader2, Calendar, MapPin, ExternalLink, Edit2, Power, Copy, Trash2, AlertTriangle, MoreVertical, Lock } from 'lucide-react';
import { usePlanSummary } from '@/hooks/use-plan-summary';
import { LimitWarning } from '@/components/FeatureGate';

export default function EventsPage() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [username, setUsername] = useState('');
    
    // Plan limits
    const { isAtLimit, getLimit, getUsage, getRemainingQuota, summary: planSummary } = usePlanSummary();
    const isAtEventLimit = isAtLimit('maxEventsPerMonth');
    const eventLimit = getLimit('maxEventsPerMonth');
    const eventsUsed = getUsage('maxEventsPerMonth');
    const eventsRemaining = getRemainingQuota('maxEventsPerMonth');

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

    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // ... rest of code ....

    const confirmDelete = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${eventToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                setEvents(events.filter(e => e._id !== eventToDelete));
                setEventToDelete(null);
            } else {
                alert('Failed to delete event');
            }
        } catch (error) {
            console.error('Delete failed', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredEvents = events.filter(e =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const copyEventLink = (slug: string) => {
        if (!username) {
            alert('Username not loaded yet');
            return;
        }
        const url = `${window.location.origin}/${username}/${slug}`;
        navigator.clipboard.writeText(url);
        alert('Event link copied!');
    };

    // Skeleton Loading
    if (loading) return (
        <div className="space-y-8 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-7 w-32 bg-slate-200 rounded" />
                    <div className="h-4 w-64 bg-slate-200 rounded" />
                </div>
                <div className="h-10 w-32 bg-slate-200 rounded" />
            </div>
            <div className="flex gap-4">
                <div className="h-10 flex-1 max-w-sm bg-slate-200 rounded" />
                <div className="h-10 w-24 bg-slate-200 rounded" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
                        <div className="h-3 bg-slate-200" />
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between">
                                <div className="h-5 w-24 bg-slate-200 rounded-full" />
                                <div className="h-5 w-5 bg-slate-200 rounded" />
                            </div>
                            <div className="h-6 w-3/4 bg-slate-200 rounded" />
                            <div className="space-y-2">
                                <div className="h-4 w-40 bg-slate-100 rounded" />
                                <div className="h-4 w-32 bg-slate-100 rounded" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <div className="h-8 flex-1 bg-slate-100 rounded" />
                                <div className="h-8 flex-1 bg-slate-100 rounded" />
                                <div className="h-8 w-8 bg-slate-100 rounded" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Limit Warning */}
            <LimitWarning limit="maxEventsPerMonth" showAt={70} />
            
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Events</h1>
                    <p className="text-slate-500">View and manage all your events in one place.</p>
                    {eventLimit !== -1 && (
                        <p className="text-xs text-slate-400 mt-1">
                            {eventsUsed} / {eventLimit} events this month
                            {eventsRemaining > 0 && eventsRemaining !== -1 && ` • ${eventsRemaining} remaining`}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {isAtEventLimit && (
                        <Button
                            variant="outline"
                            className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                            onClick={() => router.push('/dashboard/billing')}
                        >
                            Upgrade Plan
                        </Button>
                    )}
                    <Button 
                        className={`shadow-sm ${isAtEventLimit ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        onClick={() => {
                            if (isAtEventLimit) {
                                router.push('/dashboard/billing');
                            } else {
                                router.push('/dashboard/events/create');
                            }
                        }}
                        title={isAtEventLimit ? 'Upgrade to create more events' : 'Create a new event'}
                    >
                        {isAtEventLimit ? <Lock className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                        {isAtEventLimit ? 'Event Limit Reached' : 'Create Event'}
                    </Button>
                </div>
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
                                    <div
                                        key={event._id}
                                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group gap-4 cursor-pointer"
                                        onClick={() => router.push(`/dashboard/events/${event._id}`)}
                                    >
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
                                                        <a
                                                            href={`/${username}/${event.slug}`}
                                                            target="_blank"
                                                            className="text-slate-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e: any) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    )}
                                                </h3>
                                                <div className="flex items-center text-sm text-slate-500 gap-4 mt-1">
                                                    <span className="flex items-center"><MapPin className="h-3.5 w-3.5 mr-1.5 text-slate-400" /> {event.location || 'Online'}</span>
                                                    {event.date && (
                                                        <span className="flex items-center">
                                                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                                                            {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
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

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e: any) => e.stopPropagation()}>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreVertical className="h-4 w-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" onClick={(e: any) => e.stopPropagation()}>
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        onClick={(e: any) => {
                                                            e.stopPropagation();
                                                            if (status === 'draft') {
                                                                router.push(`/dashboard/events/create?draftId=${event._id}`);
                                                            } else {
                                                                router.push(`/dashboard/events/${event._id}/edit`);
                                                            }
                                                        }}
                                                    >
                                                        <Edit2 className="mr-2 h-4 w-4" />
                                                        <span>{status === 'draft' ? 'Resume Editing' : 'Edit Event'}</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={(e: any) => {
                                                            e.stopPropagation();
                                                            toggleStatus(event._id, status);
                                                        }}
                                                    >
                                                        <Power className={`mr-2 h-4 w-4 ${status === 'active' ? 'text-red-500' : 'text-green-500'}`} />
                                                        <span>{status === 'active' ? 'Deactivate Event' : 'Activate Event'}</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={(e: any) => {
                                                            e.stopPropagation();
                                                            copyEventLink(event.slug);
                                                        }}
                                                    >
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        <span>Copy Link</span>
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />

                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                        onClick={(e: any) => {
                                                            e.stopPropagation();
                                                            setEventToDelete(event._id);
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>Delete</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!eventToDelete} onOpenChange={(open: boolean) => !open && setEventToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Event
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this event? This action will permanently remove the event and all associated tickets.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEventToDelete(null)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={confirmDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Event'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
