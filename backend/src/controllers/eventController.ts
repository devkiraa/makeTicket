import { Request, Response } from 'express';
import { Event } from '../models/Event';

// Create Event
export const createEvent = async (req: Request, res: Response) => {
    try {
        // @ts-ignore - handled by middleware
        const userId = req.user.id;
        const { title, description, slug, date, location, price, formSchema, authorizedHelpers } = req.body;
        const event = await Event.create({
            hostId: userId,
            title,
            description,
            slug,
            date,
            location,
            price: price || 0,
            formSchema,
            authorizedHelpers
        });

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create event', error });
    }
};

// Get Event by Slug (Public)
export const getEvent = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const event = await Event.findOne({ slug });
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch event', error });
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

        const event = await Event.findOneAndUpdate(
            { _id: id, hostId: userId },
            { $set: updates },
            { new: true }
        );

        if (!event) return res.status(404).json({ message: 'Event not found or unauthorized' });

        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update event', error });
    }
};
