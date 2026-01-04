import { User } from '../models/User';
import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { checkFeatureAccess as checkPlanFeatureAccess } from '../services/planLimitService';

// Create Event
export const createEvent = async (req: Request, res: Response) => {
    try {
        // @ts-ignore - handled by middleware
        const userId = req.user.id;
        const {
            title, description, slug, date, location, price,
            formSchema, authorizedHelpers, status,
            maxRegistrations, allowMultipleRegistrations,
            emailTemplateId, sendConfirmationEmail,
            ticketTemplateId, attachTicket,
            waitlistEnabled, approvalRequired
        } = req.body;

        // Feature gating
        if (typeof price === 'number' && price > 0) {
            const paymentsCheck = await checkPlanFeatureAccess(userId, 'acceptPayments');
            if (!paymentsCheck.allowed) {
                return res.status(403).json({
                    message: paymentsCheck.message,
                    feature: paymentsCheck.feature,
                    upgradeRequired: paymentsCheck.upgradeRequired,
                    code: 'FEATURE_NOT_AVAILABLE'
                });
            }
        }

        if (waitlistEnabled === true) {
            const waitlistCheck = await checkPlanFeatureAccess(userId, 'waitlistManagement');
            if (!waitlistCheck.allowed) {
                return res.status(403).json({
                    message: waitlistCheck.message,
                    feature: waitlistCheck.feature,
                    upgradeRequired: waitlistCheck.upgradeRequired,
                    code: 'FEATURE_NOT_AVAILABLE'
                });
            }
        }

        // Clean ObjectIds (handle empty strings)
        const cleanEmailTemplateId = (emailTemplateId && emailTemplateId !== '') ? emailTemplateId : undefined;
        const cleanTicketTemplateId = (ticketTemplateId && ticketTemplateId !== '') ? ticketTemplateId : undefined;

        const event = await Event.create({
            hostId: userId,
            title,
            description,
            slug,
            date: date || undefined, // dates can handle null/undefined usually, but undefined triggers optional
            location,
            price: price || 0,
            formSchema,
            authorizedHelpers,
            status: status || 'draft',
            maxRegistrations: maxRegistrations || 0,
            allowMultipleRegistrations: allowMultipleRegistrations, // Pass value directly (frontend sends boolean)
            emailTemplateId: cleanEmailTemplateId,
            sendConfirmationEmail: sendConfirmationEmail,
            ticketTemplateId: cleanTicketTemplateId,
            attachTicket: attachTicket,
            waitlistEnabled: waitlistEnabled || false,
            approvalRequired: approvalRequired || false
        });

        res.status(201).json(event);
    } catch (error) {
        console.error('Create Event Error:', error);
        res.status(500).json({ message: 'Failed to create event', error });
    }
};

// Get Event by Username and Slug (Public)
export const getEvent = async (req: Request, res: Response) => {
    try {
        const { username, slug } = req.params;

        // Find Host - try multiple strategies
        // 1. First try exact username match
        let host = await User.findOne({ username });

        // 2. If not found, try email prefix match
        if (!host) {
            host = await User.findOne({
                email: { $regex: `^${username}@`, $options: 'i' }
            });
        }

        // 3. If still not found, try normalized name match
        if (!host) {
            const allUsers = await User.find();
            host = allUsers.find(u => {
                const normalizedName = (u.name || '').toLowerCase().replace(/\s+/g, '');
                return normalizedName === username.toLowerCase();
            }) || null;
        }

        if (!host) return res.status(404).json({ message: 'Host not found' });

        const event = await Event.findOne({ hostId: host._id, slug });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Return event with host details embedded if needed, or frontend fetches host differently
        // For simple display, event + host username is enough
        res.status(200).json({ ...event.toObject(), host: { username: host.username || username, name: host.name, avatar: host.avatar } });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch event', error });
    }
};

// Check Event Slug Availability
export const checkEventSlug = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { slug, excludeEventId } = req.query;
        if (!slug) return res.status(400).json({ message: 'Slug required' });

        // Build query - exclude the current event when editing
        const query: any = { hostId: userId, slug };
        if (excludeEventId) {
            query._id = { $ne: excludeEventId };
        }

        const existing = await Event.findOne(query);
        res.json({ available: !existing });
    } catch (error) {
        res.status(500).json({ message: 'Error checking slug', error });
    }
};

// Get User's Events (Protected)
export const getMyEvents = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const events = await Event.find({ hostId: userId }).sort({ createdAt: -1 });
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch your events', error });
    }
};

// Update Event (Protected)
export const updateEvent = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;
        const updates = req.body;

        // First check if event exists at all
        const existingEvent = await Event.findById(id);
        if (!existingEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Feature gating for updates (only check if toggled/used)
        if (typeof updates.price === 'number' && updates.price > 0) {
            const paymentsCheck = await checkPlanFeatureAccess(userId, 'acceptPayments');
            if (!paymentsCheck.allowed) {
                return res.status(403).json({
                    message: paymentsCheck.message,
                    feature: paymentsCheck.feature,
                    upgradeRequired: paymentsCheck.upgradeRequired,
                    code: 'FEATURE_NOT_AVAILABLE'
                });
            }
        }

        if (updates.waitlistEnabled === true) {
            const waitlistCheck = await checkPlanFeatureAccess(userId, 'waitlistManagement');
            if (!waitlistCheck.allowed) {
                return res.status(403).json({
                    message: waitlistCheck.message,
                    feature: waitlistCheck.feature,
                    upgradeRequired: waitlistCheck.upgradeRequired,
                    code: 'FEATURE_NOT_AVAILABLE'
                });
            }
        }

        // Clean up empty ObjectId fields (can't be empty strings)
        if (updates.emailTemplateId === '' || updates.emailTemplateId === null) {
            delete updates.emailTemplateId;
        }
        if (updates.ticketTemplateId === '' || updates.ticketTemplateId === null) {
            delete updates.ticketTemplateId;
        }

        const event = await Event.findOneAndUpdate(
            { _id: id, hostId: userId },
            { $set: updates },
            { new: true }
        );

        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        res.status(200).json(event);
    } catch (error: any) {
        console.error('Update Event Error:', error);
        res.status(500).json({ message: 'Failed to update event', error: error.message || error });
    }
};

// Delete Event (Protected)
export const deleteEvent = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;

        // Check ownership
        const event = await Event.findOne({ _id: id, hostId: userId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        // Delete associated tickets (cleanup)
        await Ticket.deleteMany({ eventId: id });

        // Delete event
        await Event.findByIdAndDelete(id);

        res.status(200).json({ message: 'Event deleted successfully' });
    } catch (error: any) {
        console.error('Delete Event Error:', error);
        res.status(500).json({ message: 'Failed to delete event', error: error.message || error });
    }
};

// Toggle Registration Pause (Protected)
export const toggleRegistrationPause = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { id } = req.params;

        // Check ownership
        const event = await Event.findOne({ _id: id, hostId: userId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        // Toggle the paused state
        const newPausedState = !event.registrationPaused;
        event.registrationPaused = newPausedState;
        await event.save();

        res.status(200).json({
            message: newPausedState ? 'Registration paused' : 'Registration resumed',
            registrationPaused: newPausedState,
            event
        });
    } catch (error: any) {
        console.error('Toggle Registration Pause Error:', error);
        res.status(500).json({ message: 'Failed to toggle registration pause', error: error.message || error });
    }
};
