import { Request, Response } from 'express';
import { User } from '../models/User';
import { Event } from '../models/Event';

export const getPublicUserProfile = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select('-password -googleId -smtpConfig -__v');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch public events for this user
        const events = await Event.find({
            hostId: user._id,
            status: 'active' // Only show active/published events
        }).select('title slug date location description price banner'); // Add banner to event if exists later

        res.json({
            user,
            events
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error });
    }
};
