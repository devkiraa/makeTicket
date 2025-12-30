import { PlanConfig, DEFAULT_PLAN_CONFIGS } from '../models/PlanConfig';
import { Subscription } from '../models/Subscription';
import { Event } from '../models/Event';
import { Ticket } from '../models/Ticket';
import { Coordinator } from '../models/Coordinator';
import { EmailTemplate } from '../models/EmailTemplate';
import { TicketTemplate } from '../models/TicketTemplate';
import { logger } from '../lib/logger';

interface LimitCheckResult {
    allowed: boolean;
    limit: number;
    current: number;
    remaining: number;
    message: string;
    upgradeRequired?: boolean;
}

interface FeatureCheckResult {
    allowed: boolean;
    feature: string;
    message: string;
    upgradeRequired?: boolean;
}

interface UserUsage {
    eventsThisMonth: number;
    eventsTotal: number;
    attendeesTotal: number;
    teamMembers: number;
    emailsThisMonth: number;
    emailTemplates: number;
    ticketTemplates: number;
    storageMB: number;
    apiRequestsToday: number;
}

// Cache for plan configs (refresh every 5 minutes)
let planConfigCache: Map<string, any> = new Map();
let cacheLastUpdated: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get plan configuration (from DB or defaults)
export const getPlanConfig = async (planId: string): Promise<any> => {
    // Check cache
    if (Date.now() - cacheLastUpdated < CACHE_TTL && planConfigCache.has(planId)) {
        return planConfigCache.get(planId);
    }

    try {
        // Try to get from database
        let config: any = await PlanConfig.findOne({ planId, isActive: true }).lean();
        
        // If not in database, use defaults
        if (!config) {
            config = DEFAULT_PLAN_CONFIGS[planId as keyof typeof DEFAULT_PLAN_CONFIGS] || DEFAULT_PLAN_CONFIGS.free;
        }

        // Update cache
        planConfigCache.set(planId, config);
        cacheLastUpdated = Date.now();

        return config;
    } catch (error) {
        logger.error('plan_config.get_failed', { planId, error });
        return DEFAULT_PLAN_CONFIGS[planId as keyof typeof DEFAULT_PLAN_CONFIGS] || DEFAULT_PLAN_CONFIGS.free;
    }
};

// Get all plan configs
export const getAllPlanConfigs = async (): Promise<any[]> => {
    try {
        const dbConfigs = await PlanConfig.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
        
        // Merge with defaults for any missing plans
        const planIds = ['free', 'starter', 'pro', 'enterprise'];
        const result = [];

        for (const planId of planIds) {
            const dbConfig = dbConfigs.find((c: any) => c.planId === planId);
            if (dbConfig) {
                result.push(dbConfig);
            } else {
                result.push(DEFAULT_PLAN_CONFIGS[planId as keyof typeof DEFAULT_PLAN_CONFIGS]);
            }
        }

        return result;
    } catch (error) {
        logger.error('plan_config.get_all_failed', { error });
        return Object.values(DEFAULT_PLAN_CONFIGS);
    }
};

// Clear cache (call after admin updates)
export const clearPlanConfigCache = () => {
    planConfigCache.clear();
    cacheLastUpdated = 0;
};

// Get user's current plan
export const getUserPlan = async (userId: string): Promise<string> => {
    try {
        const subscription = await Subscription.findOne({ userId }).lean();
        return subscription?.plan || 'free';
    } catch (error) {
        logger.error('plan_limit.get_user_plan_failed', { userId, error });
        return 'free';
    }
};

const isPlainObject = (value: unknown): value is Record<string, any> => {
    return !!value && typeof value === 'object' && !Array.isArray(value);
};

const mergeOverrides = (base: any, overrides: any) => {
    if (!isPlainObject(overrides)) return base;
    return { ...base, ...overrides };
};

// Get user's effective plan config (plan config + per-account overrides)
// Currently scoped to Enterprise: the plan config stays the source of truth for other plans.
export const getUserEffectivePlanConfig = async (userId: string): Promise<any> => {
    const subscription = await Subscription.findOne({ userId }).lean();
    const plan = subscription?.plan || 'free';

    const baseConfig = await getPlanConfig(plan);

    if (plan !== 'enterprise') {
        return baseConfig;
    }

    const overrides = (subscription as any)?.planOverrides;
    if (!overrides) {
        return baseConfig;
    }

    return {
        ...baseConfig,
        limits: mergeOverrides(baseConfig?.limits || {}, overrides?.limits),
        features: mergeOverrides(baseConfig?.features || {}, overrides?.features)
    };
};

