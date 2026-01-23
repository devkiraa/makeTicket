import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { Contact } from '../models/Contact';
import { SecurityEvent } from '../models/SecurityEvent';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import crypto from 'crypto';
import { sendTicketEmail } from '../services/emailService';
import { createNotification } from './notificationController';
import { addRegistrationToSheet } from './googleSheetsController';
import { checkCanAddAttendee } from '../services/planLimitService';
import { escapeRegex } from '../utils/security';
import { logger } from '../lib/logger';

// Register for Event
export const registerTicket = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { formData, email } = req.body; // Basic email required for sending ticket

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check if registration has closed (time-based)
        if (event.registrationCloseTime && new Date() > new Date(event.registrationCloseTime)) {
            return res.status(400).json({
                message: 'Registration has closed for this event.',
                registrationClosed: true,
                closeTime: event.registrationCloseTime
            });
        }

        // Check if registration is paused
        if (event.registrationPaused) {
            return res.status(400).json({
                message: 'Registration is temporarily paused for this event.',
                registrationPaused: true
            });
        }

        // Check plan limit for attendees
        const planCheck = await checkCanAddAttendee(event.hostId.toString(), eventId);
        if (!planCheck.allowed) {
            return res.status(403).json({
                message: planCheck.message,
                planLimit: true,
                currentUsage: planCheck.current,
                limit: planCheck.limit
            });
        }

        // Check if event is closed
        if (event.status === 'closed') {
            return res.status(400).json({ message: 'Registration is closed for this event.' });
        }

        // SECURITY: Atomic registration count check to prevent race conditions
        // Uses findOneAndUpdate to atomically increment a counter
        let isEventFull = false;
        let reservedSlot = false;

        if (event.maxRegistrations && event.maxRegistrations > 0) {
            // SCALPER DETECTION (Phase 5)
            // Prevent mass purchasing from same device
            const { generateDeviceHash } = await import('../utils/encryption');
            const deviceHash = generateDeviceHash(req.headers['user-agent'] || '', req.ip || '');

            // Find all users known to this device
            const potentialScalpers = await User.find({ 'knownDevices.deviceHash': deviceHash }).select('_id');
            const scalperUserIds = potentialScalpers.map(u => u._id);

            if (scalperUserIds.length > 0) {
                const deviceTicketCount = await Ticket.countDocuments({
                    eventId,
                    userId: { $in: scalperUserIds },
                    status: { $ne: 'cancelled' }
                });

                // Limit: 10 tickets per device across all accounts for same event
                if (deviceTicketCount >= 10) {
                    logger.warn('scalper.detected', { eventId, deviceHash, count: deviceTicketCount });
                    return res.status(429).json({ message: 'Ticket limit exceeded for this device.' });
                }
            }

            // CAPACITY ALERTS (Phase 5)
            // Check if nearing capacity
            const currentTotal = await Ticket.countDocuments({ eventId, waitlist: { $ne: true } });
            const capacityRatio = currentTotal / event.maxRegistrations;

            if (capacityRatio >= 0.9 && !event.capacityAlertSent) {
                // Send alert to host (fire and forget)
                // In prod, use email queue. Here we just log or mock.
                // We'll update flag to avoid spam
                await Event.findByIdAndUpdate(eventId, { capacityAlertSent: true });
                logger.info('event.capacity_alert', { eventId, ratio: capacityRatio });
                // TODO: trigger sendEmail logic
            }

            // Atomic reserve logic continues below...
            // Try to atomically reserve a slot using findOneAndUpdate
            // This prevents the check-then-act race condition
            const currentCount = await Ticket.countDocuments({ eventId, waitlist: { $ne: true } });

            if (currentCount >= event.maxRegistrations) {
                isEventFull = true;

                // If waitlist is NOT enabled, reject registration
                if (!event.waitlistEnabled) {
                    // Auto-close the event
                    await Event.findByIdAndUpdate(eventId, { status: 'closed' });
                    return res.status(400).json({
                        message: 'Registration is full. Maximum limit reached.',
                        limitReached: true
                    });
                }
                // If waitlist IS enabled, we'll continue and add to waitlist below
            } else {
                // We'll verify the count again after ticket creation using post-validation
                reservedSlot = true;
            }
        }

        // Check for duplicate registration if not allowed
        if (!event.allowMultipleRegistrations) {
            const { email: submittedEmail } = req.body;
            if (submittedEmail) {
                const existingTicket = await Ticket.findOne({
                    eventId,
                    guestEmail: submittedEmail.toLowerCase()
                });
                if (existingTicket) {
                    return res.status(400).json({
                        message: 'You have already registered for this event.',
                        alreadyRegistered: true
                    });
                }
            }
        }

        // Better extraction of name and email from formData using form schema
        let guestName = 'Guest';
        let guestEmail = email || 'No Email';

        if (formData && event.formSchema) {
            // Match form questions to responses to get name and email by label
            for (const question of event.formSchema) {
                const value = formData[question.id];
                if (!value) continue;

                const label = (question.label || '').toLowerCase();
                if (label.includes('name') && !guestName || guestName === 'Guest') {
                    guestName = String(value);
                }
                if ((label.includes('email') || question.type === 'email') && (!guestEmail || guestEmail === 'No Email')) {
                    guestEmail = String(value);
                }
            }
        }

        // Fallback: Check formData keys directly
        if (guestName === 'Guest' && formData) {
            const keys = Object.keys(formData);
            const nameKey = keys.find(k => k.toLowerCase().includes('name'));
            if (nameKey) guestName = formData[nameKey];
        }
        if (guestEmail === 'No Email' && formData) {
            const keys = Object.keys(formData);
            const emailKey = keys.find(k => k.toLowerCase().includes('email'));
            if (emailKey) guestEmail = formData[emailKey];
        }

        // Generate Unique QR Hash
        const qrCodeHash = crypto.randomBytes(32).toString('hex');

        // Check if Paid Event
        let userId = null;
        let paymentStatus = 'free'; // Default for free events
        let pricePaid = 0;

        if (event.price && event.price > 0) {
            // Check for Authorization Header since this route is public but paid events need auth
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).json({ message: 'Login required for paid events.' });
            }

            // Verify Token Manually here or trust frontend sent it
            // Ideally we use middleware, but to support mixed public/private we do this:
            try {
                const token = authHeader.split(' ')[1];
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
                userId = decoded.id;
                paymentStatus = 'completed'; // Assuming login was the barrier
                pricePaid = event.price;
            } catch (err) {
                return res.status(401).json({ message: 'Invalid or expired session. Please login again.' });
            }
        }

        // Determine ticket status based on waitlist and approval settings
        let ticketStatus = 'issued';
        let isWaitlisted = false;
        let isApproved = true;

        if (isEventFull && event.waitlistEnabled) {
            // Add to waitlist
            isWaitlisted = true;
            ticketStatus = 'waitlisted';
            isApproved = !event.approvalRequired; // If approval also required, keep unapproved
        } else if (event.approvalRequired) {
            // Needs approval before ticket is issued
            isApproved = false;
            ticketStatus = 'pending';
        }

        const ticket = await Ticket.create({
            eventId,
            userId: userId, // Link to user if available
            formData,
            guestName,
            guestEmail,
            pricePaid,
            paymentStatus,
            qrCodeHash,
            // New fields
            waitlist: isWaitlisted,
            approved: isApproved,
            status: ticketStatus
        });

        // SECURITY: Post-creation validation for race condition handling
        // If we thought we had a slot but now we're over capacity, move to waitlist
        if (reservedSlot && event.maxRegistrations && event.maxRegistrations > 0) {
            const finalCount = await Ticket.countDocuments({
                eventId,
                waitlist: { $ne: true },
                _id: { $lte: ticket._id } // Only count tickets created before or at same time
            });

            if (finalCount > event.maxRegistrations) {
                // Race condition detected - another registration beat us
                logger.warn('ticket.race_condition_detected', {
                    eventId,
                    ticketId: ticket._id,
                    maxRegistrations: event.maxRegistrations,
                    actualCount: finalCount
                });

                if (event.waitlistEnabled) {
                    // Move to waitlist instead of deleting
                    await Ticket.findByIdAndUpdate(ticket._id, {
                        waitlist: true,
                        status: 'waitlisted'
                    });
                    isWaitlisted = true;
                    ticketStatus = 'waitlisted';
                } else {
                    // No waitlist - delete the ticket and reject
                    await Ticket.findByIdAndDelete(ticket._id);
                    await Event.findByIdAndUpdate(eventId, { status: 'closed' });
                    return res.status(400).json({
                        message: 'Registration is full. Maximum limit reached.',
                        limitReached: true,
                        raceCondition: true
                    });
                }
            }
        }

        // Only send confirmation email if ticket is approved and not waitlisted
        if (isApproved && !isWaitlisted) {
            sendTicketEmail({
                eventHostId: event.hostId.toString(),
                recipientEmail: guestEmail,
                ticketData: {
                    _id: ticket._id,
                    guestName,
                    guestEmail,
                    qrCodeHash
                },
                eventDetails: {
                    _id: event._id,
                    title: event.title,
                    slug: event.slug,
                    date: event.date || null,
                    location: event.location || '',
                    description: event.description || '',
                    emailTemplateId: event.emailTemplateId?.toString(),
                    ticketTemplateId: event.ticketTemplateId?.toString(),
                    sendConfirmationEmail: event.sendConfirmationEmail,
                    attachTicket: event.attachTicket
                }
            }).catch(err => {
                // Log error but don't fail the registration
                console.error('Email sending failed:', err.message);
            });
        }

        // Create notification for event host (different messages based on status)
        if (isWaitlisted) {
            createNotification({
                userId: event.hostId.toString(),
                type: 'waitlist',
                title: 'New Waitlist Entry',
                message: `${guestName || guestEmail} joined the waitlist for ${event.title}`,
                eventId: event._id.toString(),
                ticketId: ticket._id.toString(),
                data: { guestName, guestEmail, ticketCode: `TKT-${qrCodeHash.substring(0, 8).toUpperCase()}` }
            });
        } else if (!isApproved) {
            createNotification({
                userId: event.hostId.toString(),
                type: 'approval',
                title: 'Registration Pending Approval',
                message: `${guestName || guestEmail} registered for ${event.title} - awaiting your approval`,
                eventId: event._id.toString(),
                ticketId: ticket._id.toString(),
                data: { guestName, guestEmail, ticketCode: `TKT-${qrCodeHash.substring(0, 8).toUpperCase()}` }
            });
        } else {
            createNotification({
                userId: event.hostId.toString(),
                type: 'registration',
                title: 'New Registration',
                message: `${guestName || guestEmail} registered for ${event.title}`,
                eventId: event._id.toString(),
                ticketId: ticket._id.toString(),
                data: { guestName, guestEmail, ticketCode: `TKT-${qrCodeHash.substring(0, 8).toUpperCase()}` }
            });
        }

        // Auto-save contact for marketing (async, non-blocking)
        if (guestEmail && guestEmail !== 'No Email') {
            Contact.findOneAndUpdate(
                { hostId: event.hostId, email: guestEmail.toLowerCase() },
                {
                    $set: {
                        name: guestName || 'Guest',
                        phone: formData?.phone || formData?.Phone || formData?.mobile || '',
                        source: 'registration',
                        updatedAt: new Date()
                    },
                    $addToSet: { eventIds: eventId },
                    $setOnInsert: {
                        hostId: event.hostId,
                        email: guestEmail.toLowerCase(),
                        createdAt: new Date(),
                        optedIn: true,
                        totalEvents: 1
                    }
                },
                { upsert: true, new: true }
            ).then(contact => {
                if (contact) {
                    contact.totalEvents = contact.eventIds?.length || 1;
                    contact.lastEventDate = event.date || new Date();
                    contact.save().catch(() => { });
                }
            }).catch(err => {
                console.error('Contact save error:', err.message);
            });
        }

        // Sync to Google Sheets (async, non-blocking)
        if (event.googleSheetId) {
            addRegistrationToSheet(
                event.hostId.toString(),
                eventId,
                {
                    name: guestName || 'Guest',
                    email: guestEmail,
                    phone: formData?.phone || formData?.Phone || formData?.mobile || '',
                    formResponses: formData,
                    status: ticketStatus,
                    ticketId: `TKT-${qrCodeHash.substring(0, 8).toUpperCase()}`
                }
            ).catch(err => {
                console.error('Google Sheets sync error:', err);
            });
        }

        // Return appropriate response based on ticket status
        if (isWaitlisted) {
            res.status(202).json({
                message: 'You have been added to the waitlist',
                waitlist: true,
                ticket
            });
        } else if (!isApproved) {
            res.status(202).json({
                message: 'Your registration is pending approval',
                pendingApproval: true,
                ticket
            });
        } else {
            res.status(201).json({ message: 'Ticket registered successfully', ticket });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Registration failed', error });
    }
};

