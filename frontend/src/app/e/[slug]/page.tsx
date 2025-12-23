'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Loader2, CheckCircle2, AlertCircle, ArrowRight, Ticket, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function PublicEventPage() {
    const params = useParams();
    const pathname = usePathname();
    const slug = params?.slug as string;

    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Flow State
    const [step, setStep] = useState(1); // 1: Email, 2: Form, 3: Success
    const [userEmail, setUserEmail] = useState('');

    // Form Data State
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check for token in URL (from Google Auth redirect)
        const params = new URLSearchParams(window.location.search);
        const tokenFromUrl = params.get('token');

        if (tokenFromUrl) {
            localStorage.setItem('auth_token', tokenFromUrl);
            setIsLoggedIn(true);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            // Check local storage
            const token = localStorage.getItem('auth_token');
            setIsLoggedIn(!!token);
        }
    }, []);

    useEffect(() => {
        if (!slug) return;

        const fetchEvent = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setEvent(data);
                    const initialAnswers: any = {};
                    data.formSchema?.forEach((field: any) => {
                        if (field.type === 'checkbox') initialAnswers[field.label] = [];
                        else initialAnswers[field.label] = '';
                    });
                    setAnswers(initialAnswers);
                } else {
                    setError('Event not found');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load event');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [slug]);

    const handleInputChange = (label: string, value: any) => {
        setAnswers(prev => ({ ...prev, [label]: value }));
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail || !userEmail.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        setError('');

        if (event.formSchema) {
            const emailField = event.formSchema.find((f: any) => f.type === 'email' || f.label.toLowerCase().includes('email'));
            if (emailField) {
                handleInputChange(emailField.label, userEmail);
            }
        }
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const payload = {
                formData: answers,
                email: userEmail
            };

            const token = localStorage.getItem('auth_token');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${event._id}/register`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setSuccess(true);
                setStep(3);
            } else {
                const errData = await res.json();
                setError(errData.message || 'Registration failed');
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-8 h-8 animate-spin text-[#00CC68]" />
        </div>
    );

    if (!event) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900">Event Not Found</h1>
                <p className="text-slate-500 mt-2">The event you are looking for does not exist or has been removed.</p>
                <Link href="/">
                    <Button variant="link" className="mt-4 text-[#00CC68]">Go Home</Button>
                </Link>
            </div>
        </div>
    );

    // Success View
    if (success || step === 3) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full border-none shadow-2xl overflow-hidden">
                <div className="bg-[#00CC68] h-32 flex items-center justify-center">
                    <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                    </div>
                </div>
                <CardContent className="pt-8 text-center space-y-6 pb-10">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-900">You're In!</h2>
                        <p className="text-slate-500">
                            Registration confirmed for <br /> <span className="font-semibold text-slate-900">{event.title}</span>
                        </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-left space-y-3">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Sent to</span>
                            <span className="font-medium text-slate-900">{userEmail}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Date</span>
                            <span className="font-medium text-slate-900">{new Date(event.date).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <Button className="w-full bg-[#303030] hover:bg-black h-11" onClick={() => window.location.reload()}>
                        Register Another Person
                    </Button>
                </CardContent>
            </Card>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-white selection:bg-[#00CC68]/20">

            {/* Left Panel - Event Details (Sticky on Desktop) */}
            <div className="lg:w-5/12 bg-[#303030] text-white relative flex flex-col justify-between p-8 lg:p-12 lg:h-screen lg:sticky lg:top-0 overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00CC68]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 text-[#00CC68] font-medium mb-8">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                            <Ticket className="w-4 h-4" />
                        </div>
                        <span className="tracking-wide text-sm font-semibold uppercase">Event Registration</span>
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                        {event.title}
                    </h1>

                    <div className="space-y-4 text-gray-300 mb-8 max-w-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                <Calendar className="w-5 h-5 text-[#00CC68]" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 font-medium">Date & Time</div>
                                <div className="text-white font-medium">
                                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    <span className="mx-2">•</span>
                                    {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                <MapPin className="w-5 h-5 text-[#00CC68]" />
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 font-medium">Location</div>
                                <div className="text-white font-medium">{event.location || 'Online Event'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 mt-8 lg:mt-0 pt-8 border-t border-white/10">
                    <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                        "{event.description}"
                    </p>
                </div>
            </div>

            {/* Right Panel - Registration Form (Scrollable) */}
            <div className="flex-1 bg-[#FAFAFA] flex flex-col">
                <div className="flex-1 flex flex-col justify-center p-6 lg:p-24 max-w-3xl mx-auto w-full">

                    {step === 1 ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold text-[#303030]">{event.price && event.price > 0 ? 'Secure your ticket' : 'Secure your spot'}</h2>
                                    <p className="text-gray-500 text-lg">
                                        {event.price && event.price > 0 ? 'Please login to purchase.' : 'Enter your email to begin.'}
                                    </p>
                                </div>

                                {event.price && event.price > 0 && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-indigo-700 font-medium">Ticket Price</p>
                                            <p className="text-2xl font-bold text-indigo-900">${event.price}</p>
                                        </div>
                                        <div className="bg-white px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 shadow-sm border border-indigo-100">USD</div>
                                    </div>
                                )}

                                {/* If Paid and Not Logged In, force Google Login */}
                                {event.price && event.price > 0 && !isLoggedIn ? (
                                    <div className="space-y-4">
                                        <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google?returnUrl=${encodeURIComponent(pathname)}`}>
                                            <Button variant="outline" className="w-full h-14 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-medium transition-all text-lg">
                                                <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                                Login with Google
                                            </Button>
                                        </a>
                                        <p className="text-center text-sm text-gray-500">Authentication is required for paid events.</p>
                                    </div>
                                ) : (
                                    <>
                                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="name@example.com"
                                                    value={userEmail}
                                                    onChange={(e) => setUserEmail(e.target.value)}
                                                    className="h-14 px-4 text-lg bg-white border-gray-200 shadow-sm focus:ring-2 focus:ring-[#00CC68] focus:border-transparent transition-all"
                                                    autoFocus
                                                    required
                                                />
                                            </div>
                                            {error && (
                                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center">
                                                    <AlertCircle className="w-4 h-4 mr-2" /> {error}
                                                </div>
                                            )}
                                            <Button type="submit" className="w-full h-14 bg-[#00CC68] hover:bg-[#00b359] text-white text-lg font-bold shadow-lg shadow-[#00CC68]/20 transition-all hover:scale-[1.01]">
                                                Continue <ArrowRight className="w-5 h-5 ml-2" />
                                            </Button>
                                        </form>

                                        <div className="relative pt-8">
                                            <div className="absolute inset-0 flex items-center top-8">
                                                <span className="w-full border-t border-gray-200" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-[#FAFAFA] px-4 text-gray-400 font-medium tracking-wider">Or continue with</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <Button variant="outline" className="h-12 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-medium transition-all" disabled>
                                                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                                Google
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-[#00CC68] transition-colors w-fit" onClick={() => setStep(1)}>
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-sm font-medium">Back to email</span>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-[#303030]">Final Details</h2>
                                <p className="text-gray-500 text-lg">Complete your profile for the event.</p>
                            </div>

                            <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-black/5">
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered as</span>
                                    <span className="text-sm font-medium text-[#00CC68] bg-[#00CC68]/10 px-3 py-1 rounded-full">{userEmail}</span>
                                </div>
                                <CardContent className="p-8">
                                    <form onSubmit={handleSubmit} className="space-y-8">
                                        {event.formSchema?.map((field: any) => (
                                            <div key={field.id} className="space-y-3 group">
                                                <Label className="text-base font-semibold text-gray-700 group-hover:text-[#00CC68] transition-colors">
                                                    {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </Label>

                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        className="flex min-h-[120px] w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00CC68] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white focus:bg-white"
                                                        placeholder={field.placeholder || "Your answer..."}
                                                        required={field.required}
                                                        value={answers[field.label] || ''}
                                                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <div className="relative">
                                                        <select
                                                            className="flex h-12 w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-base ring-offset-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00CC68] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white focus:bg-white appearance-none"
                                                            required={field.required}
                                                            value={answers[field.label] || ''}
                                                            onChange={(e) => handleInputChange(field.label, e.target.value)}
                                                        >
                                                            <option value="">Select an option...</option>
                                                            {field.options?.map((opt: string) => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                        </div>
                                                    </div>
                                                ) : field.type === 'radio' ? (
                                                    <div className="space-y-3">
                                                        {field.options?.map((opt: string) => (
                                                            <label key={opt} className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${answers[field.label] === opt ? 'border-[#00CC68] bg-[#00CC68]/5' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                                                                <input
                                                                    type="radio"
                                                                    name={field.id}
                                                                    value={opt}
                                                                    checked={answers[field.label] === opt}
                                                                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                                                                    className="w-5 h-5 text-[#00CC68] border-gray-300 focus:ring-[#00CC68]"
                                                                />
                                                                <span className={`font-medium ${answers[field.label] === opt ? 'text-gray-900' : 'text-gray-700'}`}>
                                                                    {opt}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Input
                                                        type={field.type}
                                                        placeholder={field.placeholder || "Your answer..."}
                                                        required={field.required}
                                                        value={answers[field.label] || ''}
                                                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                                                        className="h-12 px-4 text-base bg-gray-50 border-gray-200 hover:bg-white focus:bg-white transition-all"
                                                    />
                                                )}
                                            </div>
                                        ))}

                                        {error && (
                                            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-2" />
                                                {error}
                                            </div>
                                        )}

                                        <Button type="submit" className="w-full h-14 bg-[#00CC68] hover:bg-[#00b359] text-white text-lg font-bold shadow-lg shadow-[#00CC68]/20 transition-all hover:translate-y-[-1px]" disabled={submitting}>
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                                                </>
                                            ) : (
                                                'Complete Registration'
                                            )}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div className="mt-12 text-center text-gray-400 text-sm">
                        <p>Powered by <span className="font-semibold text-gray-600">GrabMyPass</span></p>
                    </div>
                </div>
            </div>
        </div>
    );
}
