'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Replaced missing Alert component with styled divs
import { Download, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function GDPRSettingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [downloading, setDownloading] = useState(false);
    const [deletionStep, setDeletionStep] = useState<'idle' | 'requested' | 'confirmed'>('idle');
    const [confirmCode, setConfirmCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleExportData = async () => {
        setDownloading(true);
        try {
            const response = await api.get('/gdpr/export-data', { responseType: 'blob' });

            // Handle blob conversion manually if api wrapper doesn't support blob automatically
            // Our api wrapper returns { data, status }
            // If data is blob, we might need to adjust api wrapper or handle it here
            // But let's assume api wrapper handles json mainly.
            // Actually, for blob, we should use fetch or specialized call.
            // Let's use direct fetch for blob to be safe.

            // Re-implement specialized fetch for blob
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/gdpr/export-data`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `maketicket_data_${new Date().toISOString()}.json`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            toast({
                title: "Data Exported",
                description: "Your personal data has been downloaded.",
            });
        } catch (error) {
            toast({
                title: "Export Failed",
                description: "Could not export your data. Please try again.",
                variant: "destructive"
            });
        } finally {
            setDownloading(false);
        }
    };

    const handleRequestDeletion = async () => {
        setLoading(true);
        try {
            await api.post('/gdpr/delete-account/request', {});
            setDeletionStep('requested');
            toast({
                title: "Confirmation Code Sent",
                description: "Please check your email for the deletion confirmation code.",
            });
        } catch (error: any) {
            toast({
                title: "Request Failed",
                description: error.message || "Failed to initiate deletion request.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDeletion = async () => {
        if (!confirmCode) return;
        setLoading(true);
        try {
            await api.post('/gdpr/delete-account/confirm', { code: confirmCode });
            setDeletionStep('confirmed');
            toast({
                title: "Account Deleted",
                description: "Your account has been permanently deleted.",
            });

            // Logout and redirect
            localStorage.removeItem('auth_token');
            localStorage.removeItem('admin_token');
            setTimeout(() => {
                router.push('/');
                window.location.reload();
            }, 2000);
        } catch (error: any) {
            toast({
                title: "Deletion Failed",
                description: error.message || "Invalid code or expired session.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Privacy & Data Settings</h1>
                <p className="text-muted-foreground mt-2">Manage your personal data and privacy rights (GDPR).</p>
            </div>

            {/* Data Export */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Export Your Data
                    </CardTitle>
                    <CardDescription>
                        Download a copy of all your personal data, tickets, and event history in JSON format.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={handleExportData} disabled={downloading}>
                        {downloading ? "Preparing Download..." : "Download Data Archive"}
                    </Button>
                </CardFooter>
            </Card>

            {/* Data Deletion */}
            <Card className="border-red-200 bg-red-50/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                        <Trash2 className="h-5 w-5" />
                        Delete Account
                    </CardTitle>
                    <CardDescription>
                        Permanently delete your account and all associated data. This action cannot be undone.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {deletionStep === 'idle' && (
                        <div className="flex w-full items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
                            <div className="flex-1 space-y-1">
                                <h5 className="font-medium leading-none tracking-tight">Warning</h5>
                                <div className="text-sm opacity-90">
                                    Deleting your account will remove all your events, tickets, and personal information.
                                    If you have active events, please cancel them first.
                                </div>
                            </div>
                        </div>
                    )}

                    {deletionStep === 'requested' && (
                        <div className="space-y-4">
                            <div className="flex w-full items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />
                                <div className="flex-1 space-y-1">
                                    <h5 className="font-medium leading-none tracking-tight">Check your email</h5>
                                    <div className="text-sm opacity-90">
                                        We've sent a 6-digit confirmation code to your email address.
                                        Enter it below to confirm deletion.
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 max-w-sm">
                                <Input
                                    placeholder="Confirmation Code"
                                    value={confirmCode}
                                    onChange={(e) => setConfirmCode(e.target.value)}
                                    maxLength={6}
                                />
                                <Button
                                    variant="destructive"
                                    onClick={handleConfirmDeletion}
                                    disabled={loading || confirmCode.length < 6}
                                >
                                    {loading ? "Deleting..." : "Confirm Delete"}
                                </Button>
                            </div>
                        </div>
                    )}

                    {deletionStep === 'confirmed' && (
                        <div className="flex w-full items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                            <div className="flex-1 space-y-1">
                                <h5 className="font-medium leading-none tracking-tight">Success</h5>
                                <div className="text-sm opacity-90">
                                    Your account has been deleted. Redirecting...
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                {deletionStep === 'idle' && (
                    <CardFooter>
                        <Button variant="destructive" onClick={handleRequestDeletion} disabled={loading}>
                            {loading ? "Processing..." : "Request Account Deletion"}
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
