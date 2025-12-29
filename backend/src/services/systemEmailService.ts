import { google } from 'googleapis';
import { SendMailClient } from 'zeptomail';
import { SystemSettings } from '../models/SystemSettings';
import { EmailAccount } from '../models/EmailAccount';
import { EmailLog } from '../models/EmailLog';

// Generate system email templates
const systemTemplates = {
    welcome: (data: { userName: string; platformName: string; loginUrl: string }) => ({
        subject: `Welcome to ${data.platformName}!`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; color: #333; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ${data.platformName}!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>Thank you for joining ${data.platformName}! We're excited to have you on board.</p>
            <p>With ${data.platformName}, you can:</p>
            <ul style="color: #64748b;">
                <li>Discover and register for amazing events</li>
                <li>Keep track of your tickets in one place</li>
                <li>Create and host your own events</li>
            </ul>
            <p style="text-align: center;">
                <a href="${data.loginUrl}" class="btn">Get Started</a>
            </p>
            <p style="color: #64748b; font-size: 14px;">If you have any questions, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    }),

    passwordReset: (data: { userName: string; resetUrl: string; platformName: string; expiryMinutes: number }) => ({
        subject: `Reset Your Password - ${data.platformName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: #EF4444; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; color: #333; }
        .btn { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .warning { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 15px; margin: 20px 0; color: #92400E; font-size: 14px; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
                <a href="${data.resetUrl}" class="btn">Reset Password</a>
            </p>
            <div class="warning">
                ⚠️ This link will expire in ${data.expiryMinutes} minutes. If you didn't request this reset, please ignore this email.
            </div>
            <p style="color: #64748b; font-size: 14px;">For security, this request was received from your account. If you didn't make this request, your password is still safe.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    }),

    hostUpgrade: (data: { userName: string; platformName: string; dashboardUrl: string }) => ({
        subject: `Congratulations! You're now a Host on ${data.platformName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 30px; color: #333; }
        .btn { display: inline-block; background: #10B981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        .feature-box { background: #F0FDF4; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Congratulations, Host!</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>Great news! Your account has been upgraded to Host status. You can now create and manage your own events!</p>
            <div class="feature-box">
                <h3 style="margin-top: 0; color: #059669;">What you can do now:</h3>
                <ul style="color: #374151; margin-bottom: 0;">
                    <li>Create unlimited events</li>
                    <li>Customize registration forms</li>
                    <li>Manage attendees and check-ins</li>
                    <li>Send custom email confirmations</li>
                    <li>View analytics and reports</li>
                </ul>
            </div>
            <p style="text-align: center;">
                <a href="${data.dashboardUrl}" class="btn">Go to Dashboard</a>
            </p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    }),

    suspension: (data: { userName: string; platformName: string; reason: string; supportEmail: string }) => ({
        subject: `Account Suspended - ${data.platformName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: #DC2626; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; color: #333; }
        .reason-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 15px; margin: 20px 0; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Account Suspended</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>Your account on ${data.platformName} has been suspended.</p>
            <div class="reason-box">
                <strong>Reason:</strong> ${data.reason || 'Violation of terms of service'}
            </div>
            <p>If you believe this was a mistake, please contact our support team at <a href="mailto:${data.supportEmail}">${data.supportEmail}</a>.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    }),

    loginAlert: (data: { userName: string; platformName: string; loginTime: string; ipAddress: string; device: string }) => ({
        subject: `New login detected - ${data.platformName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f8fafc; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: #3B82F6; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; color: #333; }
        .info-box { background: #EFF6FF; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { padding: 20px 30px; background: #f8fafc; text-align: center; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 New Login Detected</h1>
        </div>
        <div class="content">
            <p>Hi <strong>${data.userName}</strong>,</p>
            <p>We detected a new login to your ${data.platformName} account:</p>
            <div class="info-box">
                <p style="margin: 5px 0;"><strong>Time:</strong> ${data.loginTime}</p>
                <p style="margin: 5px 0;"><strong>IP Address:</strong> ${data.ipAddress}</p>
                <p style="margin: 5px 0;"><strong>Device:</strong> ${data.device}</p>
            </div>
            <p style="color: #64748b; font-size: 14px;">If this was you, you can safely ignore this email. If you didn't log in, please secure your account immediately.</p>
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${data.platformName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`
    })
};

// Send system email using configured system email account
export const sendSystemEmail = async (
    type: 'welcome' | 'passwordReset' | 'hostUpgrade' | 'suspension' | 'loginAlert',
    recipientEmail: string,
    data: any
): Promise<boolean> => {
    try {
        // Get system settings
        const settings = await (SystemSettings as any).getSettings();

        // Check if system email is enabled
        if (!settings.systemEmail?.enabled || !settings.systemEmail?.accountId) {
            console.log(`⚠️ System email not configured. Skipping ${type} email to ${recipientEmail}`);
            return false;
        }

        // Check if this email type is enabled
        const emailTypeMapping: Record<string, string> = {
            welcome: 'welcomeEmail',
            passwordReset: 'passwordReset',
            hostUpgrade: 'hostUpgradeConfirmation',
            suspension: 'suspensionNotice',
            loginAlert: 'loginAlert'
        };

        const settingKey = emailTypeMapping[type];
        if (settingKey && !settings.emailSettings[settingKey]) {
            console.log(`ℹ️ ${type} emails disabled in settings. Skipping.`);
            return true; // Not an error, just disabled
        }

        // Get the email account
        const emailAccount = await EmailAccount.findById(settings.systemEmail.accountId);
        if (!emailAccount || !emailAccount.isActive) {
            console.error(`❌ System email account not found or inactive`);
            return false;
        }

        // Generate email content
        const platformName = settings.platformName || 'MakeTicket';
        const templateData = { ...data, platformName };

        let emailContent: { subject: string; html: string };

        // Check for custom template first
        const customTemplate = settings.emailTemplates?.[type];
        if (customTemplate) {
            // Use custom template with placeholder replacement
            emailContent = {
                subject: customTemplate.subject || systemTemplates[type](templateData).subject,
                html: customTemplate
            };
        } else {
            // Use default template
            emailContent = systemTemplates[type](templateData);
        }

        const fromName = settings.systemEmail.fromName || platformName;
        const fromEmail = settings.systemEmail.fromEmail || emailAccount.email;
        let emailSent = false;
        let usedProvider: 'zeptomail' | 'gmail' | 'system' = 'system';
        let zeptoRequestId: string | undefined;

        // Try ZeptoMail first (via env config or if provider is zeptomail)
        if (process.env.ZEPTOMAIL_TOKEN) {
            try {
                const zeptoUrl = process.env.ZEPTOMAIL_URL || 'https://api.zeptomail.in/v1.1/email';
                const client = new SendMailClient({ url: zeptoUrl, token: process.env.ZEPTOMAIL_TOKEN });

                await client.sendMail({
                    from: {
                        address: process.env.ZEPTOMAIL_FROM_EMAIL || fromEmail,
                        name: process.env.ZEPTOMAIL_FROM_NAME || fromName
                    },
                    to: [{
                        email_address: {
                            address: recipientEmail,
                            name: data.userName || recipientEmail.split('@')[0]
                        }
                    }],
                    subject: emailContent.subject,
                    htmlbody: emailContent.html
                });

                emailSent = true;
                usedProvider = 'zeptomail';
                console.log(`✅ System email (${type}) sent via ZeptoMail to ${recipientEmail}`);
            } catch (zeptoError: any) {
                console.error('ZeptoMail send failed:', zeptoError.message);
                // Fall through to Gmail
            }
        }

        // Fallback to Gmail OAuth if ZeptoMail failed or not configured
        if (!emailSent && emailAccount.provider === 'gmail' && emailAccount.accessToken) {
            // Set up Gmail OAuth
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
                console.log('Token refresh not needed or failed');
            }

            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

            // Build email
            const fromHeader = `${fromName} <${fromEmail}>`;

            // Encode subject for proper UTF-8 support
            const encodedSubject = `=?UTF-8?B?${Buffer.from(emailContent.subject).toString('base64')}?=`;

            const rawEmail = Buffer.from(
                `From: ${fromHeader}\r\n` +
                `To: ${recipientEmail}\r\n` +
                `Subject: ${encodedSubject}\r\n` +
                `MIME-Version: 1.0\r\n` +
                `Content-Type: text/html; charset=utf-8\r\n\r\n` +
                emailContent.html
            ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw: rawEmail }
            });

            emailSent = true;
            usedProvider = 'gmail';
            console.log(`✅ System email (${type}) sent via Gmail to ${recipientEmail}`);
        }

        if (!emailSent) {
            throw new Error('No email provider configured or all providers failed');
        }

        // Update account stats
        emailAccount.emailsSent = (emailAccount.emailsSent || 0) + 1;
        emailAccount.lastUsed = new Date();
        await emailAccount.save();

        // Log the email
        await EmailLog.create({
            userId: null, // System email
            type: `system_${type}`,
            fromEmail: fromEmail,
            toEmail: recipientEmail,
            subject: emailContent.subject,
            status: 'sent',
            provider: usedProvider,
            zeptoRequestId: zeptoRequestId,
            sentAt: new Date()
        });

        return true;

    } catch (error: any) {
        console.error(`❌ Failed to send system email (${type}):`, error.message);

        // Log failed email
        try {
            await EmailLog.create({
                userId: null,
                type: `system_${type}`,
                fromEmail: 'system',
                toEmail: recipientEmail,
                subject: `System: ${type}`,
                status: 'failed',
                errorMessage: error.message
            });
        } catch (logError) {
            console.error('Failed to log email error:', logError);
        }

        return false;
    }
};

// Convenience functions
export const sendWelcomeEmail = (email: string, userName: string, loginUrl: string) =>
    sendSystemEmail('welcome', email, { userName, loginUrl });

export const sendPasswordResetEmail = (email: string, userName: string, resetUrl: string, expiryMinutes = 30) =>
    sendSystemEmail('passwordReset', email, { userName, resetUrl, expiryMinutes });

export const sendHostUpgradeEmail = (email: string, userName: string, dashboardUrl: string) =>
    sendSystemEmail('hostUpgrade', email, { userName, dashboardUrl });

export const sendSuspensionEmail = (email: string, userName: string, reason: string, supportEmail: string) =>
    sendSystemEmail('suspension', email, { userName, reason, supportEmail });

export const sendLoginAlertEmail = (email: string, userName: string, loginTime: string, ipAddress: string, device: string) =>
    sendSystemEmail('loginAlert', email, { userName, loginTime, ipAddress, device });
