'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Calendar,
    Ticket,
    MapPin,
    CheckCircle2,
    Clock,
    Sparkles,
    ArrowRight,
    QrCode,
    ExternalLink
} from 'lucide-react';

interface Registration {
    ticketId: string;
    qrCodeHash: string;
    status: string;
    checkedIn: boolean;
    registeredAt: string;
    event: {
        _id: string;
        title: string;
        slug: string;
        date: string;
        location: string;
        description: string;
        status: string;
    } | null;
    formData: any;
}

export default function UserDashboard() {
    const router = useRouter();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const headers = { 'Authorization': `Bearer ${token}` };

                const [profileRes, registrationsRes] = await Promise.all([
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, { headers }),
                    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/my-registrations`, { headers })
                ]);

                if (profileRes.ok) {
                    const profileData = await profileRes.json();
                    setProfile(profileData);

                    // If user is a host or admin, redirect to main dashboard
                    if (profileData.role === 'host' || profileData.role === 'admin') {
                        router.push('/dashboard');
                        return;
                    }
                }

                if (registrationsRes.ok) {
                    setRegistrations(await registrationsRes.json());
                }
            } catch (error) {
                console.error('Error loading user dashboard', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    const handleUpgradeToHost = async () => {
        setUpgrading(true);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/dashboard/upgrade-to-host`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                // Redirect to main dashboard after upgrade
                router.push('/dashboard');
            } else {
                const data = await res.json();
                alert(data.message || 'Failed to upgrade');
            }
        } catch (error) {
            console.error('Error upgrading to host', error);
            alert('An error occurred');
        } finally {
            setUpgrading(false);
        }
    };

    const upcomingEvents = registrations.filter(r => r.event && new Date(r.event.date) > new Date());
    const pastEvents = registrations.filter(r => r.event && new Date(r.event.date) <= new Date());

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-slate-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Welcome, {profile?.name || profile?.email?.split('@')[0] || 'User'}
                    </h1>
                    <p className="text-slate-500">Your event registrations and tickets.</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Total Registrations</p>
                                <p className="text-2xl font-bold text-slate-900">{registrations.length}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Ticket className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Upcoming Events</p>
                                <p className="text-2xl font-bold text-slate-900">{upcomingEvents.length}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200">
                                <Calendar className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Checked In</p>
                                <p className="text-2xl font-bold text-slate-900">
                                    {registrations.filter(r => r.checkedIn).length}
                                </p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-200">
                                <QrCode className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Become a Host CTA */}
            <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                <Sparkles className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Want to host your own events?</h3>
                                <p className="text-slate-600 text-sm mt-1">
                                    Upgrade to a host account and start creating events, managing registrations, and more!
                                </p>
                            </div>
                        </div>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm whitespace-nowrap"
                            onClick={handleUpgradeToHost}
                            disabled={upgrading}
                        >
                            {upgrading ? 'Upgrading...' : 'Become a Host'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* My Registrations */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle>My Registrations</CardTitle>
                    <CardDescription>Events you have registered for.</CardDescription>
                </CardHeader>
                <CardContent>
                    {registrations.length === 0 ? (
                        <div className="text-center py-12">
                            <Ticket className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="font-semibold text-slate-900 mb-2">No registrations yet</h3>
                            <p className="text-slate-500 text-sm mb-4">
                                When you register for events, they will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Upcoming Events */}
                            {upcomingEvents.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-green-600" />
                                        Upcoming
                                    </h4>
                                    <div className="space-y-3">
                                        {upcomingEvents.map((reg) => (
                                            <div
                                                key={reg.ticketId}
                                                className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex flex-col items-center justify-center text-white font-bold shadow-lg">
                                                        <span className="text-[10px] uppercase opacity-80">
                                                            {reg.event?.date ? new Date(reg.event.date).toLocaleString('default', { month: 'short' }) : 'N/A'}
                                                        </span>
                                                        <span className="text-lg leading-none">
                                                            {reg.event?.date ? new Date(reg.event.date).getDate() : '--'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900">{reg.event?.title || 'Unknown Event'}</h3>
                                                        <div className="flex items-center text-xs text-slate-500 gap-3 mt-1">
                                                            <span className="flex items-center">
                                                                <MapPin className="h-3 w-3 mr-1" />
                                                                {reg.event?.location || 'Online'}
                                                            </span>
                                                            <span className="flex items-center">
                                                                <Clock className="h-3 w-3 mr-1" />
                                                                {reg.event?.date ? new Date(reg.event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'TBD'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${reg.checkedIn
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {reg.checkedIn ? 'Checked In' : 'Registered'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Past Events */}
                            {pastEvents.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                                        Past Events
                                    </h4>
                                    <div className="space-y-3">
                                        {pastEvents.map((reg) => (
                                            <div
                                                key={reg.ticketId}
                                                className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50/50"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-14 w-14 rounded-xl bg-slate-200 flex flex-col items-center justify-center text-slate-600 font-bold">
                                                        <span className="text-[10px] uppercase opacity-80">
                                                            {reg.event?.date ? new Date(reg.event.date).toLocaleString('default', { month: 'short' }) : 'N/A'}
                                                        </span>
                                                        <span className="text-lg leading-none">
                                                            {reg.event?.date ? new Date(reg.event.date).getDate() : '--'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-slate-700">{reg.event?.title || 'Unknown Event'}</h3>
                                                        <div className="flex items-center text-xs text-slate-400 gap-3 mt-1">
                                                            <span className="flex items-center">
                                                                <MapPin className="h-3 w-3 mr-1" />
                                                                {reg.event?.location || 'Online'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${reg.checkedIn
                                                        ? 'bg-blue-50 text-blue-600'
                                                        : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {reg.checkedIn ? 'Attended' : 'Ended'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
