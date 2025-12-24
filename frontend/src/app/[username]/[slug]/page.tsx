'use client';

import { useState, useEffect } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Loader2, CheckCircle2, AlertCircle, ArrowRight, Ticket, ChevronLeft, Mail, Users } from 'lucide-react';
import Link from 'next/link';

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
    const [error, setError] = useState('');

    // Flow State
    const [step, setStep] = useState(1); // 1: Email, 2: Form, 3: Success
    const [userEmail, setUserEmail] = useState('');
    const [userProfile, setUserProfile] = useState<{ name?: string; avatar?: string; email?: string } | null>(null);

    // Form Data State
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isLoggedIn, setIsLoggedIn] = useState(false);

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
                    setError('You have already registered for this event with this email address.');
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

            if (res.ok) {
                setSuccess(true);
                setStep(3);
            } else {
                const errData = await res.json();
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
                    Powered by <span className="font-semibold text-white">GrabMyPass</span>
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
                    Powered by <span className="font-semibold text-white">GrabMyPass</span>
                </p>
            </div>
        </div>
    );

    // Success View
    if (success || step === 3) return (
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

                        {/* Add to Calendar */}
                        {event.date && (
                            <Button
                                variant="outline"
                                className="w-full h-12 mb-4 border-indigo-200 text-indigo-700 font-medium rounded-xl hover:bg-indigo-50 flex items-center justify-center gap-2"
                                onClick={() => {
                                    const startDate = new Date(event.date);
                                    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours
                                    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';

                                    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${encodeURIComponent(event.description || 'Event registered via GrabMyPass')}&location=${encodeURIComponent(event.location || '')}`;

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
                    Powered by <span className="font-semibold text-slate-600">GrabMyPass</span>
                </p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-white selection:bg-[#00CC68]/20">

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

                                {event.price && event.price > 0 && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-indigo-700 font-medium">Ticket Price</p>
                                            <p className="text-2xl font-bold text-indigo-900">₹{event.price}</p>
                                        </div>
                                        <div className="bg-white px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 shadow-sm border border-indigo-100">INR</div>
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
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-[#00CC68] transition-colors w-fit" onClick={() => setStep(1)}>
                                <ChevronLeft className="w-4 h-4" />
                                <span className="text-sm font-medium">Back</span>
                            </div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-[#303030]">Complete Registration</h2>
                                <p className="text-gray-500 text-lg">Fill in the details below.</p>
                            </div>

                            {/* User Profile Card */}
                            {(isLoggedIn && userProfile) ? (
                                <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
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
                                <div className="flex items-center gap-3 p-4 bg-[#00CC68]/10 rounded-xl border border-[#00CC68]/20">
                                    <div className="w-10 h-10 bg-[#00CC68] rounded-full flex items-center justify-center text-white font-bold">
                                        {userEmail.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Registering as</p>
                                        <p className="font-semibold text-gray-900">{userEmail}</p>
                                    </div>
                                </div>
                            )}

                            <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-black/5">
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-5 h-5 text-[#00CC68]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="font-semibold text-gray-700">Registration Form</span>
                                        <span className="ml-auto text-xs text-gray-400">{event.formSchema?.filter((f: any) => f.itemType !== 'section').length || event.formSchema?.length || 0} questions</span>
                                    </div>
                                </div>
                                <CardContent className="p-8">
                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {event.formSchema?.map((field: any) => {
                                            // Handle Sections
                                            if (field.itemType === 'section') {
                                                return (
                                                    <div key={field.id} className="pt-6 pb-2 border-t-2 border-indigo-500 mt-6 first:mt-0 first:pt-0 first:border-t-0">
                                                        <h3 className="text-xl font-bold text-gray-900">{field.label}</h3>
                                                        {field.sectionDescription && (
                                                            <p className="text-sm text-gray-500 mt-1">{field.sectionDescription}</p>
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
                                                            <p className="text-sm text-gray-500 mt-0.5">{field.description}</p>
                                                        )}
                                                    </div>

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
                                            );
                                        })}

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
