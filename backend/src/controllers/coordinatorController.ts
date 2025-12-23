import { Request, Response } from 'express';
import { Coordinator } from '../models/Coordinator';
import { Event } from '../models/Event';
import { User } from '../models/User';
import { Ticket } from '../models/Ticket';
import crypto from 'crypto';
import { emailQueue } from '../queues/emailQueue';

// Generate unique invite token
const generateInviteToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Add a coordinator to an event
export const addCoordinator = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { eventId, email, name, permissions } = req.body;

        // Verify the user owns this event
        const event = await Event.findOne({ _id: eventId, hostId: userId });
        if (!event) {
            return res.status(403).json({ message: 'Not authorized to add coordinators to this event' });
        }

        // Check if coordinator already exists
        const existing = await Coordinator.findOne({ eventId, email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'This email is already a coordinator for this event' });
        }

        // Generate invite token
        const inviteToken = generateInviteToken();
        const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Create coordinator
        const coordinator = await Coordinator.create({
            eventId,
            email: email.toLowerCase(),
            name,
            inviteToken,
            inviteExpiry,
            status: 'pending',
            permissions: permissions || {},
            addedBy: userId
        });

        // Get host info for email
        const host = await User.findById(userId);

        // Build invite link
        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/coordinator/invite/${inviteToken}`;

        // Send invite email
        emailQueue.add('send-email', {
            to: email,
            subject: `You've been invited to coordinate "${event.title}"`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #303030; margin-bottom: 20px;">You're Invited! 🎉</h1>
                    <p style="color: #666; font-size: 16px; line-height: 1.6;">
                        <strong>${host?.name || host?.email}</strong> has invited you to be an event coordinator for:
                    </p>
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin: 20px 0;">
                        <h2 style="margin: 0 0 10px 0;">${event.title}</h2>
                        ${event.date ? `<p style="margin: 0; opacity: 0.9;">📅 ${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                        ${event.location ? `<p style="margin: 5px 0 0 0; opacity: 0.9;">📍 ${event.location}</p>` : ''}
                    </div>
                    <p style="color: #666; font-size: 14px;">As a coordinator, you'll be able to:</p>
                    <ul style="color: #666; font-size: 14px;">
                        ${permissions?.canScanQR !== false ? '<li>Scan QR codes to check-in attendees</li>' : ''}
                        ${permissions?.canViewAttendees !== false ? '<li>View the attendee list</li>' : ''}
                        ${permissions?.canEditEvent ? '<li>Edit event details</li>' : ''}
                        ${permissions?.canExportData ? '<li>Export attendee data</li>' : ''}
                        ${permissions?.canSendEmails ? '<li>Send emails to participants</li>' : ''}
                    </ul>
                    <a href="${inviteLink}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px;">
                        Accept Invitation
                    </a>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
                    </p>
                </div>
            `
        });

        res.status(201).json({
            message: 'Coordinator invited successfully',
            coordinator: {
                id: coordinator._id,
                email: coordinator.email,
                name: coordinator.name,
                status: coordinator.status,
                permissions: coordinator.permissions,
                inviteLink
            }
        });
    } catch (error) {
        console.error('Add coordinator error:', error);
        res.status(500).json({ message: 'Failed to add coordinator', error });
    }
};

// Accept coordinator invite
export const acceptInvite = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        // @ts-ignore
        const userId = req.user.id;
        // @ts-ignore
        const userEmail = req.user.email;

        // Find the invite
        const coordinator = await Coordinator.findOne({ inviteToken: token });
        if (!coordinator) {
            return res.status(404).json({ message: 'Invalid or expired invitation' });
        }

        // Check if invite is still valid
        if (coordinator.status !== 'pending') {
            return res.status(400).json({ message: 'This invitation has already been used or revoked' });
        }

        if (coordinator.inviteExpiry && new Date() > coordinator.inviteExpiry) {
            return res.status(400).json({ message: 'This invitation has expired' });
        }

        // Verify email matches (case-insensitive)
        const user = await User.findById(userId);
        if (user?.email.toLowerCase() !== coordinator.email.toLowerCase()) {
            return res.status(403).json({
                message: 'This invitation was sent to a different email address. Please login with the correct account.',
                expectedEmail: coordinator.email
            });
        }

        // Accept the invite
        coordinator.userId = userId;
        coordinator.status = 'active';
        coordinator.acceptedAt = new Date();
        await coordinator.save();

        // Get event details
        const event = await Event.findById(coordinator.eventId);

        res.json({
            message: 'Invitation accepted successfully',
            event: event ? {
                id: event._id,
                title: event.title,
                date: event.date,
                location: event.location
            } : null,
            permissions: coordinator.permissions
        });
    } catch (error) {
        console.error('Accept invite error:', error);
        res.status(500).json({ message: 'Failed to accept invitation', error });
    }
};

// Get invite details (for preview before accepting)
export const getInviteDetails = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const coordinator = await Coordinator.findOne({ inviteToken: token })
            .populate('eventId', 'title date location description')
            .populate('addedBy', 'name email');

        if (!coordinator) {
            return res.status(404).json({ message: 'Invalid invitation link' });
        }

        if (coordinator.status !== 'pending') {
            return res.status(400).json({
                message: 'This invitation has already been used',
                status: coordinator.status
            });
        }

        if (coordinator.inviteExpiry && new Date() > coordinator.inviteExpiry) {
            return res.status(400).json({ message: 'This invitation has expired' });
        }

        res.json({
            email: coordinator.email,
            name: coordinator.name,
            event: coordinator.eventId,
            invitedBy: coordinator.addedBy,
            permissions: coordinator.permissions,
            expiresAt: coordinator.inviteExpiry
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get invite details', error });
    }
};

