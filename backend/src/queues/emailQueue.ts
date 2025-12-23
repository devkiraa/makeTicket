import { Queue } from 'bullmq';

export const emailQueue = new Queue('email-queue', {
    connection: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        tls: { rejectUnauthorized: false }
    }
});
