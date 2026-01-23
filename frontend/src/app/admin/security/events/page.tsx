'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Search } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import api from '@/lib/api';

interface SecurityEvent {
    _id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ipAddress: string;
    userId?: { email: string; name: string };
    details: any;
    createdAt: string;
}

export default function SecurityEventsPage() {
    const { toast } = useToast();
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState({
        type: 'all',
        severity: 'all',
        search: ''
    });

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params: any = { page, limit: 20 };
            if (filters.type !== 'all') params.type = filters.type;
            if (filters.severity !== 'all') params.severity = filters.severity;
            if (filters.search) params.search = filters.search;

            const { data } = await api.get('/admin/security/events', { params });
            setEvents(data.events);
            setTotalPages(data.pagination.pages);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to fetch security events",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchEvents, 300); // Debounce
        return () => clearTimeout(timeout);
    }, [page, filters]);

    const handleExport = async () => {
        try {
            const response = await api.get('/admin/security/export', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `security_logs_${new Date().toISOString()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
        } catch (error) {
            toast({
                title: "Export Failed",
                description: "Could not export logs",
                variant: "destructive"
            });
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-500 hover:bg-red-600';
            case 'high': return 'bg-orange-500 hover:bg-orange-600';
            case 'medium': return 'bg-yellow-500 hover:bg-yellow-600';
            case 'low': return 'bg-blue-500 hover:bg-blue-600';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security & Threat Events</h1>
                    <p className="text-muted-foreground mt-2">Filter and inspect detailed security logs.</p>
                </div>
                <Button onClick={handleExport} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Log
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Event Logs</CardTitle>
                    <CardDescription>Search events by IP, type, or severity.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search IP, Email, Reason..."
                                    className="pl-8"
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>
                        </div>
                        <Select
                            value={filters.severity}
                            onValueChange={(value: string) => setFilters({ ...filters, severity: value })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Severity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Severities</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.type}
                            onValueChange={(value: string) => setFilters({ ...filters, type: value })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Event Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="auth_failure">Auth Failure</SelectItem>
                                <SelectItem value="login_success">Login Success</SelectItem>
                                <SelectItem value="captcha_failed">CAPTCHA Failed</SelectItem>
                                <SelectItem value="admin_action">Admin Action</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Severity</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : events.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No events found matching your filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    events.map((event) => (
                                        <TableRow key={event._id}>
                                            <TableCell className="whitespace-nowrap font-mono text-sm">
                                                {new Date(event.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getSeverityColor(event.severity)} text-white border-0`}>
                                                    {event.severity.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">{event.type}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs">{event.ipAddress}</span>
                                                    {event.userId && (
                                                        <span className="text-xs text-muted-foreground">{event.userId.email}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-md truncate text-sm text-muted-foreground">
                                                {JSON.stringify(event.details)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </div>
                        <div className="space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
