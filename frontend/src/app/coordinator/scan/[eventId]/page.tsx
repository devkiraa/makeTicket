'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Ticket, Loader2, CheckCircle2, XCircle, QrCode, ArrowLeft, Camera, Keyboard, AlertCircle, Users } from 'lucide-react';

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
    const [mode, setMode] = useState<'camera' | 'manual'>('manual'); // Start with manual for now
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
                // Get event stats
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

        // Cleanup camera on unmount
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [eventId, router]);

    // Start camera for QR scanning
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

    // Process scan (either from camera or manual)
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
                // Update local stats
                if (event) {
                    setEvent({
                        ...event,
                        stats: {
                            ...event.stats,
                            checkedIn: event.stats.checkedIn + 1
                        }
                    });
                }
                // Play success sound (optional)
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 px-4">
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <p className="text-white text-lg mb-4">{error}</p>
                <Link href="/dashboard/coordinator">
                    <Button variant="outline">Back to Dashboard</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/dashboard/coordinator" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back</span>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-indigo-400" />
                            <span className="font-semibold">QR Scanner</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Info */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-6">
                <div className="max-w-2xl mx-auto px-4">
                    <h1 className="text-xl font-bold">{event?.title}</h1>
                    <div className="flex items-center gap-4 mt-2 text-sm opacity-90">
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {event?.stats.checkedIn} / {event?.stats.totalAttendees} checked in
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanner Area */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6">
                    <Button
                        variant={mode === 'manual' ? 'default' : 'outline'}
                        onClick={() => { stopCamera(); setMode('manual'); }}
                        className={mode === 'manual' ? 'bg-indigo-600' : 'bg-transparent border-slate-600 text-slate-300'}
                    >
                        <Keyboard className="w-4 h-4 mr-2" />
                        Manual Entry
                    </Button>
                    <Button
                        variant={mode === 'camera' ? 'default' : 'outline'}
                        onClick={startCamera}
                        className={mode === 'camera' ? 'bg-indigo-600' : 'bg-transparent border-slate-600 text-slate-300'}
                    >
                        <Camera className="w-4 h-4 mr-2" />
                        Camera Scan
                    </Button>
                </div>

                {/* Camera View */}
                {mode === 'camera' && (
                    <div className="relative aspect-square bg-black rounded-2xl overflow-hidden mb-6">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-64 h-64 border-2 border-white/50 rounded-xl">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                            </div>
                        </div>
                        <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm">
                            Point camera at QR code
                        </p>
                    </div>
                )}

                {/* Manual Entry */}
                {mode === 'manual' && (
                    <Card className="bg-slate-800 border-slate-700 mb-6">
                        <CardContent className="pt-6">
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-300 mb-2 block">
                                        Enter Ticket Code
                                    </label>
                                    <Input
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. ABC12345"
                                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-14 text-lg font-mono text-center tracking-widest"
                                        autoFocus
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={scanning || !manualCode.trim()}
                                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-lg font-semibold"
                                >
                                    {scanning ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="w-5 h-5 mr-2" />
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
                    <Card className={`border-2 ${scanResult.success
                            ? 'bg-green-900/50 border-green-500'
                            : scanResult.alreadyCheckedIn
                                ? 'bg-amber-900/50 border-amber-500'
                                : 'bg-red-900/50 border-red-500'
                        } mb-6`}>
                        <CardContent className="pt-6 text-center">
                            {scanResult.success ? (
                                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            ) : scanResult.alreadyCheckedIn ? (
                                <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                            ) : (
                                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                            )}

                            <h3 className="text-xl font-bold mb-2">{scanResult.message}</h3>

                            {scanResult.ticket && (
                                <div className="mt-4 p-4 bg-white/10 rounded-lg">
                                    <p className="text-lg font-semibold">{scanResult.ticket.name}</p>
                                    <p className="text-sm text-slate-300">{scanResult.ticket.email}</p>
                                </div>
                            )}

                            <Button
                                onClick={() => setScanResult(null)}
                                variant="outline"
                                className="mt-6 bg-transparent border-white/30 text-white hover:bg-white/10"
                            >
                                Scan Next
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6 text-center">
                            <p className="text-3xl font-bold text-green-400">{event?.stats.checkedIn}</p>
                            <p className="text-sm text-slate-400">Checked In</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="pt-6 text-center">
                            <p className="text-3xl font-bold text-slate-300">
                                {(event?.stats.totalAttendees || 0) - (event?.stats.checkedIn || 0)}
                            </p>
                            <p className="text-sm text-slate-400">Remaining</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
