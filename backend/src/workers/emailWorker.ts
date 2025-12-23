import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import { User } from '../models/User';
import mongoose from 'mongoose';
import crypto from 'crypto';

// Re-implementing decrypt strictly for what the worker needs if strictly necessary, 
// but importing from utils is better.
// Assuming the relative path is correct.
import { decrypt } from '../utils/encryption';

// Mock of renderTicketEmail for now since we don't have the template file yet
const renderTicketEmail = (data: any) => {
    return `
    <html>
      <body>
        <h1>Your Ticket for ${data.eventDetails.title}</h1>
        <p>Ticket ID: ${data.ticketData.qrCodeHash}</p>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data.ticketData.qrCodeHash}" />
      </body>
    </html>
    `;
};

const emailWorker = new Worker('email-queue', async (job) => {
    try {
        const { eventHostId, recipientEmail, ticketData, eventDetails } = job.data;

        // 1. Fetch Host SMTP Config
        // We need a DB connection here if it's a standalone process, 
        // but assuming this runs in the same process or DB is connected.
        if (mongoose.connection.readyState === 0) {
            // Connect if not connected (basic handling)
            await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/grabmypass');
        }

        const host = await User.findById(eventHostId);
        if (!host || !host.smtpConfig) throw new Error("Host SMTP not found");

        // 2. Decrypt Credentials
        // Our util expects { iv, content }, but our model has { authUser: 'enc', authPass: 'enc', iv: 'common_iv' }?
        // The implementation plan model had: { user: String, pass: String, iv: String }
        // So 'user' is encrypted content, 'pass' is encrypted content. 
        // They likely share an IV or have separate IVs. 
        // If they share an IV (less secure but common in simple designs), we use host.smtpConfig.iv

        const decryptedUser = decrypt({ iv: host.smtpConfig.iv!, content: host.smtpConfig.user! });
        const decryptedPass = decrypt({ iv: host.smtpConfig.iv!, content: host.smtpConfig.pass! });

        // 3. Create Transporter
        const transporter = nodemailer.createTransport({
            host: host.smtpConfig.host,
            port: host.smtpConfig.port,
            secure: host.smtpConfig.secure,
            auth: {
                user: decryptedUser,
                pass: decryptedPass,
            },
        });

        // 4. Render Email HTML
        const emailHtml = renderTicketEmail({ ticketData, eventDetails });

        // 5. Send Email
        await transporter.sendMail({
            from: `"${eventDetails.title}" <${decryptedUser}>`,
            to: recipientEmail,
            subject: `Your Ticket for ${eventDetails.title}`,
            html: emailHtml,
        });

        console.log(`Email sent to ${recipientEmail} for event ${eventDetails.title}`);

    } catch (error) {
        console.error(`Failed to send email job ${job.id}:`, error);
        throw error;
    }

}, {
    connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: { rejectUnauthorized: false }
    }
});

export default emailWorker;