// Get user's current usage
export const getUserUsage = async (userId: string): Promise<UserUsage> => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
        const [
            eventsThisMonth,
            eventsTotal,
            tickets,
            coordinators,
            emailTemplates,
            ticketTemplates
        ] = await Promise.all([
            Event.countDocuments({ hostId: userId, createdAt: { $gte: startOfMonth } }),
            Event.countDocuments({ hostId: userId }),
            Ticket.countDocuments({ eventId: { $in: await Event.find({ hostId: userId }).distinct('_id') } }),
            Coordinator.countDocuments({ invitedBy: userId, status: 'accepted' }),
            EmailTemplate.countDocuments({ createdBy: userId }),
            TicketTemplate.countDocuments({ createdBy: userId })
        ]);

        // TODO: Add email tracking and storage tracking
        return {
            eventsThisMonth,
            eventsTotal,
            attendeesTotal: tickets,
            teamMembers: coordinators,
            emailsThisMonth: 0, // TODO: Track from EmailLog
            emailTemplates,
            ticketTemplates,
            storageMB: 0, // TODO: Calculate from uploads
            apiRequestsToday: 0 // TODO: Track API requests
        };
    } catch (error) {
        logger.error('plan_limit.get_usage_failed', { userId, error });
        return {
            eventsThisMonth: 0,
            eventsTotal: 0,
            attendeesTotal: 0,
            teamMembers: 0,
            emailsThisMonth: 0,
            emailTemplates: 0,
            ticketTemplates: 0,
            storageMB: 0,
            apiRequestsToday: 0
        };
    }
};

// Check if user can create a new event
export const checkCanCreateEvent = async (userId: string): Promise<LimitCheckResult> => {
    const config = await getUserEffectivePlanConfig(userId);
    const usage = await getUserUsage(userId);

    const monthlyLimit = config.limits?.maxEventsPerMonth ?? DEFAULT_PLAN_CONFIGS.free.limits.maxEventsPerMonth;
    const totalLimit = config.limits?.maxEventsTotal ?? -1;

    // Check monthly limit
    if (monthlyLimit !== -1 && usage.eventsThisMonth >= monthlyLimit) {
        return {
            allowed: false,
            limit: monthlyLimit,
            current: usage.eventsThisMonth,
            remaining: 0,
            message: `You've reached your monthly event limit (${monthlyLimit} events). Upgrade your plan to create more events.`,
            upgradeRequired: true
        };
    }

    // Check total limit
    if (totalLimit !== -1 && usage.eventsTotal >= totalLimit) {
        return {
            allowed: false,
            limit: totalLimit,
            current: usage.eventsTotal,
            remaining: 0,
            message: `You've reached your total event limit (${totalLimit} events). Upgrade your plan to create more events.`,
            upgradeRequired: true
        };
    }

    const remaining = monthlyLimit === -1 ? -1 : monthlyLimit - usage.eventsThisMonth;
    return {
        allowed: true,
        limit: monthlyLimit,
        current: usage.eventsThisMonth,
        remaining,
        message: remaining === -1 ? 'Unlimited events' : `You can create ${remaining} more event(s) this month`
    };
};

// Check if event can accept more attendees
export const checkCanAddAttendee = async (userId: string, eventId: string): Promise<LimitCheckResult> => {
    const config = await getUserEffectivePlanConfig(userId);

    const attendeeLimit = config.limits?.maxAttendeesPerEvent ?? DEFAULT_PLAN_CONFIGS.free.limits.maxAttendeesPerEvent;
    
    // Get current attendee count for this event
    const currentAttendees = await Ticket.countDocuments({ eventId });

    if (attendeeLimit !== -1 && currentAttendees >= attendeeLimit) {
        return {
            allowed: false,
            limit: attendeeLimit,
            current: currentAttendees,
            remaining: 0,
            message: `This event has reached its attendee limit (${attendeeLimit}). Upgrade your plan for more attendees.`,
            upgradeRequired: true
        };
    }

    const remaining = attendeeLimit === -1 ? -1 : attendeeLimit - currentAttendees;
    return {
        allowed: true,
        limit: attendeeLimit,
        current: currentAttendees,
        remaining,
        message: remaining === -1 ? 'Unlimited attendees' : `${remaining} spots remaining`
    };
};

// Check if user can add more coordinators to an event
export const checkCanAddCoordinator = async (userId: string, eventId: string): Promise<LimitCheckResult> => {
    const config = await getUserEffectivePlanConfig(userId);

    const coordinatorLimit = config.limits?.maxCoordinatorsPerEvent ?? DEFAULT_PLAN_CONFIGS.free.limits.maxCoordinatorsPerEvent;
    
    // Get current coordinator count for this event
    const currentCoordinators = await Coordinator.countDocuments({ eventId, status: { $in: ['pending', 'accepted'] } });

    if (coordinatorLimit !== -1 && currentCoordinators >= coordinatorLimit) {
        return {
            allowed: false,
            limit: coordinatorLimit,
            current: currentCoordinators,
            remaining: 0,
            message: `You've reached the coordinator limit for this event (${coordinatorLimit}). Upgrade your plan to add more.`,
            upgradeRequired: true
        };
    }

    const remaining = coordinatorLimit === -1 ? -1 : coordinatorLimit - currentCoordinators;
    return {
        allowed: true,
        limit: coordinatorLimit,
        current: currentCoordinators,
        remaining,
        message: remaining === -1 ? 'Unlimited coordinators' : `You can add ${remaining} more coordinator(s)`
    };
};

