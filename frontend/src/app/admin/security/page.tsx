'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, AlertTriangle, Lock, Globe, ChevronRight } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import api from '@/lib/api';

interface SecurityStats {
    overview: {
        totalEvents: number;
        recentEvents24h: number;
    };
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    topAttackingIps: { ip: string; count: number }[];
}

export default function SecurityDashboard() {
    const { toast } = useToast();
    const router = useRouter();
    const [stats, setStats] = useState<SecurityStats | null>(null);

    const fetchStats = async () => {
        try {
            const { data } = await api.get('/admin/security/stats');
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            toast({
                title: "Error",
                description: "Failed to fetch security stats",
                variant: "destructive"
            });
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Detection Overview</h1>
                <p className="text-muted-foreground mt-2">High-level threat metrics and security status.</p>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Events (24h)</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.overview.recentEvents24h || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.overview.totalEvents || 0} all time
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats?.bySeverity.critical || 0}</div>
                        <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Account Lockouts</CardTitle>
                        <Lock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.byType.auth_failure || 0}</div>
                        <p className="text-xs text-muted-foreground">Failed login attempts (all time)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Top Attacking IP</CardTitle>
                        <Globe className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold truncate">
                            {stats?.topAttackingIps[0]?.ip || 'None'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.topAttackingIps[0]?.count || 0} events from this source
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation to Detailed Events */}
            <Card
                className="cursor-pointer hover:bg-slate-50 transition-colors border-dashed"
                onClick={() => router.push('/admin/security/events')}
            >
                <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-slate-100 rounded-full">
                            <ShieldAlert className="h-6 w-6 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">View Detailed Security Logs</h3>
                            <p className="text-muted-foreground">Inspect individual security events, successful logins, and blocked attacks.</p>
                        </div>
                    </div>
                    <ChevronRight className="h-6 w-6 text-slate-400" />
                </CardContent>
            </Card>
        </div>
    );
}