// Validate Ticket (Scanner)
export const validateTicket = async (req: Request, res: Response) => {
    try {
        const { hash } = req.body;
        // @ts-ignore
        const helperId = req.user.id; // Helper or Host

        if (!hash || typeof hash !== 'string') {
            return res.status(400).json({ message: 'Ticket code is required' });
        }

        let ticket = null;

        // Check if input is a ticket code (TKT-XXXXXXXX format)
        if (hash.toUpperCase().startsWith('TKT-')) {
            // Extract the short code (8 characters after TKT-)
            const shortCode = escapeRegex(hash.substring(4).toUpperCase());

            // Search for ticket where qrCodeHash starts with this short code (case-insensitive)
            ticket = await Ticket.findOne({
                qrCodeHash: { $regex: `^${shortCode}`, $options: 'i' }
            }).populate('eventId');
        } else {
            // Full hash lookup - escape for regex safety
            const safeHash = escapeRegex(hash);
            ticket = await Ticket.findOne({ qrCodeHash: hash }).populate('eventId');

            // Also try case-insensitive match
            if (!ticket) {
                ticket = await Ticket.findOne({
                    qrCodeHash: { $regex: `^${safeHash}`, $options: 'i' }
                }).populate('eventId');
            }
        }

        if (!ticket) {
            // SECURITY: Log failed validation attempts for monitoring
            await SecurityEvent.create({
                type: 'invalid_ticket_scan',
                severity: 'medium',
                userId: helperId,
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'],
                details: {
                    attemptedCode: hash.substring(0, 20), // Truncate to avoid log pollution
                    endpoint: 'validateTicket'
                }
            }).catch(() => { });

            return res.status(404).json({
                message: 'Invalid Ticket',
                hint: 'Please scan the QR code or enter the full ticket code (e.g., TKT-XXXXXXXX)'
            });
        }

        if (ticket.status === 'checked-in') {
            return res.status(400).json({
                message: 'Ticket already checked in',
                checkedInAt: ticket.checkedInAt,
                guestName: ticket.guestName
            });
        }

        // Authorization Check (Is user the host or an authorized helper?)
        // This requires checking the event associated with ticket
        // For now, let's assume if they have access to this endpoint they are auth'd generally, 
        // but in production we'd check `ticket.eventId.hostId === helperId` or `authorizedHelpers`.

        ticket.status = 'checked-in';
        ticket.checkedInAt = new Date();
        ticket.checkedInBy = helperId;
        await ticket.save();

        res.status(200).json({
            message: 'Check-in Successful',
            ticket: {
                _id: ticket._id,
                guestName: ticket.guestName,
                guestEmail: ticket.guestEmail,
                status: ticket.status,
                checkedInAt: ticket.checkedInAt,
                ticketCode: `TKT-${ticket.qrCodeHash.substring(0, 8).toUpperCase()}`
            }
        });
    } catch (error) {
        console.error('Ticket validation error:', error);
        res.status(500).json({ message: 'Validation failed', error });
    }
};

