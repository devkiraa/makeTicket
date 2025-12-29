'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, KeyRound, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [invalidLink, setInvalidLink] = useState(false);

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            setInvalidLink(true);
        }
    }, [token, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            setSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Invalid link state
    if (invalidLink) {
        return (
            <>
                <CardHeader className="space-y-1">
                    <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <CardTitle className="text-2xl text-center font-bold text-slate-900">Invalid Reset Link</CardTitle>
                    <CardDescription className="text-center text-slate-500">
                        This password reset link is invalid or has expired.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-700">
                        <p>This can happen if:</p>
                        <ul className="list-disc list-inside space-y-1 mt-2">
                            <li>The link has expired (valid for 30 minutes)</li>
                            <li>The link has already been used</li>
                            <li>The link was copied incorrectly</li>
                        </ul>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Link href="/forgot-password" className="w-full">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                            Request New Reset Link
                        </Button>
                    </Link>
                    <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline flex items-center justify-center gap-1">
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>
                </CardFooter>
            </>
        );
    }

    // Success state
    if (success) {
        return (
            <>
                <CardHeader className="space-y-1">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-center font-bold text-slate-900">Password Reset!</CardTitle>
                    <CardDescription className="text-center text-slate-500">
                        Your password has been successfully reset.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 text-center">
                        <p>Redirecting you to login...</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Link href="/login" className="w-full">
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                            Go to Login Now
                        </Button>
                    </Link>
                </CardFooter>
            </>
        );
    }

    // Form state
    return (
        <>
            <CardHeader className="space-y-1">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                    <KeyRound className="w-8 h-8 text-indigo-600" />
                </div>
                <CardTitle className="text-2xl text-center font-bold text-slate-900">Set new password</CardTitle>
                <CardDescription className="text-center text-slate-500">
                    Your new password must be different from previously used passwords.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                            <span className="font-semibold">Error:</span> {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-700">New Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-white border-slate-200 focus-visible:ring-indigo-600 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">Must be at least 6 characters</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-slate-700">Confirm Password</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="bg-white border-slate-200 focus-visible:ring-indigo-600 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
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
                                Resetting...
                            </>
                        ) : (
                            'Reset Password'
                        )}
                    </Button>
                    <Link href="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline flex items-center justify-center gap-1">
                        <ArrowLeft className="h-4 w-4" />
                        Back to login
                    </Link>
                </CardFooter>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 font-sans selection:bg-indigo-100">
            <Link href="/" className="mb-8 flex items-center gap-2 group">
                <img src="/logo.png" alt="MakeTicket" className="h-10 w-10 rounded-lg group-hover:scale-105 transition-transform" />
                <span className="font-bold text-xl text-slate-900 tracking-tight">MakeTicket</span>
            </Link>

            <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl">
                <Suspense fallback={
                    <div className="p-8 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                }>
                    <ResetPasswordForm />
                </Suspense>
            </Card>
        </div>
    );
}
