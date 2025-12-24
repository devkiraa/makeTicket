'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, Loader2, CheckCircle2, XCircle, QrCode } from 'lucide-react';

export default function ValidatorPage() {
    const [data, setData] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
    const [mode, setMode] = useState<'manual' | 'camera'>('manual');
    const [loading, setLoading] = useState(false);
    const [manualCode, setManualCode] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

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
            setStatus({ type: 'error', message: 'Camera access denied. Please use manual entry.' });
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

    const validate = async (hash: string) => {
        if (!hash.trim() || loading) return;

        setLoading(true);
        setData(hash);
        setStatus({ type: '', message: '' });

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ hash })
            });
            const json = await res.json();
            if (res.ok) {
                setStatus({ type: 'success', message: `Approved: ${json.ticket?._id || 'Valid Ticket'}` });
            } else {
                setStatus({ type: 'error', message: json.message || 'Invalid ticket' });
            }
        } catch (e) {
            setStatus({ type: 'error', message: 'Network Error' });
        } finally {
            setLoading(false);
            setManualCode('');
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        validate(manualCode);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md border-slate-200 shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                        <QrCode className="w-6 h-6 text-indigo-600" />
                    </div>
                    <CardTitle className="text-slate-900">Validate Ticket</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">Scan or enter a ticket code to validate</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => { stopCamera(); setMode('manual'); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${mode === 'manual'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Keyboard className="w-4 h-4" />
                            Manual
                        </button>
                        <button
                            onClick={startCamera}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${mode === 'camera'
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Camera className="w-4 h-4" />
                            Camera
                        </button>
                    </div>

                    {/* Camera View */}
                    {mode === 'camera' && (
                        <div className="relative aspect-square bg-slate-900 rounded-xl overflow-hidden">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-48 h-48 relative">
                                    <div className="absolute inset-0 border-2 border-white/20 rounded-xl" />
                                    <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl" />
                                    <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl" />
                                    <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl" />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl" />
                                </div>
                            </div>
                            <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-sm">
                                Point at QR code
                            </p>
                        </div>
                    )}

                    {/* Manual Entry */}
                    {mode === 'manual' && (
                        <form onSubmit={handleManualSubmit} className="space-y-3">
                            <Input
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                placeholder="Enter ticket code or hash"
                                className="h-12 text-center font-mono tracking-wider border-slate-200"
                                autoFocus
                            />
                            <Button
                                type="submit"
                                disabled={loading || !manualCode.trim()}
                                className="w-full h-11 bg-indigo-600 hover:bg-indigo-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Validating...
                                    </>
                                ) : (
                                    'Validate'
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Result */}
                    {status.type && (
                        <div className={`p-4 rounded-xl text-center ${status.type === 'success'
                                ? 'bg-emerald-50 border border-emerald-200'
                                : 'bg-red-50 border border-red-200'
                            }`}>
                            <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${status.type === 'success' ? 'bg-emerald-100' : 'bg-red-100'
                                }`}>
                                {status.type === 'success' ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-600" />
                                )}
                            </div>
                            <p className={`font-semibold ${status.type === 'success' ? 'text-emerald-900' : 'text-red-900'
                                }`}>
                                {status.type === 'success' ? 'Valid Ticket' : 'Invalid'}
                            </p>
                            <p className={`text-sm mt-1 ${status.type === 'success' ? 'text-emerald-700' : 'text-red-700'
                                }`}>
                                {status.message}
                            </p>
                            {data && (
                                <p className="text-xs text-slate-500 mt-2 font-mono truncate">
                                    Code: {data}
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <p className="text-sm text-slate-400 mt-6">
                Powered by <span className="font-semibold text-slate-600">GrabMyPass</span>
            </p>
        </div>
    );
}
