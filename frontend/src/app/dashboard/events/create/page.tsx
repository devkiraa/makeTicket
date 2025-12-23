'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChevronRight,
    ChevronLeft,
} from 'lucide-react';
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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-generate slug from title if slug is empty
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
                ...formData,
                date: noDate ? null : formData.date,
                formSchema: questions
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                router.push('/dashboard/events');
            } else {
                alert('Failed to create event. Please check your inputs.');
            }
        } catch (error) {
            console.error(error);
            alert('Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32">
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
                        <div className="flex items-center">
                            <span className="bg-slate-100 border border-r-0 border-slate-300 px-3 h-10 flex items-center text-slate-500 rounded-l-md text-sm">grabmypass.com/e/</span>
                            <Input id="slug" name="slug" value={formData.slug} onChange={handleInputChange} placeholder="tech-conf-2024" className="bg-white rounded-l-none" />
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
                            <Label htmlFor="price">Ticket Price (USD)</Label>
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
                                    <p className="font-medium text-slate-900">grabmypass.com/e/{formData.slug}</p>
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
