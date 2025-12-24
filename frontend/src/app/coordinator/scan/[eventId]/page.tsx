'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Ticket,
    Loader2,
    CheckCircle2,
    XCircle,
    QrCode,
    ArrowLeft,
    Camera,
    Keyboard,
    AlertCircle,
    Users,
    Scan,
    UserCheck,
    Clock
} from 'lucide-react';

interface ScanResult {
    success: boolean;
    message: string;
    ticket?: {
        id: string;
        name: string;
        email: string;
        checkedInAt: string;
    };
    alreadyCheckedIn?: boolean;
}

interface EventInfo {
    title: string;
    date?: string;
    location?: string;
    stats: {
        totalAttendees: number;
        checkedIn: number;
    };
}

export default function QRScannerPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params?.eventId as string;

    const [loading, setLoading] = useState(true);
    const [event, setEvent] = useState<EventInfo | null>(null);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [mode, setMode] = useState<'camera' | 'manual'>('manual');
    const [error, setError] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Fetch event info
    useEffect(() => {
        const fetchEvent = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/coordinators/my-events`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                if (res.ok) {
                    const events = await res.json();
                    const currentEvent = events.find((e: any) => e.event.id === eventId);
                    if (currentEvent) {
                        setEvent({
                            title: currentEvent.event.title,
                            date: currentEvent.event.date,
                            location: currentEvent.event.location,
                            stats: currentEvent.event.stats
                        });
                    } else {
                        setError('Event not found or access denied');
                    }
                }
            } catch (err) {
                console.error('Failed to fetch event', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [eventId, router]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setMode('camera');
        } catch (err) {
            console.error('Camera access denied', err);
            setError('Camera access denied. Please use manual entry.');
            setMode('manual');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setMode('manual');
    };

    const processScan = async (code: string) => {
        if (!code.trim() || scanning) return;

        setScanning(true);
        setScanResult(null);
        setError('');

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/scan/check-in`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ticketCode: code.trim(),
                        eventId
                    })
                }
            );

            const data = await res.json();

            if (res.ok) {
                setScanResult({
                    success: true,
                    message: data.message,
                    ticket: data.ticket
                });
                if (event) {
                    setEvent({
                        ...event,
                        stats: {
                            ...event.stats,
                            checkedIn: event.stats.checkedIn + 1
                        }
                    });
                }
                try {
                    new Audio('/sounds/success.mp3').play().catch(() => { });
                } catch { }
            } else {
                setScanResult({
                    success: false,
                    message: data.message,
                    alreadyCheckedIn: data.alreadyCheckedIn,
                    ticket: data.ticket
                });
            }
        } catch (err) {
            setScanResult({
                success: false,
                message: 'Failed to process scan'
            });
        } finally {
            setScanning(false);
            setManualCode('');
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processScan(manualCode);
    };

    const checkedInPercent = event ? Math.round((event.stats.checkedIn / event.stats.totalAttendees) * 100) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Loading scanner...</p>
                </div>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <Link href="/dashboard/coordinator">
                        <Button className="bg-slate-900 hover:bg-slate-800">Back to Dashboard</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/dashboard/coordinator" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">Back</span>
                        </Link>
                        <div className="flex items-center gap-2 text-slate-900">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <Scan className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="font-semibold">Check-In</span>
                        </div>
                        <div className="w-16" /> {/* Spacer for centering */}
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Event Card */}
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white">
                        <h1 className="text-lg font-bold truncate">{event?.title}</h1>
                        {event?.date && (
                            <p className="text-sm text-white/80 mt-1">
                                {new Date(event.date).toLocaleDateString('en-IN', {
                                    weekday: 'short', day: 'numeric', month: 'short'
                                })}
                            </p>
                        )}
                    </div>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-3 divide-x divide-slate-100">
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold text-indigo-600">{event?.stats.totalAttendees}</p>
                                <p className="text-xs text-slate-500 mt-1">Total</p>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold text-emerald-600">{event?.stats.checkedIn}</p>
                                <p className="text-xs text-slate-500 mt-1">Checked In</p>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold text-slate-900">
                                    {(event?.stats.totalAttendees || 0) - (event?.stats.checkedIn || 0)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Remaining</p>
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div className="px-4 pb-4">
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                    style={{ width: `${checkedInPercent}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2 text-center">{checkedInPercent}% checked in</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Mode Toggle */}
                <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200">
                    <button
                        onClick={() => { stopCamera(); setMode('manual'); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${mode === 'manual'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                    >
                        <Keyboard className="w-4 h-4" />
                        Manual Entry
                    </button>
                    <button
                        onClick={startCamera}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${mode === 'camera'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                    >
                        <Camera className="w-4 h-4" />
                        Scan QR
                    </button>
                </div>

                {/* Scanner Content */}
                {mode === 'camera' && (
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        <div className="relative aspect-square bg-slate-900">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-56 h-56 relative">
                                    <div className="absolute inset-0 border-2 border-white/20 rounded-2xl" />
                                    <div className="absolute -top-0.5 -left-0.5 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-2xl" />
                                    <div className="absolute -top-0.5 -right-0.5 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-2xl" />
                                    <div className="absolute -bottom-0.5 -left-0.5 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-2xl" />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-2xl" />
                                    {/* Animated scan line */}
                                    <div className="absolute inset-4 overflow-hidden rounded-lg">
                                        <div className="h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse"
                                            style={{ animation: 'scan 2s ease-in-out infinite' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-6 left-0 right-0">
                                <p className="text-center text-white/80 text-sm bg-black/30 mx-auto w-fit px-4 py-2 rounded-full backdrop-blur-sm">
                                    Align QR code within frame
                                </p>
                            </div>
                        </div>
                    </Card>
                )}

                {mode === 'manual' && (
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-6">
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                                        Ticket Code
                                    </label>
                                    <Input
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. TKT-85BBBEB9"
                                        className="h-14 text-lg font-mono text-center tracking-widest border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                                        autoFocus
                                    />
                                    <p className="text-xs text-slate-400 mt-2 text-center">
                                        Enter the code from the attendee's ticket
                                    </p>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={scanning || !manualCode.trim()}
                                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl disabled:opacity-50"
                                >
                                    {scanning ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck className="w-5 h-5 mr-2" />
                                            Check In
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Scan Result */}
                {scanResult && (
                    <Card className={`border-2 shadow-sm overflow-hidden ${scanResult.success
                            ? 'border-emerald-200 bg-emerald-50'
                            : scanResult.alreadyCheckedIn
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-red-200 bg-red-50'
                        }`}>
                        <CardContent className="p-6 text-center">
                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${scanResult.success
                                    ? 'bg-emerald-100'
                                    : scanResult.alreadyCheckedIn
                                        ? 'bg-amber-100'
                                        : 'bg-red-100'
                                }`}>
                                {scanResult.success ? (
                                    <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                                ) : scanResult.alreadyCheckedIn ? (
                                    <AlertCircle className="w-8 h-8 text-amber-600" />
                                ) : (
                                    <XCircle className="w-8 h-8 text-red-600" />
                                )}
                            </div>

                            <h3 className={`text-lg font-bold mb-1 ${scanResult.success
                                    ? 'text-emerald-900'
                                    : scanResult.alreadyCheckedIn
                                        ? 'text-amber-900'
                                        : 'text-red-900'
                                }`}>
                                {scanResult.success ? 'Check-in Successful!' : scanResult.alreadyCheckedIn ? 'Already Checked In' : 'Check-in Failed'}
                            </h3>
                            <p className={`text-sm ${scanResult.success
                                    ? 'text-emerald-700'
                                    : scanResult.alreadyCheckedIn
                                        ? 'text-amber-700'
                                        : 'text-red-700'
                                }`}>
                                {scanResult.message}
                            </p>

                            {scanResult.ticket && (
                                <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
                                    <p className="font-semibold text-slate-900">{scanResult.ticket.name}</p>
                                    <p className="text-sm text-slate-500">{scanResult.ticket.email}</p>
                                </div>
                            )}

                            <Button
                                onClick={() => setScanResult(null)}
                                className="mt-6 bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                <Scan className="w-4 h-4 mr-2" />
                                Scan Next
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Quick Tips */}
                {!scanResult && (
                    <div className="text-center py-4">
                        <p className="text-sm text-slate-400">
                            💡 Tip: Use the camera for faster check-ins
                        </p>
                    </div>
                )}
            </main>

            <style jsx>{`
                @keyframes scan {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(180px); }
                }
            `}</style>
        </div>
    );
}
