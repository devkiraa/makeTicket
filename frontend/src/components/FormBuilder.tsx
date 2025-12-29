'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Plus,
    Trash2,
    GripVertical,
    Copy,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Settings2,
    SeparatorHorizontal,
    Type,
    AlignLeft,
    List,
    CheckSquare,
    Circle,
    Calendar,
    Hash,
    Phone,
    Mail,
    Clock,
    Link as LinkIcon,
    Link2,
    ToggleLeft,
    FileSpreadsheet,
    RefreshCw,
    Download,
    Unlink,
    Bold,
    Italic,
    Image,
    Settings,
    Upload
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface FormItem {
    id: string;
    itemType: 'question' | 'section';
    // Question properties
    type?: string;
    label: string;
    description?: string;
    required?: boolean;
    placeholder?: string;
    options?: string[];
    // Section properties (for section type)
    sectionDescription?: string;
    // Validation properties
    validation?: {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        patternError?: string;
        min?: number;
        max?: number;
    };
    // Rich content
    hasImage?: boolean;
    imageUrl?: string;
    // File upload settings
    fileSettings?: {
        acceptedTypes?: string[]; // e.g., ['image/*', 'application/pdf']
        maxSizeMB?: number;
    };
}

interface GoogleForm {
    id: string;
    name: string;
    createdTime: string;
    modifiedTime: string;
    webViewLink: string;
}

interface FormBuilderProps {
    questions: FormItem[];
    onChange: (questions: FormItem[]) => void;
    draftId?: string | null;
    headerImage?: string;
    onHeaderImageChange?: (image: string | null) => void;
}

// All field types like Google Forms
const FIELD_TYPES = [
    { value: 'text', label: 'Short answer', icon: Type },
    { value: 'textarea', label: 'Paragraph', icon: AlignLeft },
    { value: 'select', label: 'Dropdown', icon: ChevronDown },
    { value: 'radio', label: 'Multiple choice', icon: Circle },
    { value: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'tel', label: 'Phone number', icon: Phone },
    { value: 'number', label: 'Number', icon: Hash },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'time', label: 'Time', icon: Clock },
    { value: 'url', label: 'URL/Link', icon: LinkIcon },
    { value: 'file', label: 'File upload', icon: Upload },
];

