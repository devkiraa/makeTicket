import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        // 1. Get all events hosted by user
        const events = await Event.find({ hostId: userId }).select('title slug date status price');
        const eventIds = events.map(e => e._id);

        // 2. Count active/draft/closed events
        const now = new Date();
        const activeEventsCount = events.filter(e => e.status === 'active').length;
        const draftEventsCount = events.filter(e => e.status === 'draft').length;
        const closedEventsCount = events.filter(e => e.status === 'closed').length;

        // 3. Get all tickets with detailed info
        const allTickets = await Ticket.find({ eventId: { $in: eventIds } })
            .select('eventId pricePaid status createdAt')
            .sort({ createdAt: -1 });

        const totalTickets = allTickets.length;
        const checkedInTickets = allTickets.filter(t => t.status === 'checked-in').length;

        // Calculate Revenue (INR)
        // @ts-ignore
        const totalRevenue = allTickets.reduce((sum, ticket) => sum + (ticket.pricePaid || 0), 0);

        // 4. Per-Event Stats
        const eventStats = events.map(event => {
            const eventTickets = allTickets.filter(t => t.eventId.toString() === event._id.toString());
            // @ts-ignore
            const eventRevenue = eventTickets.reduce((sum, t) => sum + (t.pricePaid || 0), 0);
            return {
                id: event._id,
                title: event.title,
                slug: event.slug,
                date: event.date,
                status: event.status,
                ticketsSold: eventTickets.length,
                checkedIn: eventTickets.filter(t => t.status === 'checked-in').length,
                revenue: eventRevenue
            };
        }).sort((a, b) => b.ticketsSold - a.ticketsSold); // Sort by most tickets

        // 5. Daily Registration Trend (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyRegistrations: { [key: string]: number } = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            dailyRegistrations[key] = 0;
        }

        allTickets.forEach(ticket => {
            // @ts-ignore
            const dateKey = new Date(ticket.createdAt).toISOString().split('T')[0];
            if (dailyRegistrations[dateKey] !== undefined) {
                dailyRegistrations[dateKey]++;
            }
        });

        // Convert to sorted array
        const registrationTrend = Object.entries(dailyRegistrations)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // 6. Recent Registrations (last 5 for efficiency)
        const recentTickets = allTickets.slice(0, 5).map(t => {
            const event = events.find(e => e._id.toString() === t.eventId.toString());
            return {
                id: t._id,
                eventTitle: event?.title || 'Unknown',
                // @ts-ignore
                date: t.createdAt,
                amount: t.pricePaid || 0
            };
        });

        // Count check-ins today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkedInToday = await Ticket.countDocuments({
            eventId: { $in: eventIds },
            status: 'checked-in',
            checkedInAt: { $gte: today }
        });

        res.status(200).json({
            totalRevenue,
            totalTickets,
            checkedInTickets,
            checkedInToday,
            activeEventsCount,
            draftEventsCount,
            closedEventsCount,
            totalEvents: events.length,
            eventStats,
            registrationTrend,
            recentRegistrations: recentTickets,
            checkInRate: totalTickets > 0 ? Math.round((checkedInTickets / totalTickets) * 100) : 0
        });
    } catch (error) {
        console.error('Analytics Error:', error);
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

// Get registrations for the logged-in user (events they've registered for)
export const getMyRegistrations = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userEmail = req.user.email;

        // Find all tickets where the form data email matches the user's email
        const tickets = await Ticket.find({}).populate('eventId').sort({ createdAt: -1 });

        // Filter tickets by email in formData
        const userTickets = tickets.filter(ticket => {
            const fd = ticket.formData instanceof Map ? Object.fromEntries(ticket.formData) : (ticket.formData || {});
            const ticketEmail = fd.email || fd.Email || fd['Email Address'] || '';
            return ticketEmail.toLowerCase() === userEmail.toLowerCase();
        });

        // Map to response format
        const registrations = userTickets.map(ticket => {
            const event = ticket.eventId as any;
            const fd = ticket.formData instanceof Map ? Object.fromEntries(ticket.formData) : (ticket.formData || {});

            return {
                ticketId: ticket._id,
                qrCodeHash: ticket.qrCodeHash,
                status: ticket.status,
                checkedIn: ticket.status === 'checked-in',
                registeredAt: ticket.createdAt,
                event: event ? {
                    _id: event._id,
                    title: event.title,
                    slug: event.slug,
                    date: event.date,
                    location: event.location,
                    description: event.description,
                    status: event.status
                } : null,
                formData: fd
            };
        });

        res.status(200).json(registrations);
    } catch (error) {
        console.error('Error fetching user registrations:', error);
        res.status(500).json({ message: 'Failed to fetch registrations', error });
    }
};

// Upgrade user from 'user' to 'host' role
import { User } from '../models/User';

export const upgradeToHost = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'host' || user.role === 'admin') {
            return res.status(400).json({ message: 'You are already a host or admin' });
        }

        user.role = 'host';
        await user.save();

        res.status(200).json({ message: 'You are now a host! You can create events.', role: 'host' });
    } catch (error) {
        console.error('Error upgrading to host:', error);
        res.status(500).json({ message: 'Failed to upgrade to host', error });
    }
};
