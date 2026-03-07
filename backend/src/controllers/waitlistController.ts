import { Request, Response } from 'express';
import { Ticket } from '../models/Ticket';
import { Event } from '../models/Event';
import { sendTicketEmail } from '../services/emailService';

// Handle user cancellation of a ticket, which triggers auto-promotion
export const cancelTicket = async (req: Request, res: Response) => {
    try {
        const { ticketId } = req.params;
        const userId = (req as any).user.id; // User must be logged in to cancel

        const ticket = await Ticket.findById(ticketId).populate('eventId');
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        // Must be the owner to cancel
        if (ticket.userId?.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to cancel this ticket' });
        }

        const event = ticket.eventId as any;

        // Soft delete or change status
        ticket.status = 'cancelled';
        await ticket.save();

        // ----------------------------------------------------
        // AUTOMATED WAITLIST PROMOTION
        // ----------------------------------------------------
        if (event.waitlistEnabled) {
            // Find the oldest waitlisted ticket
            const nextInLine = await Ticket.findOne({
                eventId: event._id,
                waitlist: true,
                status: 'waitlisted'
            }).sort({ createdAt: 1 }); // Oldest first

            if (nextInLine) {
                // Promote them!
                nextInLine.waitlist = false;

                // If approval is required, put them in pending queue, else issue immediately
                if (event.approvalRequired) {
                    nextInLine.approved = false;
                    nextInLine.status = 'pending';
                } else {
                    nextInLine.approved = true;
                    nextInLine.status = 'issued';

                    // Send email notification of promotion + ticket
                    sendTicketEmail({
                        eventHostId: event.hostId.toString(),
                        recipientEmail: nextInLine.guestEmail || '',
                        ticketData: {
                            _id: nextInLine._id,
                            guestName: nextInLine.guestName || 'Guest',
                            guestEmail: nextInLine.guestEmail || '',
                            qrCodeHash: nextInLine.qrCodeHash
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
                    }).catch(err => console.error('Failed to send waitlist promotion email:', err));
                }

                await nextInLine.save();
            }
        }

        res.json({ message: 'Ticket cancelled successfully' });
    } catch (error) {
        console.error('Cancel Ticket Error:', error);
        res.status(500).json({ message: 'Failed to cancel ticket', error });
    }
};
