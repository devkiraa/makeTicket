import { Request, Response } from 'express';
import { SupportTicket } from '../models/SupportTicket';
import { Ticket } from '../models/Ticket';
import { Event } from '../models/Event';
import { logger } from '../lib/logger';

// Create a support ticket
export const createSupportTicket = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { ticketId, subject, category, description } = req.body;

        // Validate ticket exists and belongs to user
        const ticket = await Ticket.findOne({ _id: ticketId, userId });
        if (!ticket) {
            return res.status(404).json({ message: 'Registration not found or does not belong to you' });
        }

        // Create support ticket
        const supportTicket = await SupportTicket.create({
            ticketId,
            eventId: ticket.eventId,
            userId,
            subject: subject || `Support for ${category}`,
            category: category || 'general',
            description,
            messages: [{
                senderId: userId,
                senderType: 'user',
                message: description,
                sentAt: new Date()
            }]
        });

        await supportTicket.populate([
            { path: 'eventId', select: 'title slug' },
            { path: 'userId', select: 'name email' }
        ]);

        logger.info('support.ticket_created', {
            supportTicketId: supportTicket._id,
            ticketId,
            category
        });

        res.status(201).json({
            message: 'Support ticket created successfully',
            ticket: supportTicket
        });
    } catch (error: any) {
        logger.error('support.create_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to create support ticket', error: error.message });
    }
};

// Get user's support tickets
export const getMySupportTickets = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { status, category } = req.query;

        const query: any = { userId };
        if (status) query.status = status;
        if (category) query.category = category;

        const tickets = await SupportTicket.find(query)
            .populate('eventId', 'title slug')
            .populate('ticketId', 'qrHash pricePaid')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            tickets,
            total: tickets.length
        });
    } catch (error: any) {
        logger.error('support.get_my_tickets_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
};

// Get support tickets for host's events
export const getEventSupportTickets = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { eventId } = req.params;
        const { status, category } = req.query;

        // Check if user is host of event
        const event = await Event.findOne({ _id: eventId, hostId: userId });
        if (!event) {
            return res.status(403).json({ message: 'Access denied - not event host' });
        }

        const query: any = { eventId };
        if (status) query.status = status;
        if (category) query.category = category;

        const tickets = await SupportTicket.find(query)
            .populate('userId', 'name email')
            .populate('ticketId', 'qrHash pricePaid formData')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            tickets,
            total: tickets.length
        });
    } catch (error: any) {
        logger.error('support.get_event_tickets_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
};

// Get all support tickets for all host's events
export const getAllHostSupportTickets = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { status, category } = req.query;

        // Get all events hosted by user
        const events = await Event.find({ hostId: userId }).select('_id');
        const eventIds = events.map(e => e._id);

        const query: any = { eventId: { $in: eventIds } };
        if (status) query.status = status;
        if (category) query.category = category;

        const tickets = await SupportTicket.find(query)
            .populate('eventId', 'title slug')
            .populate('userId', 'name email')
            .populate('ticketId', 'qrHash pricePaid')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            tickets,
            total: tickets.length
        });
    } catch (error: any) {
        logger.error('support.get_all_host_tickets_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
};

// Add message to support ticket
export const addMessage = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const userRole = req.user.role || 'user';
        const { ticketId } = req.params;
        const { message } = req.body;

        const supportTicket = await SupportTicket.findById(ticketId);
        if (!supportTicket) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Check access
        const isTicketOwner = supportTicket.userId.toString() === userId;
        const event = await Event.findById(supportTicket.eventId);
        const isEventHost = event?.hostId.toString() === userId;
        const isAdmin = userRole === 'admin';

        if (!isTicketOwner && !isEventHost && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Determine sender type
        let senderType: 'user' | 'host' | 'admin' = 'user';
        if (isAdmin) senderType = 'admin';
        else if (isEventHost) senderType = 'host';

        // Add message
        supportTicket.messages.push({
            senderId: userId as any,
            senderType,
            message,
            attachments: [],
            sentAt: new Date()
        });

        // Update status if it was resolved
        if (supportTicket.status === 'resolved' || supportTicket.status === 'closed') {
            supportTicket.status = 'in_progress';
        }

        supportTicket.updatedAt = new Date();
        await supportTicket.save();

        logger.info('support.message_added', {
            supportTicketId: ticketId,
            senderType
        });

        res.json({
            message: 'Message added successfully',
            ticket: supportTicket
        });
    } catch (error: any) {
        logger.error('support.add_message_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to add message' });
    }
};

