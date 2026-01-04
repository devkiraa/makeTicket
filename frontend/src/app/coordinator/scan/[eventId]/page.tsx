'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Loader2,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Camera,
    Keyboard,
    AlertCircle,
    Scan,
    UserCheck,
    Volume2,
    VolumeX,
    RotateCcw,
    Users,
    Clock,
    ChevronDown,
    CheckCircle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ScanResult {
    success: boolean;
    message: string;
    ticket?: {
        id: string;
        name: string;
        email: string;
        phone?: string;
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

interface RecentCheckIn {
    name: string;
    time: string;
    success: boolean;
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
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const [error, setError] = useState('');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
    const [showRecent, setShowRecent] = useState(false);
    const [scannerReady, setScannerReady] = useState(false);
    const [processingCode, setProcessingCode] = useState<string | null>(null);

    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const manualInputRef = useRef<HTMLInputElement>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    // Play sound
    const playSound = useCallback((type: 'success' | 'error' | 'warning') => {
        if (!soundEnabled) return;
        try {
            const audio = new Audio(`/sounds/${type}.mp3`);
            audio.volume = 0.5;
            audio.play().catch(() => { });
        } catch { }
    }, [soundEnabled]);

    // Vibrate
    const vibrate = useCallback((pattern: number | number[]) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }, []);

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
                    `${apiUrl}/coordinators/my-events`,
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
                setError('Failed to load event');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [eventId, router, apiUrl]);

    // Initialize QR Scanner
    useEffect(() => {
        if (mode !== 'camera' || loading || error) return;

        const initScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode("qr-reader");
                html5QrCodeRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 15,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1,
                        disableFlip: false
                    },
                    (decodedText) => {
                        if (processingCode === decodedText) return;
                        setProcessingCode(decodedText);
                        processScan(decodedText);
                    },
                    () => { }
                );

                setScannerReady(true);
            } catch (err) {
                console.error('Failed to start scanner', err);
                setError('Camera access denied. Please use manual entry.');
                setMode('manual');
            }
        };

        const timeout = setTimeout(initScanner, 100);

        return () => {
            clearTimeout(timeout);
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().catch(() => { });
            }
        };
    }, [mode, loading, error]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().catch(() => { });
            }
        };
    }, []);

    const stopScanner = async () => {
        if (html5QrCodeRef.current?.isScanning) {
            await html5QrCodeRef.current.stop();
        }
        setScannerReady(false);
    };

    const processScan = async (code: string) => {
        if (!code.trim() || scanning) return;

        setScanning(true);
        setScanResult(null);

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(
                `${apiUrl}/scan/check-in`,
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

                setRecentCheckIns(prev => [{
                    name: data.ticket?.name || 'Guest',
                    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    success: true
                }, ...prev.slice(0, 9)]);

                playSound('success');
                vibrate(100);
            } else {
                setScanResult({
                    success: false,
                    message: data.message,
                    alreadyCheckedIn: data.alreadyCheckedIn,
                    ticket: data.ticket
                });

                if (data.alreadyCheckedIn) {
                    playSound('warning');
                    vibrate([50, 50, 50]);
                } else {
                    playSound('error');
                    vibrate([100, 50, 100]);
                }
            }
        } catch (err) {
            setScanResult({
                success: false,
                message: 'Network error. Please try again.'
            });
            playSound('error');
        } finally {
            setScanning(false);
            setManualCode('');
            setTimeout(() => setProcessingCode(null), 3000);
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processScan(manualCode);
    };

    const handleModeSwitch = async (newMode: 'camera' | 'manual') => {
        if (newMode === mode) return;

        if (mode === 'camera') {
            await stopScanner();
        }

        setMode(newMode);
        setScanResult(null);

        if (newMode === 'manual') {
            setTimeout(() => manualInputRef.current?.focus(), 100);
        }
    };

    const handleScanNext = () => {
        setScanResult(null);
        if (mode === 'manual') {
            manualInputRef.current?.focus();
        }
    };

    const checkedInPercent = event?.stats.totalAttendees
        ? Math.round((event.stats.checkedIn / event.stats.totalAttendees) * 100)
        : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Loading scanner...</p>
                </div>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center max-w-md">
                    <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-7 h-7 text-red-500" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-500 mb-6 text-sm">{error}</p>
                    <Link href="/dashboard/coordinator">
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                            Back to Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
                <div className="max-w-lg mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <Link href="/dashboard/coordinator" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>

                        <div className="text-center flex-1 px-4">
                            <h1 className="text-slate-900 font-semibold truncate text-sm">{event?.title}</h1>
                            <p className="text-slate-400 text-xs">Check-In</p>
                        </div>

                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
                {/* Stats */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{event?.stats.totalAttendees || 0}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Total</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-emerald-600">{event?.stats.checkedIn || 0}</p>
                            <p className="text-xs text-slate-400 mt-0.5">Checked In</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-400">
                                {(event?.stats.totalAttendees || 0) - (event?.stats.checkedIn || 0)}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">Remaining</p>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${checkedInPercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 text-right">{checkedInPercent}%</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                        onClick={() => handleModeSwitch('camera')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${mode === 'camera'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Camera className="w-4 h-4" />
                        Camera
                    </button>
                    <button
                        onClick={() => handleModeSwitch('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${mode === 'manual'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Keyboard className="w-4 h-4" />
                        Manual
                    </button>
                </div>

                {/* Scanner / Manual Entry */}
                {!scanResult && (
                    <>
                        {mode === 'camera' && (
                            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                                <div id="qr-reader" className="w-full" style={{ minHeight: '300px' }} />

                                {!scannerReady && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                                        <div className="text-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                                            <p className="text-slate-400 text-sm">Starting camera...</p>
                                        </div>
                                    </div>
                                )}

                                {scanning && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                                        <div className="text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-white mx-auto mb-2" />
                                            <p className="text-white text-sm font-medium">Processing...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === 'manual' && (
                            <div className="bg-white rounded-xl border border-slate-200 p-5">
                                <form onSubmit={handleManualSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">
                                            Ticket Code
                                        </label>
                                        <Input
                                            ref={manualInputRef}
                                            value={manualCode}
                                            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                            placeholder="TKT-XXXXXXXX"
                                            className="h-14 text-lg font-mono text-center tracking-widest border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                            autoFocus
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={scanning || !manualCode.trim()}
                                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-50"
                                    >
                                        {scanning ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Checking...
                                            </>
                                        ) : (
                                            <>
                                                <UserCheck className="w-4 h-4 mr-2" />
                                                Check In
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        )}
                    </>
                )}

                {/* Scan Result */}
                {scanResult && (
                    <div className={`rounded-xl border-2 overflow-hidden ${scanResult.success
                        ? 'bg-emerald-50 border-emerald-200'
                        : scanResult.alreadyCheckedIn
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-red-50 border-red-200'
                        }`}>
                        <div className="p-6 text-center">
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

                            <h3 className={`text-lg font-semibold mb-1 ${scanResult.success
                                ? 'text-emerald-900'
                                : scanResult.alreadyCheckedIn
                                    ? 'text-amber-900'
                                    : 'text-red-900'
                                }`}>
                                {scanResult.success ? 'Checked In' : scanResult.alreadyCheckedIn ? 'Already Checked In' : 'Invalid Ticket'}
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
                                <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                                    <p className="font-semibold text-slate-900">{scanResult.ticket.name}</p>
                                    <p className="text-slate-500 text-sm">{scanResult.ticket.email}</p>
                                </div>
                            )}

                            <Button
                                onClick={handleScanNext}
                                className="mt-5 w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Scan Next
                            </Button>
                        </div>
                    </div>
                )}

                {/* Recent Check-ins */}
                {recentCheckIns.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200">
                        <button
                            onClick={() => setShowRecent(!showRecent)}
                            className="w-full p-3.5 flex items-center justify-between text-left"
                        >
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-700">Recent</span>
                                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                    {recentCheckIns.length}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showRecent ? 'rotate-180' : ''}`} />
                        </button>

                        {showRecent && (
                            <div className="px-3.5 pb-3.5 space-y-1.5 border-t border-slate-100 pt-2">
                                {recentCheckIns.map((checkin, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                                        <div className="flex items-center gap-2.5">
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            <span className="text-slate-700 text-sm">{checkin.name}</span>
                                        </div>
                                        <span className="text-slate-400 text-xs">{checkin.time}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            <style jsx global>{`
                #qr-reader video {
                    border-radius: 0.75rem !important;
                    object-fit: cover !important;
                }
                #qr-reader__scan_region {
                    background: transparent !important;
                }
                #qr-reader__dashboard {
                    display: none !important;
                }
                #qr-reader__dashboard_section_swaplink {
                    display: none !important;
                }
            `}</style>
        </div>
    );
}
