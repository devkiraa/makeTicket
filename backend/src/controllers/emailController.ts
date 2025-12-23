import { Request, Response } from 'express';
import { google } from 'googleapis';
import { EmailAccount } from '../models/EmailAccount';
import { EmailTemplate } from '../models/EmailTemplate';

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
        const existingAccount = await EmailAccount.findOne({ userId, email });

        if (existingAccount) {
            existingAccount.accessToken = tokens.access_token || '';
            existingAccount.refreshToken = tokens.refresh_token || existingAccount.refreshToken;
            existingAccount.tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
            existingAccount.isVerified = true;
            existingAccount.name = name || existingAccount.name;
            await existingAccount.save();
        } else {
            await EmailAccount.create({
                userId,
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

        const accounts = await EmailAccount.find({ userId })
            .select('-accessToken -refreshToken')
            .sort({ createdAt: -1 });

        res.json(accounts);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch email accounts' });
    }
};

// Set email account as active
export const setActiveEmailAccount = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { accountId } = req.params;

        // Deactivate all accounts
        await EmailAccount.updateMany({ userId }, { isActive: false });

        // Activate selected account
        const account = await EmailAccount.findOneAndUpdate(
            { _id: accountId, userId },
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

// Delete email account
export const deleteEmailAccount = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { accountId } = req.params;

        const result = await EmailAccount.findOneAndDelete({ _id: accountId, userId });

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

        // Get the email account
        const account = await EmailAccount.findOne({ _id: accountId, userId });
        if (!account) {
            return res.status(404).json({ message: 'Account not found' });
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

        // Create test email
        const testEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .success { background: #dcfce7; border: 1px solid #86efac; padding: 15px; border-radius: 8px; color: #166534; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Test Email Successful!</h1>
        </div>
        <div class="content">
            <div class="success">
                <strong>✅ Your email connection is working!</strong>
            </div>
            <p style="margin-top: 20px;">This is a test email from GrabMyPass to verify that your Gmail account is properly connected and can send emails.</p>
            <p><strong>Account:</strong> ${account.email}</p>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div class="footer">
            <p>GrabMyPass - Event Registration Made Easy</p>
        </div>
    </div>
</body>
</html>`;

        // Encode the email
        const subject = '✉️ GrabMyPass - Test Email Successful!';
        const rawEmail = Buffer.from(
            `From: ${account.email}\r\n` +
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

        res.json({
            message: 'Test email sent successfully!',
            sentTo: account.email
        });
    } catch (error: any) {
        console.error('Send test email error:', error);
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
