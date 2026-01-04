import { Request, Response } from 'express';
import { Ticket } from '../models/Ticket';
import { Event } from '../models/Event';
import { logger } from '../lib/logger';
import { sendTicketEmail } from '../services/emailService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for payment screenshot uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', 'payment-proofs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

export const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
    }
});

// Upload payment proof screenshot
export const uploadPaymentProof = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { utr, amount } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'Payment screenshot is required' });
        }

        const ticket = await Ticket.findById(ticketId).populate('eventId');
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const event = ticket.eventId as any;
        if (!event.paymentConfig?.enabled) {
            return res.status(400).json({ message: 'Payment proof not required for this event' });
        }

        // Store payment proof info
        const screenshotUrl = `/uploads/payment-proofs/${req.file.filename}`;

        ticket.paymentProof = {
            screenshotUrl,
            utr: utr || '',
            amount: parseFloat(amount) || ticket.pricePaid,
            uploadedAt: new Date(),
            verificationStatus: 'pending',
            verificationMethod: 'none',
            autoVerifyResponse: {}
        };

        await ticket.save();

        logger.info('payment.proof_uploaded', {
            ticketId,
            utr,
            amount
        });

        res.json({
            message: 'Payment proof uploaded successfully',
            ticket,
            screenshotUrl
        });
    } catch (error: any) {
        logger.error('payment.upload_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to upload payment proof', error: error.message });
    }
};

