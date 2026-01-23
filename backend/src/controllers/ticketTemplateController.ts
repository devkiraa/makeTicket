import { Request, Response } from 'express';
import { TicketTemplate } from '../models/TicketTemplate';

// Create ticket template
export const createTicketTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { name, width, height, backgroundColor, backgroundImage, backgroundSize, qrCode, elements, isDefault, isGlobal } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            await TicketTemplate.updateMany({ userId }, { isDefault: false });
        }

        const template = await TicketTemplate.create({
            userId,
            name,
            width: width || 600,
            height: height || 300,
            backgroundColor,
            backgroundImage,
            backgroundSize,
            qrCode,
            elements: elements || [],
            isDefault: isDefault || false,
            isGlobal: isGlobal || false
        });

        res.status(201).json(template);
    } catch (error: any) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'A template with this name already exists' });
        }
        console.error('Create ticket template error:', error);
        res.status(500).json({ message: 'Failed to create template' });
    }
};

// Get user's ticket templates
export const getTicketTemplates = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        // Fetch user's templates OR global templates
        // We sort by local first, then global
        const templates = await TicketTemplate.find({
            $or: [
                { userId },
                { isGlobal: true }
            ]
        }).sort({ isGlobal: 1, createdAt: -1 });

        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch templates' });
    }
};

// Get single ticket template
export const getTicketTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { templateId } = req.params;

        const template = await TicketTemplate.findOne({
            _id: templateId,
            $or: [{ userId }, { isGlobal: true }]
        });

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch template' });
    }
};

// Update ticket template
export const updateTicketTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { templateId } = req.params;
        const { name, width, height, backgroundColor, backgroundImage, backgroundSize, qrCode, elements, isDefault, isActive, isGlobal } = req.body;

        // If setting as default, unset other defaults
        if (isDefault) {
            await TicketTemplate.updateMany({ userId }, { isDefault: false });
        }

        const template = await TicketTemplate.findOneAndUpdate(
            { _id: templateId, userId },
            {
                name,
                width,
                height,
                backgroundColor,
                backgroundImage,
                backgroundSize,
                qrCode,
                elements,
                isDefault,
                isActive,
                isGlobal
            },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update template' });
    }
};

// Delete ticket template
export const deleteTicketTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;
        const { templateId } = req.params;

        const result = await TicketTemplate.findOneAndDelete({ _id: templateId, userId });

        if (!result) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete template' });
    }
};

// Get default ticket template
export const getDefaultTicketTemplate = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user.id;

        let template = await TicketTemplate.findOne({ userId, isDefault: true });

        // If no default, get the first one
        if (!template) {
            template = await TicketTemplate.findOne({ userId });
        }

        res.json(template);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch default template' });
    }
};

// Get downloadable template specs (for designers)
export const getTemplateSpecs = async (req: Request, res: Response) => {
    const specs = {
        recommended: {
            width: 600,
            height: 300,
            format: 'PNG or JPG',
            dpi: 150
        },
        sizes: [
            { name: 'Standard', width: 600, height: 300, aspectRatio: '2:1' },
            { name: 'Compact', width: 400, height: 200, aspectRatio: '2:1' },
            { name: 'Square', width: 400, height: 400, aspectRatio: '1:1' },
            { name: 'Vertical', width: 300, height: 500, aspectRatio: '3:5' },
            { name: 'Wide', width: 800, height: 300, aspectRatio: '8:3' }
        ],
        placeholders: [
            { key: 'guest_name', description: 'Attendee\'s full name', example: 'John Doe' },
            { key: 'event_title', description: 'Event name', example: 'Tech Conference 2024' },
            { key: 'event_date', description: 'Event date/time', example: 'Dec 25, 2024' },
            { key: 'event_location', description: 'Venue/location', example: 'Convention Center' },
            { key: 'ticket_code', description: 'Unique ticket code', example: 'TKT-ABC123' }
        ],
        qrCode: {
            description: 'QR code will be auto-generated with the ticket code',
            recommendedSize: '100-150px',
            minSize: 80,
            maxSize: 200
        }
    };

    res.json(specs);
};
