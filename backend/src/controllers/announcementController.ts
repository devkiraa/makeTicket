import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { User } from '../models/User';
import { EmailAccount } from '../models/EmailAccount';
import { google } from 'googleapis';
import { logger } from '../lib/logger';

// Helper to send email via Gmail API or ZeptoMail
const sendAnnouncementEmail = async (
    emailAccount: any,
    recipientEmail: string,
    subject: string,
    htmlBody: string
): Promise<boolean> => {
    try {
        if (emailAccount.provider === 'gmail') {
            // Gmail OAuth2
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_GMAIL_CLIENT_ID,
                process.env.GOOGLE_GMAIL_CLIENT_SECRET
            );
            oauth2Client.setCredentials({
                access_token: emailAccount.accessToken,
                refresh_token: emailAccount.refreshToken
            });

            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            const fromEmail = emailAccount.customFromEmail || emailAccount.email;
            const fromName = emailAccount.customFromName || emailAccount.name || 'MakeTicket';

            const raw = Buffer.from(
                `From: "${fromName}" <${fromEmail}>\r\n` +
                `To: ${recipientEmail}\r\n` +
                `Subject: ${subject}\r\n` +
                `MIME-Version: 1.0\r\n` +
                `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
                htmlBody
            ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw }
            });

            return true;
        } else if (emailAccount.provider === 'zeptomail') {
            // ZeptoMail API
            const response = await fetch('https://api.zeptomail.com/v1.1/email', {
                method: 'POST',
                headers: {
                    'Authorization': emailAccount.apiToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: {
                        address: emailAccount.email,
                        name: emailAccount.name || 'MakeTicket'
                    },
                    to: [{ email_address: { address: recipientEmail } }],
                    subject,
                    htmlbody: htmlBody
                })
            });

            return response.ok;
        }

        return false;
    } catch (error) {
        logger.error('announcement.email_send_failed', { error, recipient: recipientEmail });
        return false;
    }
};

// Generate announcement email HTML
const generateAnnouncementHtml = (data: {
    eventTitle: string;
    announcementType: 'cancellation' | 'time_change' | 'custom';
    subject: string;
    message: string;
    newDateTime?: string;
    newLocation?: string;
    guestName?: string;
}): string => {
    const { eventTitle, announcementType, message, newDateTime, newLocation, guestName } = data;

    let headerColor = '#4F46E5'; // Indigo
    let headerIcon = '📢';
    let headerTitle = 'Event Update';

    if (announcementType === 'cancellation') {
        headerColor = '#DC2626'; // Red
        headerIcon = '❌';
        headerTitle = 'Event Cancelled';
    } else if (announcementType === 'time_change') {
        headerColor = '#F59E0B'; // Amber
        headerIcon = '📅';
        headerTitle = 'Schedule Changed';
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; }
        .header-icon { font-size: 48px; margin-bottom: 10px; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 30px; color: #1e293b; line-height: 1.6; }
        .content h2 { margin: 0 0 20px 0; font-size: 20px; color: #0f172a; }
        .message-box { background: #f8fafc; border-left: 4px solid ${headerColor}; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0; }
        .update-box { background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 12px; margin: 20px 0; }
        .update-box strong { color: #92400e; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .event-name { font-weight: 600; color: ${headerColor}; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-icon">${headerIcon}</div>
            <h1>${headerTitle}</h1>
            <p>Regarding: ${eventTitle}</p>
        </div>
        <div class="content">
            ${guestName ? `<p>Hi <strong>${guestName}</strong>,</p>` : '<p>Hi there,</p>'}
            
            <div class="message-box">
                ${message.replace(/\n/g, '<br>')}
            </div>
            
            ${announcementType === 'time_change' && (newDateTime || newLocation) ? `
            <div class="update-box">
                <p style="margin: 0 0 10px 0; font-weight: 600;">📌 Updated Details:</p>
                ${newDateTime ? `<p style="margin: 5px 0;">📅 <strong>New Date/Time:</strong> ${newDateTime}</p>` : ''}
                ${newLocation ? `<p style="margin: 5px 0;">📍 <strong>New Location:</strong> ${newLocation}</p>` : ''}
            </div>
            ` : ''}
            
            ${announcementType === 'cancellation' ? `
            <p style="color: #64748b; font-size: 14px;">
                We sincerely apologize for any inconvenience this may cause. If you have any questions, please don't hesitate to reach out to the event organizer.
            </p>
            ` : ''}
            
            <p style="color: #64748b; margin-top: 20px;">
                Thank you for your understanding.<br>
                - The Event Team
            </p>
        </div>
        <div class="footer">
            <p>This email was sent via MakeTicket</p>
        </div>
    </div>
</body>
</html>`;
};

/**
 * Send announcement to all event attendees
 */
export const sendEventAnnouncement = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { eventId } = req.params;
        const { type, subject, message, newDateTime, newLocation } = req.body;

        // Validate input
        if (!type || !subject || !message) {
            return res.status(400).json({
                message: 'Type, subject, and message are required'
            });
        }

        if (!['cancellation', 'time_change', 'custom'].includes(type)) {
            return res.status(400).json({
                message: 'Invalid announcement type. Must be: cancellation, time_change, or custom'
            });
        }

        // Get event
        const event = await Event.findOne({ _id: eventId, hostId: userId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Get active email account for the host
        const emailAccount = await EmailAccount.findOne({
            userId,
            isActive: true,
            isVerified: true
        });

        if (!emailAccount) {
            return res.status(400).json({
                message: 'No active email account found. Please configure an email account first.'
            });
        }

        // Get all confirmed attendees
        const tickets = await Ticket.find({
            eventId,
            status: { $in: ['confirmed', 'approved', 'pending'] }
        }).select('guestEmail guestName');

        if (tickets.length === 0) {
            return res.status(400).json({
                message: 'No attendees to notify'
            });
        }

        // Remove duplicates by email
        const uniqueAttendees = new Map<string, { email: string; name: string }>();
        tickets.forEach(ticket => {
            if (ticket.guestEmail && !uniqueAttendees.has(ticket.guestEmail)) {
                uniqueAttendees.set(ticket.guestEmail, {
                    email: ticket.guestEmail,
                    name: ticket.guestName || 'Guest'
                });
            }
        });

        const attendeeList = Array.from(uniqueAttendees.values());

        logger.info('announcement.sending', {
            event_id: eventId,
            event_title: event.title,
            type,
            recipient_count: attendeeList.length
        });

        // Send emails in batches
        let successCount = 0;
        let failCount = 0;
        const batchSize = 10;

        for (let i = 0; i < attendeeList.length; i += batchSize) {
            const batch = attendeeList.slice(i, i + batchSize);

            const results = await Promise.all(
                batch.map(async (attendee) => {
                    const html = generateAnnouncementHtml({
                        eventTitle: event.title,
                        announcementType: type,
                        subject,
                        message,
                        newDateTime,
                        newLocation,
                        guestName: attendee.name
                    });

                    const success = await sendAnnouncementEmail(
                        emailAccount,
                        attendee.email,
                        subject,
                        html
                    );

                    return success;
                })
            );

            successCount += results.filter(r => r).length;
            failCount += results.filter(r => !r).length;

            // Small delay between batches to avoid rate limits
            if (i + batchSize < attendeeList.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // If cancellation, update event status
        if (type === 'cancellation') {
            await Event.findByIdAndUpdate(eventId, {
                status: 'closed',
                registrationPaused: true
            });
        }

        // If time change, update event times
        if (type === 'time_change' && newDateTime) {
            const newDate = new Date(newDateTime);
            await Event.findByIdAndUpdate(eventId, {
                date: newDate,
                eventStartTime: newDate
            });
        }

        logger.info('announcement.completed', {
            event_id: eventId,
            success_count: successCount,
            fail_count: failCount
        });

        res.json({
            message: 'Announcement sent successfully',
            stats: {
                total: attendeeList.length,
                sent: successCount,
                failed: failCount
            }
        });
    } catch (error) {
        logger.error('announcement.error', { error });
        res.status(500).json({ message: 'Failed to send announcement' });
    }
};

/**
 * Cancel event and notify all attendees
 */
export const cancelEvent = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { eventId } = req.params;
        const { reason, refundInfo } = req.body;

        // Get event
        const event = await Event.findOne({ _id: eventId, hostId: userId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Build cancellation message
        let message = `We regret to inform you that "${event.title}" has been cancelled.`;
        if (reason) {
            message += `\n\nReason: ${reason}`;
        }
        if (refundInfo) {
            message += `\n\n💰 Refund Information:\n${refundInfo}`;
        }

        // Forward to sendEventAnnouncement
        req.body = {
            type: 'cancellation',
            subject: `❌ Event Cancelled: ${event.title}`,
            message
        };

        return sendEventAnnouncement(req, res);
    } catch (error) {
        logger.error('cancel_event.error', { error });
        res.status(500).json({ message: 'Failed to cancel event' });
    }
};

/**
 * Update event time and notify attendees
 */
export const updateEventTime = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { eventId } = req.params;
        const { newDateTime, newLocation, additionalMessage } = req.body;

        if (!newDateTime && !newLocation) {
            return res.status(400).json({
                message: 'Please provide new date/time or location'
            });
        }

        // Get event
        const event = await Event.findOne({ _id: eventId, hostId: userId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Format new date for display
        let formattedDateTime = '';
        if (newDateTime) {
            const date = new Date(newDateTime);
            formattedDateTime = date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Build message
        let message = `The schedule for "${event.title}" has been updated.`;
        if (additionalMessage) {
            message += `\n\n${additionalMessage}`;
        }

        // Forward to sendEventAnnouncement
        req.body = {
            type: 'time_change',
            subject: `📅 Schedule Update: ${event.title}`,
            message,
            newDateTime: formattedDateTime,
            newLocation
        };

        return sendEventAnnouncement(req, res);
    } catch (error) {
        logger.error('update_event_time.error', { error });
        res.status(500).json({ message: 'Failed to update event time' });
    }
};

/**
 * Get announcement preview (email HTML)
 */
export const getAnnouncementPreview = async (req: Request, res: Response) => {
    try {
        const { type, subject, message, eventTitle, newDateTime, newLocation } = req.body;

        const html = generateAnnouncementHtml({
            eventTitle: eventTitle || 'Sample Event',
            announcementType: type || 'custom',
            subject: subject || 'Event Update',
            message: message || 'This is a preview of your announcement.',
            newDateTime,
            newLocation,
            guestName: 'John Doe'
        });

        res.json({ html });
    } catch (error) {
        res.status(500).json({ message: 'Failed to generate preview' });
    }
};
