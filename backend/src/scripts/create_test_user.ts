/**
 * Script to create a test user account for Razorpay verification
 * Run with: npx ts-node src/scripts/create_test_user.ts
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/maketicket';

// Test account credentials for Razorpay verification
const TEST_USER = {
    email: 'razorpay-test@maketicket.app',
    password: 'RazorpayTest@2025',
    name: 'Razorpay Test Account',
    username: 'razorpay-test',
    role: 'host', // Host role to access billing/payment features
    isVerified: true
};

async function createTestUser() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            password: String,
            name: String,
            username: String,
            role: { type: String, default: 'user' },
            isVerified: { type: Boolean, default: false },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        }));

        // Check if test user already exists
        const existingUser = await User.findOne({ email: TEST_USER.email });
        
        if (existingUser) {
            console.log('\n⚠️  Test user already exists!');
            console.log('\n📋 Test Account Credentials:');
            console.log('═'.repeat(50));
            console.log(`   Email:    ${TEST_USER.email}`);
            console.log(`   Password: ${TEST_USER.password}`);
            console.log('═'.repeat(50));
            console.log('\n🔗 Login URL: https://maketicket.app/login');
            console.log('💳 Billing URL: https://maketicket.app/dashboard/billing');
        } else {
            // Hash the password
            const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);

            // Create the test user
            const newUser = new User({
                email: TEST_USER.email,
                password: hashedPassword,
                name: TEST_USER.name,
                username: TEST_USER.username,
                role: TEST_USER.role,
                isVerified: TEST_USER.isVerified
            });

            await newUser.save();

            console.log('\n✅ Test user created successfully!');
            console.log('\n📋 Test Account Credentials for Razorpay:');
            console.log('═'.repeat(50));
            console.log(`   Email:    ${TEST_USER.email}`);
            console.log(`   Password: ${TEST_USER.password}`);
            console.log('═'.repeat(50));
            console.log('\n🔗 Login URL: https://maketicket.app/login');
            console.log('💳 Billing URL: https://maketicket.app/dashboard/billing');
            console.log('\n📝 Instructions for Razorpay:');
            console.log('   1. Go to https://maketicket.app/login');
            console.log('   2. Enter the email and password above');
            console.log('   3. Navigate to Dashboard > Billing');
            console.log('   4. Click "Upgrade to Pro" to test the payment flow');
        }

        await mongoose.disconnect();
        console.log('\nDone!');
        process.exit(0);
    } catch (error) {
        console.error('Error creating test user:', error);
        process.exit(1);
    }
}

createTestUser();
