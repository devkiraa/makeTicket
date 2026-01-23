'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Mail,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    Send,
    AlertCircle
} from 'lucide-react';

interface EmailLog {
    _id: string;
    toEmail: string;
    toName?: string;
    fromEmail: string;
    subject: string;
    type: string;
    status: 'sent' | 'failed' | 'pending' | 'bounced';
    provider: string;
    errorMessage?: string;
    createdAt: string;
    userId?: { email: string; name: string };
}

export default function EmailLogsPage() {
    const [emails, setEmails] = useState<EmailLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [providerFilter, setProviderFilter] = useState('all');
    const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

    useEffect(() => {
        fetchEmails();
    }, [page, statusFilter, providerFilter]);

    const fetchEmails = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '25',
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(providerFilter !== 'all' && { provider: providerFilter }),
                ...(search && { search })
            });

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/email/logs?${params}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.ok) {
                const data = await res.json();
                setEmails(data.emails);
                setTotalPages(data.pagination.pages);
                setTotal(data.pagination.total);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        fetchEmails();
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'sent':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'bounced':
                return <AlertCircle className="w-4 h-4 text-orange-500" />;
            default:
                return <Mail className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            sent: 'bg-green-50 text-green-700 border-green-200',
            failed: 'bg-red-50 text-red-700 border-red-200',
            pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            bounced: 'bg-orange-50 text-orange-700 border-orange-200'
        };
        return styles[status] || 'bg-slate-50 text-slate-700 border-slate-200';
    };

    const getProviderBadge = (provider: string) => {
        const styles: Record<string, string> = {
            gmail: 'bg-blue-50 text-blue-700',
            zeptomail: 'bg-purple-50 text-purple-700',
            system: 'bg-slate-100 text-slate-700',
            smtp: 'bg-indigo-50 text-indigo-700'
        };
        return styles[provider] || 'bg-slate-50 text-slate-700';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Email Logs
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            {total} Total
                        </Badge>
                    </h1>
                    <p className="text-slate-500 mt-1">View all emails sent from the system.</p>
                </div>

                <Button onClick={fetchEmails} variant="outline" disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters Card */}
            <Card className="border-slate-200">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100">
                            <Search className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Search & Filter</CardTitle>
                            <CardDescription>Find specific emails by recipient, subject, or status</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by email or subject..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-900 text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="sent">Sent</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                            <option value="bounced">Bounced</option>
                        </select>

                        {/* Provider Filter */}
                        <select
                            value={providerFilter}
                            onChange={(e) => { setProviderFilter(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-900 text-sm"
                        >
                            <option value="all">All Providers</option>
                            <option value="gmail">Gmail</option>
                            <option value="zeptomail">ZeptoMail</option>
                            <option value="system">System</option>
                        </select>

                        <Button onClick={handleSearch}>
                            <Search className="w-4 h-4 mr-2" />
                            Search
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Email List */}
            <Card className="border-slate-200">
                <CardHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-indigo-500" />
                            <CardTitle>Email History</CardTitle>
                        </div>
                        <CardDescription>
                            Page {page} of {totalPages}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : emails.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No emails found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {emails.map((email) => (
                                <div
                                    key={email._id}
                                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedEmail(email)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            {getStatusIcon(email.status)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-medium text-slate-900 truncate">
                                                    {email.toEmail}
                                                </span>
                                                <Badge variant="outline" className={getStatusBadge(email.status)}>
                                                    {email.status}
                                                </Badge>
                                                <Badge variant="secondary" className={getProviderBadge(email.provider)}>
                                                    {email.provider}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-600 truncate">{email.subject}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                <span>Type: <span className="font-medium">{email.type}</span></span>
                                                <span>•</span>
                                                <span>From: {email.fromEmail}</span>
                                                <span>•</span>
                                                <span>{formatDate(email.createdAt)}</span>
                                            </div>
                                            {email.errorMessage && (
                                                <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                                    <AlertCircle className="w-3 h-3 inline mr-1" />
                                                    {email.errorMessage}
                                                </div>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-900">
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            <Card className="border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Page Info */}
                        <div className="text-sm text-slate-600">
                            Showing <span className="font-medium">{emails.length > 0 ? ((page - 1) * 25) + 1 : 0}</span> to{' '}
                            <span className="font-medium">{Math.min(page * 25, total)}</span> of{' '}
                            <span className="font-medium">{total}</span> emails
                        </div>

                        {/* Page Navigation */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(1)}
                                disabled={page === 1}
                            >
                                First
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Prev
                            </Button>

                            <div className="flex items-center gap-1 px-2">
                                {totalPages > 0 && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={page === pageNum ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setPage(pageNum)}
                                            className="w-9"
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages || 1, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(totalPages || 1)}
                                disabled={page === totalPages || totalPages === 0}
                            >
                                Last
                            </Button>
                        </div>

                        {/* Page Jump */}
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-600">Page:</span>
                            <Input
                                type="number"
                                min={1}
                                max={totalPages || 1}
                                value={page}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val >= 1 && val <= (totalPages || 1)) {
                                        setPage(val);
                                    }
                                }}
                                className="w-16 h-8 text-center"
                            />
                            <span className="text-slate-500">of {totalPages || 1}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Footer */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Sent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Failed</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span>Bounced</span>
                </div>
            </div>

            {/* Email Detail Modal */}
            {selectedEmail && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEmail(null)}>
                    <Card className="bg-white max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Email Details</CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedEmail(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-medium">To</label>
                                        <p className="text-slate-900 font-medium">{selectedEmail.toEmail}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-medium">From</label>
                                        <p className="text-slate-900">{selectedEmail.fromEmail}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-medium">Subject</label>
                                    <p className="text-slate-900">{selectedEmail.subject}</p>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-medium">Status</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            {getStatusIcon(selectedEmail.status)}
                                            <Badge variant="outline" className={getStatusBadge(selectedEmail.status)}>
                                                {selectedEmail.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-medium">Provider</label>
                                        <Badge variant="secondary" className={`mt-1 ${getProviderBadge(selectedEmail.provider)}`}>
                                            {selectedEmail.provider}
                                        </Badge>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-medium">Type</label>
                                        <p className="text-slate-900">{selectedEmail.type}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-medium">Sent At</label>
                                    <p className="text-slate-900">{new Date(selectedEmail.createdAt).toLocaleString()}</p>
                                </div>

                                {selectedEmail.errorMessage && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <label className="text-xs text-red-600 uppercase font-medium">Error Message</label>
                                        <p className="text-red-700 mt-1">{selectedEmail.errorMessage}</p>
                                    </div>
                                )}

                                {selectedEmail.userId && (
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase font-medium">Sender (User)</label>
                                        <p className="text-slate-900">{selectedEmail.userId.name || selectedEmail.userId.email}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
