import express from 'express';
import { verifyToken } from '../middleware/auth';
import {
    createSupportTicket,
    getMySupportTickets,
    getEventSupportTickets,
    getAllHostSupportTickets,
    addMessage,
    updateTicketStatus,
    getSupportTicketDetails,
    adminGetAllSupportTickets,
    adminUpdateTicketStatus
} from '../controllers/supportController';

const router = express.Router();

// User routes
router.post('/tickets', verifyToken, createSupportTicket);
router.get('/my-tickets', verifyToken, getMySupportTickets);
router.get('/tickets/:ticketId', verifyToken, getSupportTicketDetails);
router.post('/tickets/:ticketId/messages', verifyToken, addMessage);

// Host routes
router.get('/host/tickets', verifyToken, getAllHostSupportTickets); // All tickets for all host's events
router.get('/host/events/:eventId/tickets', verifyToken, getEventSupportTickets); // Tickets for specific event
router.patch('/host/tickets/:ticketId/status', verifyToken, updateTicketStatus);

// Admin routes
router.get('/admin/tickets', verifyToken, adminGetAllSupportTickets);
router.patch('/admin/tickets/:ticketId', verifyToken, adminUpdateTicketStatus);

export default router;

