'use client';

import { useState, useEffect, useRef } from 'react';
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
    Save
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { Switch } from '@/components/ui/switch';
import { FormBuilder } from '@/components/FormBuilder';

export default function CreateEventPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [noDate, setNoDate] = useState(false);

    // Step 1: Basic Details
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        location: '',
        slug: '',
        price: 0
    });

    // Step 2: Form Builder
    const [questions, setQuestions] = useState<any[]>([
        { id: 'q1', type: 'text', label: 'Full Name', required: true, placeholder: 'John Doe' },
        { id: 'q2', type: 'email', label: 'Email Address', required: true, placeholder: 'john@example.com' }
    ]);

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
                    setUsername(data.username || 'user');
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchUser();
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
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/check-slug?slug=${formData.slug}`, {
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
                            price: draft.price || 0
                        });
                        if (draft.formSchema) setQuestions(draft.formSchema);
                        if (!draft.date) setNoDate(true);
                        lastSavedData.current = JSON.stringify({ ...draft, formSchema: draft.formSchema });
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
                date: (!noDate && formData.date) ? formData.date : null,
                formSchema: questions,
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
            lastSavedData.current = JSON.stringify({ ...formData, questions, noDate });
            setLastSavedAt(new Date());
        } catch (e) {
            console.error("Auto-save failed", e);
        } finally {
            setIsSavingDraft(false);
        }
    };

    // Auto-Save Effect
    useEffect(() => {
        const currentData = JSON.stringify({ ...formData, questions, noDate });
        // Prevent saving if no changes
        if (currentData === lastSavedData.current) return;

        const timeoutId = setTimeout(performSave, 2000); // 2s debounce
        return () => clearTimeout(timeoutId);
    }, [formData, questions, noDate, draftId, isDraftLoaded]);

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
                    {draftId && (
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
                    Save Draft
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
                date: (!noDate && formData.date) ? formData.date : null,
                formSchema: questions,
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
            {/* Steps Indicator */}
            <div className="flex items-center justify-center space-x-4 mb-8">
                <div className={`flex items-center ${step >= 1 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'} font-bold`}>1</div>
                    <span className="ml-2 font-medium">Details</span>
                </div>
                <div className="w-12 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'} font-bold`}>2</div>
                    <span className="ml-2 font-medium">Form Builder</span>
                </div>
                <div className="w-12 h-0.5 bg-slate-200"></div>
                <div className={`flex items-center ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-indigo-600 bg-indigo-50' : 'border-slate-300'} font-bold`}>3</div>
                    <span className="ml-2 font-medium">Review</span>
                </div>
            </div>

            {/* Step 1: Basic Details */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Event Title</Label>
                        <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="e.g. Annual Tech Conference 2024" className="bg-white" />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="slug">Event URL Slug</Label>
                        <div className="relative">
                            <div className="flex items-center">
                                <span className="bg-slate-100 border border-r-0 border-slate-300 px-3 h-10 flex items-center text-slate-500 rounded-l-md text-sm">
                                    grabmypass.com/{username || '...'}/
                                </span>
                                <Input
                                    id="slug"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleInputChange}
                                    placeholder="tech-conf-2024"
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
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={noDate}
                                        onCheckedChange={setNoDate}
                                        id="create-no-date"
                                    />
                                    <Label htmlFor="create-no-date" className="text-xs font-normal text-slate-500">
                                        No specific time
                                    </Label>
                                </div>
                            </div>
                            <Input
                                id="date"
                                name="date"
                                type="datetime-local"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="bg-white"
                                disabled={noDate}
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
                    </div>
                </div>
            )}

            {/* Step 2: Form Builder */}
            {step === 2 && (
                <FormBuilder
                    questions={questions}
                    onChange={setQuestions}
                />
            )}

            {/* Step 3: Review */}
            {step === 3 && (
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
                                        {noDate ? "To Be Announced" : (formData.date ? new Date(formData.date).toLocaleString() : 'N/A')}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-indigo-400 uppercase">Location</label>
                                    <p className="font-medium text-slate-900">{formData.location}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-indigo-400 uppercase">URL</label>
                                    <p className="font-medium text-slate-900">grabmypass.com/{username}/{formData.slug}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-white border border-slate-200 rounded-lg p-8 max-w-2xl mx-auto shadow-sm">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold">{formData.title}</h1>
                            <p className="text-slate-500 mt-2">{formData.description}</p>
                        </div>

                        <div className="space-y-4 opacity-70 pointer-events-none">
                            <p className="text-center text-sm text-slate-400 italic mb-4">Form Preview</p>
                            {questions.map(q => (
                                <div key={q.id} className="grid gap-2">
                                    <Label className="font-medium">
                                        {q.label} {q.required && <span className="text-red-500">*</span>}
                                    </Label>
                                    <Input disabled placeholder={q.placeholder || "Answer..."} />
                                </div>
                            ))}
                        </div>
                    </div>
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
                        {step === 3 ? (
                            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Publishing...' : 'Publish Event'}
                            </Button>
                        ) : (
                            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setStep(prev => Math.min(3, prev + 1))}>
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
