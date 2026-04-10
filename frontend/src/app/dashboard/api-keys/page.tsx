'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Key,
    Plus,
    Copy,
    Trash2,
    RefreshCw,
    Eye,
    EyeOff,
    Clock,
    TrendingUp,
    AlertCircle,
    Check,
    ExternalLink,
    Code,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

interface ApiKeyType {
    id: string;
    name: string;
    keyPrefix: string;
    permissions: string[];
    rateLimit: number;
    isActive: boolean;
    usageCount: number;
    lastUsedAt?: string;
    createdAt: string;
}

interface UsageStats {
    overview: {
        totalKeys: number;
        activeKeys: number;
        totalRequests: number;
    };
    keys: Array<{
        name: string;
        keyPrefix: string;
        requests: number;
        lastUsed?: string;
    }>;
}

export default function ApiKeysPage() {
    const [apiKeys, setApiKeys] = useState<ApiKeyType[]>([]);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [apiLogs, setApiLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmingType, setConfirmingType] = useState<'regenerate' | 'delete' | null>(null);
    const [showDocs, setShowDocs] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchApiKeys();
        fetchUsageStats();
        fetchApiLogs();
    }, []);

    const fetchApiKeys = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api-keys`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setApiKeys(data.apiKeys || []);
            }
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsageStats = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/api-keys/usage`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsageStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch usage stats:', error);
        }
    };

    const fetchApiLogs = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setLogsLoading(true);
        try {
            const res = await fetch(`${API_URL}/api-keys/logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setApiLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch API logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };



    const createApiKey = async () => {
        if (!newKeyName.trim()) return;

        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setCreating(true);
        try {
            const res = await fetch(`${API_URL}/api-keys`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newKeyName })
            });

            if (res.ok) {
                const data = await res.json();
                setNewlyCreatedKey(data.apiKey.key);
                setNewKeyName('');
                fetchApiKeys();
                fetchUsageStats();
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to create API key');
            }
        } catch (error) {
            console.error('Failed to create API key:', error);
        } finally {
            setCreating(false);
        }
    };

    const regenerateKey = async (keyId: string) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setRegeneratingId(keyId);
        setConfirmingId(null);
        setConfirmingType(null);
        
        try {
            const res = await fetch(`${API_URL}/api-keys/${keyId}/regenerate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setNewlyCreatedKey(data.apiKey.key);
                fetchApiKeys();
            }
        } catch (error) {
            console.error('Failed to regenerate API key:', error);
        } finally {
            setRegeneratingId(null);
        }
    };

    const deleteKey = async (keyId: string) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setDeletingId(keyId);
        setConfirmingId(null);
        setConfirmingType(null);
        
        try {
            const res = await fetch(`${API_URL}/api-keys/${keyId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchApiKeys();
                fetchUsageStats();
            }
        } catch (error) {
            console.error('Failed to delete API key:', error);
        } finally {
            setDeletingId(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const relativeTime = (dateStr?: string) => {
        if (!dateStr) return 'Never';
        const diff = Date.now() - new Date(dateStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
                    <p className="text-slate-500 mt-1">Manage API keys to access your data programmatically</p>
                </div>
                <Button
                    onClick={() => setShowNewKeyModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={apiKeys.length >= 5}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create API Key
                </Button>
            </div>

            {/* Usage Stats */}
            {usageStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <Key className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Keys</p>
                                <p className="text-2xl font-bold text-slate-900">{usageStats.overview.totalKeys}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Check className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Active Keys</p>
                                <p className="text-2xl font-bold text-slate-900">{usageStats.overview.activeKeys}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Total Requests</p>
                                <p className="text-2xl font-bold text-slate-900">{usageStats.overview.totalRequests.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* API Keys List */}
            <div className="bg-white rounded-xl border border-slate-200">
                <div className="p-5 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-900">Your API Keys</h2>
                    <p className="text-sm text-slate-500 mt-1">You can create up to 5 API keys</p>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    </div>
                ) : apiKeys.length === 0 ? (
                    <div className="p-12 text-center">
                        <Key className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="font-medium text-slate-900 mb-1">No API keys yet</h3>
                        <p className="text-sm text-slate-500 mb-4">Create an API key to start accessing your data programmatically</p>
                        <Button onClick={() => setShowNewKeyModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Key
                        </Button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {apiKeys.map((key) => (
                            <div key={key.id} className="p-5 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-medium text-slate-900">{key.name}</h3>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${key.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {key.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono text-slate-700">
                                                {key.keyPrefix}••••••••
                                            </code>
                                        </div>
                                        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <TrendingUp className="w-3.5 h-3.5" />
                                                {key.usageCount.toLocaleString()} requests
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                Last used: {relativeTime(key.lastUsedAt)}
                                            </span>
                                            <span>Created: {formatDate(key.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {confirmingId === key.id ? (
                                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-8 text-[10px] uppercase font-bold"
                                                    onClick={() => {
                                                        setConfirmingId(null);
                                                        setConfirmingType(null);
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant={confirmingType === 'delete' ? 'destructive' : 'default'}
                                                    size="sm"
                                                    className="h-8 text-[10px] uppercase font-bold bg-indigo-600 hover:bg-indigo-700"
                                                    onClick={() => confirmingType === 'delete' ? deleteKey(key.id) : regenerateKey(key.id)}
                                                >
                                                    Confirm {confirmingType}
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setConfirmingId(key.id);
                                                        setConfirmingType('regenerate');
                                                    }}
                                                    disabled={regeneratingId === key.id || deletingId === key.id}
                                                    className="text-slate-600"
                                                    title="Regenerate Key"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${regeneratingId === key.id ? 'animate-spin' : ''}`} />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setConfirmingId(key.id);
                                                        setConfirmingType('delete');
                                                    }}
                                                    disabled={deletingId === key.id || regeneratingId === key.id}
                                                    className="text-red-600 hover:bg-red-50 hover:border-red-200"
                                                    title="Delete Key"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent API Access Logs */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-slate-900">Recent API Access Logs</h2>
                        <p className="text-sm text-slate-500">Last 50 programmatic requests across all your keys</p>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchApiLogs}
                        disabled={logsLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Endpoint</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duration</th>
                                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logsLoading && apiLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : apiLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">
                                        No recent API activity found
                                    </td>
                                </tr>
                            ) : (
                                apiLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                log.method === 'GET' ? 'bg-green-100 text-green-700' : 
                                                log.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                            }`}>
                                                {log.method}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <code className="text-xs font-mono text-slate-600 truncate max-w-[200px] block">
                                                {log.url}
                                            </code>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                log.statusCode < 300 ? 'bg-green-100 text-green-700' : 
                                                log.statusCode < 500 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {log.statusCode}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-medium text-slate-700">{log.apiKeyName}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{log.apiKeyPrefix}••••</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            {log.duration}ms
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                                            {relativeTime(log.timestamp)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* API Documentation */}
            <div className="bg-white rounded-xl border border-slate-200">
                <button
                    onClick={() => setShowDocs(!showDocs)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Code className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900">API Documentation</h2>
                            <p className="text-sm text-slate-500">Learn how to use the MakeTicket API</p>
                        </div>
                    </div>
                    {showDocs ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {showDocs && (
                    <div className="p-5 border-t border-slate-100 space-y-6">
                        {/* Authentication */}
                        <div>
                            <h3 className="font-medium text-slate-900 mb-2">Authentication</h3>
                            <p className="text-sm text-slate-600 mb-3">
                                Include your API key in the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600">X-API-Key</code> header with every request.
                            </p>
                            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                                <pre className="text-sm text-slate-300">
                                    {`curl -H "X-API-Key: <YOUR_API_KEY>" \\
     https://api.maketicket.app/api/v1/events`}
                                </pre>
                            </div>
                        </div>

                        {/* Endpoints */}
                        <div>
                            <h3 className="font-medium text-slate-900 mb-3">Available Endpoints</h3>
                            <div className="space-y-3">
                                <div className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                        <code className="text-sm font-mono text-slate-700">/api/v1/stats/overview</code>
                                    </div>
                                    <p className="text-sm text-slate-600">Get your event statistics overview (total events, registrations, revenue)</p>
                                </div>-

                                <div className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                        <code className="text-sm font-mono text-slate-700">/api/v1/events</code>
                                    </div>
                                    <p className="text-sm text-slate-600">List all your events with pagination</p>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                        <code className="text-sm font-mono text-slate-700">/api/v1/events/:eventId</code>
                                    </div>
                                    <p className="text-sm text-slate-600">Get detailed information about a specific event</p>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                        <code className="text-sm font-mono text-slate-700">/api/v1/events/:eventId/registrations</code>
                                    </div>
                                    <p className="text-sm text-slate-600">Get all registrations for an event</p>
                                </div>

                                <div className="border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">GET</span>
                                        <code className="text-sm font-mono text-slate-700">/api/v1/stats/registrations?period=30d</code>
                                    </div>
                                    <p className="text-sm text-slate-600">Get registration statistics for a time period (7d, 30d, 90d, 1y)</p>
                                </div>
                            </div>
                        </div>

                        {/* Response Format */}
                        <div>
                            <h3 className="font-medium text-slate-900 mb-2">Response Format</h3>
                            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                                <pre className="text-sm text-slate-300">
                                    {`{
  "success": true,
  "data": {
    "events": { "total": 12, "active": 5 },
    "registrations": { "total": 450 },
    "revenue": { "total": 25000, "currency": "INR" }
  },
  "timestamp": "2025-12-31T10:00:00.000Z"
}`}
                                </pre>
                            </div>
                        </div>

                        {/* Rate Limits */}
                        <div>
                            <h3 className="font-medium text-slate-900 mb-2">Rate Limits</h3>
                            <p className="text-sm text-slate-600">
                                Each API key is limited to <strong>60 requests per minute</strong>.
                                Rate limit headers are included in every response:
                            </p>
                            <ul className="mt-2 text-sm text-slate-600 space-y-1">
                                <li>• <code className="bg-slate-100 px-1.5 py-0.5 rounded">X-RateLimit-Limit</code> - Maximum requests per minute</li>
                                <li>• <code className="bg-slate-100 px-1.5 py-0.5 rounded">X-RateLimit-Remaining</code> - Requests remaining</li>
                                <li>• <code className="bg-slate-100 px-1.5 py-0.5 rounded">X-RateLimit-Reset</code> - Unix timestamp when the limit resets</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Key Modal */}
            {showNewKeyModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Create API Key</h2>

                        {newlyCreatedKey ? (
                            <div className="space-y-4">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <Check className="w-5 h-5 text-green-600 mt-0.5" />
                                        <div>
                                            <h3 className="font-medium text-green-800">API Key Created!</h3>
                                            <p className="text-sm text-green-700 mt-1">
                                                Copy this key now. You won't be able to see it again.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative">
                                    <Input
                                        value={newlyCreatedKey}
                                        readOnly
                                        className="pr-10 font-mono text-sm bg-slate-50"
                                    />
                                    <button
                                        onClick={() => copyToClipboard(newlyCreatedKey)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded"
                                    >
                                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                                    </button>
                                </div>

                                <Button
                                    onClick={() => {
                                        setShowNewKeyModal(false);
                                        setNewlyCreatedKey(null);
                                    }}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Done
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Key Name
                                    </label>
                                    <Input
                                        placeholder="e.g., Production Integration"
                                        value={newKeyName}
                                        onChange={(e) => setNewKeyName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        A descriptive name to identify this API key
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <h4 className="text-sm font-medium text-slate-700 mb-2">Permissions</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {['read:events', 'read:registrations', 'read:analytics', 'read:tickets'].map((perm) => (
                                            <span key={perm} className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                                {perm}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowNewKeyModal(false)}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={createApiKey}
                                        disabled={!newKeyName.trim() || creating}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {creating ? 'Creating...' : 'Create Key'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
