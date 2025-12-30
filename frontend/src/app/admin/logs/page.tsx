'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    RefreshCw, 
    Trash2, 
    Terminal, 
    Search, 
    Download, 
    Cloud, 
    CloudOff,
    Play,
    Pause,
    ChevronDown,
    CheckCircle,
    XCircle,
    Clock,
    HardDrive,
    Upload,
    Wifi,
    FileText
} from 'lucide-react';

interface LogFile {
    name: string;
    size: number;
    modified: string;
}

interface BackupStatus {
    enabled: boolean;
    provider?: string;
    email?: string;
    lastBackup?: string;
    backupFrequency?: string;
    hasFolderId?: boolean;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userIdQuery, setUserIdQuery] = useState('');
    const [ipQuery, setIpQuery] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [selectedFile, setSelectedFile] = useState('access.log');
    const [availableFiles, setAvailableFiles] = useState<LogFile[]>([]);
    const [backupStatus, setBackupStatus] = useState<BackupStatus>({ enabled: false });
    const [backingUp, setBackingUp] = useState(false);
    const [connectingDrive, setConnectingDrive] = useState(false);
    const [filterLevel, setFilterLevel] = useState<'all' | 'errors' | 'success'>('all');
    const [showFileSelector, setShowFileSelector] = useState(false);
    
    const eventSourceRef = useRef<EventSource | null>(null);
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const autoScrollRef = useRef(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const tryParseJson = (line: string): any | null => {
        try {
            return JSON.parse(line);
        } catch {
            return null;
        }
    };

    const getLogStatus = (line: string): number | null => {
        const parsed = tryParseJson(line);
        const status = parsed?.status ?? parsed?.http?.status_code;
        return typeof status === 'number' ? status : null;
    };

    const formatLogLine = (line: string): string => {
        const parsed = tryParseJson(line);
        if (!parsed) return line;

        const timestamp = typeof parsed.timestamp === 'string' ? parsed.timestamp : '';
        const method = typeof parsed.method === 'string' ? parsed.method : (typeof parsed.http?.method === 'string' ? parsed.http.method : '');
        const url = typeof parsed.url === 'string' ? parsed.url : (typeof parsed.http?.path === 'string' ? parsed.http.path : '');
        const status = getLogStatus(line);
        const durationMs = typeof parsed.duration_ms === 'number'
            ? parsed.duration_ms
            : (typeof parsed.http?.response_time_ms === 'number' ? parsed.http.response_time_ms : null);

        const userId = typeof parsed.user_id === 'string' ? parsed.user_id : (parsed.user_id ? String(parsed.user_id) : '');
        const clientIp = typeof parsed.client_ip === 'string' ? parsed.client_ip : (parsed.client_ip ? String(parsed.client_ip) : '');
        const suffixParts: string[] = [];
        if (userId) suffixParts.push(`uid=${userId}`);
        if (clientIp) suffixParts.push(`ip=${clientIp}`);
        const suffix = suffixParts.length ? ` ${suffixParts.join(' ')}` : '';

        if (method && url && status !== null) {
            return `${timestamp} ${method} ${url} ${status}${durationMs !== null ? ` ${durationMs}ms` : ''}${suffix}`.trim();
        }

        const level = typeof parsed.level === 'string' ? parsed.level : '';
        const event = typeof parsed.event === 'string' ? parsed.event : '';
        const message = typeof parsed.message === 'string' ? parsed.message : '';
        if (level && event) {
            return `${timestamp} ${level} ${event}${message ? ` - ${message}` : ''}`.trim();
        }

        return line;
    };

    // Fetch logs from API
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const params = new URLSearchParams({
                file: selectedFile,
                lines: '200'
            });
            if (searchQuery) params.append('search', searchQuery);
            if (userIdQuery.trim()) params.append('userId', userIdQuery.trim());
            if (ipQuery.trim()) params.append('ip', ipQuery.trim());

            const res = await fetch(`${API_URL}/admin/logs?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setAvailableFiles(data.availableFiles || []);
                if (data.backupStatus) setBackupStatus(data.backupStatus);
            }
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    }, [API_URL, selectedFile, searchQuery, userIdQuery, ipQuery]);

    // Start real-time streaming
    const startStreaming = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const token = localStorage.getItem('auth_token');
        const eventSource = new EventSource(`${API_URL}/admin/logs/stream?token=${token}`);
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'log') {
                    setLogs(prev => {
                        const newLogs = [data.data, ...prev];
                        return newLogs.slice(0, 500); // Keep last 500
                    });
                    
                    // Auto-scroll if enabled
                    if (autoScrollRef.current && logsContainerRef.current) {
                        logsContainerRef.current.scrollTop = 0;
                    }
                } else if (data.type === 'history') {
                    setLogs(data.data);
                }
            } catch (e) {
                console.error('Failed to parse SSE data:', e);
            }
        };

        eventSource.onerror = () => {
            console.error('SSE connection error');
            setIsStreaming(false);
            eventSource.close();
        };

        eventSourceRef.current = eventSource;
        setIsStreaming(true);
    }, [API_URL]);

    // Stop streaming
    const stopStreaming = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setIsStreaming(false);
    }, []);

    // Clear logs
    const clearLogs = async () => {
        if (!confirm('Are you sure you want to clear the logs? This action cannot be undone.')) return;
        
        const token = localStorage.getItem('auth_token');
        try {
            await fetch(`${API_URL}/admin/logs?file=${selectedFile}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs([]);
            fetchLogs();
        } catch (error) {
            console.error('Failed to clear logs', error);
        }
    };

    // Download logs
    const downloadLogs = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_URL}/admin/logs/download?file=${selectedFile}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = selectedFile;
                a.click();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to download logs', error);
        }
    };

    // Connect Google Drive
    const connectDrive = async () => {
        setConnectingDrive(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_URL}/admin/logs/drive/auth-url`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Failed to get Drive auth URL', error);
        } finally {
            setConnectingDrive(false);
        }
    };

    // Disconnect Google Drive
    const disconnectDrive = async () => {
        if (!confirm('Disconnect Google Drive backup? Your logs will no longer be backed up automatically.')) return;
        
        const token = localStorage.getItem('auth_token');
        try {
            await fetch(`${API_URL}/admin/logs/drive`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setBackupStatus({ enabled: false });
        } catch (error) {
            console.error('Failed to disconnect Drive', error);
        }
    };

    // Trigger manual backup
    const triggerBackup = async () => {
        setBackingUp(true);
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_URL}/admin/logs/backup`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                alert('Backup completed successfully!');
                // Refresh backup status
                fetchLogs();
            } else {
                const error = await res.json();
                alert(`Backup failed: ${error.message}`);
            }
        } catch (error) {
            console.error('Failed to trigger backup', error);
            alert('Failed to trigger backup');
        } finally {
            setBackingUp(false);
        }
    };

    // Filter logs
    const filteredLogs = logs.filter((log) => {
        const status = getLogStatus(log);

        if (filterLevel === 'errors') {
            if (status !== null) return status >= 400;
            return log.includes(' 4') || log.includes(' 5');
        }

        if (filterLevel === 'success') {
            if (status !== null) return status >= 200 && status < 300;
            return log.includes(' 2');
        }

        return true;
    });

    // Format file size
    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Get log line styling
    const getLogStyle = (log: string) => {
        const parsed = tryParseJson(log);
        const level = typeof parsed?.level === 'string' ? parsed.level : null;
        if (level) {
            if (level === 'ERROR' || level === 'FATAL') return 'text-red-400 bg-red-950/30';
            if (level === 'WARN') return 'text-orange-400';
            if (level === 'INFO') return 'text-green-400';
            if (level === 'DEBUG' || level === 'TRACE') return 'text-blue-400';
        }

        const status = getLogStatus(log);
        if (status !== null) {
            if (status >= 500) return 'text-red-400 bg-red-950/30';
            if (status >= 400) return 'text-orange-400';
            if (status >= 300) return 'text-blue-400';
            if (status >= 200) return 'text-green-400';
        }

        if (log.includes(' 500 ') || log.includes(' 502 ') || log.includes(' 503 ')) {
            return 'text-red-400 bg-red-950/30';
        }
        if (log.includes(' 404 ') || log.includes(' 400 ') || log.includes(' 401 ') || log.includes(' 403 ')) {
            return 'text-orange-400';
        }
        if (log.includes(' 200 ') || log.includes(' 201 ') || log.includes(' 204 ')) {
            return 'text-green-400';
        }
        if (log.includes(' 301 ') || log.includes(' 302 ') || log.includes(' 304 ')) {
            return 'text-blue-400';
        }
        return 'text-slate-300';
    };

    // Check for URL params (Drive callback)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('drive_connected') === 'true') {
            const email = params.get('email');
            alert(`Google Drive connected successfully${email ? ` (${email})` : ''}! Your logs will now be backed up daily.`);
            window.history.replaceState({}, '', '/admin/logs');
        }
        if (params.get('error')) {
            alert(`Failed to connect Google Drive: ${params.get('error')}`);
            window.history.replaceState({}, '', '/admin/logs');
        }
    }, []);

    useEffect(() => {
        fetchLogs();
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [fetchLogs]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        System Logs
                        {isStreaming && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">
                                <Wifi className="w-3 h-3 mr-1" />
                                Live
                            </Badge>
                        )}
                    </h1>
                    <p className="text-slate-500 mt-1">Real-time server logs with Google Drive backup.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {/* Stream Toggle */}
                    <Button
                        variant={isStreaming ? "default" : "outline"}
                        onClick={isStreaming ? stopStreaming : startStreaming}
                        className={isStreaming ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                        {isStreaming ? (
                            <>
                                <Pause className="mr-2 h-4 w-4" />
                                Stop Live
                            </>
                        ) : (
                            <>
                                <Play className="mr-2 h-4 w-4" />
                                Go Live
                            </>
                        )}
                    </Button>

                    <Button variant="outline" onClick={fetchLogs} disabled={loading || isStreaming}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>

                    <Button variant="outline" onClick={downloadLogs}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>

                    <Button variant="destructive" onClick={clearLogs}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear
                    </Button>
                </div>
            </div>

            {/* Google Drive Backup Card */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${backupStatus.enabled ? 'bg-green-100' : 'bg-slate-100'}`}>
                                {backupStatus.enabled ? (
                                    <Cloud className="h-5 w-5 text-green-600" />
                                ) : (
                                    <CloudOff className="h-5 w-5 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-lg">Google Drive Backup</CardTitle>
                                <CardDescription>
                                    {backupStatus.enabled 
                                        ? `Connected to ${backupStatus.email}` 
                                        : 'Automatically backup logs to your Google Drive'}
                                </CardDescription>
                            </div>
                        </div>
                        
                        {backupStatus.enabled ? (
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={triggerBackup}
                                    disabled={backingUp}
                                >
                                    <Upload className={`mr-2 h-4 w-4 ${backingUp ? 'animate-bounce' : ''}`} />
                                    {backingUp ? 'Backing up...' : 'Backup Now'}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={disconnectDrive}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    Disconnect
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={connectDrive} disabled={connectingDrive}>
                                <Cloud className="mr-2 h-4 w-4" />
                                {connectingDrive ? 'Connecting...' : 'Connect Drive'}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                
                {backupStatus.enabled && (
                    <CardContent className="border-t pt-4">
                        <div className="flex flex-wrap gap-6 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="h-4 w-4" />
                                <span>Frequency:</span>
                                <Badge variant="secondary">{backupStatus.backupFrequency || 'Daily'}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span>Last Backup:</span>
                                <span className="font-medium">
                                    {backupStatus.lastBackup 
                                        ? new Date(backupStatus.lastBackup).toLocaleString() 
                                        : 'Never'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <HardDrive className="h-4 w-4" />
                                <span>Folder:</span>
                                <span className="font-medium">MakeTicket-Logs</span>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* File Selector */}
                <div className="relative">
                    <Button 
                        variant="outline" 
                        className="w-full sm:w-auto justify-between min-w-[200px]"
                        onClick={() => setShowFileSelector(!showFileSelector)}
                    >
                        <span className="flex items-center">
                            <FileText className="mr-2 h-4 w-4" />
                            {selectedFile}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    
                    {showFileSelector && availableFiles.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full sm:w-72 bg-white border rounded-lg shadow-lg z-10 max-h-64 overflow-auto">
                            {availableFiles.map((file) => (
                                <button
                                    key={file.name}
                                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b last:border-0 ${
                                        selectedFile === file.name ? 'bg-indigo-50' : ''
                                    }`}
                                    onClick={() => {
                                        setSelectedFile(file.name);
                                        setShowFileSelector(false);
                                        fetchLogs();
                                    }}
                                >
                                    <span className="font-medium text-sm">{file.name}</span>
                                    <span className="text-xs text-slate-500">{formatSize(file.size)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                        className="pl-10"
                    />
                </div>

                {/* User ID */}
                <div className="w-full sm:w-56">
                    <Input
                        placeholder="User ID"
                        value={userIdQuery}
                        onChange={(e) => setUserIdQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                    />
                </div>

                {/* IP Address */}
                <div className="w-full sm:w-56">
                    <Input
                        placeholder="IP Address"
                        value={ipQuery}
                        onChange={(e) => setIpQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                    />
                </div>

                {/* Filter */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                            filterLevel === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                        }`}
                        onClick={() => setFilterLevel('all')}
                    >
                        All
                    </button>
                    <button
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                            filterLevel === 'success' ? 'bg-white shadow text-green-600' : 'text-slate-600 hover:text-slate-900'
                        }`}
                        onClick={() => setFilterLevel('success')}
                    >
                        <CheckCircle className="h-3 w-3" />
                        2xx
                    </button>
                    <button
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                            filterLevel === 'errors' ? 'bg-white shadow text-red-600' : 'text-slate-600 hover:text-slate-900'
                        }`}
                        onClick={() => setFilterLevel('errors')}
                    >
                        <XCircle className="h-3 w-3" />
                        4xx/5xx
                    </button>
                </div>
            </div>

            {/* Logs Console */}
            <Card className="bg-slate-950 border-slate-800 text-slate-300">
                <CardHeader className="border-b border-slate-900 pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-green-500" />
                            <CardTitle className="text-slate-200">Server Console</CardTitle>
                            {isStreaming && (
                                <span className="flex items-center gap-1 text-xs text-green-400">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Streaming
                                </span>
                            )}
                        </div>
                        <CardDescription className="text-slate-500">
                            {filteredLogs.length} entries
                            {filterLevel !== 'all' && ` (filtered)`}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div 
                        ref={logsContainerRef}
                        className="p-4 font-mono text-xs md:text-sm h-[600px] overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                    >
                        {loading && logs.length === 0 ? (
                            <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Loading logs...
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-slate-500 italic flex items-center gap-2">
                                <Terminal className="h-4 w-4" />
                                {searchQuery ? 'No logs matching your search.' : 'No logs found.'}
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {filteredLogs.map((log, i) => (
                                    <div 
                                        key={i} 
                                        className={`whitespace-pre-wrap break-all py-1 px-2 rounded ${getLogStyle(log)} hover:bg-slate-900/50 transition-colors`}
                                        title={log}
                                    >
                                        <span className="text-slate-600 mr-3 select-none">
                                            {(filteredLogs.length - i).toString().padStart(3, '0')}
                                        </span>
                                        {formatLogLine(log)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats Footer */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>2xx Success</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>3xx Redirect</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>4xx Client Error</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>5xx Server Error</span>
                </div>
            </div>
        </div>
    );
}
