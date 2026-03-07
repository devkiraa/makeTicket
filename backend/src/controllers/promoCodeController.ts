import { Request, Response } from 'express';
import { PromoCode } from '../models/PromoCode';
import { Event } from '../models/Event';

// Create a new promo code
export const createPromoCode = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const hostId = req.user.id;
        const { eventId, code, discountType, discountValue, maxUses, validFrom, validUntil } = req.body;

        // Verify event ownership
        const event = await Event.findOne({ _id: eventId, hostId });
        if (!event) {
            return res.status(404).json({ message: 'Event not found or unauthorized' });
        }

        // Basic validation
        if (!code || !discountType || discountValue === undefined) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
            return res.status(400).json({ message: 'Percentage discount must be between 1 and 100' });
        }

        const normalizedCode = code.toUpperCase().trim();

        // Check if code exists
        const existingCode = await PromoCode.findOne({ eventId, code: normalizedCode });
        if (existingCode) {
            return res.status(400).json({ message: 'Promo code already exists for this event' });
        }

        const promoCode = await PromoCode.create({
            eventId,
            hostId,
            code: normalizedCode,
            discountType,
            discountValue,
            maxUses: maxUses || 0,
            validFrom: validFrom || new Date(),
            validUntil: validUntil || null,
        });

        res.status(201).json({ message: 'Promo code created successfully', promoCode });
    } catch (error) {
        console.error('Create Promo Code Error:', error);
        res.status(500).json({ message: 'Failed to create promo code', error });
    }
};

// List promo codes for an event
export const getEventPromoCodes = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const hostId = req.user.id;
        const { eventId } = req.params;

        const promoCodes = await PromoCode.find({ eventId, hostId }).sort({ createdAt: -1 });
        res.status(200).json(promoCodes);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch promo codes', error });
    }
};

// Validate and apply promo code (Public endpoint for attendees)
export const validatePromoCode = async (req: Request, res: Response) => {
    try {
        const { eventId, code } = req.body;

        if (!eventId || !code) {
            return res.status(400).json({ message: 'Event ID and Promo Code are required' });
        }

        const normalizedCode = code.toUpperCase().trim();
        const promoCode = await PromoCode.findOne({ eventId, code: normalizedCode, isActive: true });

        if (!promoCode) {
            return res.status(404).json({ message: 'Invalid or inactive promo code', valid: false });
        }

        const now = new Date();
        if (promoCode.validFrom && now < promoCode.validFrom) {
            return res.status(400).json({ message: 'Promo code is not yet active', valid: false });
        }

        if (promoCode.validUntil && now > promoCode.validUntil) {
            return res.status(400).json({ message: 'Promo code has expired', valid: false });
        }

        if (promoCode.maxUses > 0 && promoCode.currentUses >= promoCode.maxUses) {
            return res.status(400).json({ message: 'Promo code usage limit reached', valid: false });
        }

        res.status(200).json({
            valid: true,
            discountType: promoCode.discountType,
            discountValue: promoCode.discountValue,
            message: 'Promo code applied successfully'
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to validate promo code', error });
    }
};

// Delete or deactivate promo code
export const togglePromoCodeStatus = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const hostId = req.user.id;
        const { id } = req.params;

        const promoCode = await PromoCode.findOne({ _id: id, hostId });
        if (!promoCode) {
            return res.status(404).json({ message: 'Promo code not found or unauthorized' });
        }

        promoCode.isActive = !promoCode.isActive;
        await promoCode.save();

        res.status(200).json({ message: `Promo code ${promoCode.isActive ? 'activated' : 'deactivated'}`, promoCode });
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle promo code', error });
    }
};
