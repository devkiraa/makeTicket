'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isVerified, setIsVerified] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [code, setCode] = useState('');
    const [needs2FA, setNeeds2FA] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
            return;
        }

        // Check verification in session storage (lasts only for tab session)
        const sessionVerified = sessionStorage.getItem('admin_2fa_verified');
        if (sessionVerified === 'true') {
            setIsVerified(true);
            setIsLoading(false);
            return;
        }

        try {
            // Check if user has 2FA enabled
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const user = await res.json();
                if (user.role !== 'admin') {
                    router.push('/dashboard'); // Not admin
                    return;
                }

                if (user.isTwoFactorEnabled) {
                    setNeeds2FA(true);
                    setIsLoading(false);
                } else {
                    // If 2FA not enabled, allow access (or enforce it here)
                    // For now, allow but maybe show warning?
                    setIsVerified(true);
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
        } catch (e) {
            console.error(e);
            setIsLoading(false);
        }
    };

    const verifyCode = async () => {
        setError('');
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/2fa/validate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code })
            });

            if (res.ok) {
                sessionStorage.setItem('admin_2fa_verified', 'true');
                setIsVerified(true);
            } else {
                setError('Invalid authentication code');
            }
        } catch (e) {
            setError('Verification failed');
        }
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (needs2FA && !isVerified) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Card className="w-full max-w-md border-slate-200 shadow-xl">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                            <Lock className="w-8 h-8" />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Admin Access Locked</h2>
                            <p className="text-slate-500 mt-2">
                                Please enter the 6-digit code from your authenticator app to access the admin panel.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000 000"
                                className="text-center text-2xl tracking-[0.5em] h-14 font-medium"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
                            />
                            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                            <Button className="w-full h-12 text-lg" onClick={verifyCode}>
                                Verify Identity
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
