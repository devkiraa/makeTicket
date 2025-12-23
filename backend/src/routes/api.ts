import express from 'express';
import { createEvent, getEvent, getMyEvents, updateEvent, checkEventSlug } from '../controllers/eventController';
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
apiRouter.get('/events/check-slug', verifyToken, checkEventSlug); // Check slug availability
apiRouter.patch('/events/update/:id', verifyToken, updateEvent); // Explicit update route
apiRouter.put('/events/update/:id', verifyToken, updateEvent); // Also support PUT

// Tickets (MUST be before :username/:slug to avoid conflicts)
apiRouter.post('/events/:eventId/register', registerTicket);
apiRouter.get('/events/:eventId/attendees', verifyToken, getEventAttendees);

// Public Event Page (LAST - catch-all pattern)
apiRouter.get('/events/:username/:slug', getEvent);

apiRouter.post('/validate', verifyToken, validateTicket);

// Dashboard
import { getDashboardStats, getAllAttendees } from '../controllers/dashboardController';
apiRouter.get('/dashboard/stats', verifyToken, getDashboardStats);
apiRouter.get('/dashboard/attendees', verifyToken, getAllAttendees);