// Get coordinators for an event
export const getEventCoordinators = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { eventId } = req.params;

        console.log('Fetching coordinators for event:', eventId, 'by user:', userId);

        // Verify ownership - use string comparison
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.hostId.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const coordinators = await Coordinator.find({ eventId })
            .populate('userId', 'name email avatar')
            .sort({ createdAt: -1 });

        console.log('Found coordinators:', coordinators.length);

        res.json(coordinators.map(c => ({
            id: c._id,
            email: c.email,
            name: c.name,
            status: c.status,
            permissions: c.permissions,
            user: c.userId,
            acceptedAt: c.acceptedAt,
            createdAt: c.createdAt
        })));
    } catch (error) {
        console.error('Error fetching coordinators:', error);
        res.status(500).json({ message: 'Failed to fetch coordinators', error });
    }
};

// Update coordinator permissions
export const updateCoordinator = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { coordinatorId } = req.params;
        const { permissions, name } = req.body;

        // Find coordinator and verify ownership
        const coordinator = await Coordinator.findById(coordinatorId).populate('eventId');
        if (!coordinator) {
            return res.status(404).json({ message: 'Coordinator not found' });
        }

        const event = coordinator.eventId as any;
        if (event.hostId.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update
        if (permissions) coordinator.permissions = { ...coordinator.permissions, ...permissions };
        if (name !== undefined) coordinator.name = name;
        await coordinator.save();

        res.json({ message: 'Coordinator updated', coordinator });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update coordinator', error });
    }
};

// Remove/revoke coordinator
export const removeCoordinator = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { coordinatorId } = req.params;

        const coordinator = await Coordinator.findById(coordinatorId).populate('eventId');
        if (!coordinator) {
            return res.status(404).json({ message: 'Coordinator not found' });
        }

        const event = coordinator.eventId as any;
        if (event.hostId.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        coordinator.status = 'revoked';
        await coordinator.save();

        res.json({ message: 'Coordinator access revoked' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove coordinator', error });
    }
};

// Get events where user is a coordinator
export const getMyCoordinatedEvents = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        const coordinatorRoles = await Coordinator.find({
            userId,
            status: 'active'
        }).populate({
            path: 'eventId',
            select: 'title date location status maxRegistrations',
            populate: {
                path: 'hostId',
                select: 'name email avatar'
            }
        });

        // Get attendee counts for each event
        const eventsWithStats = await Promise.all(
            coordinatorRoles.map(async (role) => {
                const event = role.eventId as any;
                if (!event) return null;

                const attendeeCount = await Ticket.countDocuments({ eventId: event._id });
                const checkedInCount = await Ticket.countDocuments({ eventId: event._id, status: 'checked-in' });

                return {
                    coordinatorId: role._id,
                    permissions: role.permissions,
                    event: {
                        id: event._id,
                        title: event.title,
                        date: event.date,
                        location: event.location,
                        status: event.status,
                        host: event.hostId,
                        stats: {
                            totalAttendees: attendeeCount,
                            checkedIn: checkedInCount,
                            maxRegistrations: event.maxRegistrations
                        }
                    }
                };
            })
        );

        res.json(eventsWithStats.filter(Boolean));
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch coordinated events', error });
    }
};

// QR Code validation and check-in (for coordinators)
export const scanQRCheckIn = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { ticketCode, eventId } = req.body;

        if (!ticketCode) {
            return res.status(400).json({ message: 'Ticket code is required' });
        }

        // Verify user is a coordinator with scan permission
        const coordinator = await Coordinator.findOne({
            userId,
            eventId,
            status: 'active',
            'permissions.canScanQR': true
        });

        // Also allow event host
        const event = await Event.findById(eventId);
        const isHost = event?.hostId.toString() === userId;

        if (!coordinator && !isHost) {
            return res.status(403).json({ message: 'Not authorized to scan tickets for this event' });
        }

        // Find the ticket
        const ticket = await Ticket.findOne({ ticketCode, eventId });
        if (!ticket) {
            return res.status(404).json({
                message: 'Invalid ticket',
                valid: false
            });
        }

        // Check if already checked in
        if (ticket.status === 'checked-in') {
            return res.status(400).json({
                message: 'This ticket has already been checked in',
                valid: true,
                alreadyCheckedIn: true,
                ticket: {
                    id: ticket._id,
                    name: ticket.guestName,
                    email: ticket.guestEmail,
                    checkedInAt: ticket.updatedAt
                }
            });
        }

        // Check in the attendee
        ticket.status = 'checked-in';
        await ticket.save();

        res.json({
            message: 'Check-in successful!',
            valid: true,
            ticket: {
                id: ticket._id,
                name: ticket.guestName,
                email: ticket.guestEmail,
                checkedInAt: new Date()
            }
        });
    } catch (error) {
        console.error('QR scan error:', error);
        res.status(500).json({ message: 'Failed to process check-in', error });
    }
};
