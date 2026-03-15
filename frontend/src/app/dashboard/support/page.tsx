'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    MessageSquare,
    Plus,
    Clock,
    CheckCircle,
    AlertCircle,
    Loader2,
    ArrowLeft
} from 'lucide-react';

interface SupportTicket {
    _id: string;
    subject: string;
    category: string;
    status: string;
    priority: string;
    description: string;
    createdAt: string;
    eventId: {
        title: string;
        slug: string;
    };
    ticketId: {
        qrHash: string;
        pricePaid: number;
    };
    messages: Array<{
        senderId: { name: string; email: string };
        senderType: string;
        message: string;
        sentAt: string;
    }>;
}

interface UserRegistration {
    _id: string;
    eventId: {
        _id: string;
        title: string;
        slug: string;
    };
    qrHash: string;
    pricePaid: number;
    createdAt: string;
}

export default function SupportPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [registrations, setRegistrations] = useState<UserRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [newMessage, setNewMessage] = useState('');

    // Create ticket form
    const [formData, setFormData] = useState({
        ticketId: '',
        subject: '',
        category: 'payment',
        description: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
            return;
        }

        try {
            // Fetch support tickets
            const ticketsRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/support/my-tickets`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (ticketsRes.ok) {
                const data = await ticketsRes.json();
                setTickets(data.tickets || []);
            }

            // Fetch user's registrations
            const registrationsRes = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/my-registrations`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (registrationsRes.ok) {
                const data = await registrationsRes.json();
                setRegistrations(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/support/tickets`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                }
            );

            if (res.ok) {
                setShowCreateForm(false);
                setFormData({ ticketId: '', subject: '', category: 'payment', description: '' });
                fetchData();
            }
        } catch (error) {
            console.error('Failed to create ticket:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!selectedTicket || !newMessage.trim()) return;

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/support/tickets/${selectedTicket._id}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ message: newMessage })
                }
            );

            if (res.ok) {
                setNewMessage('');
                // Refresh ticket details
                const detailsRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/support/tickets/${selectedTicket._id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (detailsRes.ok) {
                    const updated = await detailsRes.json();
                    setSelectedTicket(updated);
                }
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            open: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-yellow-100 text-yellow-800',
            resolved: 'bg-green-100 text-green-800',
            closed: 'bg-gray-100 text-gray-800'
        };
        return (
            <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
                {status.replace('_', ' ')}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (selectedTicket) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{selectedTicket.subject}</h1>
                        <p className="text-sm text-slate-500">{selectedTicket.eventId?.title || 'Unknown Event'}</p>
                    </div>
                    <div className="ml-auto">
                        {getStatusBadge(selectedTicket.status)}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Conversation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {selectedTicket.messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-lg ${msg.senderType === 'user'
                                        ? 'bg-indigo-50 ml-auto max-w-[80%]'
                                        : 'bg-slate-50 mr-auto max-w-[80%]'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium text-sm">
                                        {msg.senderId.name || msg.senderId.email}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                        {msg.senderType}
                                    </Badge>
                                    <span className="text-xs text-slate-500 ml-auto">
                                        {new Date(msg.sentAt).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm">{msg.message}</p>
                            </div>
                        ))}

                        {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                            <div className="flex gap-2 mt-4">
                                <Input
                                    placeholder="Type your message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button onClick={handleSendMessage}>Send</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (showCreateForm) {
        return (
            <div className="max-w-2xl">
                <Button variant="ghost" onClick={() => setShowCreateForm(false)} className="mb-4">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Support Ticket</CardTitle>
                        <CardDescription>
                            Need help with your registration? Create a support ticket and the event organizer will respond.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div>
                                <Label>Select Registration *</Label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.ticketId}
                                    onChange={(e) => setFormData({ ...formData, ticketId: e.target.value })}
                                    required
                                >
                                    <option value="">Choose a registration...</option>
                                    {registrations.map((reg) => (
                                        <option key={reg._id} value={reg._id}>
                                            {reg.eventId.title} - {reg.qrHash}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label>Category *</Label>
                                <select
                                    className="w-full p-2 border rounded-lg"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="payment">Payment Issue</option>
                                    <option value="registration">Registration Issue</option>
                                    <option value="ticket">Ticket Issue</option>
                                    <option value="general">General Inquiry</option>
                                </select>
                            </div>

                            <div>
                                <Label>Subject *</Label>
                                <Input
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="Brief description of your issue"
                                    required
                                />
                            </div>

                            <div>
                                <Label>Description *</Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Provide details about your issue..."
                                    rows={5}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full">Create Ticket</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Support Tickets</h1>
                    <p className="text-slate-600">Get help with your event registrations</p>
                </div>
                <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Ticket
                </Button>
            </div>

            {tickets.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="w-16 h-16 text-slate-300 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No support tickets yet</h3>
                        <p className="text-slate-600 text-center mb-4">
                            Create a support ticket if you need help with any of your registrations
                        </p>
                        <Button onClick={() => setShowCreateForm(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Ticket
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {tickets.map((ticket) => (
                        <Card
                            key={ticket._id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedTicket(ticket)}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                            {getStatusBadge(ticket.status)}
                                            <Badge variant="outline">{ticket.category}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-600 mb-2">
                                            {ticket.eventId?.title || 'Unknown Event'}
                                        </p>
                                        <p className="text-sm text-slate-500 line-clamp-2">
                                            {ticket.description}
                                        </p>
                                    </div>
                                    <div className="text-right text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="mt-1">
                                            {ticket.messages.length} messages
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