// Get pending payment verifications (for admin/host)
export const getPendingPayments = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;
        // @ts-ignore
        const userRole = req.user?.role;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        let query: any = {
            'paymentProof.verificationStatus': 'pending'
        };

        // If not admin, only show their own events
        if (userRole !== 'admin') {
            const hostEvents = await Event.find({ hostId: userId }).select('_id');
            const eventIds = hostEvents.map(e => e._id);
            query.eventId = { $in: eventIds };
        }

        const tickets = await Ticket.find(query)
            .populate('eventId', 'title slug hostId price')
            .populate('userId', 'name email')
            .sort({ 'paymentProof.uploadedAt': -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Check for duplicate UTRs across all tickets
        const utrs = tickets.map(t => t.paymentProof?.utr).filter(Boolean);
        const duplicateChecks = await Ticket.find({
            'paymentProof.utr': { $in: utrs },
            'paymentProof.verificationStatus': { $in: ['pending', 'verified'] }
        }).select('paymentProof.utr _id');

        const utrCounts: Record<string, number> = {};
        duplicateChecks.forEach(t => {
            if (t.paymentProof && t.paymentProof.utr) {
                const utr = t.paymentProof.utr;
                utrCounts[utr] = (utrCounts[utr] || 0) + 1;
            }
        });

        const paymentsWithFlags = tickets.map(t => {
            const utr = t.paymentProof?.utr;
            return {
                ...t,
                isDuplicateUtr: utr ? (utrCounts[utr] > 1) : false
            };
        });

        const total = await Ticket.countDocuments(query);

        res.json({
            payments: paymentsWithFlags,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (error: any) {
        logger.error('payment.get_pending_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch pending payments' });
    }
};

// Manual verification (approve/reject)
export const verifyPaymentManual = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { status, rejectionReason, forceApprove } = req.body; // status: 'verified' or 'rejected', forceApprove: boolean

        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid verification status' });
        }

        const ticket = await Ticket.findById(ticketId).populate('eventId').populate('userId');
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        if (!ticket.paymentProof) {
            return res.status(400).json({ message: 'No payment proof to verify' });
        }

        const event = ticket.eventId as any;

        // Validation checks for approval (skip if forceApprove is true)
        if (status === 'verified' && !forceApprove) {
            // Check 1: Amount validation - payment proof amount should match ticket price
            const proofAmount: number = Number(ticket.paymentProof.amount) || 0;
            const ticketPrice: number = Number(ticket.pricePaid) || Number(event?.price) || 0;

            // Allow a small tolerance (₹1) for rounding differences
            if (proofAmount > 0 && ticketPrice > 0 && Math.abs(proofAmount - ticketPrice) > 1) {
                return res.status(400).json({
                    message: `Amount mismatch: Payment proof shows ₹${proofAmount}, but ticket price is ₹${ticketPrice}. Use 'Force Approve' to override.`,
                    amountMismatch: true,
                    proofAmount,
                    expectedAmount: ticketPrice,
                    canForceApprove: true
                });
            }

            // Check 2: UTR should not be empty
            if (!ticket.paymentProof.utr || ticket.paymentProof.utr.trim() === '') {
                return res.status(400).json({
                    message: 'UTR/Transaction ID is missing. Cannot verify without UTR.',
                    missingUtr: true
                });
            }

            // Check 3: Date validation - payment should be within reasonable timeframe
            const uploadedAtValue = ticket.paymentProof.uploadedAt;
            const uploadedAt = uploadedAtValue ? new Date(uploadedAtValue as Date) : new Date();
            const now = new Date();
            const daysDiff = Math.abs((now.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff > 30) {
                logger.warn('payment.old_proof', {
                    ticketId,
                    uploadedAt,
                    daysDiff,
                    message: 'Payment proof is older than 30 days'
                });
                // Don't reject, but log warning - organizer can still approve
            }
        }

        ticket.paymentProof.verificationStatus = status as any;
        ticket.paymentProof.verifiedAt = new Date();
        // @ts-ignore
        ticket.paymentProof.verifiedBy = req.user.id;
        ticket.paymentProof.verificationMethod = 'manual';

        if (status === 'rejected' && rejectionReason) {
            ticket.paymentProof.rejectionReason = rejectionReason;
            ticket.status = 'pending'; // Keep ticket pending if payment rejected
        } else if (status === 'verified') {
            ticket.status = 'issued'; // Issue ticket on verification
            ticket.paymentStatus = 'completed';
        }

        await ticket.save();

        // Send confirmation email ONLY after successful verification
        if (status === 'verified' && event) {
            try {
                const guestName = ticket.guestName || (ticket.userId as any)?.name || 'Guest';
                const guestEmail = ticket.guestEmail || (ticket.userId as any)?.email;

                if (guestEmail) {
                    await sendTicketEmail({
                        eventHostId: event.hostId?.toString() || event.hostId,
                        recipientEmail: guestEmail,
                        ticketData: {
                            _id: ticket._id,
                            guestName,
                            guestEmail,
                            qrCodeHash: ticket.qrCodeHash || ticket._id.toString()
                        },
                        eventDetails: {
                            _id: event._id,
                            title: event.title,
                            slug: event.slug,
                            date: event.date,
                            location: event.location || event.venue || '',
                            description: event.description || '',
                            emailTemplateId: event.emailTemplateId,
                            ticketTemplateId: event.ticketTemplateId,
                            sendConfirmationEmail: event.sendConfirmationEmail,
                            attachTicket: event.attachTicket
                        }
                    });
                    logger.info('payment.email_sent_after_verify', { ticketId, email: guestEmail });
                }
            } catch (emailError: any) {
                logger.error('payment.email_send_failed', { ticketId, error: emailError.message });
                // Don't fail the verification if email fails
            }
        }

        logger.info('payment.manual_verify', {
            ticketId,
            status,
            amountVerified: ticket.paymentProof.amount,
            // @ts-ignore
            verifiedBy: req.user.id
        });

        res.json({
            message: `Payment ${status} successfully${status === 'verified' ? '. Confirmation email sent.' : ''}`,
            ticket
        });
    } catch (error: any) {
        logger.error('payment.verify_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to verify payment' });
    }
};

