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
    Copy,
    FileText,
    Star,
    X
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

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

export default function EmailTemplatesPage() {
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

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

    const openCreateDialog = () => {
        setEditingTemplate(null);
        setFormData({
            name: '',
            subject: '',
            body: getDefaultBody(),
            type: 'registration',
            isDefault: false
        });
        setDialogOpen(true);
    };

    const openEditDialog = (template: EmailTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            subject: template.subject,
            body: template.body,
            type: template.type,
            isDefault: template.isDefault
        });
        setDialogOpen(true);
    };

    const getDefaultBody = () => `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .ticket-code { background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .code { font-size: 28px; font-weight: bold; color: #4F46E5; letter-spacing: 4px; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
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
            
            <p>Please save this email or take a screenshot of your ticket code. You'll need to show it at the event for check-in.</p>
        </div>
        <div class="footer">
            <p>Sent via GrabMyPass</p>
        </div>
    </div>
</body>
</html>`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        const token = localStorage.getItem('auth_token');
        const url = editingTemplate
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates/${editingTemplate._id}`
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates`;

        try {
            const res = await fetch(url, {
                method: editingTemplate ? 'PATCH' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: editingTemplate ? 'Template updated!' : 'Template created!' });
                setDialogOpen(false);
                fetchTemplates();
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
                fetchTemplates();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete template' });
        }
    };

    const insertPlaceholder = (placeholder: string) => {
        const textarea = document.getElementById('body') as HTMLTextAreaElement;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newBody = formData.body.substring(0, start) + placeholder + formData.body.substring(end);
        setFormData({ ...formData, body: newBody });
    };

    const typeColors: Record<string, string> = {
        registration: 'bg-green-100 text-green-700',
        reminder: 'bg-blue-100 text-blue-700',
        update: 'bg-amber-100 text-amber-700',
        cancellation: 'bg-red-100 text-red-700',
        custom: 'bg-purple-100 text-purple-700'
    };

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
                <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> New Template
                </Button>
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    <CheckCircle2 className="w-5 h-5" />
                    {message.text}
                </div>
            )}

            {/* Templates Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
            ) : templates.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">No templates yet</h3>
                        <p className="text-slate-500 text-sm mb-4">
                            Create your first email template to send personalized confirmation emails
                        </p>
                        <Button onClick={openCreateDialog}>
                            <Plus className="w-4 h-4 mr-2" /> Create Template
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <Card key={template._id} className="hover:shadow-md transition-shadow">
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
                                        onClick={() => openEditDialog(template)}
                                        className="flex-1"
                                    >
                                        <Edit className="w-4 h-4 mr-1" /> Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteTemplate(template._id)}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? 'Edit Template' : 'Create Email Template'}
                        </DialogTitle>
                        <DialogDescription>
                            Design your email template with placeholders that will be replaced with actual data
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Template Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Event Registration"
                                    required
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
                                required
                            />
                        </div>

                        {/* Placeholders */}
                        <div className="space-y-2">
                            <Label>Available Placeholders</Label>
                            <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
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
                                className="w-full h-64 px-3 py-2 rounded-md border border-slate-200 text-sm font-mono"
                                placeholder="<html>...</html>"
                                required
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

                        <div className="flex gap-3 justify-end pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    <>{editingTemplate ? 'Update' : 'Create'} Template</>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
