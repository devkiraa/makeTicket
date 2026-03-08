import mongoose from 'mongoose';
import { User } from './User';

describe('User Model Test', () => {
    it('create & save user successfully', async () => {
        const userData = { email: 'test@example.com', password: 'password123', username: 'testuser' };
        const validUser = new User(userData);
        const savedUser = await validUser.save();

        expect(savedUser._id).toBeDefined();
        expect(savedUser.email).toBe(userData.email);
        expect(savedUser.password).toBe(userData.password);
        expect(savedUser.username).toBe(userData.username);
        expect(savedUser.role).toBe('user'); // default value
        expect(savedUser.status).toBe('active'); // default value
    });

    it('insert user successfully, but the field not defined in schema should be undefined', async () => {
        const userWithInvalidField = new User({
            email: 'test2@example.com',
            password: 'password123',
            username: 'testuser2',
            nickname: 'testnickname' // this field is not defined in schema
        });
        const savedUser = await userWithInvalidField.save();
        expect(savedUser._id).toBeDefined();
        // @ts-ignore
        expect(savedUser.nickname).toBeUndefined();
    });

    it('create user without required field should fail', async () => {
        const userWithoutRequiredField = new User({ email: 'test3@example.com' }); // missing password
        let err;
        try {
            await userWithoutRequiredField.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        // @ts-ignore
        expect(err.errors.password).toBeDefined();
    });

    it('create user with duplicate email should fail', async () => {
        const validUser1 = new User({ email: 'test4@example.com', password: 'password123', username: 'testuser4' });
        await validUser1.save();

        const validUser2 = new User({ email: 'test4@example.com', password: 'password123', username: 'testuser5' });
        let err;
        try {
            await validUser2.save();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        // @ts-ignore
        expect(err.code).toBe(11000); // MongoDB duplicate key error code
    });
});
