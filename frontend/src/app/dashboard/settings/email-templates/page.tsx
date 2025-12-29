'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Plus,
    Loader2,
    CheckCircle2,
    Edit,
    Trash2,
    FileText,
    Star,
    Monitor,
    Smartphone,
    Save,
    X,
    Eye
} from 'lucide-react';

interface EmailTemplate {
    _id: string;
    name: string;
    subject: string;
    body: string;
    type: string;
    isDefault: boolean;
    isActive: boolean;
    createdAt: string;
}

interface Placeholder {
    key: string;
    description: string;
}

// Sample placeholder values for preview
const sampleData: Record<string, string> = {
    '{{guest_name}}': 'John Doe',
    '{{guest_email}}': 'john@example.com',
    '{{event_title}}': 'Tech Conference 2025',
    '{{event_date}}': 'December 25, 2025 at 10:00 AM',
    '{{event_time}}': '10:00 AM',
    '{{event_location}}': 'Convention Center, Main Hall',
    '{{event_description}}': 'Join us for an exciting tech conference...',
    '{{ticket_code}}': 'TKT-ABC123',
    '{{qr_code_url}}': 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=TKT-ABC123',
    '{{event_link}}': 'https://maketicket.app/events/tech-conf-2025',
    '{{host_name}}': 'Event Host',
    '{{host_email}}': 'host@example.com'
};