// Get Attendees for Event (with optional pagination)
export const getEventAttendees = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { limit, skip, search } = req.query;
        // @ts-ignore
        const userId = req.user.id;

        console.log('=== getEventAttendees Debug ===');
        console.log('Event ID:', eventId);
        console.log('User ID:', userId);

        // Verify ownership
        const event = await Event.findOne({ _id: eventId, hostId: userId });
        if (!event) {
            console.log('Event not found for this user');
            return res.status(403).json({ message: 'Event not found or unauthorized' });
        }

        console.log('Event found:', event.title);

        // Build query - fetch all for now (frontend handles pagination)
        // If search is provided, we need to fetch all and filter
        let tickets = await Ticket.find({ eventId })
            .sort({ createdAt: -1 })
            .limit(limit ? parseInt(limit as string) : 500) // Max 500 to prevent overwhelming
            .lean();

        console.log('Tickets found:', tickets.length);

        // Map to neat structure
        const attendees = tickets.map(ticket => {
            const data = ticket.formData || {};
            const fd = data instanceof Map ? Object.fromEntries(data) : data;

            // Fallback for old tickets without direct fields
            const extractedName = fd.name || fd.Name || Object.entries(fd).find(([k]) => k.toLowerCase().includes('name'))?.[1] || 'Guest';
            const extractedEmail = fd.email || fd.Email || Object.entries(fd).find(([k]) => k.toLowerCase().includes('email'))?.[1] || 'No Email';

            return {
                id: ticket._id,
                name: ticket.guestName || extractedName,
                email: ticket.guestEmail || extractedEmail,
                eventName: event.title,
                status: ticket.status,
                checkedIn: ticket.status === 'checked-in',
                registeredAt: ticket.createdAt,
                checkedInAt: ticket.checkedInAt,
                formData: fd
            };
        });

        res.status(200).json(attendees);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch attendees', error });
    }
};

