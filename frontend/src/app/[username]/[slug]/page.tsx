'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Loader2, CheckCircle2, AlertCircle, ArrowRight, Ticket, ChevronLeft, Mail, Users, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { UpiQrCode } from '@/components/UpiQrCode';
import { PaymentProofUpload } from '@/components/PaymentProofUpload';

export default function PublicEventPage() {
    const params = useParams();
    const pathname = usePathname();
    const slug = params?.slug as string;
    const username = params?.username as string;

    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [success, setSuccess] = useState(false);
    const [ticket, setTicket] = useState<any>(null);
    const [error, setError] = useState('');
    const [alreadyRegistered, setAlreadyRegistered] = useState(false);
    const [existingTicket, setExistingTicket] = useState<any>(null);

    // Flow State
    const [step, setStep] = useState(1); // 1: Email, 2: Form, 3: Success, 4: Already Registered
    const [userEmail, setUserEmail] = useState('');
    const [userProfile, setUserProfile] = useState<{ name?: string; avatar?: string; email?: string } | null>(null);

    // Form Data State
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Multistep Form State
    const [currentSectionPage, setCurrentSectionPage] = useState(0);
    const [copied, setCopied] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);

    const handleCopyUpi = () => {
        if (!event?.paymentConfig?.upiId) return;
        navigator.clipboard.writeText(event.paymentConfig.upiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formSections = useMemo(() => {
        if (!event?.formSchema) return [];
        const sections: any[][] = [];
        let currentSection: any[] = [];

        event.formSchema.forEach((field: any) => {
            if (field.itemType === 'section') {
                if (currentSection.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = [field];
            } else {
                currentSection.push(field);
            }
        });
        if (currentSection.length > 0) sections.push(currentSection);

        return sections.length > 0 ? sections : [event.formSchema];
    }, [event?.formSchema]);

    const totalSteps = useMemo(() => {
        const baseSteps = formSections.length;
        const hasPayment = event?.paymentConfig?.enabled && event?.price > 0;
        return baseSteps + (hasPayment ? 1 : 0);
    }, [formSections.length, event?.paymentConfig?.enabled, event?.price]);

    const upiUrl = useMemo(() => {
        if (!event?.paymentConfig?.upiId) return '';
        const pa = encodeURIComponent(event.paymentConfig.upiId);
        const pn = encodeURIComponent(event.paymentConfig.upiName || '');
        const am = event.price;
        const tn = encodeURIComponent(`Payment for ${event.title}`);
        return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=INR&tn=${tn}`;
    }, [event?.paymentConfig, event?.price, event?.title]);

    const handleNextSection = () => {
        const currentFields = formSections[currentSectionPage];
        // Validate required fields and custom validations
        for (const field of currentFields) {
            if (field.itemType === 'section') continue;

            const val = answers[field.label];

            // Required field check
            if (field.required) {
                if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0)) {
                    setError(`Please fill in "${field.label}"`);
                    return;
                }
            }

            // Skip further validation if empty and not required
            if (!val || (typeof val === 'string' && val.trim() === '')) continue;

            // Text validation
            if (field.validation && typeof val === 'string') {
                // Min length
                if (field.validation.minLength && val.length < field.validation.minLength) {
                    setError(`"${field.label}" must be at least ${field.validation.minLength} characters`);
                    return;
                }
                // Max length
                if (field.validation.maxLength && val.length > field.validation.maxLength) {
                    setError(`"${field.label}" must be no more than ${field.validation.maxLength} characters`);
                    return;
                }
                // Pattern
                if (field.validation.pattern) {
                    try {
                        const regex = new RegExp(field.validation.pattern);
                        if (!regex.test(val)) {
                            setError(field.validation.patternError || `"${field.label}" has an invalid format`);
                            return;
                        }
                    } catch (e) {
                        // Invalid regex, skip check
                    }
                }
            }

            // Number validation
            if (field.type === 'number' && field.validation) {
                const numVal = parseFloat(val);
                if (!isNaN(numVal)) {
                    if (field.validation.min !== undefined && numVal < field.validation.min) {
                        setError(`"${field.label}" must be at least ${field.validation.min}`);
                        return;
                    }
                    if (field.validation.max !== undefined && numVal > field.validation.max) {
                        setError(`"${field.label}" must be no more than ${field.validation.max}`);
                        return;
                    }
                }
            }
        }
        setError('');
        setCurrentSectionPage(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevSection = () => {
        setError('');
        if (currentSectionPage > 0) {
            setCurrentSectionPage(prev => prev - 1);
        } else {
            setStep(1);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Fetch user profile if logged in
    const fetchUserProfile = async (token: string) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const userData = await res.json();
                setUserEmail(userData.email);
                setUserProfile({
                    name: userData.name,
                    email: userData.email,
                    avatar: userData.avatar
                });
                return userData;
            }
        } catch (e) {
            console.error('Failed to fetch user profile', e);
        }
        return null;
    };

    useEffect(() => {
        // Check for token in URL (from Google Auth redirect)
        const params = new URLSearchParams(window.location.search);
        const tokenFromUrl = params.get('token');

        const handleAuthCallback = async (token: string) => {
            localStorage.setItem('auth_token', token);
            setIsLoggedIn(true);

            // Fetch user profile
            const userData = await fetchUserProfile(token);
            if (userData) {
                // Check if already registered before advancing
                // We'll set the email and let them proceed - the check will happen when they enter email step
                // For Google login, we show step 1 with their profile where they click Continue
                // The check happens when they click Continue
            }

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        };

        if (tokenFromUrl) {
            handleAuthCallback(tokenFromUrl);
        } else {
            // Check local storage
            const token = localStorage.getItem('auth_token');
            if (token) {
                setIsLoggedIn(true);
                fetchUserProfile(token);
            }
        }
    }, []);

    useEffect(() => {
        if (!slug || !username) return;

        const fetchEvent = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${username}/${slug}`);
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
    }, [slug, username]);

    const handleInputChange = (label: string, value: any) => {
        setAnswers(prev => ({ ...prev, [label]: value }));
    };

    // Helper function to render simple markdown (bold, italic, links)
    const renderDescription = (text: string) => {
        if (!text) return null;
        // Convert **bold** to <strong>
        let html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Convert *italic* to <em>
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        // Convert [text](url) to <a>
        html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#00CC68] underline hover:text-[#00b359]">$1</a>');
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    // Check if email is already registered for this event
    const checkRegistrationStatus = async (email: string): Promise<boolean> => {
        if (!event?._id) return false;

        setCheckingEmail(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${event._id}/check-registration?email=${encodeURIComponent(email)}`
            );
            if (res.ok) {
                const data = await res.json();
                if (data.alreadyRegistered) {
                    // Show friendly "Already Registered" screen instead of error
                    setExistingTicket(data.ticket || null);
                    setAlreadyRegistered(true);
                    setStep(4); // New step for already registered
                    return true;
                }
            }
        } catch (e) {
            console.error('Failed to check registration', e);
        } finally {
            setCheckingEmail(false);
        }
        return false;
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userEmail || !userEmail.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }
        setError('');

        // Check if already registered
        const isAlreadyRegistered = await checkRegistrationStatus(userEmail);
        if (isAlreadyRegistered) return;

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

            const responseData = await res.json();

            if (res.ok) {
                setTicket(responseData.ticket);

                // Check if payment is required
                if (event.paymentConfig?.enabled && event.price > 0) {
                    // Move to Payment Page (which is virtually the last section)
                    setCurrentSectionPage(formSections.length);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    setIsFinalizing(true);
                    setTimeout(() => {
                        setIsFinalizing(false);
                        setSuccess(true);
                        setStep(4); // Go directly to success
                    }, 1500);
                }
            } else {
                const errData = responseData;
                if (errData.alreadyRegistered) {
                    setError('You have already registered for this event with this email address.');
                } else if (errData.limitReached) {
                    setError('Registration is full. This event has reached its maximum limit.');
                } else {
                    setError(errData.message || 'Registration failed');
                }
            }
        } catch (err) {
            setError('Something went wrong. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Skeleton Loading State
    if (loading) return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            {/* Left Panel Skeleton */}
            <div className="lg:w-5/12 bg-[#303030] text-white p-8 lg:p-12 lg:h-screen lg:sticky lg:top-0">
                <div className="space-y-6 animate-pulse">
                    {/* Badge skeleton */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/10" />
                        <div className="h-4 w-32 bg-white/10 rounded" />
                    </div>

                    {/* Title skeleton */}
                    <div className="space-y-3">
                        <div className="h-10 w-3/4 bg-white/10 rounded" />
                        <div className="h-10 w-1/2 bg-white/10 rounded" />
                    </div>

                    {/* Details skeleton */}
                    <div className="space-y-4 mt-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10" />
                            <div className="space-y-2 flex-1">
                                <div className="h-3 w-16 bg-white/10 rounded" />
                                <div className="h-4 w-48 bg-white/10 rounded" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10" />
                            <div className="space-y-2 flex-1">
                                <div className="h-3 w-16 bg-white/10 rounded" />
                                <div className="h-4 w-32 bg-white/10 rounded" />
                            </div>
                        </div>
                    </div>

                    {/* Description skeleton */}
                    <div className="pt-8 mt-8 border-t border-white/10 space-y-2">
                        <div className="h-3 w-full bg-white/10 rounded" />
                        <div className="h-3 w-4/5 bg-white/10 rounded" />
                        <div className="h-3 w-3/5 bg-white/10 rounded" />
                    </div>
                </div>
            </div>

            {/* Right Panel Skeleton */}
            <div className="flex-1 bg-[#FAFAFA] p-6 lg:p-24">
                <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
                    {/* Header skeleton */}
                    <div className="space-y-3">
                        <div className="h-8 w-64 bg-gray-200 rounded" />
                        <div className="h-5 w-48 bg-gray-200 rounded" />
                    </div>

                    {/* Card skeleton */}
                    <div className="bg-white rounded-2xl p-8 shadow-lg space-y-6">
                        <div className="space-y-2">
                            <div className="h-4 w-24 bg-gray-200 rounded" />
                            <div className="h-12 w-full bg-gray-100 rounded-lg" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-gray-200 rounded" />
                            <div className="h-12 w-full bg-gray-100 rounded-lg" />
                        </div>
                        <div className="h-14 w-full bg-gray-200 rounded-lg" />
                    </div>
                </div>
            </div>
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

    // Event is closed
    if (event.status === 'closed') return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl text-center">
                    <div className="bg-gradient-to-r from-red-500 to-rose-500 px-8 py-10">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center mb-4">
                            <AlertCircle className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Registration Closed</h2>
                    </div>
                    <div className="px-8 py-8 space-y-4">
                        <h3 className="text-xl font-bold text-slate-900">{event.title}</h3>
                        <p className="text-slate-500">
                            {event.maxRegistrations > 0
                                ? 'This event has reached its maximum registration limit.'
                                : 'Registration for this event has been closed by the host.'}
                        </p>
                        <div className="pt-4 space-y-3">
                            <Link href="/" className="block">
                                <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl">
                                    Browse Other Events
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
                <p className="text-center text-slate-500 text-sm mt-6">
                    Powered by <span className="font-semibold text-white">MakeTicket</span>
                </p>
            </div>
        </div>
    );

    // Event is draft (not published yet)
    if (event.status === 'draft') return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl overflow-hidden shadow-2xl text-center">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-10">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center mb-4">
                            <AlertCircle className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Coming Soon</h2>
                    </div>
                    <div className="px-8 py-8 space-y-4">
                        <h3 className="text-xl font-bold text-slate-900">{event.title}</h3>
                        <p className="text-slate-500">
                            This event is not yet open for registration. Please check back later!
                        </p>
                        <div className="pt-4 space-y-3">
                            <Link href="/" className="block">
                                <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl">
                                    Browse Other Events
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
                <p className="text-center text-slate-500 text-sm mt-6">
                    Powered by <span className="font-semibold text-white">MakeTicket</span>
                </p>
            </div>
        </div>
    );

    // Payment Step (Step 3) - for paid events
    if (step === 3 && event.paymentConfig?.enabled && ticket) return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white">
            {/* Left Panel - Event Details */}
            <div className="lg:w-5/12 bg-[#303030] text-white p-8 lg:p-12 lg:h-screen lg:sticky lg:top-0">
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6">
                        <ChevronLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Home</span>
                    </Link>
                </div>

                <div className="space-y-6">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">Payment Required</span>
                    </div>

                    {/* Title */}
                    <div>
                        <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-3">
                            Complete Your Payment
                        </h1>
                        <p className="text-xl text-white/70">
                            for {event.title}
                        </p>
                    </div>

                    {/* Event Details */}
                    <div className="space-y-4 pt-6">
                        {event.date && (
                            <div className="flex items-center gap-3 text-white/80">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-white/60">Event Date</p>
                                    <p className="font-medium">
                                        {new Date(event.date).toLocaleDateString('en-IN', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        )}
                        {event.location && (
                            <div className="flex items-center gap-3 text-white/80">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-white/60">Location</p>
                                    <p className="font-medium">{event.location}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Info */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mt-8 border border-white/20">
                        <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                <span className="text-white/70">Amount to Pay</span>
                                <span className="text-2xl font-bold">₹{event.price}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/70">Pay To</span>
                                <span className="font-medium">{event.paymentConfig.upiName}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/70">UPI ID</span>
                                <span className="font-mono text-sm">{event.paymentConfig.upiId}</span>
                            </div>
                        </div>
                    </div>

                    {event.paymentConfig.verificationNote && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mt-6">
                            <p className="text-sm text-amber-200">
                                <strong>Note:</strong> {event.paymentConfig.verificationNote}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel - Payment Form */}
            <div className="lg:w-7/12 p-8 lg:p-12 overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                    {/* Progress Indicator */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                            <span className="font-medium text-indigo-600">Step 3 of 3</span>
                            <span>•</span>
                            <span>Payment</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500" style={{ width: '100%' }} />
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-slate-900 mb-2">Make Payment</h2>
                    <p className="text-slate-600 mb-8">Scan the QR code below and upload payment proof to complete registration</p>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* QR Code Section */}
                        <div className="space-y-4">
                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <span className="text-indigo-600">1</span>
                                    </div>
                                    Scan QR Code
                                </h3>
                                <UpiQrCode
                                    upiId={event.paymentConfig.upiId}
                                    payeeName={event.paymentConfig.upiName}
                                    amount={event.price}
                                />
                                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                                    Open any UPI app and scan this QR code to pay ₹{event.price}
                                </div>
                            </div>
                        </div>

                        {/* Upload Section */}
                        <div className="space-y-4">
                            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6">
                                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                                        <span className="text-indigo-600">2</span>
                                    </div>
                                    Upload Payment Proof
                                </h3>
                                <PaymentProofUpload
                                    ticketId={ticket._id}
                                    expectedAmount={event.price}
                                    expectedPayeeName={event.paymentConfig?.upiName}
                                    expectedUpiId={event.paymentConfig?.upiId}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 pt-6 border-t border-slate-200 flex gap-4">
                        <Button
                            variant="outline"
                            onClick={() => setStep(2)}
                            className="flex-1"
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back to Form
                        </Button>
                        <Button
                            onClick={() => {
                                setSuccess(true);
                                setStep(4);
                            }}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                        >
                            Continue to Confirmation
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Your payment will be verified by the event organizer
                    </p>
                </div>
            </div>
        </div>
    );

    // Finalizing View
    if (isFinalizing) return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-[#00CC68]/10 rounded-full animate-ping opacity-25" />
                <div className="relative w-24 h-24 border-4 border-[#00CC68]/20 border-t-[#00CC68] rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Securing your spot...</h2>
            <p className="text-gray-500 max-w-xs mx-auto">Please wait while we generate your ticket and confirm your registration details.</p>
        </div>
    );

    // Success View
    if (success || step === 4) return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                {/* Success Card */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">

                    {/* Header */}
                    <div className="pt-12 pb-8 px-8 text-center">
                        {/* Animated Check Circle */}
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-25" />
                            <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                                <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5} />
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-900 mb-2">You're all set!</h2>
                        <p className="text-slate-500">Your registration is confirmed</p>
                    </div>

                    {/* Divider */}
                    <div className="relative px-8">
                        <div className="absolute left-0 top-1/2 w-4 h-8 bg-slate-50 rounded-r-full -translate-y-1/2" />
                        <div className="absolute right-0 top-1/2 w-4 h-8 bg-slate-50 rounded-l-full -translate-y-1/2" />
                        <div className="border-t border-dashed border-slate-200" />
                    </div>

                    {/* Event Details */}
                    <div className="p-8">
                        <div className="bg-slate-50 rounded-xl p-5 mb-6">
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{event.title}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                {event.date && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        <span>{new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                    </div>
                                )}
                                {event.location && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4" />
                                        <span>{event.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Confirmation Details */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <span className="text-slate-500 text-sm">Confirmation sent to</span>
                                <span className="font-medium text-slate-900 text-sm">{userEmail}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <span className="text-slate-500 text-sm">Status</span>
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    Confirmed
                                </span>
                            </div>
                        </div>

                        {/* Wallet Integration */}
                        {ticket && (
                            <div className="mb-6">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-2 rounded-xl"
                                    onClick={async () => {
                                        try {
                                            const newWindow = window.open('', '_blank');
                                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/wallet/google/${ticket._id}`);
                                            const data = await res.json();
                                            if (data.url && newWindow) {
                                                newWindow.location.href = data.url;
                                            } else if (!data.url && newWindow) {
                                                newWindow.close();
                                                alert('Google Wallet is not configured by the host.');
                                            }
                                        } catch (e) {
                                            alert('Failed to get pass');
                                        }
                                    }}
                                >
                                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Add to Google Wallet
                                </Button>
                            </div>
                        )}

                        {/* Add to Calendar */}
                        {event.date && (
                            <Button
                                variant="outline"
                                className="w-full h-12 mb-4 border-indigo-200 text-indigo-700 font-medium rounded-xl hover:bg-indigo-50 flex items-center justify-center gap-2"
                                onClick={() => {
                                    const startDate = new Date(event.date);
                                    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours
                                    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';

                                    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(event.description || 'Event registered via MakeTicket')}&location=${encodeURIComponent(event.location || '')}`;

                                    window.open(calendarUrl, '_blank');
                                }}
                            >
                                <Calendar className="w-4 h-4" />
                                Add to Google Calendar
                            </Button>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            <Button
                                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all"
                                onClick={() => window.location.reload()}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Register Another Person
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full h-12 border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50"
                                onClick={() => window.location.href = '/'}
                            >
                                Back to Home
                            </Button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
                        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Check your inbox for ticket details</span>
                        </div>
                    </div>
                </div>

                {/* Powered by */}
                <p className="text-center text-slate-400 text-sm mt-6">
                    Powered by <span className="font-semibold text-slate-600">MakeTicket</span>
                </p>
            </div>
        </div>
    );

    // Already Registered View
    if (alreadyRegistered && step === 4) return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-amber-100">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-8 text-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Already Registered!</h1>
                        <p className="text-amber-100 text-sm">You&apos;ve already secured your spot for this event</p>
                    </div>

                    {/* Content */}
                    <div className="p-8">
                        {/* Event Info */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 mb-6 border border-amber-100">
                            <h3 className="font-bold text-slate-900 text-lg mb-3">{event?.title}</h3>
                            <div className="space-y-2 text-sm text-slate-600">
                                {event?.date && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-amber-600" />
                                        <span>{new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                )}
                                {event?.location && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-amber-600" />
                                        <span>{event.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Registered Email */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <span className="text-slate-500 text-sm">Registered email</span>
                                <span className="font-medium text-slate-900 text-sm">{userEmail}</span>
                            </div>
                            {existingTicket?.qrCodeHash && (
                                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                    <span className="text-slate-500 text-sm">Ticket Code</span>
                                    <span className="font-mono font-bold text-amber-600 text-sm">
                                        TKT-{existingTicket.qrCodeHash.substring(0, 8).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <span className="text-slate-500 text-sm">Status</span>
                                <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    Confirmed
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <Button
                                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all"
                                onClick={() => {
                                    setAlreadyRegistered(false);
                                    setExistingTicket(null);
                                    setUserEmail('');
                                    setStep(1);
                                    setError('');
                                }}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Register Another Person
                            </Button>

                            <Button
                                variant="outline"
                                className="w-full h-12 border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50"
                                onClick={() => window.location.href = '/'}
                            >
                                Back to Home
                            </Button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-amber-50 border-t border-amber-100">
                        <div className="flex items-center justify-center gap-2 text-amber-600 text-xs">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Your ticket was sent to your email</span>
                        </div>
                    </div>
                </div>

                {/* Powered by */}
                <p className="text-center text-slate-400 text-sm mt-6">
                    Powered by <span className="font-semibold text-slate-600">MakeTicket</span>
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white selection:bg-[#00CC68]/20">

            {/* Left Panel - Event Details (Sticky on Desktop, Hidden on Mobile after Step 1) */}
            <div className={`lg:w-5/12 bg-[#303030] text-white relative flex flex-col lg:h-screen lg:sticky lg:top-0 overflow-hidden ${step !== 1 ? 'hidden lg:flex' : ''}`}>
                {/* Form Header Image - Stick to top and fit sides */}
                {event.formHeaderImage && (
                    <div className="w-full shrink-0 relative z-10">
                        <img
                            src={event.formHeaderImage}
                            alt={event.title}
                            className="w-full h-48 lg:h-64 object-cover"
                        />
                    </div>
                )}

                <div className="relative z-0 p-8 lg:p-12 flex-1 flex flex-col justify-between">
                    {/* Background Decor - Positioned behind text, not affecting banner */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#00CC68]/15 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <div className="relative z-10">
                        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                            {event.title}
                        </h1>

                        <div className="space-y-4 text-gray-300 mb-8 max-w-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
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
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                    <MapPin className="w-5 h-5 text-[#00CC68]" />
                                </div>
                                <div>
                                    <div className="text-sm text-gray-400 font-medium">Location</div>
                                    <div className="text-white font-medium">{event.location || 'Online Event'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8">
                        <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                            "{event.description}"
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Registration Form (Scrollable) */}
            <div className="flex-1 bg-[#FAFAFA] flex flex-col">
                <div className="flex-1 flex flex-col justify-center p-6 lg:p-24 max-w-3xl mx-auto w-full">

                    {step === 1 ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-bold text-[#303030]">{event.price > 0 ? 'Secure your ticket' : 'Secure your spot'}</h2>
                                    <p className="text-gray-500 text-lg">
                                        {event.price > 0 ? 'Please login to purchase.' : 'Enter your email to begin.'}
                                    </p>
                                </div>

                                {/* Spots remaining indicator */}
                                {event.maxRegistrations > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                            <Users className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-amber-900">
                                                Limited spots available
                                            </p>
                                            <p className="text-xs text-amber-700">
                                                Only {event.maxRegistrations} registrations allowed
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {event.price > 0 && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-indigo-700 font-medium">Ticket Price</p>
                                            <p className="text-2xl font-bold text-indigo-900">₹{event.price}</p>
                                        </div>
                                        <div className="bg-white px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 shadow-sm border border-indigo-100">INR</div>
                                    </div>
                                )}

                                {/* If Paid and Not Logged In, force Google Login */}
                                {event.price > 0 && !isLoggedIn ? (
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
                                ) : isLoggedIn && userEmail ? (
                                    // User is logged in - show their account info professionally
                                    <div className="space-y-6">
                                        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                {userProfile?.avatar ? (
                                                    <img
                                                        src={userProfile.avatar}
                                                        alt={userProfile.name || 'Profile'}
                                                        className="w-14 h-14 rounded-full object-cover border-2 border-[#00CC68]"
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 bg-gradient-to-br from-[#00CC68] to-[#00a857] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                                                        {(userProfile?.name || userEmail).charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    {userProfile?.name && (
                                                        <p className="font-bold text-lg text-gray-900 truncate">{userProfile.name}</p>
                                                    )}
                                                    <p className="text-sm text-gray-500 truncate">{userEmail}</p>
                                                </div>
                                                <div className="flex items-center gap-1 bg-[#00CC68]/10 px-3 py-1.5 rounded-full">
                                                    <svg className="w-4 h-4 text-[#00CC68]" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-xs font-semibold text-[#00CC68]">Verified</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-xs text-gray-400">Signed in with Google</span>
                                                <button
                                                    className="text-xs text-gray-500 hover:text-red-500 transition-colors font-medium"
                                                    onClick={() => {
                                                        localStorage.removeItem('auth_token');
                                                        setIsLoggedIn(false);
                                                        setUserEmail('');
                                                        setUserProfile(null);
                                                    }}
                                                >
                                                    Switch account
                                                </button>
                                            </div>
                                        </div>

                                        {error && (
                                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md flex items-center">
                                                <AlertCircle className="w-4 h-4 mr-2" /> {error}
                                            </div>
                                        )}

                                        <Button
                                            onClick={async () => {
                                                setError('');
                                                const isAlreadyRegistered = await checkRegistrationStatus(userEmail);
                                                if (!isAlreadyRegistered) {
                                                    if (event.formSchema) {
                                                        const emailField = event.formSchema.find((f: any) => f.type === 'email' || f.label.toLowerCase().includes('email'));
                                                        if (emailField) {
                                                            handleInputChange(emailField.label, userEmail);
                                                        }
                                                    }
                                                    setStep(2);
                                                }
                                            }}
                                            disabled={checkingEmail}
                                            className="w-full h-14 bg-[#00CC68] hover:bg-[#00b359] text-white text-lg font-bold shadow-lg shadow-[#00CC68]/20 transition-all hover:scale-[1.01]"
                                        >
                                            {checkingEmail ? (
                                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Checking...</>
                                            ) : (
                                                <>Continue to Register <ArrowRight className="w-5 h-5 ml-2" /></>
                                            )}
                                        </Button>
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
                                            <Button
                                                type="submit"
                                                disabled={checkingEmail}
                                                className="w-full h-14 bg-[#00CC68] hover:bg-[#00b359] text-white text-lg font-bold shadow-lg shadow-[#00CC68]/20 transition-all hover:scale-[1.01]"
                                            >
                                                {checkingEmail ? (
                                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Checking...</>
                                                ) : (
                                                    <>Continue <ArrowRight className="w-5 h-5 ml-2" /></>
                                                )}
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
                                            <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google?returnUrl=${encodeURIComponent(pathname)}`}>
                                                <Button variant="outline" className="w-full h-12 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-medium transition-all">
                                                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                    </svg>
                                                    Continue with Google
                                                </Button>
                                            </a>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div key={currentSectionPage} className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500" id="registration-form-container">
                            <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-[#00CC68] transition-colors w-fit" onClick={handlePrevSection}>
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-sm font-medium">Back</span>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-[#303030]">Complete Registration</h2>
                                <p className="text-gray-500 text-lg">
                                    Step {currentSectionPage + 1} of {totalSteps}
                                </p>
                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
                                    <div
                                        className="bg-[#00CC68] h-full rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${((currentSectionPage + 1) / totalSteps) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* User Profile Card - Only show on first step */}
                            {currentSectionPage === 0 && (
                                (isLoggedIn && userProfile) ? (
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm">
                                        {userProfile.avatar ? (
                                            <img
                                                src={userProfile.avatar}
                                                alt={userProfile.name || 'Profile'}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-[#00CC68] rounded-full flex items-center justify-center text-white font-bold">
                                                {(userProfile.name || userEmail).charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            {userProfile.name && (
                                                <p className="font-semibold text-gray-900 truncate">{userProfile.name}</p>
                                            )}
                                            <p className="text-sm text-gray-500 truncate">{userEmail}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-[#00CC68]">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-[#00CC68]/10 rounded-xl">
                                        <div className="w-10 h-10 bg-[#00CC68] rounded-full flex items-center justify-center text-white font-bold">
                                            {userEmail.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Registering as</p>
                                            <p className="font-semibold text-gray-900">{userEmail}</p>
                                        </div>
                                    </div>
                                )
                            )}


                            <form onSubmit={handleSubmit} className="space-y-6">
                                {currentSectionPage < formSections.length ? (
                                    formSections[currentSectionPage]?.map((field: any) => {
                                        // Handle Sections
                                        if (field.itemType === 'section') {
                                            return (
                                                <div key={field.id} className="pt-6 pb-2 mt-6 first:mt-0 first:pt-0">
                                                    {field.hasImage && field.imageUrl && (
                                                        <img src={field.imageUrl} alt="" className="mb-4 max-h-64 rounded-lg" />
                                                    )}
                                                    {field.label && <h3 className="text-xl font-bold text-gray-900">{field.label}</h3>}
                                                    {field.sectionDescription && (
                                                        <p className="text-sm text-gray-500 mt-1">{renderDescription(field.sectionDescription)}</p>
                                                    )}
                                                </div>
                                            );
                                        }

                                        // Handle Questions
                                        return (
                                            <div key={field.id} className="space-y-3 group">
                                                <div>
                                                    <Label className="text-base font-semibold text-gray-700 group-hover:text-[#00CC68] transition-colors">
                                                        {field.label} {field.required && <span className="text-red-500 ml-1">*</span>}
                                                    </Label>
                                                    {field.description && (
                                                        <p className="text-sm text-gray-500 mt-0.5">{renderDescription(field.description)}</p>
                                                    )}
                                                    {field.hasImage && field.imageUrl && (
                                                        <img src={field.imageUrl} alt="" className="mt-2 max-h-48 rounded-lg" />
                                                    )}
                                                </div>

                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        className="flex min-h-[120px] w-full rounded-lg border-none bg-gray-50 px-4 py-3 text-base ring-offset-white placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00CC68] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white focus:bg-white"
                                                        placeholder={field.placeholder || "Your answer..."}
                                                        required={field.required}
                                                        value={answers[field.label] || ''}
                                                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <div className="relative">
                                                        <select
                                                            className="flex h-12 w-full items-center justify-between rounded-lg border-none bg-gray-50 px-4 py-2 text-base ring-offset-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00CC68] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:bg-white focus:bg-white appearance-none"
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
                                                            <label key={opt} className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${answers[field.label] === opt ? 'bg-[#00CC68]/5' : 'hover:bg-gray-50'}`}>
                                                                <input
                                                                    type="radio"
                                                                    name={field.id}
                                                                    value={opt}
                                                                    checked={answers[field.label] === opt}
                                                                    onChange={(e) => handleInputChange(field.label, e.target.value)}
                                                                    className="w-5 h-5 text-[#00CC68] border-none bg-gray-200 focus:ring-[#00CC68]"
                                                                />
                                                                <span className={`font-medium ${answers[field.label] === opt ? 'text-gray-900' : 'text-gray-700'}`}>
                                                                    {opt}
                                                                </span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : field.type === 'file' ? (
                                                    <div className="space-y-3">
                                                        <div className="relative">
                                                            <input
                                                                type="file"
                                                                id={`file-${field.id}`}
                                                                required={field.required}
                                                                accept={field.fileSettings?.acceptedTypes?.join(',') || '*'}
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        const maxSize = (field.fileSettings?.maxSizeMB || 10) * 1024 * 1024;
                                                                        if (file.size > maxSize) {
                                                                            alert(`File is too large. Maximum size is ${field.fileSettings?.maxSizeMB || 10}MB`);
                                                                            e.target.value = '';
                                                                            return;
                                                                        }
                                                                        // Convert to base64 for storage
                                                                        const reader = new FileReader();
                                                                        reader.onloadend = () => {
                                                                            handleInputChange(field.label, {
                                                                                name: file.name,
                                                                                type: file.type,
                                                                                size: file.size,
                                                                                data: reader.result
                                                                            });
                                                                        };
                                                                        reader.readAsDataURL(file);
                                                                    }
                                                                }}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                            />
                                                            <div className={`flex flex-col items-center justify-center p-6 rounded-lg transition-all ${answers[field.label] ? 'bg-[#00CC68]/5' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                                                {answers[field.label] ? (
                                                                    <>
                                                                        <div className="w-12 h-12 bg-[#00CC68]/10 rounded-full flex items-center justify-center mb-3">
                                                                            <svg className="w-6 h-6 text-[#00CC68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                        </div>
                                                                        <p className="text-sm font-medium text-gray-900">{answers[field.label]?.name || 'File uploaded'}</p>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {answers[field.label]?.size ? `${(answers[field.label].size / 1024).toFixed(1)} KB` : ''}
                                                                        </p>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleInputChange(field.label, null);
                                                                                const input = document.getElementById(`file-${field.id}`) as HTMLInputElement;
                                                                                if (input) input.value = '';
                                                                            }}
                                                                            className="mt-2 text-xs text-red-500 hover:text-red-700"
                                                                        >
                                                                            Remove file
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                                            </svg>
                                                                        </div>
                                                                        <p className="text-sm font-medium text-gray-700">Click to upload or drag and drop</p>
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {field.fileSettings?.acceptedTypes?.length ?
                                                                                `Accepted: ${field.fileSettings.acceptedTypes.join(', ')}` :
                                                                                'Any file type'
                                                                            }
                                                                            {field.fileSettings?.maxSizeMB && ` • Max ${field.fileSettings.maxSizeMB}MB`}
                                                                        </p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Input
                                                        type={field.type}
                                                        placeholder={field.placeholder || "Your answer..."}
                                                        required={field.required}
                                                        value={answers[field.label] || ''}
                                                        onChange={(e) => handleInputChange(field.label, e.target.value)}
                                                        className="h-12 px-4 text-base bg-gray-50 border-none hover:bg-white focus:bg-white transition-all"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <>
                                        {/* Mobile View */}
                                        <div className="lg:hidden space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="text-center md:text-left md:flex md:items-end md:justify-between px-1">
                                                <div className="space-y-1">
                                                    <h3 className="text-2xl font-bold text-gray-900">Payment & Verification</h3>
                                                    <p className="text-gray-500">Step 2 of 2: Complete payment</p>
                                                </div>
                                                <div className="hidden md:block text-right">
                                                    <p className="text-sm text-gray-400">Transaction ID: {ticket?._id?.slice(-8).toUpperCase()}</p>
                                                </div>
                                            </div>

                                            <div className="overflow-hidden flex flex-col">
                                                {/* Payment Info */}
                                                <div className="p-8 flex flex-col items-center relative">

                                                    <div className="my-auto w-full max-w-[280px] space-y-6">
                                                        <div className="bg-white p-4 rounded-2xl aspect-square flex items-center justify-center relative group">
                                                            <UpiQrCode
                                                                upiId={event.paymentConfig.upiId}
                                                                payeeName={event.paymentConfig.upiName}
                                                                amount={event.price}
                                                            />
                                                        </div>

                                                        <div className="text-center space-y-1">
                                                            <div className="flex items-center justify-center gap-2 text-3xl font-bold text-gray-900">
                                                                <span>₹{event.price}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                                                                Pay to <span className="font-semibold text-gray-900">{event.paymentConfig.upiName}</span>
                                                            </p>
                                                        </div>

                                                        <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UPI ID</span>
                                                                <code className="text-sm font-bold text-gray-700 select-all">{event.paymentConfig.upiId}</code>
                                                            </div>
                                                            <button
                                                                onClick={handleCopyUpi}
                                                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                                                                title="Copy UPI ID"
                                                            >
                                                                {copied ? <Check className="w-4 h-4 text-[#00CC68]" /> : <Copy className="w-4 h-4" />}
                                                            </button>
                                                        </div>

                                                        <Button
                                                            asChild
                                                            className="w-full h-12 bg-[#00CC68] hover:bg-[#00b359] text-white font-bold rounded-xl shadow-lg shadow-[#00CC68]/20 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <a href={upiUrl}>
                                                                <ArrowRight className="w-5 h-5" />
                                                                Open UPI App to Pay
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Upload */}
                                                <div className="p-8 pt-6 border-t border-slate-100">
                                                    <div className="mb-6">
                                                        <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                                                            Upload Payment Proof
                                                        </h4>
                                                        <p className="text-sm text-gray-500 leading-relaxed">
                                                            Please upload the screenshot of your payment transaction.
                                                            Ensure the <strong>UTR/Transaction ID</strong> is visible.
                                                        </p>
                                                    </div>

                                                    <div className="flex-1">
                                                        {ticket ? (
                                                            <div>
                                                                <PaymentProofUpload
                                                                    ticketId={ticket._id}
                                                                    expectedAmount={event.price}
                                                                    expectedPayeeName={event.paymentConfig?.upiName}
                                                                    expectedUpiId={event.paymentConfig?.upiId}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="h-40 flex items-center justify-center bg-red-50 rounded-xl border border-red-100 text-red-600">
                                                                Session expired. Please refresh.
                                                            </div>
                                                        )}
                                                    </div>

                                                    {event.paymentConfig?.verificationNote && (
                                                        <div className="mt-8 pt-6 border-t border-gray-100">
                                                            <div className="flex gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                                </div>
                                                                <div className="text-sm text-gray-600">
                                                                    <span className="font-medium text-gray-900 block mb-1">Host Note</span>
                                                                    {event.paymentConfig.verificationNote}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Desktop View */}
                                        <div className="hidden lg:block animate-in fade-in slide-in-from-right-4 duration-300">
                                            <div className="max-w-2xl mx-auto">
                                                <div className="overflow-hidden">
                                                    {/* Top Section: QR and Amount */}
                                                    <div className="p-10">
                                                        <div className="flex items-center justify-between gap-10">
                                                            <div className="space-y-5 flex-1">
                                                                <div>
                                                                    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                                                        Payment Required
                                                                    </div>
                                                                    <h2 className="text-3xl font-bold text-gray-900">Scan & Pay</h2>
                                                                    <p className="text-gray-500 text-sm mt-1">Complete your registration for {event.title}</p>
                                                                </div>

                                                                <div className="flex flex-col gap-1">
                                                                    <div className="flex items-baseline gap-2">
                                                                        <span className="text-5xl font-black text-gray-900 tracking-tight">₹{event.price}</span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-500">Payable to: <span className="font-semibold text-gray-900">{event.paymentConfig.upiName}</span></p>
                                                                </div>

                                                                <div className="inline-flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl group relative">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UPI ID</span>
                                                                        <code className="text-sm font-bold text-gray-700">{event.paymentConfig.upiId}</code>
                                                                    </div>
                                                                    <button
                                                                        onClick={handleCopyUpi}
                                                                        className="ml-1 p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-400 hover:text-gray-600"
                                                                    >
                                                                        {copied ? <Check className="w-3.5 h-3.5 text-[#00CC68]" /> : <Copy className="w-3.5 h-3.5" />}
                                                                    </button>
                                                                </div>

                                                                <div>
                                                                    <Button
                                                                        asChild
                                                                        variant="outline"
                                                                        className="h-10 border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl px-6 font-semibold flex items-center gap-2"
                                                                    >
                                                                        <a href={upiUrl}>
                                                                            <ArrowRight className="w-4 h-4" />
                                                                            Pay in UPI App
                                                                        </a>
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="flex-shrink-0">
                                                                <div className="bg-transparent flex items-center justify-center">
                                                                    <UpiQrCode
                                                                        upiId={event.paymentConfig.upiId}
                                                                        payeeName={event.paymentConfig.upiName}
                                                                        amount={event.price}
                                                                        size={128}
                                                                        hideDetails={true}
                                                                        transparent={true}
                                                                    />
                                                                </div>
                                                                <p className="text-[10px] text-center text-gray-400 mt-3 font-black uppercase tracking-[0.2em]">Secure UPI Payment</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Bottom Section: Upload */}
                                                    <div className="p-10 pt-8 space-y-8 border-t border-slate-100">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <h3 className="text-xl font-bold text-gray-900">Upload Payment Proof</h3>
                                                                <p className="text-gray-500 text-sm mt-1">Upload the screenshot showing the UTR/Transaction ID</p>
                                                            </div>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step {totalSteps} of {totalSteps}</span>
                                                                <span className="text-xs font-mono font-semibold text-gray-600">{ticket?._id?.slice(-8).toUpperCase()}</span>
                                                            </div>
                                                        </div>

                                                        <div className="rounded-2xl">
                                                            {ticket ? (
                                                                <PaymentProofUpload
                                                                    ticketId={ticket._id}
                                                                    expectedAmount={event.price}
                                                                    expectedPayeeName={event.paymentConfig?.upiName}
                                                                    expectedUpiId={event.paymentConfig?.upiId}
                                                                />
                                                            ) : (
                                                                <div className="p-8 text-center">
                                                                    <p className="text-red-500 font-medium">Session error. Please refresh the page.</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {event.paymentConfig?.verificationNote && (
                                                            <div className="bg-indigo-50/30 rounded-2xl p-6">
                                                                <div className="flex gap-4">
                                                                    <div className="w-1 h-auto bg-indigo-500 rounded-full shrink-0" />
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Note from Host</p>
                                                                        <p className="text-sm text-indigo-900/80 leading-relaxed italic">
                                                                            "{event.paymentConfig.verificationNote}"
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-8 text-center">
                                                    <p className="text-xs text-gray-400 flex items-center justify-center gap-2">
                                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                        Verified Payment System by GrabMyPass
                                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}



                                {error && (
                                    <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    {/* Back Button - shown if sections > 1 or on payment step */}
                                    {(currentSectionPage > 0 || (event.paymentConfig?.enabled && event.price > 0 && currentSectionPage === formSections.length)) && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handlePrevSection}
                                            className="w-full h-14 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                                        >
                                            Back
                                        </Button>
                                    )}

                                    {/* Next/Submit Button */}
                                    {currentSectionPage < formSections.length ? (
                                        <Button
                                            type={currentSectionPage < formSections.length - 1 ? "button" : "submit"}
                                            onClick={currentSectionPage < formSections.length - 1 ? handleNextSection : undefined}
                                            className="w-full h-14 bg-[#00CC68] hover:bg-[#00b359] text-white text-lg font-bold shadow-lg shadow-[#00CC68]/20 transition-all hover:translate-y-[-1px]"
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...
                                                </>
                                            ) : (
                                                currentSectionPage < formSections.length - 1 ? (
                                                    <>Next <ArrowRight className="w-5 h-5 ml-2" /></>
                                                ) : (event.paymentConfig?.enabled && event.price > 0) ? (
                                                    <>Proceed to Payment <ArrowRight className="w-5 h-5 ml-2" /></>
                                                ) : (
                                                    'Complete Registration'
                                                )
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setIsFinalizing(true);
                                                setTimeout(() => {
                                                    setIsFinalizing(false);
                                                    setSuccess(true);
                                                    setStep(4);
                                                }, 1500);
                                            }}
                                            className="w-full h-14 bg-[#00CC68] hover:bg-[#00b359] text-white text-lg font-bold shadow-lg shadow-[#00CC68]/20 transition-all hover:translate-y-[-1px]"
                                            disabled={isFinalizing}
                                        >
                                            {isFinalizing ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Securing Details...
                                                </>
                                            ) : (
                                                "I've Completed Payment"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="mt-12 text-center text-gray-400 text-sm">
                        <p>Powered by <span className="font-semibold text-gray-600">MakeTicket</span></p>
                    </div>
                </div>
            </div >
        </div >
    );
}
