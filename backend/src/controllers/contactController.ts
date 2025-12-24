import { Request, Response } from 'express';
import { Contact } from '../models/Contact';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { EmailAccount } from '../models/EmailAccount';
import { google } from 'googleapis';

// Get all contacts for a user
export const getContacts = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { limit = 100, skip = 0, search } = req.query;

        let query: any = { hostId: userId };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const contacts = await Contact.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string))
            .skip(parseInt(skip as string))
            .lean();

        const total = await Contact.countDocuments({ hostId: userId });

        res.status(200).json({
            contacts,
            total,
            hasMore: parseInt(skip as string) + contacts.length < total
        });
    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ message: 'Failed to fetch contacts', error });
    }
};

// Sync contacts from tickets (run to populate existing registrations)
export const syncContacts = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        // Get all events for this user
        const events = await Event.find({ hostId: userId }).select('_id title date');
        const eventIds = events.map(e => e._id);

        // Get all tickets for these events
        const tickets = await Ticket.find({ eventId: { $in: eventIds } })
            .select('eventId guestName guestEmail formData createdAt')
            .lean();

        let synced = 0;
        let updated = 0;

        for (const ticket of tickets) {
            const email = ticket.guestEmail ||
                (ticket.formData as any)?.email ||
                (ticket.formData as any)?.Email;

            if (!email) continue;

            const name = ticket.guestName ||
                (ticket.formData as any)?.name ||
                (ticket.formData as any)?.Name ||
                'Guest';

            const phone = (ticket.formData as any)?.phone ||
                (ticket.formData as any)?.Phone ||
                (ticket.formData as any)?.mobile ||
                '';

            const event = events.find(e => e._id.toString() === ticket.eventId.toString());

            try {
                const existing = await Contact.findOne({ hostId: userId, email: email.toLowerCase() });

                if (existing) {
                    // Update existing contact
                    if (!existing.eventIds.includes(ticket.eventId)) {
                        existing.eventIds.push(ticket.eventId);
                        existing.totalEvents = existing.eventIds.length;
                        if (event?.date && (!existing.lastEventDate || new Date(event.date) > existing.lastEventDate)) {
                            existing.lastEventDate = new Date(event.date);
                        }
                        await existing.save();
                        updated++;
                    }
                } else {
                    // Create new contact
                    await Contact.create({
                        hostId: userId,
                        email: email.toLowerCase(),
                        name,
                        phone,
                        source: 'registration',
                        eventIds: [ticket.eventId],
                        lastEventDate: event?.date,
                        totalEvents: 1
                    });
                    synced++;
                }
            } catch (err) {
                // Skip duplicates
            }
        }

        res.status(200).json({
            message: `Synced ${synced} new contacts, updated ${updated} existing`,
            synced,
            updated
        });
    } catch (error) {
        console.error('Sync contacts error:', error);
        res.status(500).json({ message: 'Failed to sync contacts', error });
    }
};

// Export contacts as CSV
export const exportContacts = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        const contacts = await Contact.find({ hostId: userId })
            .sort({ createdAt: -1 })
            .lean();

        // Build CSV
        const headers = ['Name', 'Email', 'Phone', 'Events Attended', 'Last Event Date', 'Source', 'Opted In', 'Added On'];
        const rows = contacts.map(c => [
            c.name || '',
            c.email,
            c.phone || '',
            c.totalEvents || 1,
            c.lastEventDate ? new Date(c.lastEventDate).toLocaleDateString() : '',
            c.source || 'registration',
            c.optedIn !== false ? 'Yes' : 'No',
            new Date(c.createdAt).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
        res.send(csvContent);
    } catch (error) {
        console.error('Export contacts error:', error);
        res.status(500).json({ message: 'Failed to export contacts', error });
    }
};

// Send bulk email to contacts
export const sendBulkEmail = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { subject, message, contactIds, eventId, isHtml } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        // Get user's active email account
        const emailAccount = await EmailAccount.findOne({ userId, isActive: true });
        if (!emailAccount) {
            return res.status(400).json({ message: 'No active email account. Please connect Gmail first.' });
        }

        let contacts: any[] = [];

        if (contactIds && contactIds.length > 0) {
            contacts = await Contact.find({
                hostId: userId,
                _id: { $in: contactIds },
                optedIn: true
            }).lean();
        } else if (eventId) {
            contacts = await Contact.find({
                hostId: userId,
                eventIds: eventId,
                optedIn: true
            }).lean();
        } else {
            contacts = await Contact.find({
                hostId: userId,
                optedIn: true
            }).lean();
        }

        if (contacts.length === 0) {
            return res.status(400).json({ message: 'No contacts to send to' });
        }

        // Setup Gmail API
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
            access_token: emailAccount.accessToken,
            refresh_token: emailAccount.refreshToken
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        let sent = 0;
        let failed = 0;

        for (const contact of contacts) {
            try {
                // Replace {name} placeholder with actual name
                const personalizedMessage = message.replace(/\{name\}/gi, contact.name || 'there');

                // Build HTML content
                let html: string;
                if (isHtml) {
                    // If already HTML, just wrap in basic container
                    html = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            ${personalizedMessage}
                            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
                            <p style="font-size: 12px; color: #888;">
                                You received this email because you registered for one of our events.
                            </p>
                        </div>
                    `;
                } else {
                    // Convert plain text to HTML
                    html = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                            <p>Hi ${contact.name || 'there'},</p>
                            <div style="white-space: pre-wrap;">${personalizedMessage}</div>
                            <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
                            <p style="font-size: 12px; color: #888;">
                                You received this email because you registered for one of our events.
                            </p>
                        </div>
                    `;
                }

                const rawMessage = [
                    `From: ${emailAccount.email}`,
                    `To: ${contact.email}`,
                    `Subject: ${subject}`,
                    `Content-Type: text/html; charset=utf-8`,
                    '',
                    html
                ].join('\r\n');

                const encodedMessage = Buffer.from(rawMessage)
                    .toString('base64')
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');

                await gmail.users.messages.send({
                    userId: 'me',
                    requestBody: { raw: encodedMessage }
                });

                sent++;
            } catch (err) {
                console.error(`Failed to send to ${contact.email}:`, err);
                failed++;
            }

            // Delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        res.status(200).json({
            message: `Sent ${sent} emails successfully${failed > 0 ? `, ${failed} failed` : ''}`,
            sent,
            failed,
            total: contacts.length
        });
    } catch (error) {
        console.error('Send bulk email error:', error);
        res.status(500).json({ message: 'Failed to send emails', error });
    }
};

// Delete contact
export const deleteContact = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { contactId } = req.params;

        await Contact.deleteOne({ _id: contactId, hostId: userId });
        res.status(200).json({ message: 'Contact deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete contact', error });
    }
};

// Get contact stats
export const getContactStats = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        const total = await Contact.countDocuments({ hostId: userId });
        const optedIn = await Contact.countDocuments({ hostId: userId, optedIn: true });
        const thisMonth = await Contact.countDocuments({
            hostId: userId,
            createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        });

        res.status(200).json({
            total,
            optedIn,
            optedOut: total - optedIn,
            thisMonth
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get stats', error });
    }
};