// Update support ticket status
export const updateTicketStatus = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { ticketId } = req.params;
        const { status, resolution } = req.body;

        const supportTicket = await SupportTicket.findById(ticketId);
        if (!supportTicket) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Check if user is event host
        const event = await Event.findById(supportTicket.eventId);
        if (event?.hostId.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied - only event host can update status' });
        }

        supportTicket.status = status;
        if (status === 'resolved' || status === 'closed') {
            supportTicket.resolvedBy = userId as any;
            supportTicket.resolvedAt = new Date();
            if (resolution) supportTicket.resolution = resolution;
        }
        supportTicket.updatedAt = new Date();
        await supportTicket.save();

        logger.info('support.status_updated', {
            supportTicketId: ticketId,
            status
        });

        res.json({
            message: 'Status updated successfully',
            ticket: supportTicket
        });
    } catch (error: any) {
        logger.error('support.update_status_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to update status' });
    }
};

// Get single support ticket details
export const getSupportTicketDetails = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const userRole = req.user.role || 'user';
        const { ticketId } = req.params;

        const supportTicket = await SupportTicket.findById(ticketId)
            .populate('eventId', 'title slug hostId')
            .populate('userId', 'name email')
            .populate('ticketId', 'qrHash pricePaid formData paymentProof')
            .populate('messages.senderId', 'name email')
            .lean();

        if (!supportTicket) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        // Check access
        const isTicketOwner = supportTicket.userId._id.toString() === userId;
        const isEventHost = (supportTicket.eventId as any).hostId?.toString() === userId;
        const isAdmin = userRole === 'admin';

        if (!isTicketOwner && !isEventHost && !isAdmin) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(supportTicket);
    } catch (error: any) {
        logger.error('support.get_details_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch ticket details' });
    }
};

// ADMIN: Get all support tickets across all events
export const adminGetAllSupportTickets = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userRole = req.user?.role;

        if (userRole !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { status, category, priority, search, page = 1, limit = 50 } = req.query;

        const query: any = {};
        if (status && status !== 'all') query.status = status;
        if (category && category !== 'all') query.category = category;
        if (priority && priority !== 'all') query.priority = priority;

        // Search in subject or description
        if (search) {
            query.$or = [
                { subject: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [tickets, total] = await Promise.all([
            SupportTicket.find(query)
                .populate('eventId', 'title slug')
                .populate('userId', 'name email')
                .populate('ticketId', 'qrHash pricePaid guestName guestEmail')
                .sort({ priority: -1, createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            SupportTicket.countDocuments(query)
        ]);

        // Get stats
        const stats = await SupportTicket.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const statusCounts = {
            open: 0,
            in_progress: 0,
            resolved: 0,
            closed: 0
        };
        stats.forEach((s: any) => {
            statusCounts[s._id as keyof typeof statusCounts] = s.count;
        });

        res.json({
            tickets,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
            stats: statusCounts
        });
    } catch (error: any) {
        logger.error('support.admin_get_all_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
};

// ADMIN: Update any support ticket status
export const adminUpdateTicketStatus = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const userRole = req.user?.role;
        const { ticketId } = req.params;
        const { status, resolution, priority } = req.body;

        if (userRole !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const supportTicket = await SupportTicket.findById(ticketId);
        if (!supportTicket) {
            return res.status(404).json({ message: 'Support ticket not found' });
        }

        if (status) {
            supportTicket.status = status;
            if (status === 'resolved' || status === 'closed') {
                supportTicket.resolvedBy = userId as any;
                supportTicket.resolvedAt = new Date();
                if (resolution) supportTicket.resolution = resolution;
            }
        }

        if (priority) {
            supportTicket.priority = priority;
        }

        supportTicket.updatedAt = new Date();
        await supportTicket.save();

        logger.info('support.admin_status_updated', {
            supportTicketId: ticketId,
            status,
            priority,
            updatedBy: userId
        });

        res.json({
            message: 'Ticket updated successfully',
            ticket: supportTicket
        });
    } catch (error: any) {
        logger.error('support.admin_update_failed', { error: error.message }, error);
        res.status(500).json({ message: 'Failed to update ticket' });
    }
};
