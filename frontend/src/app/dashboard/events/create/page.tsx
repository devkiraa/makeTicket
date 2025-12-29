'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChevronRight,
    ChevronLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    Save,
    Mail,
    Ticket
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Switch } from '@/components/ui/switch';
import { FormBuilder } from '@/components/FormBuilder';

function CreateEventContent() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); // Track if editing existing event


    // Step 1: Basic Details
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        location: '',
        slug: '',
        price: 0,
        maxRegistrations: 0, // 0 = unlimited
        allowMultipleRegistrations: true, // Allow same email to register multiple times
        emailTemplateId: '', // Selected email template
        sendConfirmationEmail: true, // Send confirmation emails
        ticketTemplateId: '', // Selected ticket template
        attachTicket: true // Attach ticket to email
    });

    // Step 2: Form Builder
    const [questions, setQuestions] = useState<any[]>([
        { id: 'q1', itemType: 'question', type: 'text', label: 'Full Name', required: true, placeholder: 'John Doe' },
        { id: 'q2', itemType: 'question', type: 'email', label: 'Email Address', required: true, placeholder: 'john@example.com' }
    ]);
    
    // Form Header Image
    const [formHeaderImage, setFormHeaderImage] = useState<string | null>(null);

    // Email Templates
    const [emailTemplates, setEmailTemplates] = useState<Array<{ _id: string; name: string; subject: string; type: string }>>([]);

    // Ticket Templates
    const [ticketTemplates, setTicketTemplates] = useState<Array<{ _id: string; name: string; width: number; height: number; isDefault: boolean }>>([]);

    // Validations & Async
    const [username, setUsername] = useState('');
    const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
    const [checkingSlug, setCheckingSlug] = useState(false);

    useEffect(() => {
        // Fetch User for URL preview
        const fetchUser = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Use username, or email prefix, or name as fallback
                    const usernameValue = data.username ||
                        (data.email ? data.email.split('@')[0] : null) ||
                        (data.name ? data.name.toLowerCase().replace(/\s+/g, '') : 'user');
                    setUsername(usernameValue);
                }
            } catch (e) {
                console.error(e);
            }
        };

        // Fetch Email Templates
        const fetchTemplates = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/email/templates?type=registration`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const templates = await res.json();
                    setEmailTemplates(templates);
                    // Auto-select default template if available
                    const defaultTemplate = templates.find((t: any) => t.isDefault);
                    if (defaultTemplate && !formData.emailTemplateId) {
                        setFormData(prev => ({ ...prev, emailTemplateId: defaultTemplate._id }));
                    }
                }
            } catch (e) {
                console.error('Failed to fetch templates', e);
            }
        };

        // Fetch Ticket Templates
        const fetchTicketTemplates = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ticket-templates`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const templates = await res.json();
                    setTicketTemplates(templates);
                    // Auto-select default ticket template if available
                    const defaultTemplate = templates.find((t: any) => t.isDefault);
                    if (defaultTemplate && !formData.ticketTemplateId) {
                        setFormData(prev => ({ ...prev, ticketTemplateId: defaultTemplate._id }));
                    }
                }
            } catch (e) {
                console.error('Failed to fetch ticket templates', e);
            }
        };

        fetchUser();
        fetchTemplates();
        fetchTicketTemplates();
    }, []);

    // Debounced Slug Check
    useEffect(() => {
        const checkSlug = async () => {
            if (!formData.slug) {
                setSlugAvailable(null);
                return;
            }
            setCheckingSlug(true);
            try {
                const token = localStorage.getItem('auth_token');
                // Use the new check-slug endpoint
                // Pass excludeEventId if editing a draft to not block own slug
                const draftIdFromUrl = new URLSearchParams(window.location.search).get('draftId');
                const excludeParam = draftIdFromUrl ? `&excludeEventId=${draftIdFromUrl}` : '';
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/check-slug?slug=${formData.slug}${excludeParam}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setSlugAvailable(data.available);
            } catch (e) {
                console.error(e);
            } finally {
                setCheckingSlug(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (formData.slug) checkSlug();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [formData.slug]);

    // Handle Google Forms Redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('googleFormsConnected') === 'true') {
            setStep(2);
        }
    }, []);

    // Auto-Save Server State
    const searchParams = useSearchParams();
    const draftIdParam = searchParams?.get('draftId');
    const [draftId, setDraftId] = useState<string | null>(draftIdParam);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
    const lastSavedData = useRef<string>('');
    const [mounted, setMounted] = useState(false);
    const [isDraftLoaded, setIsDraftLoaded] = useState(!draftIdParam);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch existing draft if ID present
    useEffect(() => {
        if (!draftId) {
            setIsDraftLoaded(true);
            return;
        }
        const fetchDraft = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            try {
                // We reuse getMyEvents and filter, OR fetch specific event endpoint
                // Assuming we can fetch specific event by ID or fetch all and find
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/my`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const events = await res.json();
                    const draft = events.find((e: any) => e._id === draftId);
                    if (draft) {
                        setFormData({
                            title: draft.title,
                            description: draft.description || '',
                            date: draft.date ? new Date(draft.date).toISOString().slice(0, 16) : '',
                            location: draft.location || '',
                            slug: draft.slug,
                            price: draft.price || 0,
                            maxRegistrations: draft.maxRegistrations || 0,
                            allowMultipleRegistrations: draft.allowMultipleRegistrations !== false,
                            emailTemplateId: draft.emailTemplateId || '',
                            sendConfirmationEmail: draft.sendConfirmationEmail !== false,
                            ticketTemplateId: draft.ticketTemplateId || '',
                            attachTicket: draft.attachTicket !== false
                        });
                        if (draft.formSchema) setQuestions(draft.formSchema);
                        if (draft.formHeaderImage) setFormHeaderImage(draft.formHeaderImage);
                        lastSavedData.current = JSON.stringify({ ...draft, formSchema: draft.formSchema, formHeaderImage: draft.formHeaderImage });
                        // Set edit mode if this is an active event (not a draft)
                        if (draft.status === 'active') {
                            setIsEditMode(true);
                        }
                        setIsDraftLoaded(true);
                    } else {
                        // Draft not found
                        alert('Draft not found.');
                        router.push('/dashboard/events/create');
                    }
                }
            } catch (e) {
                console.error("Failed to load draft", e);
            }
        };
        fetchDraft();
    }, [draftId]);

    const performSave = async () => {
        // Only save if we have a title (minimum requirement)
        if (!formData.title) return;
        // CRITICAL: Do not save if we are supposed to load a draft but haven't finished yet
        if (draftId && !isDraftLoaded) return;

        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setIsSavingDraft(true);
        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                slug: formData.slug,
                location: formData.location,
                price: Number(formData.price) || 0,
                date: formData.date ? formData.date : null,
                maxRegistrations: Number(formData.maxRegistrations) || 0,
                allowMultipleRegistrations: formData.allowMultipleRegistrations,
                emailTemplateId: formData.emailTemplateId || null,
                sendConfirmationEmail: formData.sendConfirmationEmail,
                ticketTemplateId: formData.ticketTemplateId || null,
                attachTicket: formData.attachTicket,
                formSchema: questions,
                formHeaderImage: formHeaderImage,
                status: 'draft'
            };

            if (draftId) {
                // Update Draft
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/update/${draftId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    console.error('Draft update failed:', res.status, await res.text());
                }
            } else {
                // Create Draft
                // We need slug to create
                if (!payload.slug) return;

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const newEvent = await res.json();
                    setDraftId(newEvent._id);
                    setIsDraftLoaded(true); // Now we are working with a loaded/known draft
                    // Update URL without reload
                    router.replace(`/dashboard/events/create?draftId=${newEvent._id}`, { scroll: false });
                } else {
                    console.error('Draft create failed:', res.status, await res.text());
                }
            }
            lastSavedData.current = JSON.stringify({ ...formData, questions });
            setLastSavedAt(new Date());
        } catch (e) {
            console.error("Auto-save failed", e);
        } finally {
            setIsSavingDraft(false);
        }
    };

    // Auto-Save Effect
    useEffect(() => {
        const currentData = JSON.stringify({ ...formData, questions });
        // Prevent saving if no changes
        if (currentData === lastSavedData.current) return;

        const timeoutId = setTimeout(performSave, 2000); // 2s debounce
        return () => clearTimeout(timeoutId);
    }, [formData, questions, draftId, isDraftLoaded]);

    // Portal for Header Actions
    const HeaderActions = () => {
        if (!mounted) return null;
        const target = document.getElementById('header-actions');
        if (!target) return null;

        return createPortal(
            <>
                <div className="flex flex-col items-end mr-2">
                    <span className="text-xs text-slate-500 font-medium">
                        {isSavingDraft ? 'Saving...' : lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not saved'}
                    </span>
                    {isEditMode ? (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">
                            Editing
                        </span>
                    ) : draftId && (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                            Draft
                        </span>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={performSave}
                    disabled={isSavingDraft || !formData.title}
                    className="h-8 border-slate-200"
                >
                    <Save className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    {isEditMode ? 'Save' : 'Save Draft'}
                </Button>
            </>,
            target
        );
    };





    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-generate slug from title if slug is empty OR (currently empty)
        // Only if user hasn't manually edited slug logic? 
        // For simplicity, just auto-gen if slug is empty when title changes
        if (name === 'title' && !formData.slug) {
            setFormData(prev => ({
                ...prev,
                slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
            }));
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');

        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                slug: formData.slug,
                location: formData.location,
                price: Number(formData.price) || 0,
                date: formData.date ? formData.date : null,
                maxRegistrations: Number(formData.maxRegistrations) || 0,
                allowMultipleRegistrations: formData.allowMultipleRegistrations,
                emailTemplateId: formData.emailTemplateId || null,
                sendConfirmationEmail: formData.sendConfirmationEmail,
                ticketTemplateId: formData.ticketTemplateId || null,
                attachTicket: formData.attachTicket,
                formSchema: questions,
                formHeaderImage: formHeaderImage,
                status: 'active' // Publish
            };

            console.log('Publishing payload:', payload);
            console.log('Draft ID:', draftId);

            let res;
            if (draftId) {
                res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/update/${draftId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                router.push('/dashboard/events');
            } else {
                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = { message: text || `HTTP ${res.status}` };
                }
                alert(`Failed to publish event: ${data.message || data.error || 'Unknown error'}`);
                console.error('Publish error:', res.status, data);
            }
        } catch (error: any) {
            console.error('Network/Request error:', error);
            alert(`Something went wrong: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32">
            <HeaderActions />

            {/* Page Title */}
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900">
                    {isEditMode ? 'Edit Event' : 'Create Event'}
                </h1>
                {isEditMode && formData.title && (
                    <p className="text-slate-500 mt-1">{formData.title}</p>
                )}
            </div>

            {/* Steps Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-8 flex-wrap gap-y-2">
                <div className={`flex items-center ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'} font-bold`}>1</div>
                    <span className="ml-2 font-medium">Details</span>
                </div>
                <div className="w-8 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'} font-bold`}>2</div>
                    <span className="ml-2 font-medium">Form Builder</span>
                </div>
                <div className="w-8 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'} font-bold`}>3</div>
                    <span className="ml-2 font-medium">Email & Tickets</span>
                </div>
                <div className="w-8 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center ${step >= 4 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 4 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'} font-bold`}>4</div>
                    <span className="ml-2 font-medium">Review</span>
                </div>
            </div>

            {/* Step 1: Basic Details */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Event Title</Label>
                        <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Annual Tech Conference 2025" className="bg-white" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="slug">Event URL Slug</Label>
                        <div className="relative">
                            <div className="flex items-center">
                                <span className="bg-slate-100 border border-r-0 border-slate-300 px-3 h-10 flex items-center text-slate-500 rounded-l-md text-sm">
                                    maketicket.app/{username || '...'}/
                                </span>
                                <Input
                                    id="slug"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleInputChange}
                                    placeholder="tech-conf-2025"
                                    className={`bg-white rounded-l-none ${slugAvailable === false ? 'border-red-500 focus:ring-red-500' : slugAvailable === true ? 'border-green-500 focus:ring-green-500' : ''}`}
                                />
                            </div>
                            <div className="absolute right-3 top-2.5">
                                {checkingSlug ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                                ) : slugAvailable === true ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : slugAvailable === false ? (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                ) : null}
                            </div>
                            {slugAvailable === false && (
                                <p className="text-xs text-red-500 mt-1">Slug already taken by you. Please choose another.</p>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={4}
                            className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Tell people what your event is about..."
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="date">Date & Time</Label>
                            </div>
                            <Input
                                id="date"
                                name="date"
                                type="datetime-local"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="bg-white"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g. Grand Hotel, New York or Online" className="bg-white" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="price">Ticket Price (INR)</Label>
                            <Input
                                id="price"
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={handleInputChange}
                                placeholder="0.00 (Leave 0 for Free)"
                                className="bg-white"
                            />
                            <p className="text-xs text-slate-500">Set to 0 for free events.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="maxRegistrations">Maximum Registrations</Label>
                            <Input
                                id="maxRegistrations"
                                name="maxRegistrations"
                                type="number"
                                min="0"
                                value={formData.maxRegistrations}
                                onChange={handleInputChange}
                                placeholder="0 (Unlimited)"
                                className="bg-white"
                            />
                            <p className="text-xs text-slate-500">Set to 0 for unlimited. Form auto-closes when limit is reached.</p>
                        </div>

                        {/* Multiple Registrations Toggle */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="space-y-0.5">
                                <Label htmlFor="allowMultipleRegistrations" className="text-base cursor-pointer">
                                    Allow Multiple Registrations
                                </Label>
                                <p className="text-xs text-slate-500">
                                    {formData.allowMultipleRegistrations
                                        ? 'Same email can register multiple times'
                                        : 'Each email can only register once'}
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={formData.allowMultipleRegistrations}
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    allowMultipleRegistrations: !prev.allowMultipleRegistrations
                                }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.allowMultipleRegistrations ? 'bg-indigo-600' : 'bg-slate-300'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.allowMultipleRegistrations ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Email Settings Section */}
                        <div className="space-y-4 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                </svg>
                                <Label className="text-base font-semibold text-indigo-900">Email Configuration</Label>
                            </div>

                            {/* Send Confirmation Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="sendConfirmationEmail" className="cursor-pointer">
                                        Send Confirmation Emails
                                    </Label>
                                    <p className="text-xs text-slate-500">
                                        Automatically email attendees when they register
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={formData.sendConfirmationEmail}
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        sendConfirmationEmail: !prev.sendConfirmationEmail
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.sendConfirmationEmail ? 'bg-indigo-600' : 'bg-slate-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.sendConfirmationEmail ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Email Template Selector */}
                            {formData.sendConfirmationEmail && (
                                <div className="grid gap-2">
                                    <Label htmlFor="emailTemplateId">Email Template</Label>
                                    <select
                                        id="emailTemplateId"
                                        value={formData.emailTemplateId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, emailTemplateId: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                    >
                                        <option value="">Use default email layout</option>
                                        {emailTemplates.map((template) => (
                                            <option key={template._id} value={template._id}>
                                                {template.name} - {template.subject}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500">
                                        Select a custom template or use the default.
                                        <a href="/dashboard/settings/email-templates" className="text-indigo-600 hover:underline ml-1">
                                            Create templates →
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Ticket Design Section */}
                        <div className="space-y-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                                </svg>
                                <Label className="text-base font-semibold text-purple-900">Ticket Design</Label>
                            </div>

                            {/* Attach Ticket Toggle */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label htmlFor="attachTicket" className="cursor-pointer">
                                        Attach Ticket to Email
                                    </Label>
                                    <p className="text-xs text-slate-500">
                                        Generate and attach a custom ticket with QR code
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={formData.attachTicket}
                                    onClick={() => setFormData(prev => ({
                                        ...prev,
                                        attachTicket: !prev.attachTicket
                                    }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.attachTicket ? 'bg-purple-600' : 'bg-slate-300'
                                        }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${formData.attachTicket ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Ticket Template Selector */}
                            {formData.attachTicket && (
                                <div className="grid gap-2">
                                    <Label htmlFor="ticketTemplateId">Ticket Template</Label>
                                    <select
                                        id="ticketTemplateId"
                                        value={formData.ticketTemplateId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ticketTemplateId: e.target.value }))}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                                    >
                                        <option value="">Use default ticket design</option>
                                        {ticketTemplates.map((template) => (
                                            <option key={template._id} value={template._id}>
                                                {template.name} ({template.width}×{template.height}px)
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500">
                                        Select a custom ticket design or use the default.
                                        <a href="/dashboard/settings/ticket-templates" className="text-purple-600 hover:underline ml-1">
                                            Design tickets →
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Form Builder */}
            {step === 2 && (
                <FormBuilder
                    questions={questions}
                    onChange={setQuestions}
                    draftId={draftId}
                    headerImage={formHeaderImage || undefined}
                    onHeaderImageChange={setFormHeaderImage}
                />
            )}

            {/* Step 3: Email & Ticket Configuration */}
            {step === 3 && (
                <div className="space-y-8">
                    {/* Email Configuration */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-indigo-600" />
                                <CardTitle>Email Configuration</CardTitle>
                            </div>
                            <CardDescription>Configure how confirmation emails are sent to attendees.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <Label className="text-base font-medium">Send Confirmation Emails</Label>
                                    <p className="text-sm text-slate-500">Automatically email attendees when they register</p>
                                </div>
                                <Switch
                                    checked={formData.sendConfirmationEmail}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendConfirmationEmail: checked }))}
                                />
                            </div>

                            {formData.sendConfirmationEmail && (
                                <div className="space-y-3">
                                    <Label>Email Template</Label>
                                    <select
                                        value={formData.emailTemplateId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, emailTemplateId: e.target.value }))}
                                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Use default email layout</option>
                                        {emailTemplates.map((t) => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500">
                                        Select a custom template or use the default.
                                        <a href="/dashboard/email-templates" className="text-indigo-600 ml-1 hover:underline">Create templates →</a>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ticket Configuration */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-indigo-600" />
                                <CardTitle>Ticket Design</CardTitle>
                            </div>
                            <CardDescription>Configure the ticket that gets attached to confirmation emails.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <div>
                                    <Label className="text-base font-medium">Attach Ticket to Email</Label>
                                    <p className="text-sm text-slate-500">Generate and attach a custom ticket with QR code</p>
                                </div>
                                <Switch
                                    checked={formData.attachTicket}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, attachTicket: checked }))}
                                />
                            </div>

                            {formData.attachTicket && (
                                <div className="space-y-3">
                                    <Label>Ticket Template</Label>
                                    <select
                                        value={formData.ticketTemplateId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, ticketTemplateId: e.target.value }))}
                                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Use default ticket design</option>
                                        {ticketTemplates.map((t) => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500">
                                        Select a custom ticket design or use the default.
                                        <a href="/dashboard/ticket-templates" className="text-indigo-600 ml-1 hover:underline">Design tickets →</a>
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
                <div className="space-y-8">
                    <Card className="border-indigo-100 bg-indigo-50/50">
                        <CardHeader>
                            <CardTitle className="text-indigo-900">Review Event Details</CardTitle>
                            <CardDescription>Confirm your settings before publishing.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-indigo-400 uppercase">Title</label>
                                    <p className="font-medium text-slate-900">{formData.title}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-indigo-400 uppercase">Date</label>
                                    <p className="font-medium text-slate-900">
                                        {formData.date ? new Date(formData.date).toLocaleString() : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-indigo-400 uppercase">Location</label>
                                    <p className="font-medium text-slate-900">{formData.location}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-indigo-400 uppercase">URL</label>
                                    <p className="font-medium text-slate-900">maketicket.app/{username}/{formData.slug}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-indigo-400 uppercase">Confirmation Email</label>
                                    <p className="font-medium text-slate-900">{formData.sendConfirmationEmail ? 'Enabled' : 'Disabled'}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-indigo-400 uppercase">Ticket Attachment</label>
                                    <p className="font-medium text-slate-900">{formData.attachTicket ? 'Enabled' : 'Disabled'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Form Preview */}
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>Form Preview</CardTitle>
                            <CardDescription>Preview how your registration form will look to attendees.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-slate-50 rounded-lg p-6 space-y-6">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">{formData.title}</h2>
                                    <p className="text-slate-500 mt-1">{formData.description}</p>
                                </div>
                                {questions.map((q: any) => (
                                    <div key={q.id}>
                                        {q.itemType === 'section' ? (
                                            <div className="pt-4 pb-2 border-t-2 border-indigo-500 mt-4 first:mt-0 first:pt-0 first:border-t-0">
                                                {q.hasImage && q.imageUrl && (
                                                    <img src={q.imageUrl} alt="" className="mb-3 max-h-40 rounded-lg border border-slate-200" />
                                                )}
                                                <h3 className="text-lg font-bold text-slate-900">{q.label}</h3>
                                                {q.sectionDescription && (
                                                    <p className="text-sm text-slate-500 mt-1">{q.sectionDescription}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {q.hasImage && q.imageUrl && (
                                                    <img src={q.imageUrl} alt="" className="max-h-28 rounded-lg border border-slate-200" />
                                                )}
                                                <Label className="font-medium">
                                                    {q.label} {q.required && <span className="text-red-500">*</span>}
                                                </Label>
                                                {q.description && (
                                                    <p className="text-xs text-slate-500">{q.description}</p>
                                                )}
                                                {q.type === 'textarea' ? (
                                                    <textarea disabled placeholder={q.placeholder || "Answer..."} className="w-full p-2 border border-slate-200 rounded-lg bg-white min-h-[60px] text-sm" />
                                                ) : q.type === 'select' ? (
                                                    <select disabled className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm">
                                                        <option>Select an option...</option>
                                                        {q.options?.map((opt: string, i: number) => <option key={i}>{opt}</option>)}
                                                    </select>
                                                ) : q.type === 'radio' ? (
                                                    <div className="space-y-1">
                                                        {q.options?.map((opt: string, i: number) => (
                                                            <label key={i} className="flex items-center gap-2 text-sm">
                                                                <input type="radio" disabled name={q.id} className="w-4 h-4" />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : q.type === 'checkbox' ? (
                                                    <div className="space-y-1">
                                                        {q.options?.map((opt: string, i: number) => (
                                                            <label key={i} className="flex items-center gap-2 text-sm">
                                                                <input type="checkbox" disabled className="w-4 h-4" />
                                                                {opt}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Input disabled placeholder={q.placeholder || "Answer..."} className="bg-white" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-50 md:left-64 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex justify-between items-center px-4 md:px-8">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(prev => Math.max(1, prev - 1))}
                        disabled={step === 1}
                        className="text-slate-600 hover:text-slate-900"
                    >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Back
                    </Button>

                    <div className="flex gap-2">
                        {step === 4 ? (
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={loading}>
                                {loading ? (isEditMode ? 'Updating...' : 'Publishing...') : (isEditMode ? 'Update Event' : 'Publish Event')}
                            </Button>
                        ) : (
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={async () => {
                                await performSave();
                                setStep(prev => Math.min(4, prev + 1));
                            }}>
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CreateEventPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        }>
            <CreateEventContent />
        </Suspense>
    );
}
