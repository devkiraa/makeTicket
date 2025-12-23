import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        // 1. Get all events hosted by user
        const events = await Event.find({ hostId: userId });
        const eventIds = events.map(e => e._id);

        // 2. Count active events (future date)
        // 2. Count active events (future date or active status)
        const now = new Date();
        const activeEventsCount = events.filter(e => {
            // Consider active if explicit status is 'active' OR date is in future
            if (e.status === 'active') return true;
            // Fallback for logic where status might be missing or we heavily rely on date
            return e.date && new Date(e.date) >= now;
        }).length;

        // 3. Count total tickets sold (approx revenue)
        // Note: We don't have a price field in Event yet, assuming free or static for now, or just ticket count.
        // If we want revenue, we need to add price to the Event model.
        // For now, let's just return ticket counts.
        // 3. Count total tickets sold
        const allTickets = await Ticket.find({ eventId: { $in: eventIds } }).select('pricePaid status');
        const totalTickets = allTickets.length;
        const checkedInTickets = allTickets.filter(t => t.status === 'checked-in').length;

        // Calculate Revenue from pricePaid field (default 0)
        // @ts-ignore
        const totalRevenue = allTickets.reduce((sum, ticket) => sum + (ticket.pricePaid || 0), 0);

        res.status(200).json({
            totalRevenue,
            totalTickets,
            activeEventsCount,
            totalEvents: events.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch dashboard stats', error });
    }
};

export const getAllAttendees = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        // Get user's events
        const events = await Event.find({ hostId: userId }).select('title date');
        const eventMap = events.reduce((acc, event) => {
            acc[event._id.toString()] = event;
            return acc;
        }, {} as any);

        const eventIds = events.map(e => e._id);

        // Get tickets for these events
        const tickets = await Ticket.find({ eventId: { $in: eventIds } }).sort({ createdAt: -1 });

        // Map tickets to flat attendee objects
        const attendees = tickets.map(ticket => {
            const event = eventMap[ticket.eventId.toString()];
            // Extract common fields from dynamic formData if available, else falback
            // As per Ticket model, formData is a Map.
            // We assume keys like 'name', 'email' exist in the form data for display.
            const data = ticket.formData || {};

            // Handle Mongoose Map if used, or plain object
            const fd = data instanceof Map ? Object.fromEntries(data) : data;

            return {
                id: ticket._id,
                name: fd.name || fd.Name || 'Guest Match',
                email: fd.email || fd.Email || 'No Email',
                eventName: event ? event.title : 'Unknown Event',
                status: ticket.status, // issued vs checked-in
                checkedIn: ticket.status === 'checked-in',
                formData: fd // Pass full form data for detail view
            };
        });

        res.status(200).json(attendees);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch attendees', error });
    }
};
