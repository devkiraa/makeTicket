'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Loader2,
    Plus,
    UserPlus,
    X,
    CheckCircle,
    Clock,
    XCircle,
    QrCode,
    Users,
    Edit,
    Download,
    Mail,
    Copy,
    Trash2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface Coordinator {
    id: string;
    email: string;
    name?: string;
    status: 'pending' | 'active' | 'revoked';
    permissions: {
        canScanQR: boolean;
        canViewAttendees: boolean;
        canEditEvent: boolean;
        canExportData: boolean;
        canSendEmails: boolean;
    };
    user?: {
        name?: string;
        email: string;
        avatar?: string;
    };
    acceptedAt?: string;
    createdAt: string;
}

interface CoordinatorManagerProps {
    eventId: string;
}

export function CoordinatorManager({ eventId }: CoordinatorManagerProps) {
    const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form state
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [permissions, setPermissions] = useState({
        canScanQR: true,
        canViewAttendees: true,
        canEditEvent: false,
        canExportData: false,
        canSendEmails: false
    });

    const fetchCoordinators = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token || !eventId) {
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${eventId}/coordinators`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (res.ok) {
                const data = await res.json();
                console.log('Fetched coordinators:', data);
                setCoordinators(data);
            } else {
                const errorData = await res.json();
                console.error('Failed to fetch coordinators:', res.status, errorData);
            }
        } catch (err) {
            console.error('Failed to fetch coordinators', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (eventId) {
            fetchCoordinators();
        }
    }, [eventId]);

    const handleAddCoordinator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail) return;

        setAdding(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/coordinators`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        eventId,
                        email: newEmail,
                        name: newName,
                        permissions
                    })
                }
            );

            const data = await res.json();
            console.log('Add coordinator response:', data);

            if (res.ok) {
                setMessage({ type: 'success', text: 'Invitation sent successfully!' });
                setInviteLink(data.coordinator.inviteLink);
                setNewEmail('');
                setNewName('');
                // Small delay to ensure DB is updated
                setTimeout(() => {
                    fetchCoordinators();
                }, 300);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to add coordinator' });
            }
        } catch (err) {
            console.error('Error adding coordinator:', err);
            setMessage({ type: 'error', text: 'Something went wrong' });
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (coordinatorId: string) => {
        if (!confirm('Are you sure you want to remove this coordinator?')) return;

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/coordinators/${coordinatorId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (res.ok) {
                fetchCoordinators();
            }
        } catch (err) {
            console.error('Failed to remove coordinator', err);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setMessage({ type: 'success', text: 'Invite link copied!' });
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Active
                    </span>
                );
            case 'pending':
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                        <Clock className="w-3 h-3" /> Pending
                    </span>
                );
            case 'revoked':
                return (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                        <XCircle className="w-3 h-3" /> Revoked
                    </span>
                );
        }
    };

    const permissionIcons = (perms: Coordinator['permissions']) => {
        const icons = [];
        if (perms.canScanQR) icons.push(<span key="qr" title="Can scan QR"><QrCode className="w-4 h-4" /></span>);
        if (perms.canViewAttendees) icons.push(<span key="view" title="Can view attendees"><Users className="w-4 h-4" /></span>);
        if (perms.canEditEvent) icons.push(<span key="edit" title="Can edit event"><Edit className="w-4 h-4" /></span>);
        if (perms.canExportData) icons.push(<span key="export" title="Can export data"><Download className="w-4 h-4" /></span>);
        if (perms.canSendEmails) icons.push(<span key="email" title="Can send emails"><Mail className="w-4 h-4" /></span>);
        return icons;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            Event Coordinators
                        </CardTitle>
                        <CardDescription>
                            Add team members who can help manage check-ins and attendees
                        </CardDescription>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                <Plus className="w-4 h-4 mr-1" />
                                Add Coordinator
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add Event Coordinator</DialogTitle>
                                <DialogDescription>
                                    Invite someone to help manage this event. They'll receive an email invitation.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleAddCoordinator} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        placeholder="coordinator@example.com"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name">Name (Optional)</Label>
                                    <Input
                                        id="name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label>Permissions</Label>
                                    <div className="grid gap-2">
                                        {[
                                            { key: 'canScanQR', label: 'Scan QR Codes', icon: QrCode },
                                            { key: 'canViewAttendees', label: 'View Attendees', icon: Users },
                                            { key: 'canEditEvent', label: 'Edit Event', icon: Edit },
                                            { key: 'canExportData', label: 'Export Data', icon: Download },
                                            { key: 'canSendEmails', label: 'Send Emails', icon: Mail },
                                        ].map(perm => (
                                            <label
                                                key={perm.key}
                                                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={permissions[perm.key as keyof typeof permissions]}
                                                    onChange={(e) => setPermissions(prev => ({
                                                        ...prev,
                                                        [perm.key]: e.target.checked
                                                    }))}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                                                />
                                                <perm.icon className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm text-slate-700">{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {message.text && (
                                    <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                        }`}>
                                        {message.text}
                                    </div>
                                )}

                                {inviteLink && (
                                    <div className="p-3 bg-indigo-50 rounded-lg">
                                        <p className="text-xs text-indigo-600 mb-2 font-medium">Invite Link (also sent via email)</p>
                                        <div className="flex gap-2">
                                            <Input
                                                value={inviteLink}
                                                readOnly
                                                className="bg-white text-xs h-9"
                                            />
                                            <Button type="button" size="sm" variant="outline" onClick={copyLink}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setDialogOpen(false);
                                            setInviteLink('');
                                            setMessage({ type: '', text: '' });
                                        }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={adding || !newEmail}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {adding ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                                        ) : (
                                            <>Send Invitation</>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : coordinators.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <UserPlus className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No coordinators added yet</p>
                        <p className="text-xs text-slate-400">Add team members to help manage this event</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {coordinators.map((coord) => (
                            <div
                                key={coord.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${coord.status === 'revoked' ? 'bg-slate-50 opacity-60' : 'bg-white'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                        {coord.user?.avatar ? (
                                            <img
                                                src={coord.user.avatar}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-indigo-600">
                                                {(coord.name?.[0] || coord.email[0]).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">
                                            {coord.user?.name || coord.name || coord.email.split('@')[0]}
                                        </p>
                                        <p className="text-sm text-slate-500">{coord.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        {permissionIcons(coord.permissions)}
                                    </div>
                                    {statusBadge(coord.status)}
                                    {coord.status !== 'revoked' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemove(coord.id)}
                                            className="text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
