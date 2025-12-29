import { Request, Response } from 'express';
import { google } from 'googleapis';
import { SendMailClient } from 'zeptomail';
import { EmailAccount } from '../models/EmailAccount';
import { EmailTemplate } from '../models/EmailTemplate';
import { EmailLog } from '../models/EmailLog';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_EMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_EMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/email/gmail/callback`
);

// ==================== EMAIL ACCOUNTS ====================

// Get Gmail OAuth URL
export const getGmailAuthUrl = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const scopes = [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent',
            state: userId // Pass user ID as state
        });

        res.json({ url });
    } catch (error) {
        console.error('Gmail auth URL error:', error);
        res.status(500).json({ message: 'Failed to generate auth URL' });
    }
};

// Gmail OAuth callback
export const gmailCallback = async (req: Request, res: Response) => {
    try {
        const { code, state } = req.query;

        // Get userId from state parameter (passed during auth URL generation)
        const userId = state as string;

        if (!code) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings/emails?error=no_code`);
        }

        if (!userId) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings/emails?error=no_user`);
        }

        const { tokens } = await oauth2Client.getToken(code as string);
        oauth2Client.setCredentials(tokens);

        // Get user email from Gmail
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        const email = userInfo.data.email;
        const name = userInfo.data.name;

        if (!email) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings/emails?error=no_email`);
        }

        // Save or update email account
        // Ensure userId is treated as ObjectId for consistent querying
        const userObjectId = new (require('mongoose').Types.ObjectId)(userId);
        const existingAccount = await EmailAccount.findOne({ userId: userObjectId, email });

        if (existingAccount) {
            existingAccount.accessToken = tokens.access_token || '';
            existingAccount.refreshToken = tokens.refresh_token || existingAccount.refreshToken;
            existingAccount.tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
            existingAccount.isVerified = true;
            existingAccount.name = name || existingAccount.name;
            await existingAccount.save();
        } else {
            await EmailAccount.create({
                userId: userObjectId,
                email,
                name,
                provider: 'gmail',
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
                isVerified: true,
                isActive: false
            });
        }

        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings/emails?success=true`);
    } catch (error) {
        console.error('Gmail callback error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings/emails?error=callback_failed`);
    }
};

// Get user's email accounts
export const getEmailAccounts = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const accounts = await EmailAccount.find({ userId: userObjectId })
            .select('-accessToken -refreshToken')
            .sort({ createdAt: -1 });

        res.json(accounts);
    } catch (error) {
        console.error('Get email accounts error:', error);
        res.status(500).json({ message: 'Failed to fetch email accounts' });
    }
};

// Set email account as active
export const setActiveEmailAccount = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { accountId } = req.params;
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Deactivate all accounts
        await EmailAccount.updateMany({ userId: userObjectId }, { isActive: false });

        // Activate selected account
        const account = await EmailAccount.findOneAndUpdate(
            { _id: accountId, userId: userObjectId },
            { isActive: true },
            { new: true }
        ).select('-accessToken -refreshToken');

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json({ message: 'Email account activated', account });
    } catch (error) {
        res.status(500).json({ message: 'Failed to activate account' });
    }
};

// Update email account (custom from address)
export const updateEmailAccount = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { accountId } = req.params;
        const { customFromEmail, customFromName } = req.body;
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Validate email format if provided
        if (customFromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customFromEmail)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const account = await EmailAccount.findOneAndUpdate(
            { _id: accountId, userId: userObjectId },
            {
                ...(customFromEmail !== undefined && { customFromEmail }),
                ...(customFromName !== undefined && { customFromName })
            },
            { new: true }
        ).select('-accessToken -refreshToken');

        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json({ message: 'Email account updated', account });
    } catch (error) {
        console.error('Update email account error:', error);
        res.status(500).json({ message: 'Failed to update account' });
    }
};

// Delete email account
export const deleteEmailAccount = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { accountId } = req.params;
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const result = await EmailAccount.findOneAndDelete({ _id: accountId, userId: userObjectId });

        if (!result) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json({ message: 'Email account removed' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete account' });
    }
};

