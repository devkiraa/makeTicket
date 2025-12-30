'use client';

import React, { useState, useEffect } from 'react';
import {
    Mail,
    Plus,
    Edit2,
    Trash2,
    Eye,
    EyeOff,
    Search,
    Filter,
    Loader2,
    FileText,
    CheckCircle,
    XCircle,
    RefreshCcw,
    Database,
    Copy,
    ChevronDown,
    Star
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface EmailTemplate {
    _id: string;
    name: string;
    description?: string;
    subject: string;
    body: string;
    type: string;
    category: string;
    isSystem: boolean;
    isDefault: boolean;
    isActive: boolean;
    previewImage?: string;
    usageCount: number;
    createdAt: string;
    updatedAt: string;
}

const TEMPLATE_TYPES = [
    { value: 'registration', label: 'Registration' },
    { value: 'reminder', label: 'Reminder' },
    { value: 'update', label: 'Update' },
    { value: 'cancellation', label: 'Cancellation' },
    { value: 'thank_you', label: 'Thank You' },
    { value: 'invitation', label: 'Invitation' },
    { value: 'custom', label: 'Custom' }
];

const TEMPLATE_CATEGORIES = [
    { value: 'event', label: 'Event' },
    { value: 'ticket', label: 'Ticket' },
    { value: 'notification', label: 'Notification' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'system', label: 'System' }
];

export default function AdminEmailTemplatesPage() {
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterActive, setFilterActive] = useState<string>('');
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        subject: '',
        body: '',
        type: 'custom',
        category: 'event',
        isDefault: false,
        isActive: true
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, [filterType, filterCategory, filterActive]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');
            
            const params = new URLSearchParams();
            if (filterType) params.append('type', filterType);
            if (filterCategory) params.append('category', filterCategory);
            if (filterActive) params.append('active', filterActive);
            
            const res = await fetch(`${API_URL}/admin/email-templates?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            } else {
                setError('Failed to load templates');
            }
        } catch (err) {
            setError('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSeedTemplates = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');
            
            const res = await fetch(`${API_URL}/admin/email-templates/seed`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setSuccess(`Seeded ${data.created} templates, skipped ${data.skipped} existing`);
                loadTemplates();
            } else {
                setError(data.message || 'Failed to seed templates');
            }
        } catch (err) {
            setError('Failed to seed templates');
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');
            
            const res = await fetch(`${API_URL}/admin/email-templates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setSuccess('Template created successfully');
                setShowCreateModal(false);
                resetForm();
                loadTemplates();
            } else {
                setError(data.message || 'Failed to create template');
            }
        } catch (err) {
            setError('Failed to create template');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedTemplate) return;
        
        try {
            setSaving(true);
            const token = localStorage.getItem('auth_token');
            
            const res = await fetch(`${API_URL}/admin/email-templates/${selectedTemplate._id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setSuccess('Template updated successfully');
                setShowEditModal(false);
                setSelectedTemplate(null);
                resetForm();
                loadTemplates();
            } else {
                setError(data.message || 'Failed to update template');
            }
        } catch (err) {
            setError('Failed to update template');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (template: EmailTemplate) => {
        try {
            const token = localStorage.getItem('auth_token');
            
            const res = await fetch(`${API_URL}/admin/email-templates/${template._id}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setSuccess(`Template ${template.isActive ? 'deactivated' : 'activated'}`);
                loadTemplates();
            } else {
                setError('Failed to toggle template status');
            }
        } catch (err) {
            setError('Failed to toggle template status');
        }
    };

    const handleDelete = async (template: EmailTemplate) => {
        if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;
        
        try {
            const token = localStorage.getItem('auth_token');
            
            const res = await fetch(`${API_URL}/admin/email-templates/${template._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setSuccess('Template deleted successfully');
                loadTemplates();
            } else {
                setError('Failed to delete template');
            }
        } catch (err) {
            setError('Failed to delete template');
        }
    };

    const openEditModal = (template: EmailTemplate) => {
        setSelectedTemplate(template);
        setFormData({
            name: template.name,
            description: template.description || '',
            subject: template.subject,
            body: template.body,
            type: template.type,
            category: template.category,
            isDefault: template.isDefault,
            isActive: template.isActive
        });
        setShowEditModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            subject: '',
            body: '',
            type: 'custom',
            category: 'event',
            isDefault: false,
            isActive: true
        });
    };

    const filteredTemplates = templates.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            registration: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            reminder: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            cancellation: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            thank_you: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
            invitation: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
            custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
        };
        return colors[type] || colors.custom;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Templates</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Manage system email templates available to all users
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSeedTemplates}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                        <Database className="w-4 h-4" />
                        Seed Defaults
                    </button>
                    <button
                        onClick={() => {
                            resetForm();
                            setShowCreateModal(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Template
                    </button>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2">
                    <XCircle className="w-5 h-5" />
                    {error}
                    <button onClick={() => setError(null)} className="ml-auto">×</button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    {success}
                    <button onClick={() => setSuccess(null)} className="ml-auto">×</button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">All Types</option>
                        {TEMPLATE_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">All Categories</option>
                        {TEMPLATE_CATEGORIES.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterActive}
                        onChange={(e) => setFilterActive(e.target.value)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">All Status</option>
                        <option value="true">Active Only</option>
                        <option value="false">Inactive Only</option>
                    </select>
                    <button
                        onClick={loadTemplates}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Templates Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : filteredTemplates.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Mail className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Templates Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {templates.length === 0 
                            ? 'Get started by seeding default templates or creating a new one.'
                            : 'No templates match your search criteria.'}
                    </p>
                    {templates.length === 0 && (
                        <button
                            onClick={handleSeedTemplates}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Seed Default Templates
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTemplates.map(template => (
                        <div
                            key={template._id}
                            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${
                                template.isActive 
                                    ? 'border-gray-200 dark:border-gray-700' 
                                    : 'border-red-200 dark:border-red-900/50 opacity-75'
                            } overflow-hidden`}
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                            {template.name}
                                        </h3>
                                        {template.isDefault && (
                                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                        )}
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                                        template.isActive 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {template.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                
                                {template.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                                        {template.description}
                                    </p>
                                )}
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(template.type)}`}>
                                        {TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                                    </span>
                                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                        {TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                                    </span>
                                </div>
                                
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-3">
                                    <span className="font-medium">Subject:</span> {template.subject}
                                </p>
                                
                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                    Used {template.usageCount} times
                                </div>
                            </div>
                            
                            <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex justify-between">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedTemplate(template);
                                            setShowPreviewModal(true);
                                        }}
                                        className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                        title="Preview"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => openEditModal(template)}
                                        className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(template)}
                                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleToggleStatus(template)}
                                    className={`px-3 py-1 text-sm rounded ${
                                        template.isActive
                                            ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                                            : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                    } transition-colors`}
                                >
                                    {template.isActive ? 'Deactivate' : 'Activate'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {showCreateModal ? 'Create Template' : 'Edit Template'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                    setSelectedTemplate(null);
                                    resetForm();
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-130px)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Template Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="e.g., Event Registration"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Brief description"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Type
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {TEMPLATE_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        {TEMPLATE_CATEGORIES.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email Subject *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="e.g., Registration Confirmed - {{event_title}}"
                                    />
                                </div>
                                
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email Body (HTML) *
                                    </label>
                                    <textarea
                                        value={formData.body}
                                        onChange={(e) => setFormData({...formData, body: e.target.value})}
                                        rows={12}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                                        placeholder="<html>...</html>"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Available placeholders: {'{{guest_name}}, {{event_title}}, {{event_date}}, {{event_location}}, {{ticket_code}}, {{qr_code}}, {{event_link}}, {{organizer_name}}'}
                                    </p>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isDefault}
                                            onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Default for type</span>
                                    </label>
                                    
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Active (visible to users)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setShowEditModal(false);
                                    setSelectedTemplate(null);
                                    resetForm();
                                }}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={showCreateModal ? handleCreate : handleUpdate}
                                disabled={saving || !formData.name || !formData.subject || !formData.body}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {showCreateModal ? 'Create Template' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && selectedTemplate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    Preview: {selectedTemplate.name}
                                </h2>
                                <p className="text-sm text-gray-500">Subject: {selectedTemplate.subject}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    setSelectedTemplate(null);
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                                <iframe
                                    srcDoc={selectedTemplate.body}
                                    className="w-full h-[500px] bg-white rounded border-0"
                                    title="Email Preview"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
