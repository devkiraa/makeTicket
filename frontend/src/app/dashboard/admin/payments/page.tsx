'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Search,
    Loader2,
    ChevronDown,
    Eye,
    RefreshCw,
    CheckCircle2,
    XCircle,
    Clock,
    CreditCard,
    FileText,
    Sparkles,
    AlertTriangle,
    Copy,
    Image as ImageIcon,
    Send,
    Shield,
    Upload
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface PaymentProof {
    screenshotUrl: string;
    utr: string;
    amount: number;
    uploadedAt: string;
    verificationStatus: 'pending' | 'verified' | 'rejected' | 'not_required';
    verifiedAt?: string;
    verificationMethod?: string;
    rejectionReason?: string;
}

interface PendingPayment {
    _id: string;
    eventId: {
        _id: string;
        title: string;
        slug: string;
        price: number;
    };
    userId?: {
        name: string;
        email: string;
    };
    guestEmail?: string;
    guestName?: string;
    pricePaid: number;
    paymentProof: PaymentProof;
    formData: any;
    createdAt: string;
    isDuplicateUtr?: boolean;
}

export default function AdminPaymentVerificationPage() {
    const { toast } = useToast();
    const [payments, setPayments] = useState<PendingPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);

    // Bulk Verify State
    const [bulkMode, setBulkMode] = useState(false);
    const [statementText, setStatementText] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkResults, setBulkResults] = useState<any>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    // Detail Sheet State
    const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Modals
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

    const fetchPayments = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch(
                `${apiUrl}/payment-verification/pending-payments?page=1&limit=100`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments);
                setTotalPages(data.pages);
            } else {
                toast({ title: 'Error', description: 'Failed to load payments', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to fetch payments', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    // Filtered payments
    const filteredPayments = payments.filter(payment => {
        const name = payment.userId?.name || payment.guestName || '';
        const email = payment.userId?.email || payment.guestEmail || '';
        const utr = payment.paymentProof?.utr || '';
        const eventTitle = payment.eventId?.title || '';

        return (
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            utr.toLowerCase().includes(searchTerm.toLowerCase()) ||
            eventTitle.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const visiblePayments = filteredPayments.slice(0, visibleCount);
    const hasMore = visibleCount < filteredPayments.length;

    useEffect(() => {
        setVisibleCount(20);
    }, [searchTerm]);

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 20);
    };

    // Stats
    const totalPending = payments.length;
    const duplicateCount = payments.filter(p => p.isDuplicateUtr).length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.pricePaid || 0), 0);
    const uniqueEvents = new Set(payments.map(p => p.eventId?._id)).size;

    const handleVerify = async () => {
        if (!selectedPayment) return;
        const token = localStorage.getItem('auth_token');
        setActionLoading(selectedPayment._id);

        try {
            const res = await fetch(
                `${apiUrl}/payment/tickets/${selectedPayment._id}/verify-manual`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: 'verified' })
                }
            );

            if (res.ok) {
                toast({ title: 'Success', description: 'Payment verified successfully' });
                setVerifyModalOpen(false);
                setIsSheetOpen(false);
                fetchPayments();
            } else {
                toast({ title: 'Error', description: 'Failed to verify payment', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Verification failed', variant: 'destructive' });
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async () => {
        if (!selectedPayment) return;
        const token = localStorage.getItem('auth_token');
        setActionLoading(selectedPayment._id);

        try {
            const res = await fetch(
                `${apiUrl}/payment/tickets/${selectedPayment._id}/verify-manual`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        status: 'rejected',
                        rejectionReason
                    })
                }
            );

            if (res.ok) {
                toast({ title: 'Success', description: 'Payment rejected' });
                setRejectModalOpen(false);
                setIsSheetOpen(false);
                setRejectionReason('');
                fetchPayments();
            } else {
                toast({ title: 'Error', description: 'Failed to reject payment', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Rejection failed', variant: 'destructive' });
        } finally {
            setActionLoading(null);
        }
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast({ title: 'Invalid File', description: 'Please upload a PDF file', variant: 'destructive' });
            return;
        }

        setPdfLoading(true);
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                fullText += pageText + '\n';
            }

            setStatementText(fullText);
            toast({ title: 'PDF Loaded', description: `Extracted text from ${pdf.numPages} page(s)` });
        } catch (error) {
            console.error('PDF extraction error:', error);
            toast({ title: 'Error', description: 'Failed to extract text from PDF', variant: 'destructive' });
        } finally {
            setPdfLoading(false);
            if (pdfInputRef.current) {
                pdfInputRef.current.value = '';
            }
        }
    };

    const handleBulkVerify = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token || !statementText.trim()) return;

        setBulkLoading(true);
        try {
            const res = await fetch(`${apiUrl}/payment-verification/bulk-verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ statementText })
            });

            const data = await res.json();

            if (res.ok) {
                setBulkResults(data);
                toast({ title: 'Batch Complete', description: data.message });
                fetchPayments();
            } else {
                toast({ title: 'Error', description: data.message || 'Bulk verification failed', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Network error during bulk verification', variant: 'destructive' });
        } finally {
            setBulkLoading(false);
        }
    };

    const handleViewDetails = (payment: PendingPayment) => {
        setSelectedPayment(payment);
        setIsSheetOpen(true);
    };

    const handleCopyUtr = (utr: string) => {
        navigator.clipboard.writeText(utr);
        toast({ title: 'Copied', description: 'UTR copied to clipboard' });
    };

    if (loading) return (
        <div className="space-y-8 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-7 w-48 bg-slate-200 rounded" />
                    <div className="h-4 w-64 bg-slate-100 rounded" />
                </div>
                <div className="h-10 w-28 bg-slate-200 rounded" />
            </div>
            <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="h-8 w-16 bg-slate-200 rounded mb-2" />
                        <div className="h-4 w-20 bg-slate-100 rounded" />
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="px-4 py-4 flex gap-8 border-t border-slate-100">
                        <div className="h-10 w-10 bg-slate-100 rounded" />
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                        <div className="h-4 w-48 bg-slate-100 rounded" />
                        <div className="h-5 w-20 bg-slate-100 rounded-full ml-auto" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Admin Payment Console</h1>
                        <p className="text-slate-500">Global oversight for all pending payments across events.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 bg-white"
                        onClick={fetchPayments}
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        variant={bulkMode ? 'default' : 'outline'}
                        size="sm"
                        className={bulkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-200 bg-white'}
                        onClick={() => setBulkMode(!bulkMode)}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {bulkMode ? 'Hide Auto-Verify' : 'Auto-Verify'}
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{totalPending}</p>
                                <p className="text-xs text-slate-500">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">₹{totalAmount.toLocaleString()}</p>
                                <p className="text-xs text-slate-500">Total Value</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{duplicateCount}</p>
                                <p className="text-xs text-slate-500">Duplicate UTRs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{uniqueEvents}</p>
                                <p className="text-xs text-slate-500">Events</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bulk Auto-Verify Panel */}
            {bulkMode && (
                <Card className="border-indigo-200 bg-indigo-50/50 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-indigo-600" />
                            Bulk Auto-Verify with Bank Statement
                        </CardTitle>
                        <CardDescription>
                            Upload a PDF or paste your bank statement text to automatically match and verify payments across all events.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* PDF Upload */}
                        <div className="flex items-center gap-3">
                            <input
                                ref={pdfInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handlePdfUpload}
                                className="hidden"
                                id="admin-pdf-upload"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-slate-200 bg-white"
                                onClick={() => pdfInputRef.current?.click()}
                                disabled={pdfLoading}
                            >
                                {pdfLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Extracting...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload PDF
                                    </>
                                )}
                            </Button>
                            <span className="text-xs text-slate-500">or paste text below</span>
                        </div>

                        <Textarea
                            placeholder="Paste transaction rows from your bank statement here...&#10;Include Date, UTR/Description, and Amount columns."
                            value={statementText}
                            onChange={(e) => setStatementText(e.target.value)}
                            rows={6}
                            className="font-mono text-xs bg-white border-slate-200"
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500">
                                The system will match UTR numbers and amounts to verify payments automatically.
                            </p>
                            <Button
                                onClick={handleBulkVerify}
                                disabled={bulkLoading || !statementText.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                {bulkLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Run Auto-Verify
                                    </>
                                )}
                            </Button>
                        </div>
                        {bulkResults && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <div>
                                    <p className="font-medium text-emerald-900">{bulkResults.message}</p>
                                    <p className="text-xs text-emerald-700">
                                        {bulkResults.results?.filter((r: any) => r.status === 'VERIFIED').length || 0} payments verified
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by name, email, UTR, or event..."
                    className="pl-9 bg-white border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Payments Table */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Global Pending Payments</CardTitle>
                            <CardDescription>
                                {loading ? 'Loading...' : (
                                    `Showing ${visiblePayments.length} of ${filteredPayments.length} payments` +
                                    (filteredPayments.length !== payments.length ? ` (${payments.length} total)` : '')
                                )}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {payments.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 mx-6 mb-6 border-2 border-dashed border-slate-100 rounded-lg">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-300" />
                            <p className="font-medium mb-1">All caught up!</p>
                            <p className="text-sm">No pending payments to verify across any events.</p>
                        </div>
                    ) : filteredPayments.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p className="font-medium">No matching payments</p>
                            <p className="text-sm">Try adjusting your search</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-100">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-medium">Proof</th>
                                        <th className="px-6 py-3 text-left font-medium">Attendee</th>
                                        <th className="px-6 py-3 text-left font-medium">Event</th>
                                        <th className="px-6 py-3 text-left font-medium">Amount / UTR</th>
                                        <th className="px-6 py-3 text-left font-medium">Uploaded</th>
                                        <th className="px-6 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visiblePayments.map((payment) => (
                                        <tr key={payment._id} className="bg-white hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div
                                                    className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 cursor-pointer overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all"
                                                    onClick={() => { setSelectedPayment(payment); setImageModalOpen(true); }}
                                                >
                                                    {payment.paymentProof.screenshotUrl ? (
                                                        <img
                                                            src={`${baseUrl}${payment.paymentProof.screenshotUrl}`}
                                                            alt="Proof"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <ImageIcon className="w-4 h-4 text-slate-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium text-slate-900">{payment.userId?.name || payment.guestName}</p>
                                                    <p className="text-slate-500 text-xs">{payment.userId?.email || payment.guestEmail}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-medium">
                                                    {payment.eventId.title}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <p className="font-bold text-slate-900">₹{payment.pricePaid}</p>
                                                    <div className="flex items-center gap-1">
                                                        <code className={`text-xs px-1.5 py-0.5 rounded font-mono ${payment.isDuplicateUtr
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {payment.paymentProof.utr || 'No UTR'}
                                                        </code>
                                                        {payment.paymentProof.utr && (
                                                            <button
                                                                onClick={() => handleCopyUtr(payment.paymentProof.utr)}
                                                                className="text-slate-400 hover:text-slate-600"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {payment.isDuplicateUtr && (
                                                        <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                                                            <AlertTriangle className="w-3 h-3" />
                                                            Duplicate
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {payment.paymentProof.uploadedAt
                                                    ? new Date(payment.paymentProof.uploadedAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : '-'
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600"
                                                        onClick={() => handleViewDetails(payment)}
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                                                        onClick={() => { setSelectedPayment(payment); setVerifyModalOpen(true); }}
                                                        title="Approve"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                                        onClick={() => { setSelectedPayment(payment); setRejectModalOpen(true); }}
                                                        title="Reject"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Load More Button */}
                            {hasMore && (
                                <div className="p-4 text-center border-t border-slate-100">
                                    <Button
                                        variant="outline"
                                        onClick={handleLoadMore}
                                        className="border-slate-200"
                                    >
                                        <ChevronDown className="w-4 h-4 mr-2" />
                                        Load More ({filteredPayments.length - visibleCount} remaining)
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Payment Details Sheet */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent className="overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>Payment Details</SheetTitle>
                        <SheetDescription>
                            Review payment proof and attendee information
                        </SheetDescription>
                    </SheetHeader>

                    {selectedPayment && (
                        <div className="mt-6 space-y-6">
                            {/* Status Badge */}
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-slate-900">{selectedPayment.userId?.name || selectedPayment.guestName}</p>
                                    <p className="text-sm text-amber-600 font-medium">Pending Verification</p>
                                </div>
                            </div>

                            {/* Duplicate Warning */}
                            {selectedPayment.isDuplicateUtr && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    <div>
                                        <p className="font-medium text-red-900 text-sm">Duplicate UTR Detected</p>
                                        <p className="text-xs text-red-700">This UTR is also used in another registration.</p>
                                    </div>
                                </div>
                            )}

                            {/* Screenshot */}
                            {selectedPayment.paymentProof.screenshotUrl && (
                                <div
                                    className="cursor-pointer rounded-lg overflow-hidden border border-slate-200"
                                    onClick={() => setImageModalOpen(true)}
                                >
                                    <img
                                        src={`${baseUrl}${selectedPayment.paymentProof.screenshotUrl}`}
                                        alt="Payment Screenshot"
                                        className="w-full object-contain max-h-64"
                                    />
                                </div>
                            )}

                            {/* Info Cards */}
                            <div className="grid gap-3">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs uppercase text-slate-500 font-medium mb-1">Email</p>
                                    <p className="text-slate-900 break-all">{selectedPayment.userId?.email || selectedPayment.guestEmail}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs uppercase text-slate-500 font-medium mb-1">Event</p>
                                    <p className="text-slate-900">{selectedPayment.eventId.title}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs uppercase text-slate-500 font-medium mb-1">Amount</p>
                                        <p className="text-slate-900 font-bold text-lg">₹{selectedPayment.pricePaid}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs uppercase text-slate-500 font-medium mb-1">UTR / Txn ID</p>
                                        <div className="flex items-center gap-2">
                                            <code className="text-sm font-mono text-slate-900">{selectedPayment.paymentProof.utr || '-'}</code>
                                            {selectedPayment.paymentProof.utr && (
                                                <button
                                                    onClick={() => handleCopyUtr(selectedPayment.paymentProof.utr)}
                                                    className="text-slate-400 hover:text-slate-600"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {selectedPayment.paymentProof.uploadedAt && (
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                        <p className="text-xs uppercase text-slate-500 font-medium mb-1">Uploaded At</p>
                                        <p className="text-slate-900">
                                            {new Date(selectedPayment.paymentProof.uploadedAt).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-slate-200 space-y-2">
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => setVerifyModalOpen(true)}
                                    disabled={actionLoading === selectedPayment._id}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Approve Payment
                                </Button>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => setRejectModalOpen(true)}
                                    disabled={actionLoading === selectedPayment._id}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Payment
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            {/* Image Preview Modal */}
            <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden">
                    <DialogTitle className="sr-only">Payment Screenshot</DialogTitle>
                    {selectedPayment && selectedPayment.paymentProof.screenshotUrl && (
                        <img
                            src={`${baseUrl}${selectedPayment.paymentProof.screenshotUrl}`}
                            alt="Payment Screenshot"
                            className="w-full max-h-[80vh] object-contain"
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Verify Modal */}
            <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Payment?</DialogTitle>
                        <DialogDescription>
                            This will issue the ticket to the attendee and send a confirmation email.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPayment?.isDuplicateUtr && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <p className="text-sm text-red-900">Warning: This UTR appears to be a duplicate.</p>
                        </div>
                    )}
                    {selectedPayment && (
                        <div className="py-4 space-y-2">
                            <p className="text-sm"><span className="text-slate-500">Attendee:</span> <span className="font-medium">{selectedPayment.userId?.name || selectedPayment.guestName}</span></p>
                            <p className="text-sm"><span className="text-slate-500">Amount:</span> <span className="font-bold">₹{selectedPayment.pricePaid}</span></p>
                            <p className="text-sm"><span className="text-slate-500">UTR:</span> <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{selectedPayment.paymentProof.utr || '-'}</code></p>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setVerifyModalOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleVerify}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Payment?</DialogTitle>
                        <DialogDescription>
                            The attendee will need to submit a new payment proof.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Reason for rejection (optional but recommended)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
