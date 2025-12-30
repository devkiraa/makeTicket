import { Request, Response, NextFunction } from 'express';
import {
    checkCanCreateEvent,
    checkCanAddAttendee,
    checkCanAddCoordinator,
    checkCanCreateEmailTemplate,
    checkCanCreateTicketTemplate,
    checkCanAddCustomFields,
    checkFeatureAccess
} from '../services/planLimitService';
import { logger } from '../lib/logger';

// Extend Express Request type
interface AuthRequest extends Request {
    userId?: string;
}

/**
 * Middleware to check if user can create an event
 */
export const canCreateEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const result = await checkCanCreateEvent(userId);

        if (!result.allowed) {
            return res.status(403).json({
                message: result.message,
                limit: result.limit,
                current: result.current,
                upgradeRequired: result.upgradeRequired,
                code: 'PLAN_LIMIT_EXCEEDED'
            });
        }

        // Attach limit info to request for potential use in controller
        (req as any).planLimits = { events: result };
        next();
    } catch (error) {
        logger.error('plan_limit_middleware.create_event_check_failed', { error });
        next(); // Allow through on error - fail open
    }
};

/**
 * Middleware to check if event can accept more attendees
 */
export const canAddAttendee = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        const eventId = req.params.eventId || req.body.eventId;

        if (!userId || !eventId) {
            return next(); // Skip check if missing data
        }

        const result = await checkCanAddAttendee(userId, eventId);

        if (!result.allowed) {
            return res.status(403).json({
                message: result.message,
                limit: result.limit,
                current: result.current,
                upgradeRequired: result.upgradeRequired,
                code: 'ATTENDEE_LIMIT_EXCEEDED'
            });
        }

        (req as any).planLimits = { ...((req as any).planLimits || {}), attendees: result };
        next();
    } catch (error) {
        logger.error('plan_limit_middleware.add_attendee_check_failed', { error });
        next();
    }
};

/**
 * Middleware to check if user can add more coordinators
 */
export const canAddCoordinator = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        const eventId = req.params.eventId || req.body.eventId;

        if (!userId || !eventId) {
            return next();
        }

        const result = await checkCanAddCoordinator(userId, eventId);

        if (!result.allowed) {
            return res.status(403).json({
                message: result.message,
                limit: result.limit,
                current: result.current,
                upgradeRequired: result.upgradeRequired,
                code: 'COORDINATOR_LIMIT_EXCEEDED'
            });
        }

        (req as any).planLimits = { ...((req as any).planLimits || {}), coordinators: result };
        next();
    } catch (error) {
        logger.error('plan_limit_middleware.add_coordinator_check_failed', { error });
        next();
    }
};

/**
 * Middleware to check if user can create email template
 */
export const canCreateEmailTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const result = await checkCanCreateEmailTemplate(userId);

        if (!result.allowed) {
            return res.status(403).json({
                message: result.message,
                limit: result.limit,
                current: result.current,
                upgradeRequired: result.upgradeRequired,
                code: 'EMAIL_TEMPLATE_LIMIT_EXCEEDED'
            });
        }

        next();
    } catch (error) {
        logger.error('plan_limit_middleware.create_email_template_check_failed', { error });
        next();
    }
};

/**
 * Middleware to check if user can create ticket template
 */
export const canCreateTicketTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const result = await checkCanCreateTicketTemplate(userId);

        if (!result.allowed) {
            return res.status(403).json({
                message: result.message,
                limit: result.limit,
                current: result.current,
                upgradeRequired: result.upgradeRequired,
                code: 'TICKET_TEMPLATE_LIMIT_EXCEEDED'
            });
        }

        next();
    } catch (error) {
        logger.error('plan_limit_middleware.create_ticket_template_check_failed', { error });
        next();
    }
};

/**
 * Factory function to create feature check middleware
 */
export const requireFeature = (featureName: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.userId;
            if (!userId) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            const result = await checkFeatureAccess(userId, featureName);

            if (!result.allowed) {
                return res.status(403).json({
                    message: result.message,
                    feature: result.feature,
                    upgradeRequired: result.upgradeRequired,
                    code: 'FEATURE_NOT_AVAILABLE'
                });
            }

            next();
        } catch (error) {
            logger.error('plan_limit_middleware.feature_check_failed', { featureName, error });
            next();
        }
    };
};

// Pre-built feature middlewares
export const requireCustomBranding = requireFeature('customBranding');
export const requireAdvancedAnalytics = requireFeature('advancedAnalytics');
export const requireApiAccess = requireFeature('apiAccess');
export const requireCustomSmtp = requireFeature('customSmtp');
export const requireExportData = requireFeature('exportData');
export const requireGoogleFormsIntegration = requireFeature('googleFormsIntegration');
export const requireGoogleSheetsIntegration = requireFeature('googleSheetsIntegration');
export const requireAcceptPayments = requireFeature('acceptPayments');
export const requireWebhooks = requireFeature('webhooks');
export const requireBulkImport = requireFeature('bulkImport');
export const requireWaitlistManagement = requireFeature('waitlistManagement');
