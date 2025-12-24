'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
    ChevronRight
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
}

export default function ContactsPage() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [stats, setStats] = useState<ContactStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);
    const [total, setTotal] = useState(0);

    // Email Templates
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Email composition - now inline
    const [showEmailSection, setShowEmailSection] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [sending, setSending] = useState(false);

    // Messages
    const [message, setMessage] = useState({ type: '', text: '' });

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
                setTotal(data.total || 0);
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
            if (res.ok) {
                const data = await res.json();
                setMessage({ type: 'success', text: data.message });
                fetchContacts();
                fetchStats();
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to sync contacts' });
        } finally {
            setSyncing(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleExport = () => {
        const token = localStorage.getItem('auth_token');
        window.open(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contacts/export?token=${token}`,
            '_blank'
        );
    };

    const handleOpenEmailSection = () => {
        setShowEmailSection(true);
        fetchTemplates();
    };

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const template = templates.find(t => t._id === templateId);
        if (template) {
            setEmailSubject(template.subject || '');
            // Keep HTML body if available, set HTML mode
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
            setMessage({ type: 'error', text: 'Please fill in subject and message' });
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
                setMessage({ type: 'success', text: data.message });
                setShowEmailSection(false);
                setEmailSubject('');
                setEmailMessage('');
                setSelectedTemplateId('');
                setIsHtmlMode(false);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to send emails' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to send emails' });
        } finally {
            setSending(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        }
    };

    // Filter contacts
    const filteredContacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const visibleContacts = filteredContacts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredContacts.length;

    if (loading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-7 w-32 bg-slate-200 rounded" />
                        <div className="h-4 w-64 bg-slate-100 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                            <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                            <div className="h-4 w-20 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
                    <p className="text-slate-500">Manage your attendee contacts for marketing</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 bg-white"
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                        Sync
                    </Button>
                    <Button
                        variant="outline"
                        className="border-slate-200 bg-white"
                        onClick={handleExport}
                        disabled={contacts.length === 0}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    {!showEmailSection && (
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleOpenEmailSection}
                            disabled={contacts.length === 0}
                        >
                            <Send className="mr-2 h-4 w-4" />
                            Compose Email
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats?.total || 0}</p>
                                <p className="text-xs text-slate-500">Total Contacts</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <UserCheck className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats?.optedIn || 0}</p>
                                <p className="text-xs text-slate-500">Opted In</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats?.thisMonth || 0}</p>
                                <p className="text-xs text-slate-500">This Month</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Mail className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stats?.optedOut || 0}</p>
                                <p className="text-xs text-slate-500">Opted Out</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Email Composition Section */}
            {showEmailSection && (
                <Card className="border-indigo-200 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                    <Mail className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Compose Bulk Email</CardTitle>
                                    <CardDescription>
                                        Send to {stats?.optedIn || 0} opted-in contacts
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowEmailSection(false);
                                    setEmailSubject('');
                                    setEmailMessage('');
                                    setSelectedTemplateId('');
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Template Selector */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                Select Template (optional)
                            </label>
                            {loadingTemplates ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading templates...
                                </div>
                            ) : templates.length === 0 ? (
                                <p className="text-sm text-slate-500 py-2">
                                    No templates found. <a href="/dashboard/settings/email-templates" className="text-indigo-600 hover:underline">Create one</a>
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedTemplateId('');
                                            setEmailSubject('');
                                            setEmailMessage('');
                                            setIsHtmlMode(false);
                                        }}
                                        className={`p-3 rounded-lg border text-left transition-all ${selectedTemplateId === ''
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                    >
                                        <FileText className="w-4 h-4 text-slate-400 mb-1" />
                                        <p className="text-sm font-medium text-slate-700">Blank</p>
                                        <p className="text-xs text-slate-500">Start from scratch</p>
                                    </button>
                                    {templates.map((template) => (
                                        <button
                                            key={template._id}
                                            onClick={() => handleSelectTemplate(template._id)}
                                            className={`p-3 rounded-lg border text-left transition-all ${selectedTemplateId === template._id
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                        >
                                            <FileText className={`w-4 h-4 mb-1 ${selectedTemplateId === template._id ? 'text-indigo-600' : 'text-slate-400'
                                                }`} />
                                            <p className="text-sm font-medium text-slate-700 truncate">{template.name}</p>
                                            <p className="text-xs text-slate-500 truncate">{template.subject}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Subject */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Subject *</label>
                            <Input
                                placeholder="Enter email subject..."
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="bg-white"
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-slate-700">Message *</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsHtmlMode(false)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${!isHtmlMode ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        Plain Text
                                    </button>
                                    <button
                                        onClick={() => setIsHtmlMode(true)}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${isHtmlMode ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        HTML
                                    </button>
                                </div>
                            </div>
                            <textarea
                                placeholder={isHtmlMode ? '<p>Your HTML content here...</p>' : 'Write your message here...'}
                                value={emailMessage}
                                onChange={(e) => setEmailMessage(e.target.value)}
                                className={`w-full h-48 px-3 py-2 rounded-lg border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${isHtmlMode ? 'font-mono text-xs' : ''}`}
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                {isHtmlMode
                                    ? 'Write valid HTML. Use {name} for personalization.'
                                    : 'Recipients will receive personalized emails with their name'
                                }
                            </p>
                            {isHtmlMode && emailMessage && (
                                <div className="mt-3">
                                    <p className="text-xs font-medium text-slate-600 mb-1">Preview:</p>
                                    <div
                                        className="p-3 rounded-lg border border-slate-200 bg-white text-sm max-h-32 overflow-auto"
                                        dangerouslySetInnerHTML={{ __html: emailMessage }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-sm text-slate-500">
                                <CheckCircle2 className="w-4 h-4 inline-block mr-1 text-emerald-500" />
                                Will send to {stats?.optedIn || 0} subscribed contacts
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowEmailSection(false);
                                        setEmailSubject('');
                                        setEmailMessage('');
                                        setSelectedTemplateId('');
                                        setIsHtmlMode(false);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700"
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
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by name or email..."
                    className="pl-9 bg-white border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Contacts Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">All Contacts</CardTitle>
                    <CardDescription>
                        Showing {visibleContacts.length} of {filteredContacts.length} contacts
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {contacts.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                            <p className="font-medium mb-2">No contacts yet</p>
                            <p className="text-sm mb-4">Sync contacts from your event registrations</p>
                            <Button onClick={handleSync} disabled={syncing}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                Sync Contacts
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left font-medium">Contact</th>
                                            <th className="px-6 py-3 text-left font-medium">Phone</th>
                                            <th className="px-6 py-3 text-left font-medium">Events</th>
                                            <th className="px-6 py-3 text-left font-medium">Status</th>
                                            <th className="px-6 py-3 text-left font-medium">Added</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {visibleContacts.map((contact) => (
                                            <tr key={contact._id} className="bg-white hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-medium text-slate-900">{contact.name || 'Unknown'}</p>
                                                        <p className="text-slate-500 text-xs">{contact.email}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 text-sm">
                                                    {contact.phone || '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                                        {contact.totalEvents} event{contact.totalEvents !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {contact.optedIn !== false ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Subscribed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                            <XCircle className="w-3 h-3" />
                                                            Unsubscribed
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-xs">
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
                                <div className="p-4 text-center border-t border-slate-100">
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

            {/* Toast Message */}
            {message.text && (
                <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 z-50 ${message.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
                    }`}>
                    {message.type === 'error' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {message.text}
                </div>
            )}
        </div>
    );
}