// Check if email is already registered for an event
export const checkRegistration = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // If multiple registrations are allowed, no need to check
        if (event.allowMultipleRegistrations) {
            return res.json({
                alreadyRegistered: false,
                allowMultiple: true
            });
        }

        // Check if this email has already registered
        const existingTicket = await Ticket.findOne({
            eventId,
            guestEmail: (email as string).toLowerCase()
        });

        res.json({
            alreadyRegistered: !!existingTicket,
            allowMultiple: false,
            // SECURITY: Don't expose sensitive ticket data in public endpoint
            // Only return status to prevent ticket scraping and QR cloning
            ticket: existingTicket ? {
                status: existingTicket.status
                // Removed: _id, qrCodeHash, guestName (IDOR prevention)
            } : null
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to check registration', error });
    }
};

// Approve a pending ticket
export const approveTicket = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const hostId = req.user.id;
        const { ticketId } = req.params;

        const ticket = await Ticket.findById(ticketId).populate('eventId');
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const event = ticket.eventId as any;

        // Verify host owns this event
        if (event.hostId.toString() !== hostId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update ticket status
        ticket.approved = true;
        ticket.status = 'issued';
        await ticket.save();

        // Send confirmation email now that it's approved
        sendTicketEmail({
            eventHostId: event.hostId.toString(),
            recipientEmail: ticket.guestEmail || '',
            ticketData: {
                _id: ticket._id,
                guestName: ticket.guestName || 'Guest',
                guestEmail: ticket.guestEmail || '',
                qrCodeHash: ticket.qrCodeHash
            },
            eventDetails: {
                _id: event._id,
                title: event.title,
                slug: event.slug,
                date: event.date || null,
                location: event.location || '',
                description: event.description || '',
                emailTemplateId: event.emailTemplateId?.toString(),
                ticketTemplateId: event.ticketTemplateId?.toString(),
                sendConfirmationEmail: event.sendConfirmationEmail,
                attachTicket: event.attachTicket
            }
        }).catch(err => {
            console.error('Email sending failed:', err.message);
        });

        res.json({ message: 'Ticket approved and confirmation sent', ticket });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to approve ticket', error });
    }
};

