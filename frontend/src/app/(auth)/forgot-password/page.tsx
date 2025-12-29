'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 font-sans selection:bg-indigo-100">
            <Link href="/" className="mb-8 flex items-center gap-2 group">
                <img src="/logo.png" alt="MakeTicket" className="h-10 w-10 rounded-lg group-hover:scale-105 transition-transform" />
                <span className="font-bold text-xl text-slate-900 tracking-tight">MakeTicket</span>
            </Link>

            <Card className="w-full max-w-md border-slate-200 bg-white shadow-xl">
                {success ? (
                    // Success state
                    <>
                        <CardHeader className="space-y-1">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl text-center font-bold text-slate-900">Check your email</CardTitle>
                            <CardDescription className="text-center text-slate-500">
                                We've sent a password reset link to <span className="font-semibold text-slate-700">{email}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600">
                                <p className="mb-2">Didn't receive the email?</p>
                                <ul className="list-disc list-inside space-y-1 text-slate-500">
                                    <li>Check your spam or junk folder</li>
                                    <li>Make sure you entered the correct email</li>
                                    <li>Wait a few minutes and try again</li>
                                </ul>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                onClick={() => {
                                    setSuccess(false);
                                    setEmail('');
                                }}
                                variant="outline"
                                className="w-full border-slate-200"
                            >
                                Try a different email
                            </Button>
                            <Link href="/login" className="w-full">
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Login
                                </Button>
                            </Link>
                        </CardFooter>
                    </>
                ) : (
                    // Form state
                    <>
                        <CardHeader className="space-y-1">
                            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                <Mail className="w-8 h-8 text-indigo-600" />
                            </div>
                            <CardTitle className="text-2xl text-center font-bold text-slate-900">Forgot password?</CardTitle>
                            <CardDescription className="text-center text-slate-500">
                                No worries, we'll send you reset instructions.
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
                                            Sending...
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
                )}
            </Card>
        </div>
    );
}
