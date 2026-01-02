'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Upload,
    CheckCircle,
    Loader2,
    AlertCircle,
    XCircle,
    AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';

interface PaymentProofUploadProps {
    ticketId: string;
    expectedAmount: number;
    expectedPayeeName?: string;
    expectedUpiId?: string;
    onUploadSuccess?: () => void;
}

interface VerificationResult {
    isValidPayment: boolean;
    utr: { value: string; verified: boolean };
    amount: { value: number; verified: boolean; matches: boolean };
    date: { value: string; verified: boolean };
    payee: { value: string; verified: boolean };
    paymentApp: string;
    errors: string[];
}

export function PaymentProofUpload({
    ticketId,
    expectedAmount,
    expectedPayeeName = '',
    expectedUpiId = '',
    onUploadSuccess
}: PaymentProofUploadProps) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [isProcessingOcr, setIsProcessingOcr] = useState(false);
    const [utr, setUtr] = useState('');
    const [detectedAmount, setDetectedAmount] = useState<number | null>(null);
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [ocrResults, setOcrResults] = useState<any>(null);
    const [verificationErrors, setVerificationErrors] = useState<string[]>([]);
    const [isVerified, setIsVerified] = useState(false);
    const [amountMismatch, setAmountMismatch] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Extract payment details from UPI screenshot
    const extractPaymentDetails = (text: string): VerificationResult => {
        const fullText = text.toLowerCase();
        const errors: string[] = [];

        // Detect payment app
        let paymentApp = '';
        if (fullText.includes('google pay') || fullText.includes('gpay') || fullText.includes('g pay')) {
            paymentApp = 'Google Pay';
        } else if (fullText.includes('phonepe') || fullText.includes('phone pe')) {
            paymentApp = 'PhonePe';
        } else if (fullText.includes('paytm')) {
            paymentApp = 'Paytm';
        } else if (fullText.includes('bhim') || fullText.includes('upi')) {
            paymentApp = 'BHIM UPI';
        } else if (fullText.includes('amazon pay')) {
            paymentApp = 'Amazon Pay';
        } else if (fullText.includes('cred')) {
            paymentApp = 'CRED';
        }

        // Check if it's a valid UPI payment screenshot
        const hasPaymentIndicators =
            fullText.includes('completed') ||
            fullText.includes('successful') ||
            fullText.includes('paid') ||
            fullText.includes('sent') ||
            fullText.includes('transaction') ||
            fullText.includes('upi') ||
            fullText.includes('reference') ||
            fullText.includes('₹') ||
            fullText.includes('rs') ||
            fullText.includes('inr');

        // Extract UTR - multiple patterns
        let utrValue = '';

        // Pattern 1: UPI transaction ID in Google Pay format
        const upiTxnMatch = text.match(/(?:UPI\s*transaction\s*ID|Transaction\s*ID|UPI\s*Ref)[:\s]*(\d{12,})/i);
        // Pattern 2: Standard 12-digit sequence after relevant keywords
        const refMatch = text.match(/(?:Ref|Reference|UTR|ID)[:\s#]*(\d{12})/i);
        // Pattern 3: Any 12-digit number
        const digit12Match = text.match(/\b(\d{12})\b/);

        if (upiTxnMatch) {
            utrValue = upiTxnMatch[1].slice(0, 12);
        } else if (refMatch) {
            utrValue = refMatch[1];
        } else if (digit12Match) {
            utrValue = digit12Match[1];
        }

        // Extract amount - improved patterns for ₹ symbol
        let amountValue = 0;

        // First try to find ₹ followed by amount (most reliable for UPI screenshots)
        const rupeePatterns = [
            // ₹250 or ₹ 250 or ₹2,50 format
            /₹\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/g,
            // Rs.250 or Rs 250 or RS250
            /(?:RS|Rs)\.?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/gi,
            // INR 250
            /INR\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/gi
        ];

        const foundAmounts: number[] = [];
        for (const pattern of rupeePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const amt = parseFloat(match[1].replace(/,/g, ''));
                if (amt > 0 && amt < 1000000) {
                    foundAmounts.push(amt);
                }
            }
        }

        // Take the first amount found (usually the main transaction amount)
        if (foundAmounts.length > 0) {
            amountValue = foundAmounts[0];
        }

        // Extract date
        let dateValue = '';
        const datePatterns = [
            /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[,\s]+(\d{4})/i,
            /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})/i,
            /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
            /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                dateValue = match[0];
                break;
            }
        }

        // Extract payee name
        let payeeValue = '';
        const payeePatterns = [
            /To[:\s]+([A-Z][A-Za-z\s]+?)(?:\n|$|Google|@)/i,
            /(?:paid\s*to|sent\s*to|beneficiary)[:\s]+([A-Z][A-Za-z\s]+)/i
        ];

        for (const pattern of payeePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                payeeValue = match[1].trim();
                break;
            }
        }

        // Determine if it's a valid payment with amount check
        const hasRupeeSymbol = text.includes('₹') || /RS\.?|Rs\.?|INR/i.test(text);
        const isValidPayment = hasPaymentIndicators && hasRupeeSymbol && (utrValue.length >= 12 || amountValue > 0);
        const amountMatches = amountValue > 0 && Math.abs(amountValue - expectedAmount) <= 1;

        // Build errors list
        if (!hasRupeeSymbol || !hasPaymentIndicators) {
            errors.push('Invalid screenshot. Please upload a UPI payment confirmation showing ₹ amount.');
        } else if (!isValidPayment) {
            errors.push('Could not verify this as a valid UPI payment screenshot.');
        } else {
            if (!utrValue) {
                errors.push('Could not detect UTR/Transaction ID from the screenshot.');
            }
            if (!amountValue || amountValue === 0) {
                errors.push('Could not detect payment amount from the screenshot.');
            } else if (!amountMatches) {
                errors.push(`Wrong payment screenshot! This shows ₹${amountValue} but you need to pay ₹${expectedAmount}.`);
            }
        }

        return {
            isValidPayment,
            utr: { value: utrValue, verified: utrValue.length >= 12 },
            amount: { value: amountValue, verified: amountValue > 0, matches: amountMatches },
            date: { value: dateValue, verified: dateValue !== '' },
            payee: { value: payeeValue, verified: payeeValue !== '' },
            paymentApp,
            errors
        };
    };

    const performOcr = async (file: File) => {
        setIsProcessingOcr(true);
        setVerificationErrors([]);
        setIsVerified(false);
        setAmountMismatch(false);
        setDetectedAmount(null);

        try {
            const result = await Tesseract.recognize(file, 'eng', {
                logger: () => { }
            });
            const text = result.data.text;

            // Extract and verify payment details
            const verificationResult = extractPaymentDetails(text);

            setOcrResults({
                fullText: text,
                confidence: result.data.confidence,
                scannedAt: new Date().toISOString(),
                verification: verificationResult
            });

            // Store detected amount
            if (verificationResult.amount.verified) {
                setDetectedAmount(verificationResult.amount.value);
            }

            // Handle verification results
            if (verificationResult.errors.length > 0) {
                setVerificationErrors(verificationResult.errors);

                // Check if it's an amount mismatch
                if (verificationResult.amount.verified && !verificationResult.amount.matches) {
                    setAmountMismatch(true);
                }

                // Still auto-fill UTR if found
                if (verificationResult.utr.verified) {
                    setUtr(verificationResult.utr.value);
                }

                toast({
                    title: 'Verification Failed',
                    description: verificationResult.errors[0],
                    variant: 'destructive'
                });
            } else {
                // All good - auto-fill and mark as verified
                setIsVerified(true);
                if (verificationResult.utr.verified) {
                    setUtr(verificationResult.utr.value);
                }
                toast({
                    title: 'Payment Verified ✓',
                    description: `₹${expectedAmount} payment confirmed. UTR: ${verificationResult.utr.value}`,
                });
            }
        } catch (error) {
            console.error('OCR Error:', error);
            toast({
                title: 'Processing Failed',
                description: 'Could not read the image. Please try a clearer screenshot.',
                variant: 'destructive'
            });
        } finally {
            setIsProcessingOcr(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast({
                    title: 'File too large',
                    description: 'Please select a file smaller than 10MB',
                    variant: 'destructive'
                });
                return;
            }

            setScreenshot(file);
            setVerificationErrors([]);
            setIsVerified(false);
            setAmountMismatch(false);
            setDetectedAmount(null);
            setUtr('');

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);

            if (file.type.startsWith('image/')) {
                performOcr(file);
            }
        }
    };

    const handleUpload = async () => {
        if (!screenshot) {
            toast({
                title: 'Screenshot required',
                description: 'Please select a payment screenshot',
                variant: 'destructive'
            });
            return;
        }

        // Block upload if amount mismatch detected
        if (amountMismatch) {
            toast({
                title: 'Wrong Screenshot',
                description: `This screenshot shows ₹${detectedAmount} but you need to pay ₹${expectedAmount}. Please upload the correct payment screenshot.`,
                variant: 'destructive'
            });
            return;
        }

        if (!utr.trim() || utr.trim().length < 12) {
            toast({
                title: 'UTR required',
                description: 'Please enter a valid 12-digit UTR',
                variant: 'destructive'
            });
            return;
        }

        setUploading(true);

        try {
            const token = localStorage.getItem('auth_token');
            const formData = new FormData();
            formData.append('screenshot', screenshot);
            formData.append('utr', utr.trim());
            formData.append('amount', expectedAmount.toString()); // Always use expected amount

            if (ocrResults) {
                formData.append('ocrData', JSON.stringify(ocrResults));
            }

            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/payment-verification/tickets/${ticketId}/payment-proof`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formData
                }
            );

            if (res.ok) {
                setUploaded(true);
                toast({
                    title: 'Success!',
                    description: 'Payment proof uploaded. Your ticket will be issued after verification.'
                });
                if (onUploadSuccess) onUploadSuccess();
            } else {
                const error = await res.json();
                toast({
                    title: 'Upload failed',
                    description: error.message || 'Failed to upload payment proof',
                    variant: 'destructive'
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to upload payment proof. Please try again.',
                variant: 'destructive'
            });
        } finally {
            setUploading(false);
        }
    };

    if (uploaded) {
        return (
            <Card className="border-none shadow-none bg-green-50 rounded-lg">
                <CardContent className="pt-6">
                    <div className="text-center">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-green-900 mb-2">Payment Proof Uploaded!</h3>
                        <p className="text-green-700 text-sm">
                            Your payment is being verified. You'll receive your ticket once the organizer confirms the payment.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const hasErrors = verificationErrors.length > 0;
    const canSubmit = screenshot && utr.trim().length >= 12 && !amountMismatch && !hasErrors;

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 space-y-6">
                {/* Screenshot Upload */}
                <div className="space-y-4">
                    <div
                        onClick={() => !isProcessingOcr && fileInputRef.current?.click()}
                        className={`rounded-lg p-10 text-center cursor-pointer transition-all relative overflow-hidden ${hasErrors || amountMismatch ? 'bg-red-50 border-2 border-red-200' :
                                isVerified ? 'bg-emerald-50 border-2 border-emerald-200' :
                                    previewUrl ? 'bg-[#00CC68]/5' : 'bg-gray-50 hover:bg-gray-100'
                            } ${isProcessingOcr ? 'cursor-not-allowed' : ''}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            id="screenshot"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {isProcessingOcr && (
                            <div className="absolute inset-0 bg-white/90 z-10 flex flex-col items-center justify-center animate-in fade-in">
                                <Loader2 className="w-8 h-8 text-[#00CC68] animate-spin mb-3" />
                                <p className="text-sm font-bold text-gray-900">Verifying payment...</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Checking ₹{expectedAmount} payment</p>
                            </div>
                        )}

                        {previewUrl ? (
                            <div className="animate-in fade-in zoom-in-95">
                                <img src={previewUrl} alt="Payment Screenshot" className="max-h-64 mx-auto rounded-lg shadow-sm mb-4" />
                                <div className="flex items-center justify-center gap-2">
                                    {isVerified ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    ) : hasErrors ? (
                                        <XCircle className="w-4 h-4 text-red-500" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4 text-[#00CC68]" />
                                    )}
                                    <p className="text-sm font-bold text-gray-900">{screenshot?.name}</p>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 font-medium">Click to change file</p>
                            </div>
                        ) : (
                            <div className="py-2">
                                <div className="w-12 h-12 bg-[#00CC68]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Upload className="w-6 h-6 text-[#00CC68]" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">Upload ₹{expectedAmount} payment screenshot</p>
                                <p className="text-xs text-gray-500 mt-1">Google Pay, PhonePe, Paytm, BHIM</p>
                            </div>
                        )}
                    </div>

                    {/* Error Messages */}
                    {hasErrors && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    {verificationErrors.map((error, i) => (
                                        <p key={i} className="text-sm font-medium text-red-700">{error}</p>
                                    ))}
                                    {amountMismatch && (
                                        <p className="text-xs text-red-500 mt-2 font-semibold">
                                            Please make a payment of ₹{expectedAmount} and upload that screenshot.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success indicator */}
                    {isVerified && !hasErrors && (
                        <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-lg">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-bold">₹{expectedAmount} Payment Verified</span>
                        </div>
                    )}
                </div>

                {/* UTR Input - only show if verified or no major errors */}
                {!amountMismatch && (
                    <div className="space-y-2">
                        <Label htmlFor="utr" className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            UPI Reference (UTR) *
                            {isVerified && utr && (
                                <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Auto-detected</Badge>
                            )}
                        </Label>
                        <Input
                            id="utr"
                            placeholder="12 digit UPI transaction ID"
                            value={utr}
                            onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                            className={`font-mono border-none h-12 rounded-lg focus-visible:ring-[#00CC68] px-4 text-base ${isVerified && utr ? 'bg-emerald-50' : 'bg-gray-50'
                                }`}
                        />
                        {utr && utr.length < 12 && (
                            <p className="text-xs text-amber-600">UTR should be 12 digits ({12 - utr.length} more needed)</p>
                        )}
                    </div>
                )}

                {/* Amount Display - Read only */}
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Amount to Pay</p>
                        <p className="text-2xl font-black text-gray-900">₹{expectedAmount}</p>
                    </div>
                    {isVerified && (
                        <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1.5 rounded-full">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span className="text-sm font-bold text-emerald-700">Matched</span>
                        </div>
                    )}
                </div>

                {/* Important Note */}
                <div className="bg-gray-50 rounded-lg p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#00CC68]" />
                    <div className="flex gap-4">
                        <AlertCircle className="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" />
                        <div className="space-y-3">
                            <p className="font-bold text-gray-900 text-sm uppercase tracking-tight">Important</p>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed font-semibold">
                                    <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                                    Upload the payment screenshot showing ₹{expectedAmount}
                                </li>
                                <li className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed font-semibold">
                                    <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                                    UTR/Transaction ID must be visible in the screenshot
                                </li>
                                <li className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed font-semibold">
                                    <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 shrink-0" />
                                    Screenshots with different amounts will be rejected
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={handleUpload}
                    disabled={uploading || isProcessingOcr || !canSubmit}
                    className={`w-full h-14 text-white text-lg font-bold rounded-lg shadow-lg transition-all hover:translate-y-[-1px] active:translate-y-0 ${isVerified
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                            : amountMismatch || hasErrors
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-[#00CC68] hover:bg-[#00b359] shadow-[#00CC68]/10'
                        }`}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                            Processing...
                        </>
                    ) : isVerified ? (
                        <>
                            <CheckCircle className="w-5 h-5 mr-3" />
                            Submit Verified Payment
                        </>
                    ) : amountMismatch ? (
                        <>
                            <XCircle className="w-5 h-5 mr-3" />
                            Wrong Amount - Upload Correct Screenshot
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5 mr-3" />
                            Submit Payment Proof
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