export default function EmailTemplatesPage() {
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Editor state
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        body: '',
        type: 'registration',
        isDefault: false
    });

    useEffect(() => {
        fetchTemplates();
        fetchPlaceholders();
    }, []);

    const fetchTemplates = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (err) {
            console.error('Failed to fetch templates', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlaceholders = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates/placeholders`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setPlaceholders(data);
            }
        } catch (err) {
            console.error('Failed to fetch placeholders', err);
        }
    };

    const startCreating = () => {
        setSelectedTemplate(null);
        setIsCreating(true);
        setFormData({
            name: '',
            subject: '',
            body: getDefaultBody(),
            type: 'registration',
            isDefault: false
        });
    };

    const selectTemplate = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setIsCreating(false);
        setFormData({
            name: template.name,
            subject: template.subject,
            body: template.body,
            type: template.type,
            isDefault: template.isDefault
        });
    };

    const cancelEdit = () => {
        setSelectedTemplate(null);
        setIsCreating(false);
        setFormData({
            name: '',
            subject: '',
            body: '',
            type: 'registration',
            isDefault: false
        });
    };

    const getDefaultBody = () => `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; color: #333; }
        .ticket-code { background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .code { font-size: 28px; font-weight: bold; color: #4F46E5; letter-spacing: 4px; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>{{guest_name}}</strong>,</p>
            <p>Thank you for registering for <strong>{{event_title}}</strong>!</p>
            
            <div class="ticket-code">
                <p style="margin: 0 0 10px 0; color: #64748b;">Your Ticket Code</p>
                <div class="code">{{ticket_code}}</div>
            </div>
            
            <p><strong>Event Details:</strong></p>
            <ul>
                <li>📅 Date: {{event_date}}</li>
                <li>📍 Location: {{event_location}}</li>
            </ul>
            
            <p>Please save this email or take a screenshot of your ticket code. You'll need to show it at check-in.</p>
            
            <p style="text-align: center; margin-top: 30px;">
                <a href="{{event_link}}" class="btn">View Event Details</a>
            </p>
        </div>
        <div class="footer">
            <p>Sent via MakeTicket • Event hosted by {{host_name}}</p>
        </div>
    </div>
</body>
</html>`;

    const handleSubmit = async () => {
        if (!formData.name || !formData.subject || !formData.body) {
            setMessage({ type: 'error', text: 'Please fill in all required fields' });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        const token = localStorage.getItem('auth_token');
        const url = selectedTemplate
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates/${selectedTemplate._id}`
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates`;

        try {
            const res = await fetch(url, {
                method: selectedTemplate ? 'PATCH' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: selectedTemplate ? 'Template updated!' : 'Template created!' });
                fetchTemplates();
                if (!selectedTemplate) {
                    setSelectedTemplate(data);
                    setIsCreating(false);
                }
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to save template' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Something went wrong' });
        } finally {
            setSaving(false);
        }
    };

    const deleteTemplate = async (templateId: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates/${templateId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            if (res.ok) {
                setMessage({ type: 'success', text: 'Template deleted' });
                if (selectedTemplate?._id === templateId) {
                    cancelEdit();
                }
                fetchTemplates();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete template' });
        }
    };

    const insertPlaceholder = (placeholder: string) => {
        const textarea = document.getElementById('body') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newBody = formData.body.substring(0, start) + placeholder + formData.body.substring(end);
            setFormData({ ...formData, body: newBody });
            // Restore cursor position
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
            }, 0);
        }
    };

    // Replace placeholders with sample data for preview
    const getPreviewHtml = () => {
        let html = formData.body;
        Object.entries(sampleData).forEach(([key, value]) => {
            html = html.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
        });
        return html;
    };

    const typeColors: Record<string, string> = {
        registration: 'bg-green-100 text-green-700',
        reminder: 'bg-blue-100 text-blue-700',
        update: 'bg-amber-100 text-amber-700',
        cancellation: 'bg-red-100 text-red-700',
        custom: 'bg-purple-100 text-purple-700'
    };

    const showEditor = selectedTemplate || isCreating;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings/emails" className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Email Templates</h1>
                        <p className="text-slate-500">Create reusable email templates with placeholders</p>
                    </div>
                </div>
                {!showEditor && (
                    <Button onClick={startCreating} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" /> New Template
                    </Button>
                )}
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    <CheckCircle2 className="w-5 h-5" />
                    {message.text}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <div className="h-5 w-32 bg-slate-200 rounded" />
                                        <div className="h-3 w-48 bg-slate-100 rounded" />
                                    </div>
                                    <div className="h-5 w-16 bg-slate-100 rounded-full" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-2">
                                    <div className="h-8 flex-1 bg-slate-100 rounded" />
                                    <div className="h-8 w-10 bg-slate-50 rounded" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : !showEditor ? (
                /* Template List View */
                templates.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="font-semibold text-slate-900 mb-2">No templates yet</h3>
                            <p className="text-slate-500 text-sm mb-4">
                                Create your first email template to send personalized confirmation emails
                            </p>
                            <Button onClick={startCreating}>
                                <Plus className="w-4 h-4 mr-2" /> Create Template
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template) => (
                            <Card
                                key={template._id}
                                className="hover:shadow-md transition-shadow cursor-pointer group"
                                onClick={() => selectTemplate(template)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{template.name}</CardTitle>
                                            {template.isDefault && (
                                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                            )}
                                        </div>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[template.type]}`}>
                                            {template.type}
                                        </span>
                                    </div>
                                    <CardDescription className="line-clamp-1">
                                        Subject: {template.subject}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                selectTemplate(template);
                                            }}
                                        >
                                            <Edit className="w-4 h-4 mr-1" /> Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteTemplate(template._id);
                                            }}
                                            className="text-slate-400 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
            ) : (
                /* Editor View with Preview */
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Left: Editor */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle>
                                        {isCreating ? 'Create New Template' : `Edit: ${selectedTemplate?.name}`}
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Template Name *</Label>
                                        <Input
                                            id="name"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g., Event Registration"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Template Type</Label>
                                        <select
                                            id="type"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm"
                                        >
                                            <option value="registration">Registration Confirmation</option>
                                            <option value="reminder">Event Reminder</option>
                                            <option value="update">Event Update</option>
                                            <option value="cancellation">Cancellation Notice</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="subject">Email Subject *</Label>
                                    <Input
                                        id="subject"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        placeholder="e.g., 🎉 You're registered for {{event_title}}!"
                                    />
                                </div>

                                {/* Placeholders */}
                                <div className="space-y-2">
                                    <Label>Insert Placeholder</Label>
                                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-lg max-h-24 overflow-y-auto">
                                        {placeholders.map((p) => (
                                            <button
                                                key={p.key}
                                                type="button"
                                                onClick={() => insertPlaceholder(p.key)}
                                                className="px-2 py-1 text-xs bg-white border border-slate-200 rounded hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                                                title={p.description}
                                            >
                                                {p.key}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="body">Email Body (HTML) *</Label>
                                    <textarea
                                        id="body"
                                        value={formData.body}
                                        onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                        className="w-full h-72 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono resize-none"
                                        placeholder="<html>...</html>"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        checked={formData.isDefault}
                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="rounded border-slate-300 text-indigo-600"
                                    />
                                    <Label htmlFor="isDefault" className="font-normal">
                                        Set as default template for {formData.type} emails
                                    </Label>
                                </div>

                                <div className="flex gap-3 pt-4 border-t">
                                    <Button variant="outline" onClick={cancelEdit} className="flex-1">
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={saving}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        {saving ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                        ) : (
                                            <><Save className="w-4 h-4 mr-2" /> {selectedTemplate ? 'Update' : 'Create'} Template</>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Preview */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-5 h-5 text-slate-500" />
                                        <CardTitle className="text-lg">Live Preview</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                                        <button
                                            onClick={() => setPreviewMode('desktop')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${previewMode === 'desktop'
                                                ? 'bg-white shadow-sm text-slate-900'
                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <Monitor className="w-4 h-4" />
                                            Desktop
                                        </button>
                                        <button
                                            onClick={() => setPreviewMode('mobile')}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${previewMode === 'mobile'
                                                ? 'bg-white shadow-sm text-slate-900'
                                                : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            <Smartphone className="w-4 h-4" />
                                            Mobile
                                        </button>
                                    </div>
                                </div>
                                <CardDescription>
                                    Subject: {formData.subject ? formData.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => sampleData[`{{${key}}}`] || `{{${key}}}`) : 'No subject'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`mx-auto bg-slate-100 rounded-lg overflow-hidden transition-all duration-300 ${previewMode === 'desktop' ? 'w-full' : 'w-[375px]'
                                        }`}
                                >
                                    {/* Browser/Phone Frame */}
                                    <div className={`${previewMode === 'mobile' ? 'pt-6 pb-4 px-2' : 'p-2'}`}>
                                        {previewMode === 'mobile' && (
                                            <div className="w-20 h-1 bg-slate-300 rounded-full mx-auto mb-3" />
                                        )}
                                        <div className="bg-white rounded-lg overflow-hidden shadow-lg">
                                            {/* Email Header Bar */}
                                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                                <div className="w-3 h-3 rounded-full bg-amber-400" />
                                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                                <span className="text-xs text-slate-500 ml-2">inbox</span>
                                            </div>
                                            {/* Email Content */}
                                            <div
                                                className={`overflow-y-auto ${previewMode === 'mobile' ? 'max-h-[500px]' : 'max-h-[600px]'}`}
                                            >
                                                <iframe
                                                    srcDoc={getPreviewHtml()}
                                                    className="w-full border-0"
                                                    style={{
                                                        height: previewMode === 'mobile' ? '500px' : '600px',
                                                        transform: previewMode === 'mobile' ? 'scale(0.9)' : 'none',
                                                        transformOrigin: 'top center'
                                                    }}
                                                    title="Email Preview"
                                                />
                                            </div>
                                        </div>
                                        {previewMode === 'mobile' && (
                                            <div className="w-10 h-10 bg-slate-200 rounded-full mx-auto mt-3" />
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
