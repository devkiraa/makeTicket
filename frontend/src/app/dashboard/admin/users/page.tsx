'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search,
    Filter,
    MoreVertical,
    Shield,
    Ban,
    UserCheck,
    Ghost,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Download,
    Mail,
    Clock,
    Monitor
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface User {
    _id: string;
    email: string;
    username?: string;
    name?: string;
    role: 'admin' | 'host' | 'user';
    status: 'active' | 'suspended';
    createdAt: string;
    avatar?: string;
}

export default function UserManagementPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Action Modal States
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [suspensionModalOpen, setSuspensionModalOpen] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [newRole, setNewRole] = useState<'admin' | 'host' | 'user'>('user');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search,
                role: roleFilter === 'all' ? '' : roleFilter,
                status: statusFilter === 'all' ? '' : statusFilter,
            });

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.users);
            setTotal(data.total);
            setPages(data.pages);
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to load users",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [page, search, roleFilter, statusFilter, toast]);

    useEffect(() => {
        const timeoutId = setTimeout(fetchUsers, 500); // Debounce search
        return () => clearTimeout(timeoutId);
    }, [fetchUsers]);

    const handleUpdateRole = async () => {
        if (!selectedUser) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${selectedUser._id}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!res.ok) throw new Error('Failed to update role');
            toast({ title: "Success", description: `User role updated to ${newRole}` });
            setRoleModalOpen(false);
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: "Role update failed", variant: "destructive" });
        }
    };

    const handleToggleStatus = async (user: User, suspensionNote?: string) => {
        const token = localStorage.getItem('auth_token');
        const newStatus = user.status === 'active' ? 'suspended' : 'active';
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${user._id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus, reason: suspensionNote })
            });

            if (!res.ok) throw new Error('Failed to update status');
            toast({ title: "Success", description: `User ${newStatus === 'active' ? 'activated' : 'suspended'}` });
            setSuspensionModalOpen(false);
            setSuspensionReason('');
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: "Status update failed", variant: "destructive" });
        }
    };

    const handleImpersonate = async (user: User) => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/users/${user._id}/impersonate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Impersonation failed');
            const data = await res.json();

            // Logic for impersonation: store current admin token to return later?
            // For now, just replace and redirect.
            localStorage.setItem('admin_token', token!); // Save admin token to allow "Stop Impersonating"
            localStorage.setItem('auth_token', data.token);

            toast({ title: "Impersonating", description: `You are now logged in as ${user.email}` });
            router.push('/dashboard');
        } catch (error) {
            toast({ title: "Error", description: "Failed to impersonate user", variant: "destructive" });
        }
    };

    const exportUsers = () => {
        const csvContent = "data:text/csv;charset=utf-8,"
            + ["Name", "Email", "Role", "Status", "Joined"].join(",") + "\n"
            + users.map(u => [u.name || 'N/A', u.email, u.role, u.status, new Date(u.createdAt).toLocaleDateString()].join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
                    <p className="text-slate-500">Manage platform users, roles, and status.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={fetchUsers}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={exportUsers}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Card className="border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, email or username..."
                                className="pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Roles</SelectItem>
                                    <SelectItem value="admin">Admins</SelectItem>
                                    <SelectItem value="host">Hosts</SelectItem>
                                    <SelectItem value="user">Users</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="suspended">Suspended</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Role</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Joined</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading && users.length === 0 ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-4"><div className="h-10 bg-slate-100 rounded-lg w-48" /></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-20" /></td>
                                            <td className="px-6 py-4"><div className="h-6 bg-slate-100 rounded-full w-20" /></td>
                                            <td className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                                            <td className="px-6 py-4"><div className="ml-auto h-8 bg-slate-100 rounded-lg w-8" /></td>
                                        </tr>
                                    ))
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                            No users found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold uppercase shrink-0">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} className="h-full w-full rounded-full object-cover" alt="" />
                                                        ) : (
                                                            (user.name || user.email).substring(0, 2)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900">{user.name || 'Unnamed User'}</div>
                                                        <div className="text-xs text-slate-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                    ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                        user.role === 'host' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                            'bg-slate-50 text-slate-600 border-slate-200'}
                                                `}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                    ${user.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}
                                                `}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => {
                                                            setSelectedUser(user);
                                                            setNewRole(user.role);
                                                            setRoleModalOpen(true);
                                                        }}>
                                                            <Shield className="mr-2 h-4 w-4" /> Manage Role
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleImpersonate(user)} className="text-orange-600">
                                                            <Ghost className="mr-2 h-4 w-4" /> Impersonate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`mailto:${user.email}`)}>
                                                            <Mail className="mr-2 h-4 w-4" /> Send Email
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/admin/sessions?userId=${user._id}`)}>
                                                            <Monitor className="mr-2 h-4 w-4" /> View Sessions
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {user.status === 'active' ? (
                                                            <DropdownMenuItem className="text-red-600" onClick={() => {
                                                                setSelectedUser(user);
                                                                setSuspensionModalOpen(true);
                                                            }}>
                                                                <Ban className="mr-2 h-4 w-4" /> Suspend User
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem className="text-green-600" onClick={() => handleToggleStatus(user)}>
                                                                <UserCheck className="mr-2 h-4 w-4" /> Activate User
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                <div className="p-4 border-t flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        Showing <b>{users.length}</b> of <b>{total}</b> users
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-slate-600">
                            Page {page} of {pages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === pages}
                            onClick={() => setPage(page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Suspension Dialog */}
            <Dialog open={suspensionModalOpen} onOpenChange={setSuspensionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Suspend User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to suspend <b>{selectedUser?.email}</b>? They will be unable to log in until reinstated.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block text-slate-700">Reason for Suspension</label>
                        <Input
                            placeholder="e.g. Violation of terms, suspicious activity"
                            value={suspensionReason}
                            onChange={(e) => setSuspensionReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSuspensionModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => selectedUser && handleToggleStatus(selectedUser, suspensionReason)}>
                            Suspend User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Role Management Dialog */}
            <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update User Role</DialogTitle>
                        <DialogDescription>
                            Update the access level for <b>{selectedUser?.email}</b>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-sm font-medium mb-2 block text-slate-700">Select Role</label>
                        <Select value={newRole} onValueChange={(v: string) => setNewRole(v as 'admin' | 'host' | 'user')}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User (Attendee)</SelectItem>
                                <SelectItem value="host">Host (Event Creator)</SelectItem>
                                <SelectItem value="admin">Administrator (Full Access)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateRole}>Update Role</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
