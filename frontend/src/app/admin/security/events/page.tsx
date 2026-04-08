'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Download, Search, MoreHorizontal, Ban, CheckCircle, LogOut } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import api from '@/lib/api';

interface SecurityEvent {
    _id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ipAddress: string;
    userId?: { _id: string; email: string; name: string };
    details: any;
    createdAt: string;
    firstSeen?: string;
    count?: number;
}

export default function SecurityEventsPage() {
    const { toast } = useToast();
    const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
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

    const handleBlockIp = async (ipAddress: string) => {
        try {
            await api.post('/admin/security/block-ip', { ipAddress, reason: 'Blocked manually from events list' });
            toast({ title: 'IP Blocked', description: `Blocked access from ${ipAddress}` });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to block IP', variant: 'destructive' });
        }
    };

    const handleUnblockIp = async (ipAddress: string) => {
        try {
            await api.post('/admin/security/unblock-ip', { ipAddress });
            toast({ title: 'IP Unblocked', description: `Restored access from ${ipAddress}` });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to unblock IP', variant: 'destructive' });
        }
    };

    const handleForceLogout = async (userId: string) => {
        try {
            await api.post('/admin/security/force-logout', { userId });
            toast({ title: 'User Logged Out', description: `Forcefully logged out user.` });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to force logout', variant: 'destructive' });
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
                                    <TableHead className="text-right">Actions</TableHead>
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
                                        <TableRow 
                                            key={event._id}
                                            className="cursor-pointer hover:bg-slate-50 transition-colors"
                                            onClick={() => setSelectedEvent(event)}
                                        >
                                            <TableCell className="whitespace-nowrap font-mono text-sm">
                                                <div>{new Date(event.createdAt).toLocaleString()}</div>
                                                {event.firstSeen && event.count && event.count > 1 && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        First: {new Date(event.firstSeen).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getSeverityColor(event.severity)} text-white border-0`}>
                                                    {event.severity.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {event.type}
                                                    {event.count && event.count > 1 && (
                                                        <Badge variant="outline" className="text-xs bg-slate-100">
                                                            {event.count}x hits
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
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
                                            <TableCell className="text-right">
                                                <div onClick={e => e.stopPropagation()} className="inline-block">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleBlockIp(event.ipAddress)}>
                                                                <Ban className="mr-2 h-4 w-4 text-red-500" />
                                                                Block IP
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleUnblockIp(event.ipAddress)}>
                                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                                Unblock IP
                                                            </DropdownMenuItem>
                                                            {event.userId && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => handleForceLogout(event.userId?._id as string)}>
                                                                        <LogOut className="mr-2 h-4 w-4 text-orange-500" />
                                                                        Force Logout User
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
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

            {/* Event Details Dialog */}
            <Dialog open={!!selectedEvent} onOpenChange={(open: boolean) => !open && setSelectedEvent(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Security Event Details</DialogTitle>
                        <DialogDescription>
                            Detailed breakdown of {selectedEvent?.type} activity.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedEvent && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-md border">
                                <div>
                                    <h4 className="font-medium text-xs text-slate-500 mb-1">IP Address</h4>
                                    <p className="font-mono text-sm">{selectedEvent.ipAddress}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-xs text-slate-500 mb-1">Severity</h4>
                                    <Badge className={`${getSeverityColor(selectedEvent.severity)} text-white`}>
                                        {selectedEvent.severity.toUpperCase()}
                                    </Badge>
                                </div>
                                <div>
                                    <h4 className="font-medium text-xs text-slate-500 mb-1">Occurrences</h4>
                                    <p className="text-sm font-semibold">{selectedEvent.count || 1} hits</p>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <h4 className="font-medium text-xs text-slate-500 mb-1">Target Account</h4>
                                    <p className="text-sm truncate">
                                        {selectedEvent.userId?.email || 'Unauthenticated'}
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-xs text-slate-500 mb-1">Most Recent</h4>
                                    <p className="text-sm text-slate-700">{new Date(selectedEvent.createdAt).toLocaleString()}</p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-xs text-slate-500 mb-1">First Seen</h4>
                                    <p className="text-sm text-slate-700">{selectedEvent.firstSeen ? new Date(selectedEvent.firstSeen).toLocaleString() : 'N/A'}</p>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-sm text-slate-800 mb-2">Raw Payload Details</h4>
                                <pre className="bg-slate-950 text-slate-50 p-4 rounded-md overflow-x-auto text-xs max-h-[300px]">
                                    {JSON.stringify(selectedEvent.details, null, 2)}
                                </pre>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-2">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setSelectedEvent(null)}
                                >
                                    Close
                                </Button>
                                <Button 
                                    variant="destructive"
                                    onClick={() => {
                                        handleBlockIp(selectedEvent.ipAddress);
                                        setSelectedEvent(null);
                                    }}
                                >
                                    <Ban className="w-4 h-4 mr-2" />
                                    Block Source IP
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
