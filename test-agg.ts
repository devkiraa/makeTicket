import mongoose from 'mongoose';
import { SecurityEvent } from './backend/src/models/SecurityEvent';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

async function run() {
    await mongoose.connect(process.env.MONGO_URI as string);
    const pipeline = [
        {
            $group: {
                _id: { ipAddress: "$ipAddress", type: "$type", severity: "$severity" },
                count: { $sum: 1 },
                createdAt: { $max: "$createdAt" },
                firstSeen: { $min: "$createdAt" },
                userId: { $last: "$userId" },
                details: { $last: "$details" }
            }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 5 }
    ];
    const res = await SecurityEvent.aggregate(pipeline as any);
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
}
run();
