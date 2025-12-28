'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Ticket, ArrowRight, Loader2, CheckCircle2, LogOut } from 'lucide-react';

interface UserProfile {
    email: string;
    name?: string;
    avatar?: string;
    googleAvatar?: string;
    googleId?: string;
}

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [loggedInUser, setLoggedInUser] = useState<UserProfile | null>(null);

    // Check if user is already logged in
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setCheckingAuth(false);
                return;
            }

            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const userData = await res.json();
                    setLoggedInUser(userData);
                }
            } catch (e) {
                console.error('Auth check failed', e);
            } finally {
                setCheckingAuth(false);
            }
        };

        checkAuth();
    }, []);

    // Check for session expired message
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('sessionExpired') === 'true') {
            setError('Your session was terminated. Please log in again.');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                document.cookie = `auth_token=${data.token}; path=/`;
            }

            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        setLoggedInUser(null);
    };

    // Loading state
    if (checkingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 font-sans selection:bg-indigo-100">
            <Link href="/" className="mb-8 flex items-center gap-2 group">
                <img src="/logo.png" alt="GrabMyPass" className="h-10 w-10 rounded-lg group-hover:scale-105 transition-transform" />
                <span className="font-bold text-xl text-slate-900 tracking-tight">GrabMyPass</span>
            </Link>

            <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl">
                {loggedInUser ? (
                    // Already logged in - show profile
                    <>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl text-center font-bold text-slate-900">Welcome back!</CardTitle>
                            <CardDescription className="text-center text-slate-500">
                                You're already signed in
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* User Profile Card */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                    {(loggedInUser.avatar || loggedInUser.googleAvatar) ? (
                                        <img src={loggedInUser.avatar || loggedInUser.googleAvatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-bold text-indigo-600">
                                            {(loggedInUser.name?.[0] || loggedInUser.email[0]).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 truncate">
                                        {loggedInUser.name || loggedInUser.email.split('@')[0]}
                                    </h3>
                                    <p className="text-sm text-slate-500 truncate">{loggedInUser.email}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                        <span className="text-xs text-green-600 font-medium">
                                            {loggedInUser.googleId ? 'Google Account' : 'Verified'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                onClick={() => router.push('/dashboard')}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11"
                            >
                                Continue to Dashboard
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleLogout}
                                className="w-full border-slate-200 text-slate-600 hover:text-slate-900"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign out and use different account
                            </Button>
                        </CardFooter>
                    </>
                ) : (
                    // Not logged in - show login form
                    <>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl text-center font-bold text-slate-900">Welcome back</CardTitle>
                            <CardDescription className="text-center text-slate-500">
                                Enter your credentials to access your dashboard
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleLogin}>
                            <CardContent className="space-y-4">
                                {error && (
                                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                                        <span className="font-semibold">Error:</span> {error}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-700">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="bg-white border-slate-200 focus-visible:ring-indigo-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-slate-700">Password</Label>
                                        <Link
                                            href="#"
                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-white border-slate-200 focus-visible:ring-indigo-600"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4">
                                <Button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors h-10"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-slate-500">Or continue with</span>
                                    </div>
                                </div>
                                <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/google`} className="w-full">
                                    <Button variant="outline" type="button" className="w-full border-slate-200 hover:bg-slate-50 hover:text-slate-900">
                                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        Continue with Google
                                    </Button>
                                </a>

                                <p className="px-8 text-center text-sm text-slate-500">
                                    Don't have an account?{" "}
                                    <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline">
                                        Sign up
                                    </Link>
                                </p>
                            </CardFooter>
                        </form>
                    </>
                )}
            </Card>
        </div>
    );
}