// Bulk Auto-verify using Cloudflare Worker
export const verifyBulkPayments = async (req: Request, res: Response) => {
    try {
        const { statementText } = req.body;
        // @ts-ignore
        const userId = req.user?.id;
        // @ts-ignore
        const userRole = req.user?.role;

        if (!statementText) {
            return res.status(400).json({ message: 'Statement text is required' });
        }

        // Get all pending tickets with populated event and user data
        let query: any = {
            'paymentProof.verificationStatus': 'pending',
            'paymentProof.utr': { $exists: true, $ne: '' }
        };

        if (userRole !== 'admin') {
            const hostEvents = await Event.find({ hostId: userId }).select('_id');
            const eventIds = hostEvents.map(e => e._id);
            query.eventId = { $in: eventIds };
        }

        const tickets = await Ticket.find(query).populate('eventId').populate('userId');
        const results: any[] = [];
        const workerUrl = 'https://upi-statement-verifier.devkiraa.workers.dev/';

        // Process in batches of 5 to avoid overwhelming the worker
        const processTicket = async (ticket: any) => {
            try {
                const event = ticket.eventId as any;
                const ticketPrice = ticket.pricePaid || event?.price || 0;
                const proofAmount = ticket.paymentProof.amount;

                // Pre-validation: Amount must match (within ₹1 tolerance)
                if (Math.abs(proofAmount - ticketPrice) > 1) {
                    results.push({
                        id: ticket._id,
                        utr: ticket.paymentProof.utr,
                        status: 'AMOUNT_MISMATCH',
                        message: `Amount mismatch: Proof ₹${proofAmount} vs Ticket ₹${ticketPrice}`
                    });
                    return;
                }

                // Determine date from uploadedAt
                const date = ticket.paymentProof.uploadedAt.toISOString().split('T')[0];

                const response = await fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        utr: ticket.paymentProof.utr,
                        amount: proofAmount,
                        date, // Date for validation
                        statementText
                    })
                });

                const result = await response.json();

                if (result.status === 'VERIFIED') {
                    // Additional check: Verify the amount from statement matches
                    if (result.matchedAmount && Math.abs(result.matchedAmount - ticketPrice) > 1) {
                        results.push({
                            id: ticket._id,
                            utr: ticket.paymentProof.utr,
                            status: 'STATEMENT_AMOUNT_MISMATCH',
                            message: `Statement shows ₹${result.matchedAmount}, expected ₹${ticketPrice}`
                        });
                        return;
                    }

                    // All validations passed - update ticket
                    ticket.paymentProof.verificationStatus = 'verified';
                    ticket.paymentProof.verifiedAt = new Date();
                    // @ts-ignore
                    ticket.paymentProof.verifiedBy = req.user.id;
                    ticket.paymentProof.verificationMethod = 'auto_bulk';
                    ticket.status = 'issued';
                    ticket.paymentStatus = 'completed';
                    ticket.paymentProof.autoVerifyResponse = result;
                    await ticket.save();

                    // Send confirmation email
                    if (event) {
                        try {
                            const guestName = ticket.guestName || (ticket.userId as any)?.name || 'Guest';
                            const guestEmail = ticket.guestEmail || (ticket.userId as any)?.email;

                            if (guestEmail) {
                                await sendTicketEmail({
                                    eventHostId: event.hostId?.toString() || event.hostId,
                                    recipientEmail: guestEmail,
                                    ticketData: {
                                        _id: ticket._id,
                                        guestName,
                                        guestEmail,
                                        qrCodeHash: ticket.qrCodeHash || ticket._id.toString()
                                    },
                                    eventDetails: {
                                        _id: event._id,
                                        title: event.title,
                                        slug: event.slug,
                                        date: event.date,
                                        location: event.location || event.venue || '',
                                        description: event.description || '',
                                        emailTemplateId: event.emailTemplateId,
                                        ticketTemplateId: event.ticketTemplateId,
                                        sendConfirmationEmail: event.sendConfirmationEmail,
                                        attachTicket: event.attachTicket
                                    }
                                });
                                logger.info('payment.bulk_email_sent', { ticketId: ticket._id, email: guestEmail });
                            }
                        } catch (emailError: any) {
                            logger.error('payment.bulk_email_failed', { ticketId: ticket._id, error: emailError.message });
                        }
                    }

                    results.push({
                        id: ticket._id,
                        utr: ticket.paymentProof.utr,
                        status: 'VERIFIED',
                        message: 'Successfully verified and email sent',
                        matchedAmount: result.matchedAmount,
                        matchedDate: result.matchedDate
                    });
                } else {
                    results.push({
                        id: ticket._id,
                        utr: ticket.paymentProof.utr,
                        status: result.status,
                        message: result.message || 'Not matched in statement'
                    });
                }
            } catch (err: any) {
                results.push({
                    id: ticket._id,
                    utr: ticket.paymentProof.utr,
                    status: 'ERROR',
                    message: err.message
                });
            }
        };

        // Execute in batches
        const batchSize = 5;
        for (let i = 0; i < tickets.length; i += batchSize) {
            const batch = tickets.slice(i, i + batchSize);
            await Promise.all(batch.map(processTicket));
        }

        const successCount = results.filter(r => r.status === 'VERIFIED').length;
        const amountMismatchCount = results.filter(r => r.status === 'AMOUNT_MISMATCH' || r.status === 'STATEMENT_AMOUNT_MISMATCH').length;

        logger.info('payment.bulk_auto_verify', {
            processed: tickets.length,
            verified: successCount,
            amountMismatches: amountMismatchCount,
            // @ts-ignore
            verifiedBy: req.user.id
        });

        res.json({
            message: `Processed ${tickets.length} tickets. Verified ${successCount}. ${amountMismatchCount > 0 ? `${amountMismatchCount} amount mismatches.` : ''}`,
            results
        });

    } catch (error: any) {
        logger.error('payment.bulk_verify_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Bulk verification failed', error: error.message });
    }
};


