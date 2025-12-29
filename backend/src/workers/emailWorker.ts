import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';
import { SendMailClient } from 'zeptomail';
import { User } from '../models/User';
import { EmailAccount } from '../models/EmailAccount';
import { EmailTemplate } from '../models/EmailTemplate';
import { TicketTemplate } from '../models/TicketTemplate';
import { EmailLog } from '../models/EmailLog';
import { Event } from '../models/Event';
import { decrypt } from '../utils/encryption';

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
        .detail-row { display: flex; margin: 10px 0; }
        .detail-icon { width: 24px; margin-right: 10px; }
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
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">Show this at check-in</p>
                <div class="qr-code">
                    <img src="${data.qrCodeUrl}" width="150" height="150" alt="QR Code" />
                </div>
                <div class="code">${data.ticketCode}</div>
            </div>
            
            <div class="details">
                <p style="margin: 0 0 10px 0; font-weight: 600;">Event Details:</p>
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

const emailWorker = new Worker('email-queue', async (job) => {
    console.log(`Processing email job ${job.id}: ${job.name}`);

    try {
        // Ensure DB connection
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/maketicket');
        }

        if (job.name === 'send-ticket') {
            const { eventHostId, recipientEmail, ticketData, eventDetails } = job.data;

            // Fetch the full event with template references
            const event = await Event.findById(eventDetails._id || eventDetails.id);
            const host = await User.findById(eventHostId);

            if (!host) {
                throw new Error('Event host not found');
            }

            // Check if confirmation emails are enabled
            if (event?.sendConfirmationEmail === false) {
                console.log(`Confirmation emails disabled for event ${event.title}`);
                return;
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

            if (event?.emailTemplateId) {
                // Use custom template
                const template = await EmailTemplate.findById(event.emailTemplateId);
                if (template) {
                    emailHtml = replacePlaceholders(template.body, placeholderData);
                    emailSubject = replacePlaceholders(template.subject, placeholderData);
                    templateName = template.name;
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
            }

            // Convert to ObjectId for consistent querying
            const hostObjectId = new (require('mongoose').Types.ObjectId)(eventHostId);
            
            // First check for any active email account (Gmail or ZeptoMail)
            const emailAccount = await EmailAccount.findOne({
                userId: hostObjectId,
                isActive: true
            });

            let emailSent = false;
            let fromEmail = '';
            let usedProvider: 'gmail' | 'zeptomail' | 'smtp' | 'system' = 'system';

            // For ticket emails, use only the user's connected email account
            // System ZeptoMail is reserved for platform emails (welcome, password reset, etc.)

            // Try user's ZeptoMail account if configured
            if (!emailSent && emailAccount && emailAccount.provider === 'zeptomail' && (emailAccount as any).zeptoMailToken) {
                try {
                    const zeptoUrl = 'https://api.zeptomail.in/v1.1/email';
                    const client = new SendMailClient({ url: zeptoUrl, token: (emailAccount as any).zeptoMailToken });

                    const senderName = emailAccount.name || 'MakeTicket';
                    const senderEmail = emailAccount.email;

                    await client.sendMail({
                        from: {
                            address: senderEmail,
                            name: senderName
                        },
                        to: [{
                            email_address: {
                                address: recipientEmail,
                                name: ticketData.guestName || 'Guest'
                            }
                        }],
                        subject: emailSubject,
                        htmlbody: emailHtml
                    });

                    fromEmail = senderEmail;
                    emailSent = true;

                    // Update email account stats
                    emailAccount.emailsSent = (emailAccount.emailsSent || 0) + 1;
                    emailAccount.lastUsed = new Date();
                    await emailAccount.save();

                    usedProvider = 'zeptomail';
                    console.log(`Email sent via ZeptoMail (user) to ${recipientEmail}`);
                } catch (zeptoError) {
                    console.error('ZeptoMail (user) send failed:', zeptoError);
                    // Will try Gmail or SMTP fallback
                }
            }

            // Try Gmail OAuth if ZeptoMail not used or failed
            if (!emailSent && emailAccount && emailAccount.provider === 'gmail' && emailAccount.accessToken) {
                // Send via Gmail OAuth
                try {
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
                    const { credentials } = await oauth2Client.refreshAccessToken();
                    if (credentials.access_token !== emailAccount.accessToken) {
                        emailAccount.accessToken = credentials.access_token!;
                        await emailAccount.save();
                    }

                    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

                    // Determine the "From" address - use custom domain if configured
                    const senderName = (emailAccount as any).customFromName || emailAccount.name || 'MakeTicket';
                    const senderEmail = (emailAccount as any).customFromEmail || emailAccount.email;
                    const fromHeader = `${senderName} <${senderEmail}>`;

                    // Build email with attachment option
                    const boundary = `boundary_${Date.now()}`;
                    let rawEmail = '';

                    // Check if we should attach ticket
                    if (event?.attachTicket && event?.ticketTemplateId) {
                        // For now, we'll just include QR in the email body
                        // Full ticket generation with canvas would require additional setup
                        rawEmail = Buffer.from(
                            `From: ${fromHeader}\r\n` +
                            `To: ${recipientEmail}\r\n` +
                            `Subject: ${emailSubject}\r\n` +
                            `MIME-Version: 1.0\r\n` +
                            `Content-Type: text/html; charset=utf-8\r\n\r\n` +
                            emailHtml
                        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    } else {
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

                    fromEmail = senderEmail;
                    emailSent = true;

                    // Update email account stats
                    emailAccount.emailsSent = (emailAccount.emailsSent || 0) + 1;
                    emailAccount.lastUsed = new Date();
                    await emailAccount.save();

                    usedProvider = 'gmail';
                    console.log(`Email sent via Gmail to ${recipientEmail}`);
                } catch (gmailError) {
                    console.error('Gmail send failed:', gmailError);
                    // Will try SMTP fallback
                }
            }

            // Fallback to SMTP if Gmail failed or not configured
            if (!emailSent && host.smtpConfig?.host) {
                try {
                    const decryptedUser = decrypt({ iv: host.smtpConfig.iv!, content: host.smtpConfig.user! });
                    const decryptedPass = decrypt({ iv: host.smtpConfig.iv!, content: host.smtpConfig.pass! });

                    const transporter = nodemailer.createTransport({
                        host: host.smtpConfig.host,
                        port: host.smtpConfig.port,
                        secure: host.smtpConfig.secure,
                        auth: {
                            user: decryptedUser,
                            pass: decryptedPass,
                        },
                    });

                    await transporter.sendMail({
                        from: `"${eventDetails.title}" <${decryptedUser}>`,
                        to: recipientEmail,
                        subject: emailSubject,
                        html: emailHtml,
                    });

                    fromEmail = decryptedUser;
                    emailSent = true;
                    usedProvider = 'smtp';
                    console.log(`Email sent via SMTP to ${recipientEmail}`);
                } catch (smtpError) {
                    console.error('SMTP send failed:', smtpError);
                }
            }

            // Log the email
            await EmailLog.create({
                userId: eventHostId,
                eventId: eventDetails._id || eventDetails.id,
                ticketId: ticketData._id,
                type: 'registration',
                fromEmail: fromEmail || 'not_sent',
                toEmail: recipientEmail,
                toName: ticketData.guestName,
                subject: emailSubject,
                templateId: event?.emailTemplateId,
                templateName: templateName,
                status: emailSent ? 'sent' : 'failed',
                provider: usedProvider,
                errorMessage: emailSent ? undefined : 'Host has no email account connected. Please connect Gmail or ZeptoMail in Email Settings.',
                eventTitle: eventDetails.title,
                ticketCode: ticketCode,
                sentAt: new Date()
            });

            if (!emailSent) {
                console.warn(`⚠️ Ticket email NOT sent - Host ${eventHostId} has no email account connected. Guest: ${recipientEmail}`);
            }
        }

    } catch (error: any) {
        console.error(`Failed to process email job ${job.id}:`, error);

        // Log failed email
        try {
            if (job.data?.eventHostId) {
                await EmailLog.create({
                    userId: job.data.eventHostId,
                    eventId: job.data.eventDetails?._id,
                    type: job.name === 'send-ticket' ? 'registration' : 'custom',
                    fromEmail: 'system',
                    toEmail: job.data.recipientEmail || 'unknown',
                    toName: job.data.ticketData?.guestName,
                    subject: `Email for ${job.data.eventDetails?.title || 'event'}`,
                    status: 'failed',
                    errorMessage: error.message,
                    eventTitle: job.data.eventDetails?.title
                });
            }
        } catch (logError) {
            console.error('Failed to log email error:', logError);
        }

        throw error;
    }

}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        ...(process.env.REDIS_TLS === 'true' && { tls: { rejectUnauthorized: false } })
    }
});

emailWorker.on('completed', (job) => {
    console.log(`Email job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err.message);
});

export default emailWorker;
