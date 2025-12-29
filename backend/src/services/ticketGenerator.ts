import { createCanvas, loadImage, registerFont } from 'canvas';
import QRCode from 'qrcode';
import { TicketTemplate } from '../models/TicketTemplate';

interface TicketElement {
    id: string;
    type: 'text' | 'placeholder';
    content?: string;
    placeholder?: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    textAlign: string;
}

interface GenerateTicketParams {
    templateId?: string;
    guestName: string;
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    ticketCode: string;
    qrCodeData: string;
}

// Replace placeholders with actual values
const replacePlaceholder = (placeholder: string, data: Record<string, string>): string => {
    return data[placeholder] || `{{${placeholder}}}`;
};

export const generateTicketImage = async (params: GenerateTicketParams): Promise<Buffer | null> => {
    try {
        const { templateId, guestName, eventTitle, eventDate, eventLocation, ticketCode, qrCodeData } = params;

        // Data map for placeholders
        const placeholderData: Record<string, string> = {
            guest_name: guestName,
            event_title: eventTitle,
            event_date: eventDate,
            event_location: eventLocation,
            ticket_code: ticketCode
        };

        let width = 600;
        let height = 300;
        let backgroundColor = '#1e1b4b';
        let qrSettings = { x: 20, y: 90, size: 120, backgroundColor: '#ffffff', foregroundColor: '#000000' };
        let elements: TicketElement[] = [];

        // Load template if provided
        if (templateId) {
            const template = await TicketTemplate.findById(templateId);
            if (template) {
                width = template.width;
                height = template.height;
                backgroundColor = template.backgroundColor;
                if (template.qrCode) {
                    qrSettings = {
                        x: template.qrCode.x || 20,
                        y: template.qrCode.y || 90,
                        size: template.qrCode.size || 120,
                        backgroundColor: template.qrCode.backgroundColor || '#ffffff',
                        foregroundColor: template.qrCode.foregroundColor || '#000000'
                    };
                }
                if (template.elements && template.elements.length > 0) {
                    elements = template.elements.map((el: any) => ({
                        id: el.id,
                        type: el.type as 'text' | 'placeholder',
                        content: el.content || undefined,
                        placeholder: el.placeholder || undefined,
                        x: el.x,
                        y: el.y,
                        fontSize: el.fontSize,
                        fontFamily: el.fontFamily,
                        fontWeight: el.fontWeight,
                        color: el.color,
                        textAlign: el.textAlign
                    }));
                }
                console.log(`🎫 Using ticket template: ${template.name}`);
            }
        } else {
            // Default elements if no template
            elements = [
                { id: '1', type: 'placeholder', placeholder: 'event_title', x: 160, y: 30, fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', color: '#ffffff', textAlign: 'left' },
                { id: '2', type: 'placeholder', placeholder: 'guest_name', x: 160, y: 70, fontSize: 18, fontFamily: 'Arial', fontWeight: 'normal', color: '#e0e7ff', textAlign: 'left' },
                { id: '3', type: 'placeholder', placeholder: 'event_date', x: 160, y: 110, fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', color: '#a5b4fc', textAlign: 'left' },
                { id: '4', type: 'placeholder', placeholder: 'event_location', x: 160, y: 135, fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', color: '#a5b4fc', textAlign: 'left' },
                { id: '5', type: 'placeholder', placeholder: 'ticket_code', x: 160, y: 180, fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold', color: '#fbbf24', textAlign: 'left' }
            ];
        }

        // Create canvas
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Draw background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw background image if available
        if (templateId) {
            const template = await TicketTemplate.findById(templateId);
            if (template?.backgroundImage) {
                try {
                    const bgImage = await loadImage(template.backgroundImage);
                    // Draw based on backgroundSize setting
                    if (template.backgroundSize === 'contain') {
                        const scale = Math.min(width / bgImage.width, height / bgImage.height);
                        const x = (width - bgImage.width * scale) / 2;
                        const y = (height - bgImage.height * scale) / 2;
                        ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
                    } else {
                        // cover or stretch
                        ctx.drawImage(bgImage, 0, 0, width, height);
                    }
                    console.log(`🖼️ Background image applied`);
                } catch (imgError) {
                    console.warn('Failed to load background image, using color fallback');
                }
            }
        }

        // Generate QR code
        const qrCodeBuffer = await QRCode.toBuffer(qrCodeData, {
            width: qrSettings.size,
            margin: 1,
            color: {
                dark: qrSettings.foregroundColor,
                light: qrSettings.backgroundColor
            }
        });

        // Draw QR code
        const qrImage = await loadImage(qrCodeBuffer);

        // Draw white background for QR
        ctx.fillStyle = qrSettings.backgroundColor;
        const padding = 8;
        ctx.fillRect(
            qrSettings.x - padding,
            qrSettings.y - padding,
            qrSettings.size + (padding * 2),
            qrSettings.size + (padding * 2)
        );

        // Round corners for QR background
        ctx.save();
        const radius = 8;
        ctx.beginPath();
        ctx.roundRect(qrSettings.x - padding, qrSettings.y - padding, qrSettings.size + (padding * 2), qrSettings.size + (padding * 2), radius);
        ctx.clip();
        ctx.fillStyle = qrSettings.backgroundColor;
        ctx.fillRect(qrSettings.x - padding, qrSettings.y - padding, qrSettings.size + (padding * 2), qrSettings.size + (padding * 2));
        ctx.drawImage(qrImage, qrSettings.x, qrSettings.y, qrSettings.size, qrSettings.size);
        ctx.restore();

        // Draw text elements
        for (const element of elements) {
            const text = element.type === 'placeholder'
                ? replacePlaceholder(element.placeholder!, placeholderData)
                : (element.content || '');

            ctx.fillStyle = element.color;
            ctx.font = `${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`;
            ctx.textAlign = element.textAlign as CanvasTextAlign;
            ctx.textBaseline = 'top';

            ctx.fillText(text, element.x, element.y);
        }

        // Add decorative elements
        // Dotted line separator
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(150, 20);
        ctx.lineTo(150, height - 20);
        ctx.stroke();
        ctx.setLineDash([]);

        // MakeTicket branding (small)
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('MakeTicket', width - 15, height - 15);

        // Convert to PNG buffer
        const buffer = canvas.toBuffer('image/png');
        console.log(`🎫 Ticket image generated: ${width}x${height}px`);

        return buffer;
    } catch (error: any) {
        console.error('❌ Failed to generate ticket image:', error.message);
        return null;
    }
};