// Check if user can create email template
export const checkCanCreateEmailTemplate = async (userId: string): Promise<LimitCheckResult> => {
    const config = await getUserEffectivePlanConfig(userId);
    const usage = await getUserUsage(userId);

    const limit = config.limits?.maxEmailTemplates ?? DEFAULT_PLAN_CONFIGS.free.limits.maxEmailTemplates;

    if (limit !== -1 && usage.emailTemplates >= limit) {
        return {
            allowed: false,
            limit,
            current: usage.emailTemplates,
            remaining: 0,
            message: `You've reached your email template limit (${limit}). Upgrade your plan to create more.`,
            upgradeRequired: true
        };
    }

    const remaining = limit === -1 ? -1 : limit - usage.emailTemplates;
    return {
        allowed: true,
        limit,
        current: usage.emailTemplates,
        remaining,
        message: remaining === -1 ? 'Unlimited templates' : `You can create ${remaining} more template(s)`
    };
};

// Check if user can create ticket template
export const checkCanCreateTicketTemplate = async (userId: string): Promise<LimitCheckResult> => {
    const config = await getUserEffectivePlanConfig(userId);
    const usage = await getUserUsage(userId);

    const limit = config.limits?.maxTicketTemplates ?? DEFAULT_PLAN_CONFIGS.free.limits.maxTicketTemplates;

    if (limit !== -1 && usage.ticketTemplates >= limit) {
        return {
            allowed: false,
            limit,
            current: usage.ticketTemplates,
            remaining: 0,
            message: `You've reached your ticket template limit (${limit}). Upgrade your plan to create more.`,
            upgradeRequired: true
        };
    }

    const remaining = limit === -1 ? -1 : limit - usage.ticketTemplates;
    return {
        allowed: true,
        limit,
        current: usage.ticketTemplates,
        remaining,
        message: remaining === -1 ? 'Unlimited templates' : `You can create ${remaining} more template(s)`
    };
};

// Check if user can add custom fields
export const checkCanAddCustomFields = async (userId: string, currentFieldCount: number): Promise<LimitCheckResult> => {
    const config = await getUserEffectivePlanConfig(userId);

    const limit = config.limits?.maxCustomFieldsPerEvent ?? DEFAULT_PLAN_CONFIGS.free.limits.maxCustomFieldsPerEvent;

    if (limit !== -1 && currentFieldCount >= limit) {
        return {
            allowed: false,
            limit,
            current: currentFieldCount,
            remaining: 0,
            message: `You've reached the custom field limit (${limit}). Upgrade your plan to add more fields.`,
            upgradeRequired: true
        };
    }

    const remaining = limit === -1 ? -1 : limit - currentFieldCount;
    return {
        allowed: true,
        limit,
        current: currentFieldCount,
        remaining,
        message: remaining === -1 ? 'Unlimited fields' : `You can add ${remaining} more field(s)`
    };
};

// Check if a feature is enabled for user's plan
export const checkFeatureAccess = async (userId: string, feature: string): Promise<FeatureCheckResult> => {
    const config = await getUserEffectivePlanConfig(userId);

    const featureEnabled = config.features?.[feature] ?? false;

    if (!featureEnabled) {
        // Find which plan has this feature
        const allConfigs = await getAllPlanConfigs();
        const plansWithFeature = allConfigs
            .filter((c: any) => c.features?.[feature])
            .map((c: any) => c.name);

        return {
            allowed: false,
            feature,
            message: `${formatFeatureName(feature)} is not available on your current plan. ${plansWithFeature.length > 0 ? `Available on: ${plansWithFeature.join(', ')}` : ''}`,
            upgradeRequired: true
        };
    }

    return {
        allowed: true,
        feature,
        message: `${formatFeatureName(feature)} is enabled`
    };
};

// Get user's complete plan limits and usage
export const getUserPlanSummary = async (userId: string) => {
    const plan = await getUserPlan(userId);
    const config = await getUserEffectivePlanConfig(userId);
    const usage = await getUserUsage(userId);

    return {
        plan,
        planName: config.name,
        planDescription: config.description,
        limits: config.limits,
        features: config.features,
        usage,
        themeColor: config.themeColor
    };
};

// Helper to format feature names
const formatFeatureName = (feature: string): string => {
    return feature
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

// Initialize plan configs in database (run on server start)
export const initializePlanConfigs = async () => {
    try {
        for (const [planId, config] of Object.entries(DEFAULT_PLAN_CONFIGS)) {
            const existing = await PlanConfig.findOne({ planId });
            if (!existing) {
                await PlanConfig.create(config);
                logger.info('plan_config.initialized', { planId });
            }
        }
    } catch (error) {
        logger.error('plan_config.init_failed', { error });
    }
};
