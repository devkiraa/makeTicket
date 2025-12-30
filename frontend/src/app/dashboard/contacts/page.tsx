'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { usePlanSummary } from '@/hooks/use-plan-summary';
import {
    Download,
    Search,
    Loader2,
    Users,
    Mail,
    RefreshCw,
    Send,
    ChevronDown,
    CheckCircle2,
    XCircle,
    UserCheck,
    Calendar,
    FileText,
    X,
    Eye,
    Code,
    Type,
    Sparkles,
    MailPlus,
    UserPlus
} from 'lucide-react';

interface Contact {
    _id: string;
    email: string;
    name: string;
    phone: string;
    source: string;
    totalEvents: number;
    lastEventDate: string;
    optedIn: boolean;
    createdAt: string;
}

interface ContactStats {
    total: number;
    optedIn: number;
    optedOut: number;
    thisMonth: number;
}

interface EmailTemplate {
    _id: string;
    name: string;
    subject: string;
    body: string;
    type: string;
}

type ViewMode = 'contacts' | 'compose';

export default function ContactsPage() {
    const { summary: planSummary } = usePlanSummary();

    const [contacts, setContacts] = useState<Contact[]>([]);
    const [stats, setStats] = useState<ContactStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);

    // View mode
    const [viewMode, setViewMode] = useState<ViewMode>('contacts');

    // Email Templates
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Email composition
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [sending, setSending] = useState(false);

    // Messages
    const [toast, setToast] = useState({ type: '', text: '' });

    const canSyncContacts = !!planSummary?.features?.bulkImport;
    const canExportContacts = !!planSummary?.features?.exportData;

    useEffect(() => {
        fetchContacts();
        fetchStats();
    }, []);

    const fetchContacts = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contacts?limit=500`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setContacts(data.contacts || []);
            }
        } catch (error) {
            console.error('Failed to fetch contacts', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contacts/stats`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const fetchTemplates = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setLoadingTemplates(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setTemplates(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch templates', error);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contacts/sync`,
                {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            const data = await res.json().catch(() => ({} as any));
            if (res.ok) {
                showToast('success', data.message);
                fetchContacts();
                fetchStats();
            } else {
                showToast('error', data.message || 'Failed to sync contacts');
            }
        } catch (error) {
            showToast('error', 'Failed to sync contacts');
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contacts/export`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'contacts.csv';
                a.click();
                showToast('success', 'Contacts exported successfully');
            } else {
                const data = await res.json().catch(() => ({} as any));
                showToast('error', data.message || 'Failed to export contacts');
            }
        } catch (error) {
            showToast('error', 'Failed to export contacts');
        }
    };

    const handleOpenCompose = () => {
        setViewMode('compose');
        fetchTemplates();
    };

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
        if (templateId === '') {
            setEmailSubject('');
            setEmailMessage('');
            setIsHtmlMode(false);
            return;
        }
        const template = templates.find(t => t._id === templateId);
        if (template) {
            setEmailSubject(template.subject || '');
            if (template.body) {
                setEmailMessage(template.body);
                setIsHtmlMode(true);
            } else {
                setEmailMessage('');
                setIsHtmlMode(false);
            }
        }
    };

    const handleSendBulkEmail = async () => {
        if (!emailSubject.trim() || !emailMessage.trim()) {
            showToast('error', 'Please fill in subject and message');
            return;
        }

        setSending(true);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contacts/email`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        subject: emailSubject,
                        message: emailMessage,
                        isHtml: isHtmlMode
                    })
                }
            );
            const data = await res.json();
            if (res.ok) {
                showToast('success', data.message);
                setViewMode('contacts');
                setEmailSubject('');
                setEmailMessage('');
                setSelectedTemplateId('');
                setIsHtmlMode(false);
            } else {
                showToast('error', data.message || 'Failed to send emails');
            }
        } catch (error) {
            showToast('error', 'Failed to send emails');
        } finally {
            setSending(false);
        }
    };

    const showToast = (type: string, text: string) => {
        setToast({ type, text });
        setTimeout(() => setToast({ type: '', text: '' }), 4000);
    };

    // Filter contacts
    const filteredContacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const visibleContacts = filteredContacts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredContacts.length;

    // Loading skeleton
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-40 bg-slate-200 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-10 w-24 bg-slate-200 rounded animate-pulse" />
                        <div className="h-10 w-32 bg-slate-200 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                            <div className="h-10 w-10 bg-slate-200 rounded-lg mb-3" />
                            <div className="h-7 w-16 bg-slate-200 rounded mb-1" />
                            <div className="h-4 w-24 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-7 h-7 text-indigo-600" />
                        Contacts
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {viewMode === 'contacts'
                            ? 'Manage your attendee contacts for marketing'
                            : 'Compose and send emails to your contacts'
                        }
                    </p>
                </div>
                <div className="flex gap-2">
                    {viewMode === 'contacts' ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 bg-white hover:bg-slate-50"
                                onClick={handleSync}
                                disabled={syncing || !canSyncContacts}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                Sync
                            </Button>
                            <Button
                                variant="outline"
                                className="border-slate-200 bg-white hover:bg-slate-50"
                                onClick={handleExport}
                                disabled={contacts.length === 0 || !canExportContacts}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Export
                            </Button>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                onClick={handleOpenCompose}
                                disabled={stats?.optedIn === 0}
                            >
                                <MailPlus className="mr-2 h-4 w-4" />
                                Compose Email
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="outline"
                            className="border-slate-200 bg-white hover:bg-slate-50"
                            onClick={() => {
                                setViewMode('contacts');
                                setEmailSubject('');
                                setEmailMessage('');
                                setSelectedTemplateId('');
                            }}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-slate-900">{stats?.total || 0}</p>
                                <p className="text-sm text-slate-500">Total Contacts</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                                <UserCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-slate-900">{stats?.optedIn || 0}</p>
                                <p className="text-sm text-slate-500">Subscribed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-slate-900">{stats?.thisMonth || 0}</p>
                                <p className="text-sm text-slate-500">This Month</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-5">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-lg shadow-slate-200">
                                <XCircle className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-3xl font-bold text-slate-900">{stats?.optedOut || 0}</p>
                                <p className="text-sm text-slate-500">Unsubscribed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Compose Email View */}
            {viewMode === 'compose' && (
                <Card className="border-slate-200 shadow-lg overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Compose Email</CardTitle>
                                <CardDescription>
                                    Sending to <span className="font-semibold text-indigo-600">{stats?.optedIn || 0}</span> subscribed contacts
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        {/* Template Selector */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 mb-3 block flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                Choose a Template
                            </label>
                            {loadingTemplates ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading templates...
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    <button
                                        onClick={() => handleSelectTemplate('')}
                                        className={`group p-4 rounded-xl border-2 text-left transition-all ${selectedTemplateId === ''
                                            ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${selectedTemplateId === '' ? 'bg-indigo-500' : 'bg-slate-100 group-hover:bg-indigo-100'
                                            }`}>
                                            <FileText className={`w-4 h-4 ${selectedTemplateId === '' ? 'text-white' : 'text-slate-500'}`} />
                                        </div>
                                        <p className="font-semibold text-slate-800 text-sm">Blank</p>
                                        <p className="text-xs text-slate-500">Start fresh</p>
                                    </button>
                                    {templates.map((template) => (
                                        <button
                                            key={template._id}
                                            onClick={() => handleSelectTemplate(template._id)}
                                            className={`group p-4 rounded-xl border-2 text-left transition-all ${selectedTemplateId === template._id
                                                ? 'border-indigo-500 bg-indigo-50 shadow-md'
                                                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${selectedTemplateId === template._id ? 'bg-indigo-500' : 'bg-slate-100 group-hover:bg-indigo-100'
                                                }`}>
                                                <FileText className={`w-4 h-4 ${selectedTemplateId === template._id ? 'text-white' : 'text-slate-500'}`} />
                                            </div>
                                            <p className="font-semibold text-slate-800 text-sm truncate">{template.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{template.type}</p>
                                        </button>
                                    ))}
                                    {templates.length === 0 && (
                                        <a
                                            href="/dashboard/settings/email-templates"
                                            className="p-4 rounded-xl border-2 border-dashed border-slate-200 text-center hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-2">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                            </div>
                                            <p className="font-medium text-slate-600 text-sm">Create Template</p>
                                            <p className="text-xs text-slate-400">Add new →</p>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Subject */}
                        <div className="mt-5">
                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Subject Line</label>
                            <Input
                                placeholder="Enter a compelling subject..."
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="bg-white border-slate-200 h-12 text-base"
                            />
                        </div>

                        {/* Message Editor & Preview - Side by Side */}
                        <div className={`mt-5 grid gap-6 items-start ${isHtmlMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                            {/* Editor */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-semibold text-slate-700">Message Content</label>
                                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                                        <button
                                            onClick={() => setIsHtmlMode(false)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${!isHtmlMode
                                                ? 'bg-white shadow-sm text-slate-800'
                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <Type className="w-3.5 h-3.5" />
                                            Plain Text
                                        </button>
                                        <button
                                            onClick={() => setIsHtmlMode(true)}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${isHtmlMode
                                                ? 'bg-white shadow-sm text-slate-800'
                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <Code className="w-3.5 h-3.5" />
                                            HTML
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    placeholder={isHtmlMode ? '<p>Hi {name},</p>\n<p>Your HTML content here...</p>' : 'Hi {name},\n\nWrite your message here...'}
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                    className={`w-full h-56 px-4 py-3 rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${isHtmlMode ? 'font-mono text-sm' : 'text-base'}`}
                                />
                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Use <code className="px-1 py-0.5 bg-slate-100 rounded">{'{name}'}</code> to personalize with recipient's name
                                </p>
                            </div>

                            {/* Live Preview - Right Side (only in HTML mode) */}
                            {isHtmlMode && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Eye className="w-4 h-4 text-indigo-500" />
                                        <label className="text-sm font-semibold text-slate-700">Live Preview</label>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 h-56 overflow-auto">
                                        {emailMessage ? (
                                            <div
                                                className="p-4 bg-white rounded-lg border border-slate-200 text-sm prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: emailMessage.replace(/\{name\}/gi, '<span class="text-indigo-600 font-medium">John Doe</span>') }}
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                                <div className="text-center">
                                                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p>Start typing to see preview</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Preview shows how your email will appear to recipients
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-5 flex items-center justify-between pt-4 border-t border-slate-100">
                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Email will be sent to {stats?.optedIn || 0} subscribed contacts
                            </p>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 h-11 px-6"
                                onClick={handleSendBulkEmail}
                                disabled={sending || !emailSubject.trim() || !emailMessage.trim()}
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Email
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Contacts List View */}
            {viewMode === 'contacts' && (
                <>
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                        <Input
                            placeholder="Search contacts by name or email..."
                            className="pl-12 bg-white border-slate-200 h-12 text-base"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Contacts Table */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">All Contacts</CardTitle>
                                    <CardDescription>
                                        {filteredContacts.length === contacts.length
                                            ? `${contacts.length} contacts total`
                                            : `Showing ${filteredContacts.length} of ${contacts.length} contacts`
                                        }
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {contacts.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="font-semibold text-slate-700 mb-1">No contacts yet</p>
                                    <p className="text-sm text-slate-500 mb-6">Sync contacts from your event registrations</p>
                                    <Button onClick={handleSync} disabled={syncing || !canSyncContacts} className="bg-indigo-600 hover:bg-indigo-700">
                                        <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                        Sync Contacts
                                    </Button>
                                </div>
                            ) : filteredContacts.length === 0 ? (
                                <div className="text-center py-16 text-slate-400">
                                    <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                    <p className="font-medium">No contacts match your search</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-left font-semibold">Contact</th>
                                                    <th className="px-6 py-4 text-left font-semibold">Phone</th>
                                                    <th className="px-6 py-4 text-left font-semibold">Events</th>
                                                    <th className="px-6 py-4 text-left font-semibold">Status</th>
                                                    <th className="px-6 py-4 text-left font-semibold">Added</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {visibleContacts.map((contact) => (
                                                    <tr key={contact._id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                                                                    {(contact.name || contact.email)[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-slate-900">{contact.name || 'Unknown'}</p>
                                                                    <p className="text-slate-500 text-sm">{contact.email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600">
                                                            {contact.phone || '—'}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                {contact.totalEvents} event{contact.totalEvents !== 1 ? 's' : ''}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {contact.optedIn !== false ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                                    Subscribed
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                                                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                                                                    Unsubscribed
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 text-sm">
                                                            {new Date(contact.createdAt).toLocaleDateString('en-IN', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {hasMore && (
                                        <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
                                            <Button
                                                variant="outline"
                                                onClick={() => setVisibleCount(prev => prev + 20)}
                                                className="border-slate-200"
                                            >
                                                <ChevronDown className="w-4 h-4 mr-2" />
                                                Load More ({filteredContacts.length - visibleCount} remaining)
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Toast */}
            {toast.text && (
                <div className={`fixed bottom-6 right-6 px-5 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4 ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
                    }`}>
                    {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    <span className="font-medium">{toast.text}</span>
                </div>
            )}
        </div>
    );
}
