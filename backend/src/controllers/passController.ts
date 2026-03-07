import { Request, Response } from 'express';
import { Pass } from '../models/Pass';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import crypto from 'crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { sendTicketEmail } from '../services/emailService';

// Create a pass
export const createPass = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const hostId = req.user.id;
        const { title, description, includedEvents, price, maxSales, saleStartsAt, saleEndsAt } = req.body;

        // Verify all events belong to host
        const validEvents = await Event.find({ _id: { $in: includedEvents }, hostId });
        if (validEvents.length !== includedEvents.length) {
            return res.status(400).json({ message: 'One or more events are invalid or do not belong to you' });
        }

        const pass = await Pass.create({
            hostId,
            title,
            description,
            includedEvents,
            price: price || 0,
            maxSales: maxSales || 0,
            saleStartsAt,
            saleEndsAt
        });

        res.status(201).json({ message: 'Pass created successfully', pass });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create pass', error });
    }
};

// Get all passes for a host
export const getHostPasses = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const hostId = req.user.id;
        const passes = await Pass.find({ hostId }).populate('includedEvents', 'title date location');
        res.status(200).json(passes);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch passes', error });
    }
};

// Purchase a pass (generates tickets for all included events)
export const purchasePass = async (req: Request, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { passId } = req.params;
        const { guestName, guestEmail, formData, promoCode } = req.body;

        let userId = null;
        let paymentStatus = 'free';

        const pass = await Pass.findById(passId).populate('includedEvents').session(session);
        if (!pass) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Pass not found' });
        }

        if (pass.status !== 'active') {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Pass is no longer active' });
        }

        if (pass.maxSales > 0 && pass.currentSales >= pass.maxSales) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'Pass sold out' });
        }

        let finalPrice = pass.price;

        if (finalPrice > 0) {
            // Require auth for paid passes
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                await session.abortTransaction();
                return res.status(401).json({ message: 'Login required for paid passes.' });
            }

            try {
                const token = authHeader.split(' ')[1];

                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
                userId = (decoded as any).id;

                // For a UPI system, passes are 'pending' until the user uploads proof
                paymentStatus = 'pending';
            } catch (err) {
                await session.abortTransaction();
                return res.status(401).json({ message: 'Invalid or expired session. Please login again.' });
            }
        }

        const generatedTickets = [];

        for (const event of pass.includedEvents as any[]) {
            const qrCodeHash = crypto.randomBytes(32).toString('hex');

            const ticket = new Ticket({
                eventId: event._id,
                userId,
                guestName: guestName || 'Guest',
                guestEmail: guestEmail || 'No Email',
                // Attach pass id to form data to help organizer track
                formData: formData ? { ...formData, purchasedViaPassId: pass._id.toString() } : { purchasedViaPassId: pass._id.toString() },
                pricePaid: 0,
                paymentStatus,
                qrCodeHash,
                status: finalPrice > 0 ? 'pending' : 'issued',
                approved: finalPrice > 0 ? false : true
            });

            await ticket.save({ session });
            generatedTickets.push(ticket);

            // Send confirmation email for each generated ticket asynchronously
            sendTicketEmail({
                eventHostId: event.hostId.toString(),
                recipientEmail: guestEmail,
                ticketData: {
                    _id: ticket._id,
                    guestName: guestName || 'Guest',
                    guestEmail: guestEmail || 'No Email',
                    qrCodeHash: ticket.qrCodeHash
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
                    sendConfirmationEmail: event.sendConfirmationEmail !== false,
                    attachTicket: event.attachTicket !== false
                }
            }).catch(err => console.error('Failed to send pass ticket email:', err));
        }

        // Increment sales
        pass.currentSales += 1;
        if (pass.maxSales > 0 && pass.currentSales >= pass.maxSales) {
            pass.status = 'sold_out';
        }
        await pass.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            message: 'Pass purchased successfully',
            tickets: generatedTickets
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Pass purchase error:', error);
        res.status(500).json({ message: 'Failed to purchase pass', error });
    } finally {
        session.endSession();
    }
};
