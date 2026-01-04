import { Request, Response } from 'express';
import { EventInterest } from '../models/EventInterest';
import { Event } from '../models/Event';

export const registerInterest = async (req: Request, res: Response) => {
    try {
        const { eventId } = req.params;
        const { email, name, source } = req.body;
        const userId = (req as any).user?._id; // If authenticated

        if (!email) return res.status(400).json({ message: 'Email is required' });

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Upsert interest
        const interest = await EventInterest.findOneAndUpdate(
            { event: eventId, email: email.toLowerCase() },
            {
                $set: {
                    user: userId || undefined,
                    name: name || undefined,
                    source: source || 'email'
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: 'Interest registered', interest });
    } catch (error) {
        console.error('Interest registration error:', error);
        res.status(500).json({ message: 'Failed to register interest' });
    }
};