// Auto-verify using Cloudflare Worker
export const verifyPaymentAuto = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const { statementText, date } = req.body; // Bank statement text extracted from PDF

        const ticket = await Ticket.findById(ticketId).populate('eventId').populate('userId');
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        if (!ticket.paymentProof?.utr) {
            return res.status(400).json({ message: 'UTR not provided in payment proof' });
        }

        const event = ticket.eventId as any;
        const ticketPrice: number = Number(ticket.pricePaid) || Number(event?.price) || 0;
        const proofAmount: number = Number(ticket.paymentProof.amount) || 0;

        // Pre-validation: Amount must match
        if (Math.abs(proofAmount - ticketPrice) > 1) {
            return res.status(400).json({
                message: `Amount mismatch: Payment proof shows ₹${proofAmount}, but ticket price is ₹${ticketPrice}`,
                amountMismatch: true,
                proofAmount,
                expectedAmount: ticketPrice
            });
        }

        // Call Cloudflare Worker
        const workerUrl = 'https://upi-statement-verifier.devkiraa.workers.dev/';
        const response = await fetch(workerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                utr: ticket.paymentProof.utr,
                amount: proofAmount,
                date,
                statementText
            })
        });

        const result = await response.json();

        // Store the verification response
        ticket.paymentProof.autoVerifyResponse = result;

        // Update verification status based on result
        if (result.status === 'VERIFIED') {
            // Additional amount check from statement
            if (result.matchedAmount && Math.abs(result.matchedAmount - ticketPrice) > 1) {
                return res.status(400).json({
                    message: `Statement shows ₹${result.matchedAmount}, expected ₹${ticketPrice}. Needs manual review.`,
                    statementAmountMismatch: true
                });
            }

            ticket.paymentProof.verificationStatus = 'verified';
            ticket.paymentProof.verifiedAt = new Date();
            // @ts-ignore
            ticket.paymentProof.verifiedBy = req.user.id;
            ticket.paymentProof.verificationMethod = 'auto';
            ticket.status = 'issued';
            ticket.paymentStatus = 'completed';

            await ticket.save();

            // Send confirmation email
            if (event) {
                try {
                    const guestName = ticket.guestName || (ticket.userId as any)?.name || 'Guest';
                    const guestEmail = ticket.guestEmail || (ticket.userId as any)?.email;

                    if (guestEmail) {
                        await sendTicketEmail({
                            eventHostId: event.hostId?.toString() || event.hostId,
                            recipientEmail: guestEmail,
                            ticketData: {
                                _id: ticket._id,
                                guestName,
                                guestEmail,
                                qrCodeHash: ticket.qrCodeHash || ticket._id.toString()
                            },
                            eventDetails: {
                                _id: event._id,
                                title: event.title,
                                slug: event.slug,
                                date: event.date,
                                location: event.location || event.venue || '',
                                description: event.description || '',
                                emailTemplateId: event.emailTemplateId,
                                ticketTemplateId: event.ticketTemplateId,
                                sendConfirmationEmail: event.sendConfirmationEmail,
                                attachTicket: event.attachTicket
                            }
                        });
                        logger.info('payment.auto_email_sent', { ticketId, email: guestEmail });
                    }
                } catch (emailError: any) {
                    logger.error('payment.auto_email_failed', { ticketId, error: emailError.message });
                }
            }
        } else if (result.status === 'NOT_FOUND') {
            ticket.paymentProof.verificationStatus = 'rejected';
            ticket.paymentProof.rejectionReason = 'UTR not found in statement';
            // @ts-ignore
            ticket.paymentProof.verifiedBy = req.user.id;
            ticket.paymentProof.verificationMethod = 'auto';
            await ticket.save();
        } else {
            // NEEDS_MANUAL_REVIEW
            ticket.paymentProof.verificationStatus = 'pending';
            ticket.paymentProof.verificationMethod = 'none';
            await ticket.save();
        }

        logger.info('payment.auto_verify', {
            ticketId,
            status: result.status,
            amountVerified: proofAmount,
            // @ts-ignore
            verifiedBy: req.user.id
        });

        res.json({
            message: result.status === 'VERIFIED' ? 'Auto-verification completed. Confirmation email sent.' : 'Auto-verification completed',
            result,
            ticket
        });
    } catch (error: any) {
        logger.error('payment.auto_verify_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Auto-verification failed', error: error.message });
    }
};
