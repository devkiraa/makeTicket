import express from 'express';
import { createEvent, getEvent, getMyEvents, updateEvent } from '../controllers/eventController';
import { registerTicket, validateTicket, getEventAttendees } from '../controllers/ticketController';
import { verifyToken } from '../middleware/auth';
import { googleAuthRedirect, googleAuthCallback, getProfile, getSessions, revokeSession, updateProfile, checkUsernameAvailability } from '../controllers/authController'; // Add import
import { getPublicUserProfile } from '../controllers/userController';

export const apiRouter = express.Router();

// Public User Profile
apiRouter.get('/users/:username', getPublicUserProfile);

// Google Auth
// Google Auth
apiRouter.get('/auth/google', googleAuthRedirect);
apiRouter.get('/auth/google/callback', googleAuthCallback);

// User Profile & Sessions
apiRouter.get('/auth/me', verifyToken, getProfile);
apiRouter.patch('/auth/me', verifyToken, updateProfile); // Add Update Profile
apiRouter.get('/auth/username', checkUsernameAvailability); // Public check
apiRouter.get('/auth/sessions', verifyToken, getSessions);
apiRouter.delete('/auth/sessions/:sessionId', verifyToken, revokeSession);

// Events
apiRouter.post('/events', verifyToken, createEvent);
apiRouter.get('/events/my', verifyToken, getMyEvents);
apiRouter.put('/events/:id', verifyToken, updateEvent);
apiRouter.get('/events/:slug', getEvent);

// Tickets
apiRouter.post('/events/:eventId/register', registerTicket);
apiRouter.get('/events/:eventId/attendees', verifyToken, getEventAttendees);
apiRouter.post('/validate', verifyToken, validateTicket);

// Dashboard
import { getDashboardStats, getAllAttendees } from '../controllers/dashboardController';
apiRouter.get('/dashboard/stats', verifyToken, getDashboardStats);
apiRouter.get('/dashboard/attendees', verifyToken, getAllAttendees);
