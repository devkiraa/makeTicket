'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RefreshCw, Trash2, Terminal, Calendar } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function LogsPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);
    const [currentFile, setCurrentFile] = useState('access.log');

    const fetchLogs = async (fileToFetch = currentFile) => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/logs?file=${fileToFetch}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs);
                setAvailableFiles(data.availableFiles || []);
                setCurrentFile(data.currentFile || 'access.log');
            }
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const clearLogs = async () => {
        if (!confirm('Are you sure you want to clear the logs?')) return;
        const token = localStorage.getItem('auth_token');
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/logs`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchLogs();
        } catch (error) {
            console.error('Failed to clear logs', error);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Logs</h1>
                    <p className="text-slate-500">View and manage server access logs.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchLogs()} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="destructive" onClick={clearLogs}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear Logs
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-950 border-slate-800 text-slate-300">
                <CardHeader className="border-b border-slate-900 pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-green-500" />
                            <div>
                                <CardTitle className="text-slate-200">Server Console</CardTitle>
                                <CardDescription className="text-slate-500">Showing last 100 entries</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-500" />
                            <Select value={currentFile} onValueChange={(val: string) => {
                                setCurrentFile(val);
                                fetchLogs(val);
                            }}>
                                <SelectTrigger className="w-[200px] h-9 bg-slate-900 border-slate-800 text-slate-300">
                                    <SelectValue placeholder="Select Log File" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                                    {availableFiles.map((file: string) => (
                                        <SelectItem key={file} value={file}>
                                            {file === 'access.log' ? 'Current Log' : file}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-4 font-mono text-xs md:text-sm h-[600px] overflow-auto hover:overflow-y-scroll scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {loading && logs.length === 0 ? (
                            <div className="text-slate-500 animate-pulse">Loading logs...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-slate-500 italic">No logs found.</div>
                        ) : (
                            <div className="space-y-0.5">
                                {logs.map((log: string, i: number) => {
                                    // Morgan 'dev' format usually looks like: GET /api/admin/logs 200 4.123 ms - 1234
                                    // Let's highlight specific parts
                                    const parts = log.split(' ');

                                    return (
                                        <div key={i} className="flex gap-4 font-mono py-1 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group">
                                            <span className="text-slate-600 w-8 shrink-0 select-none">{(logs.length - i).toString().padStart(3, '0')}</span>
                                            <div className="flex flex-wrap items-center gap-y-1">
                                                {parts.map((part: string, pi: number) => {
                                                    // Status code check (3 digits)
                                                    if (/^\d{3}$/.test(part)) {
                                                        const status = parseInt(part);
                                                        let color = 'text-slate-300';
                                                        if (status >= 500) color = 'text-red-500 font-bold';
                                                        else if (status >= 400) color = 'text-amber-500 font-bold';
                                                        else if (status >= 300) color = 'text-blue-400';
                                                        else if (status >= 200) color = 'text-emerald-500 font-bold';
                                                        return <span key={pi} className={color}>{part}</span>;
                                                    }

                                                    // HTTP Method check
                                                    if (['GET', 'POST', 'PATCH', 'DELETE', 'PUT'].includes(part)) {
                                                        let mColor = 'text-slate-400';
                                                        if (part === 'GET') mColor = 'text-sky-400';
                                                        if (part === 'POST') mColor = 'text-indigo-400';
                                                        if (part === 'PATCH') mColor = 'text-yellow-400';
                                                        if (part === 'DELETE') mColor = 'text-rose-400';
                                                        return <span key={pi} className={`${mColor} font-bold`}>{part}</span>;
                                                    }

                                                    // Path segments
                                                    if (part.startsWith('/')) {
                                                        return <span key={pi} className="text-slate-400">{part}</span>;
                                                    }

                                                    // Timing
                                                    if (part === 'ms') {
                                                        return <span key={pi} className="text-slate-600">{part}</span>;
                                                    }
                                                    if (!isNaN(parseFloat(part)) && parts[pi + 1] === 'ms') {
                                                        return <span key={pi} className="text-slate-500">{part}</span>;
                                                    }

                                                    return <span key={pi} className="text-slate-300">{part}</span>;
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

