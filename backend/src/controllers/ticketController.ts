import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { Contact } from '../models/Contact';
import crypto from 'crypto';
import { sendTicketEmail } from '../services/emailService';
import { createNotification } from './notificationController';
import { addRegistrationToSheet } from './googleSheetsController';

// Register for Event
export const registerTicket = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { formData, email } = req.body; // Basic email required for sending ticket

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check if event is closed
        if (event.status === 'closed') {
            return res.status(400).json({ message: 'Registration is closed for this event.' });
        }

        // Check registration limit
        let isEventFull = false;
        if (event.maxRegistrations && event.maxRegistrations > 0) {
            // Count only confirmed tickets (not waitlisted)
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

        let ticket = null;

        // Check if input is a ticket code (TKT-XXXXXXXX format)
        if (hash.toUpperCase().startsWith('TKT-')) {
            // Extract the short code (8 characters after TKT-)
            const shortCode = hash.substring(4).toUpperCase();

            // Search for ticket where qrCodeHash starts with this short code (case-insensitive)
            ticket = await Ticket.findOne({
                qrCodeHash: { $regex: `^${shortCode}`, $options: 'i' }
            }).populate('eventId');
        } else {
            // Full hash lookup
            ticket = await Ticket.findOne({ qrCodeHash: hash }).populate('eventId');

            // Also try case-insensitive match
            if (!ticket) {
                ticket = await Ticket.findOne({
                    qrCodeHash: { $regex: `^${hash}`, $options: 'i' }
                }).populate('eventId');
            }
        }

        if (!ticket) {
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
            ticket: existingTicket ? {
                _id: existingTicket._id,
                qrCodeHash: existingTicket.qrCodeHash,
                guestName: existingTicket.guestName,
                status: existingTicket.status
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
