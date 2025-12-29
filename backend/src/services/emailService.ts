import { google } from 'googleapis';
import mongoose from 'mongoose';
import { EmailAccount } from '../models/EmailAccount';
import { EmailTemplate } from '../models/EmailTemplate';
import { EmailLog } from '../models/EmailLog';
import { User } from '../models/User';
import { generateTicketImage } from './ticketGenerator';

// Generate default email HTML if no template selected
const generateDefaultEmailHtml = (data: {
    guestName: string;
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    ticketCode: string;
    qrCodeUrl: string;
}) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; color: #333; }
        .ticket-box { background: #f1f5f9; padding: 25px; border-radius: 12px; text-align: center; margin: 20px 0; }
        .qr-code { margin: 15px 0; }
        .qr-code img { border-radius: 8px; }
        .code { font-size: 24px; font-weight: bold; color: #4F46E5; letter-spacing: 3px; margin-top: 10px; }
        .details { margin: 20px 0; padding: 20px; background: #fafafa; border-radius: 8px; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 You're Registered!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${data.guestName}</strong>,</p>
            <p>Thank you for registering for <strong>${data.eventTitle}</strong>!</p>
            
            <div class="ticket-box">
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">Show this QR code at check-in</p>
                <div class="qr-code">
                    <img src="${data.qrCodeUrl}" width="150" height="150" alt="QR Code" />
                </div>
                <div class="code">${data.ticketCode}</div>
            </div>
            
            <div class="details">
                <p style="margin: 0 0 10px 0; font-weight: 600;">📋 Event Details:</p>
                <p style="margin: 5px 0;">📅 <strong>Date:</strong> ${data.eventDate}</p>
                <p style="margin: 5px 0;">📍 <strong>Location:</strong> ${data.eventLocation}</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px;">Please save this email or take a screenshot. You'll need to show the QR code at check-in.</p>
        </div>
        <div class="footer">
            <p>Sent via MakeTicket</p>
        </div>
    </div>
</body>
</html>`;
};

// Replace placeholders in template
const replacePlaceholders = (template: string, data: Record<string, string>): string => {
    let result = template;
    Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    });
    return result;
};

// Format date nicely
const formatEventDate = (date: Date | string | null): string => {
    if (!date) return 'Date TBD';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Generate short ticket code from hash
const generateTicketCode = (hash: string): string => {
    return `TKT-${hash.substring(0, 8).toUpperCase()}`;
};

interface SendTicketEmailParams {
    eventHostId: string;
    recipientEmail: string;
    ticketData: {
        _id: any;
        guestName: string;
        guestEmail: string;
        qrCodeHash: string;
    };
    eventDetails: {
        _id: any;
        title: string;
        slug: string;
        date: Date | null;
        location: string;
        description: string;
        emailTemplateId?: string;
        ticketTemplateId?: string;
        sendConfirmationEmail?: boolean;
        attachTicket?: boolean;
    };
}

export const sendTicketEmail = async (params: SendTicketEmailParams): Promise<boolean> => {
    const { eventHostId, recipientEmail, ticketData, eventDetails } = params;

    console.log(`📧 Sending registration email to ${recipientEmail} for ${eventDetails.title}`);

    try {
        // Check if confirmation emails are enabled
        if (eventDetails.sendConfirmationEmail === false) {
            console.log(`ℹ️ Confirmation emails disabled for event ${eventDetails.title}`);
            return true;
        }

        // Get host info
        const host = await User.findById(eventHostId);
        if (!host) {
            console.error('❌ Event host not found');
            return false;
        }

        // Prepare placeholder data
        const ticketCode = generateTicketCode(ticketData.qrCodeHash);
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketData.qrCodeHash}`;

        const placeholderData: Record<string, string> = {
            guest_name: ticketData.guestName || 'Guest',
            guest_email: ticketData.guestEmail || recipientEmail,
            event_title: eventDetails.title || 'Event',
            event_date: formatEventDate(eventDetails.date),
            event_time: eventDetails.date ? new Date(eventDetails.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'TBD',
            event_location: eventDetails.location || 'Location TBD',
            event_description: eventDetails.description || '',
            ticket_code: ticketCode,
            qr_code_url: qrCodeUrl,
            event_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/e/${eventDetails.slug}`,
            host_name: host.name || host.username || 'Event Host',
            host_email: host.email || ''
        };

        // Get email content
        let emailHtml: string;
        let emailSubject: string;
        let templateName: string | undefined;

        if (eventDetails.emailTemplateId) {
            // Use custom template
            const template = await EmailTemplate.findById(eventDetails.emailTemplateId);
            if (template) {
                emailHtml = replacePlaceholders(template.body, placeholderData);
                emailSubject = replacePlaceholders(template.subject, placeholderData);
                templateName = template.name;
                console.log(`📝 Using template: ${template.name}`);
            } else {
                // Fallback to default
                emailHtml = generateDefaultEmailHtml({
                    guestName: placeholderData.guest_name,
                    eventTitle: placeholderData.event_title,
                    eventDate: placeholderData.event_date,
                    eventLocation: placeholderData.event_location,
                    ticketCode: placeholderData.ticket_code,
                    qrCodeUrl: placeholderData.qr_code_url
                });
                emailSubject = `🎉 Your ticket for ${placeholderData.event_title}`;
            }
        } else {
            // Use default template
            emailHtml = generateDefaultEmailHtml({
                guestName: placeholderData.guest_name,
                eventTitle: placeholderData.event_title,
                eventDate: placeholderData.event_date,
                eventLocation: placeholderData.event_location,
                ticketCode: placeholderData.ticket_code,
                qrCodeUrl: placeholderData.qr_code_url
            });
            emailSubject = `🎉 Your ticket for ${placeholderData.event_title}`;
            console.log(`📝 Using default template`);
        }

        // Try to send via Gmail OAuth
        console.log(`🔍 Looking for email account for hostId: ${eventHostId}`);

        // Convert to ObjectId for consistent querying
        const mongoose = require('mongoose');
        const hostObjectId = new mongoose.Types.ObjectId(eventHostId);

        const emailAccount = await EmailAccount.findOne({
            userId: hostObjectId,
            isActive: true,
            provider: 'gmail'
        });

        console.log(`🔍 Found email account: ${emailAccount ? emailAccount.email : 'NONE'}`);

        if (!emailAccount) {
            console.error(`❌ No active Gmail account found for host: ${eventHostId}`);

            // Log failed email
            await EmailLog.create({
                userId: eventHostId,
                eventId: eventDetails._id,
                ticketId: ticketData._id,
                type: 'registration',
                fromEmail: 'none',
                toEmail: recipientEmail,
                toName: ticketData.guestName,
                subject: emailSubject,
                templateName: templateName,
                status: 'failed',
                errorMessage: 'No active Gmail account found. Please connect a Gmail account.',
                eventTitle: eventDetails.title,
                ticketCode: ticketCode
            });

            return false;
        }

        console.log(`📤 Sending via Gmail: ${emailAccount.email} (for host: ${eventHostId})`);

        // Send via Gmail OAuth
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_EMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_EMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/email/gmail/callback`
        );

        oauth2Client.setCredentials({
            access_token: emailAccount.accessToken,
            refresh_token: emailAccount.refreshToken
        });

        // Refresh token if needed
        try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            if (credentials.access_token && credentials.access_token !== emailAccount.accessToken) {
                emailAccount.accessToken = credentials.access_token;
                await emailAccount.save();
            }
        } catch (refreshError) {
            console.log('Token refresh not needed or failed, continuing with existing token');
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Generate ticket image if enabled
        let ticketImageBuffer: Buffer | null = null;
        if (eventDetails.attachTicket !== false && eventDetails.ticketTemplateId) {
            console.log(`🎫 Generating ticket with template: ${eventDetails.ticketTemplateId}`);
            ticketImageBuffer = await generateTicketImage({
                templateId: eventDetails.ticketTemplateId,
                guestName: placeholderData.guest_name,
                eventTitle: placeholderData.event_title,
                eventDate: placeholderData.event_date,
                eventLocation: placeholderData.event_location,
                ticketCode: placeholderData.ticket_code,
                qrCodeData: ticketData.qrCodeHash
            });
        } else if (eventDetails.attachTicket !== false) {
            // Generate default ticket even without template
            console.log(`🎫 Generating default ticket`);
            ticketImageBuffer = await generateTicketImage({
                guestName: placeholderData.guest_name,
                eventTitle: placeholderData.event_title,
                eventDate: placeholderData.event_date,
                eventLocation: placeholderData.event_location,
                ticketCode: placeholderData.ticket_code,
                qrCodeData: ticketData.qrCodeHash
            });
        }

        // Build email (with or without attachment)
        let rawEmail: string;

        // Determine the "From" address - use custom domain if configured
        const fromName = (emailAccount as any).customFromName || emailAccount.name || 'MakeTicket';
        const fromEmail = (emailAccount as any).customFromEmail || emailAccount.email;
        const fromHeader = `${fromName} <${fromEmail}>`;

        if (ticketImageBuffer) {
            // MIME multipart email with attachment
            const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const ticketBase64 = ticketImageBuffer.toString('base64');

            const mimeMessage = [
                `From: ${fromHeader}`,
                `To: ${recipientEmail}`,
                `Subject: ${emailSubject}`,
                `MIME-Version: 1.0`,
                `Content-Type: multipart/mixed; boundary="${boundary}"`,
                ``,
                `--${boundary}`,
                `Content-Type: text/html; charset=utf-8`,
                `Content-Transfer-Encoding: 7bit`,
                ``,
                emailHtml,
                ``,
                `--${boundary}`,
                `Content-Type: image/png; name="ticket.png"`,
                `Content-Transfer-Encoding: base64`,
                `Content-Disposition: attachment; filename="ticket.png"`,
                ``,
                ticketBase64,
                ``,
                `--${boundary}--`
            ].join('\r\n');

            rawEmail = Buffer.from(mimeMessage)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            console.log(`📎 Email with ticket attachment prepared`);
        } else {
            // Simple HTML email without attachment
            rawEmail = Buffer.from(
                `From: ${fromHeader}\r\n` +
                `To: ${recipientEmail}\r\n` +
                `Subject: ${emailSubject}\r\n` +
                `MIME-Version: 1.0\r\n` +
                `Content-Type: text/html; charset=utf-8\r\n\r\n` +
                emailHtml
            ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawEmail }
        });

        // Update email account stats
        emailAccount.emailsSent = (emailAccount.emailsSent || 0) + 1;
        emailAccount.lastUsed = new Date();
        await emailAccount.save();

        // Log successful email
        await EmailLog.create({
            userId: eventHostId,
            eventId: eventDetails._id,
            ticketId: ticketData._id,
            type: 'registration',
            fromEmail: fromEmail,
            toEmail: recipientEmail,
            toName: ticketData.guestName,
            subject: emailSubject,
            templateId: eventDetails.emailTemplateId,
            templateName: templateName,
            status: 'sent',
            eventTitle: eventDetails.title,
            ticketCode: ticketCode,
            sentAt: new Date()
        });

        console.log(`✅ Email sent successfully to ${recipientEmail}`);
        return true;

    } catch (error: any) {
        console.error(`❌ Failed to send email:`, error.message);

        // Log failed email
        try {
            await EmailLog.create({
                userId: eventHostId,
                eventId: eventDetails._id,
                ticketId: ticketData._id,
                type: 'registration',
                fromEmail: 'error',
                toEmail: recipientEmail,
                toName: ticketData.guestName,
                subject: `Ticket for ${eventDetails.title}`,
                status: 'failed',
                errorMessage: error.message,
                eventTitle: eventDetails.title,
                ticketCode: generateTicketCode(ticketData.qrCodeHash)
            });
        } catch (logError) {
            console.error('Failed to log email error:', logError);
        }

        return false;
    }
};
