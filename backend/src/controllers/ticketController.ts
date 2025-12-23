import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import crypto from 'crypto';
import { emailQueue } from '../queues/emailQueue';

// Register for Event
export const registerTicket = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { formData, email } = req.body; // Basic email required for sending ticket

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Heuristic to find name
        let guestName = 'Guest';
        if (formData) {
            const keys = Object.keys(formData);
            const nameKey = keys.find(k => k.toLowerCase().includes('name'));
            if (nameKey) guestName = formData[nameKey];
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

        const ticket = await Ticket.create({
            eventId,
            userId: userId, // Link to user if available
            formData,
            guestName,
            guestEmail: email || 'No Email',
            pricePaid,
            paymentStatus,
            qrCodeHash
        });

        // Add to Email Queue
        await emailQueue.add('send-ticket', {
            eventHostId: event.hostId,
            recipientEmail: email,
            ticketData: ticket,
            eventDetails: event
        });

        res.status(201).json({ message: 'Ticket registered successfully', ticket });
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

        const ticket = await Ticket.findOne({ qrCodeHash: hash }).populate('eventId');
        if (!ticket) return res.status(404).json({ message: 'Invalid Ticket' });

        if (ticket.status === 'checked-in') {
            return res.status(400).json({ message: 'Ticket already checked in', checkedInAt: ticket.checkedInAt });
        }

        // Authorization Check (Is user the host or an authorized helper?)
        // This requires checking the event associated with ticket
        // For now, let's assume if they have access to this endpoint they are auth'd generally, 
        // but in production we'd check `ticket.eventId.hostId === helperId` or `authorizedHelpers`.

        ticket.status = 'checked-in';
        ticket.checkedInAt = new Date();
        ticket.checkedInBy = helperId;
        await ticket.save();

        res.status(200).json({ message: 'Check-in Successful', ticket });
    } catch (error) {
        res.status(500).json({ message: 'Validation failed', error });
    }
};

// Get Attendees for Event
export const getEventAttendees = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        // @ts-ignore
        const userId = req.user.id;

        // Verify ownership
        const event = await Event.findOne({ _id: eventId, hostId: userId });
        if (!event) return res.status(403).json({ message: 'Event not found or unauthorized' });

        const tickets = await Ticket.find({ eventId }).sort({ createdAt: -1 });

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
                formData: fd // Pass full form data for frontend usage
            };
        });

        res.status(200).json(attendees);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch attendees', error });
    }
};