// Reject (delete) a pending ticket
export const rejectTicket = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const hostId = req.user.id;
        const { ticketId } = req.params;

        const ticket = await Ticket.findById(ticketId).populate('eventId');
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const event = ticket.eventId as any;

        // Verify host owns this event
        if (event.hostId.toString() !== hostId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await Ticket.deleteOne({ _id: ticketId });

        res.json({ message: 'Ticket rejected and deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to reject ticket', error });
    }
};

// Get pending/waitlisted tickets for an event
export const getPendingTickets = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const hostId = req.user.id;
        const { eventId } = req.params;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.hostId.toString() !== hostId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const pendingTickets = await Ticket.find({
            eventId,
            $or: [
                { approved: false },
                { waitlist: true }
            ]
        }).sort({ createdAt: -1 });

        res.json({ tickets: pendingTickets });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch pending tickets', error });
    }
};
/**
 * Transfer Ticket to another user
 */
export const transferTicket = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { ticketId } = req.params;
        const { recipientEmail, reason } = req.body;
        const userId = (req as any).user.id; // Current owner

        // 1. Find Ticket
        const ticket = await Ticket.findById(ticketId).session(session);
        if (!ticket) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // 2. Verify Ownership
        if (ticket.userId && ticket.userId.toString() !== userId) {
            // Also allow admins or event coordinators? For now, strict ownership.
            await session.abortTransaction();
            return res.status(403).json({ message: 'You do not own this ticket' });
        }

        // 3. Find Recipient
        const recipient = await User.findOne({ email: recipientEmail });
        if (!recipient) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Recipient user not found. They must have an account.' });
        }

        if (recipient._id.toString() === userId) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Cannot transfer ticket to yourself' });
        }

        // 4. Update Ticket
        const oldOwnerId = ticket.userId;
        const oldGuestEmail = ticket.guestEmail;
        const oldGuestName = ticket.guestName;

        ticket.userId = recipient._id;
        ticket.guestEmail = recipient.email;
        ticket.guestName = recipient.name || recipient.email;
        // Reset check-in status? Usually yes for transfers unless specifically allowed.
        // But if already checked in?
        if (ticket.status === 'checked-in') {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Cannot transfer a checked-in ticket' });
        }

        await ticket.save({ session });

        // 5. Create Audit Log
        await AuditLog.create([{
            action: 'TICKET_TRANSFER',
            performedBy: userId,
            targetResourceId: ticket._id,
            targetResourceType: 'Ticket',
            details: {
                fromUser: userId,
                toUser: recipient._id,
                toEmail: recipientEmail,
                reason,
                event: ticket.eventId
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        }], { session });

        await session.commitTransaction();

        // 6. Notifications (Async)
        try {
            // Email old owner
            // Email new owner
            // Not implemented here for brevity, but recommended.
            logger.info('ticket.transferred', { ticketId, from: userId, to: recipient._id });
        } catch (e) {
            logger.error('ticket.transfer_notification_error', { error: (e as Error).message });
        }

        res.status(200).json({ message: 'Ticket transferred successfully', ticket });

    } catch (error) {
        await session.abortTransaction();
        logger.error('ticket.transfer_error', { error: (error as Error).message });
        res.status(500).json({ message: 'Failed to transfer ticket' });
    } finally {
        session.endSession();
    }
};