export function FormBuilder({ questions, onChange, draftId, headerImage, onHeaderImageChange }: FormBuilderProps) {
    const [activeItem, setActiveItem] = useState<string | null>(null);

    // Google Forms state
    const [googleFormsConnected, setGoogleFormsConnected] = useState(false);
    const [hasDriveAccess, setHasDriveAccess] = useState(false);
    const [googleForms, setGoogleForms] = useState<GoogleForm[]>([]);
    const [selectedGoogleForm, setSelectedGoogleForm] = useState<string>('');
    const [loadingForms, setLoadingForms] = useState(false);
    const [importing, setImporting] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    
    // Header image upload
    const headerImageInputRef = useRef<HTMLInputElement>(null);

    // URL-based import
    const [importMode, setImportMode] = useState<'url' | 'browse'>('url');
    const [formUrl, setFormUrl] = useState('');
    const [urlError, setUrlError] = useState('');

    // Check Google Forms access on mount
    useEffect(() => {
        checkGoogleFormsAccess();

        // Check URL params for connection success
        const params = new URLSearchParams(window.location.search);
        if (params.get('googleFormsConnected') === 'true') {
            checkGoogleFormsAccess();
            // Clean up URL but preserve other params (like draftId)
            const newParams = new URLSearchParams(window.location.search);
            newParams.delete('googleFormsConnected');
            const queryString = newParams.toString();
            const newUrl = window.location.pathname + (queryString ? '?' + queryString : '');
            window.history.replaceState({}, document.title, newUrl);
        }
    }, []);

    const checkGoogleFormsAccess = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/access`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setGoogleFormsConnected(data.hasAccess || data.formsScope);
                setHasDriveAccess(data.hasDriveAccess || false);
                // Only fetch forms list if we have drive access
                if (data.hasDriveAccess) {
                    fetchGoogleForms();
                }
            }
        } catch (error) {
            console.error('Failed to check Google Forms access', error);
        } finally {
            setCheckingAccess(false);
        }
    };

    const connectGoogleForms = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/connect`;
            if (draftId) {
                url += `?draftId=${draftId}`;
            }

            const res = await fetch(
                url,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Failed to get connect URL', error);
        }
    };

    const disconnectGoogleForms = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/disconnect`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setGoogleFormsConnected(false);
            setGoogleForms([]);
            setSelectedGoogleForm('');
        } catch (error) {
            console.error('Failed to disconnect', error);
        }
    };

    const fetchGoogleForms = async () => {
        const token = localStorage.getItem('auth_token');
        setLoadingForms(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/list`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setGoogleForms(data.forms || []);
            }
        } catch (error) {
            console.error('Failed to fetch Google Forms', error);
        } finally {
            setLoadingForms(false);
        }
    };

    const importGoogleForm = async () => {
        if (!selectedGoogleForm) return;

        const token = localStorage.getItem('auth_token');
        setImporting(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/form/${selectedGoogleForm}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                const importedQuestions = data.questions;

                // Set header image separately if present
                if (data.bannerImage && onHeaderImageChange) {
                    onHeaderImageChange(data.bannerImage);
                }

                onChange(importedQuestions);
                setSelectedGoogleForm('');
            }
        } catch (error) {
            console.error('Failed to import Google Form', error);
        } finally {
            setImporting(false);
        }
    };

    // Extract form ID from Google Form URL
    const extractFormId = (url: string): string | null => {
        // Matches: https://docs.google.com/forms/d/FORM_ID/...
        const match = url.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    };

    // Import from pasted URL
    const importFromUrl = async () => {
        setUrlError('');
        const formId = extractFormId(formUrl);

        if (!formId) {
            setUrlError('Invalid Google Form URL. Please paste a valid URL like: https://docs.google.com/forms/d/...');
            return;
        }

        const token = localStorage.getItem('auth_token');
        setImporting(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/google-forms/form/${formId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                const importedQuestions = data.questions;

                // Set header image separately if present
                if (data.bannerImage && onHeaderImageChange) {
                    onHeaderImageChange(data.bannerImage);
                }

                onChange(importedQuestions);
                setFormUrl('');
            } else {
                const error = await res.json();
                setUrlError(error.message || 'Failed to import form');
            }
        } catch (error) {
            console.error('Failed to import from URL', error);
            setUrlError('Failed to import form. Please check the URL and try again.');
        } finally {
            setImporting(false);
        }
    };

    // Handle header image upload
    const handleHeaderImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onHeaderImageChange) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.onload = () => {
                // Resize if needed
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height = Math.round(height * (MAX_WIDTH / width));
                    width = MAX_WIDTH;
                }
                if (height > MAX_HEIGHT) {
                    width = Math.round(width * (MAX_HEIGHT / height));
                    height = MAX_HEIGHT;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                const resizedImage = canvas.toDataURL('image/jpeg', 0.8);
                onHeaderImageChange(resizedImage);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Add a new question
    const addQuestion = (type: string = 'text', afterId?: string) => {
        const newQ: FormItem = {
            id: `q-${Date.now()}`,
            itemType: 'question',
            type,
            label: 'Question',
            required: false,
            placeholder: '',
            options: ['radio', 'checkbox', 'select'].includes(type) ? ['Option 1'] : undefined
        };

        if (afterId) {
            const index = questions.findIndex(q => q.id === afterId);
            const newQuestions = [...questions];
            newQuestions.splice(index + 1, 0, newQ);
            onChange(newQuestions);
        } else {
            onChange([...questions, newQ]);
        }
        setActiveItem(newQ.id);
    };

    // Add a new section
    const addSection = (afterId?: string) => {
        const newSection: FormItem = {
            id: `section-${Date.now()}`,
            itemType: 'section',
            label: 'Section Title',
            sectionDescription: 'Section description (optional)'
        };

        if (afterId) {
            const index = questions.findIndex(q => q.id === afterId);
            const newQuestions = [...questions];
            newQuestions.splice(index + 1, 0, newSection);
            onChange(newQuestions);
        } else {
            onChange([...questions, newSection]);
        }
        setActiveItem(newSection.id);
    };

    const updateItem = (id: string, field: keyof FormItem, value: any) => {
        onChange(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const duplicateItem = (id: string) => {
        const index = questions.findIndex(q => q.id === id);
        const item = questions[index];
        const newItem = { ...item, id: `${item.itemType}-${Date.now()}` };
        const newQuestions = [...questions];
        newQuestions.splice(index + 1, 0, newItem);
        onChange(newQuestions);
    };

    const removeItem = (id: string) => {
        onChange(questions.filter(q => q.id !== id));
    };

    const addOption = (qId: string) => {
        onChange(questions.map(q => {
            if (q.id === qId) {
                return { ...q, options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] };
            }
            return q;
        }));
    };

    const updateOption = (qId: string, index: number, value: string) => {
        onChange(questions.map(q => {
            if (q.id === qId) {
                const newOptions = [...(q.options || [])];
                newOptions[index] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const removeOption = (qId: string, index: number) => {
        onChange(questions.map(q => {
            if (q.id === qId) {
                return { ...q, options: q.options?.filter((_, i) => i !== index) };
            }
            return q;
        }));
    };

    const moveItem = (id: string, direction: 'up' | 'down') => {
        const index = questions.findIndex(q => q.id === id);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) {
            return;
        }
        const newQuestions = [...questions];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
        onChange(newQuestions);
    };

    const getFieldIcon = (type: string) => {
        const field = FIELD_TYPES.find(f => f.value === type);
        return field?.icon || Type;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Registration Form</h2>
                        <p className="text-sm text-slate-500">
                            {questions.filter(q => q.itemType === 'question').length} questions, {' '}
                            {questions.filter(q => q.itemType === 'section').length} sections
                        </p>
                    </div>
                </div>

                {/* Form Header Image Section */}
                {onHeaderImageChange && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                <Image className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900">Form Header Image</h3>
                                <p className="text-xs text-slate-500">Add a banner image at the top of your registration form</p>
                            </div>
                        </div>

                        {headerImage ? (
                            <div className="space-y-3">
                                <div className="relative rounded-lg overflow-hidden border border-purple-200">
                                    <img 
                                        src={headerImage} 
                                        alt="Form header" 
                                        className="w-full h-32 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => headerImageInputRef.current?.click()}
                                            className="mr-2"
                                        >
                                            Change
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => onHeaderImageChange(null)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={() => headerImageInputRef.current?.click()}
                                className="w-full h-24 border-dashed border-2 border-purple-200 bg-white/50 hover:bg-white hover:border-purple-400 transition-all"
                            >
                                <div className="flex flex-col items-center gap-2 text-purple-600">
                                    <Upload className="w-6 h-6" />
                                    <span className="text-sm font-medium">Upload Header Image</span>
                                    <span className="text-xs text-slate-400">Recommended: 1200 x 400px</span>
                                </div>
                            </Button>
                        )}
                        <input
                            ref={headerImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleHeaderImageUpload}
                            className="hidden"
                        />
                    </div>
                )}

                {/* Google Forms Import Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900">Import from Google Forms</h3>
                            <p className="text-xs text-slate-500">Paste a form URL or browse your Google Drive</p>
                        </div>
                    </div>

                    {checkingAccess ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Checking connection...
                        </div>
                    ) : !googleFormsConnected ? (
                        <Button
                            onClick={connectGoogleForms}
                            className="bg-blue-600 hover:bg-blue-700 text-white border-transparent shadow-sm transition-all"
                        >
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Connect Google Account
                        </Button>
                    ) : (
                        <div className="space-y-3">
                            {/* Tab Buttons */}
                            <div className="flex gap-1 p-1 bg-white/60 rounded-lg">
                                <button
                                    onClick={() => setImportMode('url')}
                                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${importMode === 'url'
                                        ? 'bg-white text-blue-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <LinkIcon className="w-3.5 h-3.5 inline mr-1.5" />
                                    Paste URL
                                </button>
                                <button
                                    onClick={() => {
                                        setImportMode('browse');
                                        if (hasDriveAccess && googleForms.length === 0) {
                                            fetchGoogleForms();
                                        }
                                    }}
                                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${importMode === 'browse'
                                        ? 'bg-white text-blue-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1.5" />
                                    Browse Drive
                                </button>
                            </div>

                            {/* URL Import Tab */}
                            {importMode === 'url' && (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            value={formUrl}
                                            onChange={(e) => {
                                                setFormUrl(e.target.value);
                                                setUrlError('');
                                            }}
                                            placeholder="https://docs.google.com/forms/d/..."
                                            className="flex-1 bg-white"
                                        />
                                        <Button
                                            onClick={importFromUrl}
                                            disabled={!formUrl || importing}
                                            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                                        >
                                            {importing ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4 mr-1" />
                                                    Import
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    {urlError && (
                                        <p className="text-xs text-red-600">{urlError}</p>
                                    )}
                                    <p className="text-xs text-slate-500">
                                        Paste the URL of any Google Form you have access to
                                    </p>
                                </div>
                            )}

                            {/* Browse Drive Tab */}
                            {importMode === 'browse' && (
                                <div className="space-y-2">
                                    {!hasDriveAccess ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-sm text-amber-800 mb-2">
                                                Drive access needed to browse your forms
                                            </p>
                                            <Button
                                                onClick={connectGoogleForms}
                                                variant="outline"
                                                size="sm"
                                                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
                                            >
                                                Enable Drive Access
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={selectedGoogleForm}
                                                    onValueChange={setSelectedGoogleForm}
                                                    disabled={loadingForms}
                                                >
                                                    <SelectTrigger className="flex-1 bg-white">
                                                        <SelectValue placeholder={loadingForms ? "Loading forms..." : "Select a Google Form"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {googleForms.map((form) => (
                                                            <SelectItem key={form.id} value={form.id}>
                                                                {form.name}
                                                            </SelectItem>
                                                        ))}
                                                        {googleForms.length === 0 && !loadingForms && (
                                                            <SelectItem value="none" disabled>No forms found</SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={fetchGoogleForms}
                                                    disabled={loadingForms}
                                                    className="shrink-0 bg-white"
                                                >
                                                    <RefreshCw className={`w-4 h-4 ${loadingForms ? 'animate-spin' : ''}`} />
                                                </Button>
                                            </div>
                                            <Button
                                                onClick={importGoogleForm}
                                                disabled={!selectedGoogleForm || importing}
                                                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                                            >
                                                {importing ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                        Importing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Download className="w-4 h-4 mr-2" />
                                                        Import Selected Form
                                                    </>
                                                )}
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Disconnect Button */}
                            <div className="pt-2 border-t border-blue-100">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={disconnectGoogleForms}
                                    className="text-slate-500 hover:text-red-600 h-7 text-xs"
                                >
                                    <Unlink className="w-3 h-3 mr-1" />
                                    Disconnect Google Account
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Items */}
            <div className="space-y-3">
                {questions.map((item, index) => {
                    const isActive = activeItem === item.id;

                    // SECTION CARD
                    if (item.itemType === 'section') {
                        return (
                            <Card
                                key={item.id}
                                className={`border-l-4 border-l-indigo-500 ${isActive ? 'ring-2 ring-indigo-500' : 'border-slate-200'} shadow-sm cursor-pointer transition-all`}
                                onClick={() => setActiveItem(item.id)}
                            >
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 text-slate-400 cursor-move hover:text-slate-600">
                                            <GripVertical className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold uppercase tracking-wider">
                                                <SeparatorHorizontal className="w-4 h-4" />
                                                Section
                                            </div>
                                            <Input
                                                value={item.label}
                                                onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                                                className="text-xl font-bold border-transparent hover:border-slate-200 focus:border-indigo-500 px-0 h-auto"
                                                placeholder="Section Title"
                                            />
                                            <Input
                                                value={item.sectionDescription || ''}
                                                onChange={(e) => updateItem(item.id, 'sectionDescription', e.target.value)}
                                                className="text-sm text-slate-500 border-transparent hover:border-slate-200 focus:border-indigo-500 px-0 h-auto"
                                                placeholder="Description (optional)"
                                            />

                                            {/* Section Image */}
                                            {item.hasImage && item.imageUrl && (
                                                <div className="relative inline-block mt-2">
                                                    <img src={item.imageUrl} alt="Section" className="max-h-48 rounded-lg border border-slate-200" />
                                                    {isActive && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                updateItem(item.id, 'imageUrl', '');
                                                                updateItem(item.id, 'hasImage', false);
                                                            }}
                                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {isActive && (
                                                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                                    {!item.hasImage && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                const imageUrl = prompt('Enter image URL:');
                                                                if (imageUrl) {
                                                                    updateItem(item.id, 'imageUrl', imageUrl);
                                                                    updateItem(item.id, 'hasImage', true);
                                                                }
                                                            }}
                                                            className="text-slate-500"
                                                        >
                                                            <Image className="w-4 h-4 mr-1" /> Add Image
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" onClick={() => duplicateItem(item.id)} className="text-slate-500">
                                                        <Copy className="w-4 h-4 mr-1" /> Duplicate
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    }

                    // QUESTION CARD
                    const FieldIcon = getFieldIcon(item.type || 'text');
                    return (
                        <Card
                            key={item.id}
                            className={`${isActive ? 'ring-2 ring-indigo-500 border-indigo-200' : 'border-slate-200'} shadow-sm cursor-pointer transition-all hover:border-slate-300`}
                            onClick={() => setActiveItem(item.id)}
                        >
                            <CardContent className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="mt-2 text-slate-400 cursor-move hover:text-slate-600">
                                        <GripVertical className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        {/* Question Label & Type */}
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <Input
                                                    value={item.label}
                                                    onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                                                    className="font-medium text-lg border-transparent hover:border-slate-200 focus:border-indigo-500 px-0 h-auto py-1"
                                                    placeholder="Question"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <FieldIcon className="w-4 h-4 text-slate-400" />
                                                <select
                                                    value={item.type}
                                                    onChange={(e) => {
                                                        const newType = e.target.value;
                                                        const updates: Partial<FormItem> = { type: newType };
                                                        if (['radio', 'checkbox', 'select'].includes(newType) && !item.options?.length) {
                                                            updates.options = ['Option 1'];
                                                        }
                                                        onChange(questions.map(q => q.id === item.id ? { ...q, ...updates } : q));
                                                    }}
                                                    className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    {FIELD_TYPES.map(ft => (
                                                        <option key={ft.value} value={ft.value}>{ft.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Description with rich text toolbar */}
                                        {isActive && (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-lg border border-slate-200">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const desc = item.description || '';
                                                            updateItem(item.id, 'description', desc + '**bold text**');
                                                        }}
                                                        className="p-1.5 hover:bg-white rounded transition-colors"
                                                        title="Bold"
                                                    >
                                                        <Bold className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const desc = item.description || '';
                                                            updateItem(item.id, 'description', desc + '*italic text*');
                                                        }}
                                                        className="p-1.5 hover:bg-white rounded transition-colors"
                                                        title="Italic"
                                                    >
                                                        <Italic className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                    <div className="w-px h-4 bg-slate-300 mx-1" />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const url = prompt('Enter URL:');
                                                            if (url) {
                                                                const desc = item.description || '';
                                                                updateItem(item.id, 'description', desc + `[link text](${url})`);
                                                            }
                                                        }}
                                                        className="p-1.5 hover:bg-white rounded transition-colors"
                                                        title="Insert Link"
                                                    >
                                                        <Link2 className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const imageUrl = prompt('Enter image URL:');
                                                            if (imageUrl) {
                                                                updateItem(item.id, 'imageUrl', imageUrl);
                                                                updateItem(item.id, 'hasImage', true);
                                                            }
                                                        }}
                                                        className="p-1.5 hover:bg-white rounded transition-colors"
                                                        title="Add Image"
                                                    >
                                                        <Image className="w-4 h-4 text-slate-600" />
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={item.description || ''}
                                                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                    className="w-full text-sm text-slate-500 border border-slate-200 rounded-lg p-2 min-h-[60px] focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
                                                    placeholder="Description (optional) - supports **bold**, *italic*, and [links](url)"
                                                />
                                                {item.hasImage && item.imageUrl && (
                                                    <div className="relative inline-block">
                                                        <img src={item.imageUrl} alt="Question" className="max-h-32 rounded-lg border border-slate-200" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                updateItem(item.id, 'imageUrl', '');
                                                                updateItem(item.id, 'hasImage', false);
                                                            }}
                                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Validation Settings for text/number fields */}
                                        {isActive && ['text', 'textarea', 'email', 'number', 'tel', 'url'].includes(item.type || '') && (
                                            <details className="group bg-slate-50 rounded-lg border border-slate-200">
                                                <summary className="flex items-center gap-2 p-3 cursor-pointer text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
                                                    <Settings className="w-4 h-4 text-slate-500" />
                                                    <span>Validation Settings</span>
                                                    <ChevronRight className="w-4 h-4 ml-auto text-slate-400 group-open:rotate-90 transition-transform" />
                                                </summary>
                                                <div className="p-3 pt-0 space-y-3 border-t border-slate-200 mt-2">
                                                    {['text', 'textarea', 'email', 'tel', 'url'].includes(item.type || '') && (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <Label className="text-xs text-slate-500">Min Length</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        value={item.validation?.minLength || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                                                                            updateItem(item.id, 'validation', { ...item.validation, minLength: val });
                                                                        }}
                                                                        className="h-8 text-sm"
                                                                        placeholder="0"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs text-slate-500">Max Length</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        value={item.validation?.maxLength || ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value ? parseInt(e.target.value) : undefined;
                                                                            updateItem(item.id, 'validation', { ...item.validation, maxLength: val });
                                                                        }}
                                                                        className="h-8 text-sm"
                                                                        placeholder="No limit"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-slate-500">Pattern (Regex)</Label>
                                                                <Input
                                                                    value={item.validation?.pattern || ''}
                                                                    onChange={(e) => {
                                                                        updateItem(item.id, 'validation', { ...item.validation, pattern: e.target.value });
                                                                    }}
                                                                    className="h-8 text-sm font-mono"
                                                                    placeholder="e.g. ^[A-Z]{2}[0-9]{4}$"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-slate-500">Pattern Error Message</Label>
                                                                <Input
                                                                    value={item.validation?.patternError || ''}
                                                                    onChange={(e) => {
                                                                        updateItem(item.id, 'validation', { ...item.validation, patternError: e.target.value });
                                                                    }}
                                                                    className="h-8 text-sm"
                                                                    placeholder="Invalid format"
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                    {item.type === 'number' && (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <Label className="text-xs text-slate-500">Minimum Value</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={item.validation?.min ?? ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                                        updateItem(item.id, 'validation', { ...item.validation, min: val });
                                                                    }}
                                                                    className="h-8 text-sm"
                                                                    placeholder="No min"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-slate-500">Maximum Value</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={item.validation?.max ?? ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                                        updateItem(item.id, 'validation', { ...item.validation, max: val });
                                                                    }}
                                                                    className="h-8 text-sm"
                                                                    placeholder="No max"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        )}

                                        {/* Placeholder for text-based fields */}
                                        {isActive && ['text', 'textarea', 'email', 'tel', 'number', 'url'].includes(item.type || '') && (
                                            <div className="bg-slate-50 rounded-lg p-3">
                                                <Input
                                                    value={item.placeholder || ''}
                                                    onChange={(e) => updateItem(item.id, 'placeholder', e.target.value)}
                                                    className="text-sm bg-white"
                                                    placeholder="Placeholder text (shown to respondents)"
                                                />
                                            </div>
                                        )}

                                        {/* Preview for non-active text fields */}
                                        {!isActive && ['text', 'email', 'tel', 'number', 'url', 'date', 'time'].includes(item.type || '') && (
                                            <div className="h-10 border-b border-dashed border-slate-300 flex items-end pb-1 text-sm text-slate-400">
                                                {item.placeholder || 'Short answer text'}
                                            </div>
                                        )}

                                        {/* Preview for textarea */}
                                        {!isActive && item.type === 'textarea' && (
                                            <div className="h-16 border-b border-dashed border-slate-300 flex items-end pb-1 text-sm text-slate-400">
                                                {item.placeholder || 'Long answer text'}
                                            </div>
                                        )}

                                        {/* File Upload Settings */}
                                        {isActive && item.type === 'file' && (
                                            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-3 mt-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-xs text-slate-500 mb-1.5 block">Max Size (MB)</Label>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max="100"
                                                            value={item.fileSettings?.maxSizeMB || 10}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 10;
                                                                updateItem(item.id, 'fileSettings', { ...item.fileSettings, maxSizeMB: val });
                                                            }}
                                                            className="h-8 text-sm bg-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-slate-500 mb-1.5 block">Accepted File Types</Label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {['image/*', 'application/pdf', 'video/*', 'audio/*'].map((type) => (
                                                            <label key={type} className="flex items-center space-x-2 text-sm text-slate-600 bg-white p-2 rounded border border-slate-200">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.fileSettings?.acceptedTypes?.includes(type) || false}
                                                                    onChange={(e) => {
                                                                        const current = item.fileSettings?.acceptedTypes || [];
                                                                        const newTypes = e.target.checked
                                                                            ? [...current, type]
                                                                            : current.filter(t => t !== type);
                                                                        updateItem(item.id, 'fileSettings', { ...item.fileSettings, acceptedTypes: newTypes });
                                                                    }}
                                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                                />
                                                                <span>{type === 'image/*' ? 'Images' : type === 'application/pdf' ? 'PDF' : type === 'video/*' ? 'Video' : 'Audio'}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Preview for File Upload */}
                                        {!isActive && item.type === 'file' && (
                                            <div className="border border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/50">
                                                <Upload className="w-6 h-6" />
                                                <span className="text-sm">File upload (Max {item.fileSettings?.maxSizeMB || 10}MB)</span>
                                                <span className="text-xs opacity-70">
                                                    {item.fileSettings?.acceptedTypes?.length
                                                        ? item.fileSettings.acceptedTypes.map(t => t === 'image/*' ? 'Images' : t === 'application/pdf' ? 'PDF' : t).join(', ')
                                                        : 'All files accepted'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Options for Radio/Checkbox/Select */}
                                        {['radio', 'checkbox', 'select'].includes(item.type || '') && (
                                            <div className="space-y-2">
                                                {item.options?.map((opt, idx) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        {item.type === 'checkbox' ? (
                                                            <div className="w-4 h-4 border-2 border-slate-300 rounded" />
                                                        ) : item.type === 'radio' ? (
                                                            <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
                                                        ) : (
                                                            <span className="text-sm text-slate-400 w-4">{idx + 1}.</span>
                                                        )}
                                                        <Input
                                                            value={opt}
                                                            onChange={(e) => updateOption(item.id, idx, e.target.value)}
                                                            className="flex-1 h-8 text-sm border-transparent hover:border-slate-200 focus:border-indigo-500 px-1"
                                                        />
                                                        {isActive && item.options && item.options.length > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => { e.stopPropagation(); removeOption(item.id, idx); }}
                                                                className="text-slate-400 hover:text-red-500 h-8 w-8 p-0"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                                {isActive && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); addOption(item.id); }}
                                                        className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-600 pl-7"
                                                    >
                                                        {item.type === 'checkbox' ? (
                                                            <div className="w-4 h-4 border-2 border-dashed border-slate-300 rounded" />
                                                        ) : item.type === 'radio' ? (
                                                            <div className="w-4 h-4 border-2 border-dashed border-slate-300 rounded-full" />
                                                        ) : null}
                                                        Add option
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {/* Footer Actions */}
                                        {isActive && (
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); duplicateItem(item.id); }} className="text-slate-500 h-8">
                                                        <Copy className="w-4 h-4 mr-1" /> Duplicate
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="text-red-500 hover:text-red-600 h-8">
                                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                                                    </Button>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-500">Required</span>
                                                        <Switch
                                                            checked={item.required || false}
                                                            onCheckedChange={(checked) => updateItem(item.id, 'required', checked)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Required indicator for non-active */}
                                        {!isActive && item.required && (
                                            <div className="text-xs text-red-500 font-medium">* Required</div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Add Buttons */}
            <div className="flex gap-3 pt-2">
                <Button
                    variant="outline"
                    onClick={() => addQuestion('text')}
                    className="flex-1 h-12 border-dashed border-2 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add Question
                </Button>
                <Button
                    variant="outline"
                    onClick={() => addSection()}
                    className="h-12 border-dashed border-2 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600"
                >
                    <SeparatorHorizontal className="w-5 h-5 mr-2" />
                    Add Section
                </Button>
            </div>

            {/* Empty State */}
            {questions.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Type className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No questions yet</p>
                    <p className="text-sm">Add questions and sections to build your form</p>
                </div>
            )}
        </div>
    );
}
