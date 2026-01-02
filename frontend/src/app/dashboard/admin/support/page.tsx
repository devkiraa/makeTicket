'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Search,
    Loader2,
    MessageSquare,
    Clock,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    RefreshCw,
    Send,
    Shield,
    Tag,
    User,
    Calendar,
    ArrowUpCircle,
    ArrowDownCircle,
    MinusCircle
} from 'lucide-react';

interface SupportTicket {
    _id: string;
    subject: string;
    category: string;
    status: string;
    priority: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    resolution?: string;
    eventId: {
        _id: string;
        title: string;
        slug: string;
    };
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    ticketId: {
        qrHash: string;
        pricePaid: number;
        guestName?: string;
        guestEmail?: string;
    };
    messages: Array<{
        senderId: { _id: string; name: string; email: string };
        senderType: string;
        message: string;
        sentAt: string;
    }>;
}

interface Stats {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
}

export default function AdminSupportPage() {
    const { toast } = useToast();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({ open: 0, in_progress: 0, resolved: 0, closed: 0 });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');

    // Selected ticket
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchTickets();
    }, [statusFilter, categoryFilter, priorityFilter]);

    const fetchTickets = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (categoryFilter !== 'all') params.append('category', categoryFilter);
            if (priorityFilter !== 'all') params.append('priority', priorityFilter);
            if (searchTerm) params.append('search', searchTerm);

            const res = await fetch(`${apiUrl}/support/admin/tickets?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
                setStats(data.stats || { open: 0, in_progress: 0, resolved: 0, closed: 0 });
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewTicket = async (ticket: SupportTicket) => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${apiUrl}/support/tickets/${ticket._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const fullTicket = await res.json();
                setSelectedTicket(fullTicket);
                setIsSheetOpen(true);
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load ticket details', variant: 'destructive' });
        }
    };

    const handleSendMessage = async () => {
        if (!selectedTicket || !newMessage.trim()) return;
        const token = localStorage.getItem('auth_token');

        setSendingMessage(true);
        try {
            const res = await fetch(`${apiUrl}/support/tickets/${selectedTicket._id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ message: newMessage })
            });

            if (res.ok) {
                setNewMessage('');
                await handleViewTicket(selectedTicket);
                toast({ title: 'Sent', description: 'Message sent successfully' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
        } finally {
            setSendingMessage(false);
        }
    };

    const handleUpdateTicket = async (ticketId: string, updates: { status?: string; priority?: string; resolution?: string }) => {
        const token = localStorage.getItem('auth_token');
        setUpdatingStatus(true);

        try {
            const res = await fetch(`${apiUrl}/support/admin/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                toast({ title: 'Updated', description: 'Ticket updated successfully' });
                fetchTickets();
                if (selectedTicket && selectedTicket._id === ticketId) {
                    await handleViewTicket(selectedTicket);
                }
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update ticket', variant: 'destructive' });
        } finally {
            setUpdatingStatus(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { bg: string; icon: any }> = {
            open: { bg: 'bg-blue-100 text-blue-800', icon: Clock },
            in_progress: { bg: 'bg-amber-100 text-amber-800', icon: RefreshCw },
            resolved: { bg: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
            closed: { bg: 'bg-slate-100 text-slate-600', icon: XCircle }
        };
        const { bg, icon: Icon } = config[status] || config.open;
        return (
            <Badge className={`${bg} gap-1`}>
                <Icon className="w-3 h-3" />
                {status.replace('_', ' ')}
            </Badge>
        );
    };

    const getPriorityBadge = (priority: string) => {
        const config: Record<string, { bg: string; icon: any }> = {
            high: { bg: 'bg-red-100 text-red-800', icon: ArrowUpCircle },
            medium: { bg: 'bg-yellow-100 text-yellow-800', icon: MinusCircle },
            low: { bg: 'bg-green-100 text-green-800', icon: ArrowDownCircle }
        };
        const { bg, icon: Icon } = config[priority] || config.medium;
        return (
            <Badge className={`${bg} gap-1`}>
                <Icon className="w-3 h-3" />
                {priority}
            </Badge>
        );
    };

    const getCategoryBadge = (category: string) => {
        const colors: Record<string, string> = {
            payment: 'bg-purple-100 text-purple-800',
            registration: 'bg-blue-100 text-blue-800',
            ticket: 'bg-indigo-100 text-indigo-800',
            general: 'bg-slate-100 text-slate-600'
        };
        return <Badge className={colors[category] || colors.general}>{category}</Badge>;
    };

    const filteredTickets = tickets.filter(t =>
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.eventId?.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-7 w-48 bg-slate-200 rounded" />
                        <div className="h-4 w-64 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                            <div className="h-4 w-20 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-600" />
                        Admin Support Console
                    </h1>
                    <p className="text-slate-500">Manage all support tickets across the platform</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 bg-white"
                    onClick={fetchTickets}
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('open')}>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
                                <p className="text-xs text-slate-500">Open</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('in_progress')}>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <RefreshCw className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.in_progress}</p>
                                <p className="text-xs text-slate-500">In Progress</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('resolved')}>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
                                <p className="text-xs text-slate-500">Resolved</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('closed')}>
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats.closed}</p>
                                <p className="text-xs text-slate-500">Closed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by subject, email, or event..."
                        className="pl-9 bg-white border-slate-200"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>
                <select
                    className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all">All Categories</option>
                    <option value="payment">Payment</option>
                    <option value="registration">Registration</option>
                    <option value="ticket">Ticket</option>
                    <option value="general">General</option>
                </select>
                <select
                    className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                >
                    <option value="all">All Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>

            {/* Tickets Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Support Tickets</CardTitle>
                    <CardDescription>
                        {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredTickets.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 mx-6 mb-6 border-2 border-dashed border-slate-100 rounded-lg">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p className="font-medium mb-1">No support tickets found</p>
                            <p className="text-sm">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium">Subject</th>
                                        <th className="px-6 py-3 text-left font-medium">User</th>
                                        <th className="px-6 py-3 text-left font-medium">Event</th>
                                        <th className="px-6 py-3 text-left font-medium">Category</th>
                                        <th className="px-6 py-3 text-left font-medium">Priority</th>
                                        <th className="px-6 py-3 text-left font-medium">Status</th>
                                        <th className="px-6 py-3 text-left font-medium">Created</th>
                                        <th className="px-6 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTickets.map((ticket) => (
                                        <tr key={ticket._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="max-w-[200px]">
                                                    <p className="font-medium text-slate-900 truncate">{ticket.subject}</p>
                                                    <p className="text-xs text-slate-500 truncate">{ticket.description?.slice(0, 50)}...</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">{ticket.userId?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-slate-500">{ticket.userId?.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-slate-700">{ticket.eventId?.title || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-4">{getCategoryBadge(ticket.category)}</td>
                                            <td className="px-6 py-4">{getPriorityBadge(ticket.priority)}</td>
                                            <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-slate-200"
                                                    onClick={() => handleViewTicket(ticket)}
                                                >
                                                    View
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

            {/* Ticket Details Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    {selectedTicket && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                                    {selectedTicket.subject}
                                </SheetTitle>
                                <SheetDescription>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {getStatusBadge(selectedTicket.status)}
                                        {getPriorityBadge(selectedTicket.priority)}
                                        {getCategoryBadge(selectedTicket.category)}
                                    </div>
                                </SheetDescription>
                            </SheetHeader>

                            <div className="mt-6 space-y-6">
                                {/* Ticket Info */}
                                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500">User</p>
                                            <p className="font-medium">{selectedTicket.userId?.name}</p>
                                            <p className="text-xs text-slate-500">{selectedTicket.userId?.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500">Event</p>
                                            <p className="font-medium">{selectedTicket.eventId?.title}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500">Created</p>
                                            <p className="font-medium">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <p className="text-xs text-slate-500">Messages</p>
                                            <p className="font-medium">{selectedTicket.messages?.length || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-sm text-slate-500 mr-2">Status:</span>
                                    {['open', 'in_progress', 'resolved', 'closed'].map(status => (
                                        <Button
                                            key={status}
                                            size="sm"
                                            variant={selectedTicket.status === status ? 'default' : 'outline'}
                                            className={selectedTicket.status === status ? 'bg-indigo-600' : ''}
                                            disabled={updatingStatus}
                                            onClick={() => handleUpdateTicket(selectedTicket._id, { status })}
                                        >
                                            {status.replace('_', ' ')}
                                        </Button>
                                    ))}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <span className="text-sm text-slate-500 mr-2">Priority:</span>
                                    {['low', 'medium', 'high'].map(priority => (
                                        <Button
                                            key={priority}
                                            size="sm"
                                            variant={selectedTicket.priority === priority ? 'default' : 'outline'}
                                            className={selectedTicket.priority === priority ? 'bg-indigo-600' : ''}
                                            disabled={updatingStatus}
                                            onClick={() => handleUpdateTicket(selectedTicket._id, { priority })}
                                        >
                                            {priority}
                                        </Button>
                                    ))}
                                </div>

                                {/* Message Thread */}
                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                    <h4 className="font-semibold text-slate-900">Conversation</h4>
                                    {selectedTicket.messages?.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg ${msg.senderType === 'user'
                                                    ? 'bg-slate-100 mr-8'
                                                    : msg.senderType === 'admin'
                                                        ? 'bg-indigo-50 ml-8 border border-indigo-200'
                                                        : 'bg-blue-50 ml-8'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm">
                                                    {msg.senderId?.name || msg.senderId?.email || 'Unknown'}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    {msg.senderType}
                                                </Badge>
                                                <span className="text-xs text-slate-500 ml-auto">
                                                    {new Date(msg.sentAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700">{msg.message}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Reply */}
                                {selectedTicket.status !== 'closed' && (
                                    <div className="space-y-3 pt-4 border-t">
                                        <h4 className="font-semibold text-slate-900">Reply as Admin</h4>
                                        <Textarea
                                            placeholder="Type your response..."
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            rows={3}
                                        />
                                        <Button
                                            className="bg-indigo-600 hover:bg-indigo-700"
                                            onClick={handleSendMessage}
                                            disabled={sendingMessage || !newMessage.trim()}
                                        >
                                            {sendingMessage ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                                            ) : (
                                                <><Send className="w-4 h-4 mr-2" /> Send Reply</>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
