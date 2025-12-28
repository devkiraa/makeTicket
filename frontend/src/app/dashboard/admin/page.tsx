'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Ticket, Activity, ShieldAlert } from 'lucide-react';

interface AdminStats {
    stats: {
        totalUsers: number;
        totalEvents: number;
        activeEvents: number;
        totalTickets: number;
    };
    recentUsers: Array<{
        _id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
        avatar?: string;
    }>;
}

export default function AdminDashboard() {
    const router = useRouter();
    const [data, setData] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAdminData = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                // Verify user role first
                const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const user = await userRes.json();
                if (user.role !== 'admin') {
                    router.push('/dashboard');
                    return;
                }

                // Fetch Stats
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to fetch admin stats');
                const statsData = await res.json();
                setData(statsData);
            } catch (err) {
                console.error(err);
                setError('Failed to load admin dashboard. Ensure you have admin privileges.');
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [router]);

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center">
            <div className="animate-pulse flex flex-col items-center">
                <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex h-[50vh] items-center justify-center p-4">
            <Card className="w-full max-w-md border-red-200 shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-2">
                        <ShieldAlert className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-red-700">Access Denied</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-slate-600">{error}</p>
                    <Button onClick={() => router.push('/dashboard')} variant="outline">
                        Return to Dashboard
                    </Button>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Overview</h1>
                    <p className="text-slate-500">Platform performance and metrics.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{data?.stats.totalUsers}</div>
                        <p className="text-xs text-slate-500 mt-1">Registered accounts</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Events</CardTitle>
                        <Calendar className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{data?.stats.totalEvents}</div>
                        <p className="text-xs text-slate-500 mt-1">Created events</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Active Events</CardTitle>
                        <Activity className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{data?.stats.activeEvents}</div>
                        <p className="text-xs text-slate-500 mt-1">Currently live</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Tickets Issued</CardTitle>
                        <Ticket className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{data?.stats.totalTickets}</div>
                        <p className="text-xs text-slate-500 mt-1">Successful registrations</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Users Table */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <CardTitle>Recent Signups</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-slate-50/50 data-[state=selected]:bg-slate-50">
                                    <th className="h-12 px-4 align-middle font-medium text-slate-500">User</th>
                                    <th className="h-12 px-4 align-middle font-medium text-slate-500">Role</th>
                                    <th className="h-12 px-4 align-middle font-medium text-slate-500">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {data?.recentUsers.map((user) => (
                                    <tr key={user._id} className="border-b transition-colors hover:bg-slate-50/50">
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                                                    {user.avatar ? (
                                                        <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
                                                    ) : (
                                                        (user.name || user.email).substring(0, 2)
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{user.name || 'No Name'}</div>
                                                    <div className="text-xs text-slate-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium 
                                                    ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                                    user.role === 'host' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                                        'bg-slate-100 text-slate-600 border border-slate-200'}
                                                `}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle text-slate-500">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