// Send test email
export const sendTestEmail = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { accountId } = req.params;
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Get the email account
        const account = await EmailAccount.findOne({ _id: accountId, userId: userObjectId });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        // Route to appropriate provider
        if (account.provider === 'zeptomail') {
            return sendZeptoMailTestEmail(req, res);
        }

        if (!account.accessToken) {
            return res.status(400).json({ message: 'Account not properly connected' });
        }

        // Set up OAuth client with tokens
        const testOauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_EMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_EMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/email/gmail/callback`
        );

        testOauth2Client.setCredentials({
            access_token: account.accessToken,
            refresh_token: account.refreshToken
        });

        // Create Gmail API client
        const gmail = google.gmail({ version: 'v1', auth: testOauth2Client });

        // Determine the "From" address - use custom domain if configured
        const fromName = account.customFromName || account.name || 'MakeTicket';
        const fromEmail = account.customFromEmail || account.email;
        const fromHeader = `${fromName} <${fromEmail}>`;

        // Create test email with modern design
        const testEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 520px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 48px 40px; text-align: center;">
                            <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 36px;">&#9989;</span>
                            </div>
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Connection Verified!</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0; font-size: 16px;">Your email is ready to send</p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <!-- Success Badge -->
                            <div style="background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); border: 1px solid #86efac; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
                                <p style="margin: 0; color: #166534; font-weight: 600; font-size: 15px;">Email connection is working perfectly!</p>
                            </div>
                            
                            <!-- Info Cards -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="background: #f8fafc; border-radius: 10px; padding: 16px 20px; margin-bottom: 12px;">
                                        <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Sender Account</p>
                                        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">${fromEmail}</p>
                                    </td>
                                </tr>
                                <tr><td style="height: 12px;"></td></tr>
                                <tr>
                                    <td style="background: #f8fafc; border-radius: 10px; padding: 16px 20px;">
                                        <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Test Sent At</p>
                                        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Message -->
                            <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 28px 0 0; text-align: center;">
                                This test confirms your email account is properly configured and ready to send event tickets and notifications.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                                <strong style="color: #64748b;">MakeTicket</strong> &bull; Event Registration Made Easy
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        // Encode the email - use ASCII-safe subject (no emojis to avoid encoding issues)
        const subject = 'MakeTicket - Test Email Successful';
        const rawEmail = Buffer.from(
            `From: ${fromHeader}\r\n` +
            `To: ${account.email}\r\n` +
            `Subject: ${subject}\r\n` +
            `MIME-Version: 1.0\r\n` +
            `Content-Type: text/html; charset=utf-8\r\n\r\n` +
            testEmailHtml
        ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        // Send email
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: rawEmail }
        });

        // Update account stats
        account.emailsSent = (account.emailsSent || 0) + 1;
        account.lastUsed = new Date();
        await account.save();

        // Log the email
        await EmailLog.create({
            userId,
            type: 'test',
            fromEmail: fromEmail,
            toEmail: account.email,
            toName: account.name,
            subject,
            status: 'sent',
            sentAt: new Date()
        });

        res.json({
            message: 'Test email sent successfully!',
            sentTo: account.email
        });
    } catch (error: any) {
        console.error('Send test email error:', error);

        // Log failed email attempt
        // @ts-ignore
        const userId = req.user?.id;
        const { accountId } = req.params;
        const account = await EmailAccount.findOne({ _id: accountId, userId });
        if (account) {
            await EmailLog.create({
                userId,
                type: 'test',
                fromEmail: account.email,
                toEmail: account.email,
                subject: 'Test Email',
                status: 'failed',
                errorMessage: error.message
            });
        }

        res.status(500).json({
            message: 'Failed to send test email',
            error: error.message
        });
    }
};

// ==================== ZEPTOMAIL ====================

// Create ZeptoMail account
export const createZeptoMailAccount = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { email, name, token, bounceAddress } = req.body;
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        if (!email || !token) {
            return res.status(400).json({ message: 'Email and API token are required' });
        }

        // Check if account already exists
        const existingAccount = await EmailAccount.findOne({ userId: userObjectId, email });
        if (existingAccount) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }

        // Create new ZeptoMail account
        const account = await EmailAccount.create({
            userId: userObjectId,
            email,
            name: name || email.split('@')[0],
            provider: 'zeptomail',
            zeptoMailToken: token,
            zeptoBounceAddress: bounceAddress || null,
            isVerified: true, // Verified via DNS
            isActive: false
        });

        res.status(201).json({
            message: 'ZeptoMail account added successfully',
            account: {
                _id: account._id,
                email: account.email,
                name: account.name,
                provider: account.provider,
                isActive: account.isActive,
                isVerified: account.isVerified
            }
        });
    } catch (error: any) {
        console.error('Create ZeptoMail account error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'An account with this email already exists' });
        }
        res.status(500).json({ message: 'Failed to create ZeptoMail account' });
    }
};

// Send test email via ZeptoMail
export const sendZeptoMailTestEmail = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { accountId } = req.params;
        const mongoose = require('mongoose');
        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Get the email account
        const account = await EmailAccount.findOne({ _id: accountId, userId: userObjectId });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
        }

        if (account.provider !== 'zeptomail' || !account.zeptoMailToken) {
            return res.status(400).json({ message: 'Invalid ZeptoMail account configuration' });
        }

        const fromName = account.name || 'MakeTicket';
        const fromEmail = account.email;

        // Create test email HTML
        const testEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9;">
    <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" style="max-width: 520px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 48px 40px; text-align: center;">
                            <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 20px; line-height: 72px;">
                                <span style="font-size: 36px;">✉️</span>
                            </div>
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">ZeptoMail Connected!</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0; font-size: 16px;">Your transactional email is ready</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px;">
                            <div style="background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); border: 1px solid #86efac; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 28px;">
                                <p style="margin: 0; color: #166534; font-weight: 600;">ZeptoMail integration is working!</p>
                            </div>
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="background: #f8fafc; border-radius: 10px; padding: 16px 20px;">
                                        <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase;">Sender</p>
                                        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">${fromEmail}</p>
                                    </td>
                                </tr>
                                <tr><td style="height: 12px;"></td></tr>
                                <tr>
                                    <td style="background: #f8fafc; border-radius: 10px; padding: 16px 20px;">
                                        <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase;">Provider</p>
                                        <p style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 600;">ZeptoMail by Zoho</p>
                                    </td>
                                </tr>
                            </table>
                            <p style="text-align: center; margin-top: 28px; color: #64748b; font-size: 14px;">
                                Your event confirmation emails will now be sent via ZeptoMail with high deliverability.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                            <p style="margin: 0; color: #94a3b8; font-size: 13px;">Powered by MakeTicket</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

        const subject = '✅ ZeptoMail Test - Connection Verified!';

        // Send via ZeptoMail SDK
        const zeptoUrl = 'https://api.zeptomail.in/v1.1/email';
        const client = new SendMailClient({ url: zeptoUrl, token: account.zeptoMailToken! });

        await client.sendMail({
            from: {
                address: fromEmail,
                name: fromName
            },
            to: [{
                email_address: {
                    address: fromEmail, // Send to self for test
                    name: fromName
                }
            }],
            subject: subject,
            htmlbody: testEmailHtml
        });

        // Update stats
        account.emailsSent = (account.emailsSent || 0) + 1;
        account.lastUsed = new Date();
        await account.save();

        // Log the email
        await EmailLog.create({
            userId,
            type: 'test',
            fromEmail: fromEmail,
            toEmail: fromEmail,
            toName: fromName,
            subject,
            status: 'sent',
            sentAt: new Date()
        });

        res.json({
            message: 'Test email sent successfully via ZeptoMail!',
            sentTo: fromEmail
        });
    } catch (error: any) {
        console.error('ZeptoMail test email error:', error);
        res.status(500).json({
            message: 'Failed to send test email',
            error: error.message
        });
    }
};

// ==================== EMAIL TEMPLATES ====================

// Create email template
export const createEmailTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { name, subject, body, type, isDefault } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            await EmailTemplate.updateMany({ userId, type }, { isDefault: false });
        }

        const template = await EmailTemplate.create({
            userId,
            name,
            subject,
            body,
            type: type || 'custom',
            isDefault: isDefault || false
        });

        res.status(201).json(template);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A template with this name already exists' });
        }
        res.status(500).json({ message: 'Failed to create template' });
    }
};

// Get user's email templates
export const getEmailTemplates = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { type } = req.query;

        const query: any = { userId };
        if (type) query.type = type;

        const templates = await EmailTemplate.find(query).sort({ createdAt: -1 });
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch templates' });
    }
};

// Get single template
export const getEmailTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { templateId } = req.params;

        const template = await EmailTemplate.findOne({ _id: templateId, userId });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch template' });
    }
};

// Update email template
export const updateEmailTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { templateId } = req.params;
        const { name, subject, body, type, isDefault, isActive } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            await EmailTemplate.updateMany({ userId, type }, { isDefault: false });
        }

        const template = await EmailTemplate.findOneAndUpdate(
            { _id: templateId, userId },
            { name, subject, body, type, isDefault, isActive },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update template' });
    }
};

// Delete email template
export const deleteEmailTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { templateId } = req.params;

        const result = await EmailTemplate.findOneAndDelete({ _id: templateId, userId });

        if (!result) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete template' });
    }
};

// Get available placeholders
export const getPlaceholders = async (req: Request, res: Response) => {
    const placeholders = [
        { key: '{{guest_name}}', description: 'Guest\'s full name' },
        { key: '{{guest_email}}', description: 'Guest\'s email address' },
        { key: '{{event_title}}', description: 'Event title' },
        { key: '{{event_date}}', description: 'Event date (formatted)' },
        { key: '{{event_time}}', description: 'Event time' },
        { key: '{{event_location}}', description: 'Event location/venue' },
        { key: '{{event_description}}', description: 'Event description' },
        { key: '{{ticket_code}}', description: 'Unique ticket/registration code' },
        { key: '{{qr_code_url}}', description: 'URL to QR code image' },
        { key: '{{event_link}}', description: 'Link to event page' },
        { key: '{{host_name}}', description: 'Event host\'s name' },
        { key: '{{host_email}}', description: 'Event host\'s email' }
    ];

    res.json(placeholders);
};

// ==================== EMAIL LOGS ====================

// Get email logs
export const getEmailLogs = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { page = 1, limit = 50, type, status, eventId, search } = req.query;

        const query: any = { userId };

        if (type) query.type = type;
        if (status) query.status = status;
        if (eventId) query.eventId = eventId;
        if (search) {
            query.$or = [
                { toEmail: { $regex: search, $options: 'i' } },
                { toName: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { eventTitle: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [logs, total] = await Promise.all([
            EmailLog.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            EmailLog.countDocuments(query)
        ]);

        res.json({
            logs,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Get email logs error:', error);
        res.status(500).json({ message: 'Failed to fetch email logs' });
    }
};

// Get email log stats
export const getEmailLogStats = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        const [total, sent, failed, byType] = await Promise.all([
            EmailLog.countDocuments({ userId }),
            EmailLog.countDocuments({ userId, status: 'sent' }),
            EmailLog.countDocuments({ userId, status: 'failed' }),
            EmailLog.aggregate([
                { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
                { $group: { _id: '$type', count: { $sum: 1 } } }
            ])
        ]);

        const typeStats = byType.reduce((acc: any, item: any) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.json({
            total,
            sent,
            failed,
            successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
            byType: typeStats
        });
    } catch (error) {
        console.error('Get email stats error:', error);
        res.status(500).json({ message: 'Failed to fetch email stats' });
    }
};

// Get single email log detail
export const getEmailLogDetail = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { logId } = req.params;

        const log = await EmailLog.findOne({ _id: logId, userId });

        if (!log) {
            return res.status(404).json({ message: 'Log not found' });
        }

        res.json(log);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch log detail' });
    }
};

