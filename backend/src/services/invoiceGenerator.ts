import { createCanvas, registerFont, loadImage } from 'canvas';
import path from 'path';
import fs from 'fs';

// Invoice data interface
export interface InvoiceData {
    // Invoice details
    invoiceNumber: string;
    invoiceDate: Date;
    dueDate?: Date;
    
    // Company details (seller)
    company: {
        name: string;
        address: string[];
        email: string;
        phone?: string;
        website?: string;
        gst?: string;
        pan?: string;
        logo?: string;
    };
    
    // Customer details
    customer: {
        name: string;
        email: string;
        address?: string[];
        phone?: string;
        gst?: string;
    };
    
    // Payment details
    payment: {
        method: string;
        transactionId: string;
        status: string;
        paidAt?: Date;
    };
    
    // Line items
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
        hsnCode?: string;
    }[];
    
    // Totals
    subtotal: number;
    tax?: {
        cgst?: number;
        sgst?: number;
        igst?: number;
        rate: number;
    };
    total: number;
    currency: string;
    
    // Additional info
    notes?: string;
    terms?: string[];
}

// A4 dimensions at 72 DPI (standard PDF)
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

// Colors
const COLORS = {
    primary: '#4F46E5',      // Indigo
    secondary: '#6366F1',
    text: '#1F2937',
    textLight: '#6B7280',
    border: '#E5E7EB',
    background: '#F9FAFB',
    success: '#10B981',
    white: '#FFFFFF'
};

// Helper to format currency
const formatCurrency = (amount: number, currency: string = 'INR'): string => {
    if (currency === 'INR') {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${currency} ${amount.toFixed(2)}`;
};

// Helper to format date
const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// Draw rounded rectangle
const drawRoundedRect = (
    ctx: any,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean = true,
    stroke: boolean = false
) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
};

export const generateInvoicePDF = async (data: InvoiceData): Promise<Buffer> => {
    const canvas = createCanvas(A4_WIDTH, A4_HEIGHT, 'pdf');
    const ctx = canvas.getContext('2d');
    
    // Determine if this is an invoice (GST registered) or receipt (individual)
    const isGstRegistered = !!data.company.gst;
    const documentType = isGstRegistered ? 'INVOICE' : 'RECEIPT';
    
    // Background
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
    
    let y = 40;
    const leftMargin = 40;
    const rightMargin = A4_WIDTH - 40;
    const contentWidth = rightMargin - leftMargin;
    
    // === HEADER SECTION ===
    // Company logo
    let logoOffset = 0;
    if (data.company.logo) {
        try {
            const logoPath = path.resolve(data.company.logo);
            if (fs.existsSync(logoPath)) {
                const logo = await loadImage(logoPath);
                const logoHeight = 40;
                const logoWidth = (logo.width / logo.height) * logoHeight;
                ctx.drawImage(logo, leftMargin, y - 28, logoWidth, logoHeight);
                logoOffset = logoWidth + 12;
            }
        } catch (e) {
            console.error('Failed to load logo:', e);
        }
    }
    
    // Company name
    ctx.fillStyle = COLORS.primary;
    ctx.font = 'bold 24px Helvetica';
    ctx.fillText(data.company.name, leftMargin + logoOffset, y);
    
    // INVOICE/RECEIPT label on right
    ctx.fillStyle = COLORS.textLight;
    ctx.font = 'bold 32px Helvetica';
    ctx.textAlign = 'right';
    ctx.fillText(documentType, rightMargin, y);
    ctx.textAlign = 'left';
    
    y += 25;
    
    // Company details
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '10px Helvetica';
    data.company.address.forEach(line => {
        ctx.fillText(line, leftMargin, y);
        y += 14;
    });
    ctx.fillText(data.company.email, leftMargin, y);
    y += 14;
    if (data.company.phone) {
        ctx.fillText(`Phone: ${data.company.phone}`, leftMargin, y);
        y += 14;
    }
    if (data.company.website) {
        ctx.fillText(data.company.website, leftMargin, y);
        y += 14;
    }
    
    // Invoice/Receipt details on right side
    const invoiceDetailsY = 70;
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 10px Helvetica';
    ctx.fillText(isGstRegistered ? 'Invoice Number:' : 'Receipt Number:', rightMargin - 100, invoiceDetailsY);
    ctx.font = '10px Helvetica';
    ctx.fillText(data.invoiceNumber, rightMargin, invoiceDetailsY);
    
    ctx.font = 'bold 10px Helvetica';
    ctx.fillText(isGstRegistered ? 'Invoice Date:' : 'Receipt Date:', rightMargin - 100, invoiceDetailsY + 16);
    ctx.font = '10px Helvetica';
    ctx.fillText(formatDate(data.invoiceDate), rightMargin, invoiceDetailsY + 16);
    
    if (data.payment.paidAt) {
        ctx.font = 'bold 10px Helvetica';
        ctx.fillText('Payment Date:', rightMargin - 100, invoiceDetailsY + 32);
        ctx.font = '10px Helvetica';
        ctx.fillText(formatDate(data.payment.paidAt), rightMargin, invoiceDetailsY + 32);
    }
    
    // Status badge
    const statusY = invoiceDetailsY + 52;
    ctx.fillStyle = COLORS.success;
    drawRoundedRect(ctx, rightMargin - 50, statusY - 12, 50, 18, 4);
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 9px Helvetica';
    ctx.fillText('PAID', rightMargin - 25, statusY);
    
    ctx.textAlign = 'left';
    
    y = Math.max(y, 150);
    
    // === DIVIDER LINE ===
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftMargin, y);
    ctx.lineTo(rightMargin, y);
    ctx.stroke();
    
    y += 25;
    
    // === BILL TO SECTION ===
    ctx.fillStyle = COLORS.textLight;
    ctx.font = 'bold 10px Helvetica';
    ctx.fillText('BILL TO', leftMargin, y);
    
    // Payment details on right
    ctx.textAlign = 'right';
    ctx.fillText('PAYMENT DETAILS', rightMargin, y);
    ctx.textAlign = 'left';
    
    y += 18;
    
    // Customer details
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 12px Helvetica';
    ctx.fillText(data.customer.name, leftMargin, y);
    
    // Payment method on right
    ctx.textAlign = 'right';
    ctx.font = '10px Helvetica';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('Method:', rightMargin - 100, y);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(data.payment.method.toUpperCase(), rightMargin, y);
    ctx.textAlign = 'left';
    
    y += 14;
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '10px Helvetica';
    ctx.fillText(data.customer.email, leftMargin, y);
    
    // Transaction ID on right
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.textLight;
    ctx.fillText('Transaction ID:', rightMargin - 100, y);
    ctx.fillStyle = COLORS.text;
    ctx.font = '9px Helvetica';
    const txnId = data.payment.transactionId.length > 20 
        ? data.payment.transactionId.substring(0, 20) + '...'
        : data.payment.transactionId;
    ctx.fillText(txnId, rightMargin, y);
    ctx.textAlign = 'left';
    
    if (data.customer.address) {
        data.customer.address.forEach(line => {
            y += 14;
            ctx.fillText(line, leftMargin, y);
        });
    }
    
    if (data.customer.gst) {
        y += 14;
        ctx.fillText(`GSTIN: ${data.customer.gst}`, leftMargin, y);
    }
    
    y += 35;
    
    // === ITEMS TABLE ===
    // Table header background
    ctx.fillStyle = COLORS.primary;
    drawRoundedRect(ctx, leftMargin, y, contentWidth, 28, 4);
    
    // Table headers
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 10px Helvetica';
    ctx.fillText('Description', leftMargin + 12, y + 18);
    ctx.textAlign = 'center';
    ctx.fillText('Qty', leftMargin + contentWidth * 0.55, y + 18);
    ctx.textAlign = 'right';
    ctx.fillText('Unit Price', leftMargin + contentWidth * 0.75, y + 18);
    ctx.fillText('Amount', rightMargin - 12, y + 18);
    ctx.textAlign = 'left';
    
    y += 38;
    
    // Table rows
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px Helvetica';
    
    data.items.forEach((item, index) => {
        // Alternating background
        if (index % 2 === 0) {
            ctx.fillStyle = COLORS.background;
            ctx.fillRect(leftMargin, y - 10, contentWidth, 26);
        }
        
        ctx.fillStyle = COLORS.text;
        ctx.font = '10px Helvetica';
        
        // Description (may wrap)
        const maxDescWidth = contentWidth * 0.5;
        let desc = item.description;
        if (ctx.measureText(desc).width > maxDescWidth) {
            desc = desc.substring(0, 40) + '...';
        }
        ctx.fillText(desc, leftMargin + 12, y + 4);
        
        // HSN Code if present
        if (item.hsnCode) {
            ctx.fillStyle = COLORS.textLight;
            ctx.font = '8px Helvetica';
            ctx.fillText(`HSN: ${item.hsnCode}`, leftMargin + 12, y + 16);
        }
        
        ctx.fillStyle = COLORS.text;
        ctx.font = '10px Helvetica';
        
        // Quantity
        ctx.textAlign = 'center';
        ctx.fillText(item.quantity.toString(), leftMargin + contentWidth * 0.55, y + 4);
        
        // Unit price
        ctx.textAlign = 'right';
        ctx.fillText(formatCurrency(item.unitPrice, data.currency), leftMargin + contentWidth * 0.75, y + 4);
        
        // Amount
        ctx.fillText(formatCurrency(item.amount, data.currency), rightMargin - 12, y + 4);
        
        ctx.textAlign = 'left';
        y += 26;
    });
    
    y += 10;
    
    // === TOTALS SECTION ===
    const totalsX = rightMargin - 180;
    const totalsWidth = 180;
    
    // Subtotal
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(totalsX, y);
    ctx.lineTo(rightMargin, y);
    ctx.stroke();
    
    y += 18;
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '10px Helvetica';
    ctx.fillText('Subtotal', totalsX, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(formatCurrency(data.subtotal, data.currency), rightMargin - 12, y);
    ctx.textAlign = 'left';
    
    // Tax breakdown
    if (data.tax) {
        if (data.tax.cgst !== undefined && data.tax.sgst !== undefined) {
            y += 18;
            ctx.fillStyle = COLORS.textLight;
            ctx.fillText(`CGST (${data.tax.rate / 2}%)`, totalsX, y);
            ctx.textAlign = 'right';
            ctx.fillStyle = COLORS.text;
            ctx.fillText(formatCurrency(data.tax.cgst, data.currency), rightMargin - 12, y);
            ctx.textAlign = 'left';
            
            y += 18;
            ctx.fillStyle = COLORS.textLight;
            ctx.fillText(`SGST (${data.tax.rate / 2}%)`, totalsX, y);
            ctx.textAlign = 'right';
            ctx.fillStyle = COLORS.text;
            ctx.fillText(formatCurrency(data.tax.sgst, data.currency), rightMargin - 12, y);
            ctx.textAlign = 'left';
        } else if (data.tax.igst !== undefined) {
            y += 18;
            ctx.fillStyle = COLORS.textLight;
            ctx.fillText(`IGST (${data.tax.rate}%)`, totalsX, y);
            ctx.textAlign = 'right';
            ctx.fillStyle = COLORS.text;
            ctx.fillText(formatCurrency(data.tax.igst, data.currency), rightMargin - 12, y);
            ctx.textAlign = 'left';
        }
    }
    
    y += 10;
    ctx.strokeStyle = COLORS.border;
    ctx.beginPath();
    ctx.moveTo(totalsX, y);
    ctx.lineTo(rightMargin, y);
    ctx.stroke();
    
    // Total
    y += 20;
    ctx.fillStyle = COLORS.primary;
    drawRoundedRect(ctx, totalsX - 10, y - 14, totalsWidth + 10, 30, 4);
    
    ctx.fillStyle = COLORS.white;
    ctx.font = 'bold 12px Helvetica';
    ctx.fillText('Total', totalsX, y + 4);
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px Helvetica';
    ctx.fillText(formatCurrency(data.total, data.currency), rightMargin - 12, y + 4);
    ctx.textAlign = 'left';
    
    y += 40;
    
    // === NOTES SECTION ===
    if (data.notes) {
        ctx.fillStyle = COLORS.textLight;
        ctx.font = 'bold 10px Helvetica';
        ctx.fillText('Notes', leftMargin, y);
        y += 14;
        ctx.font = '9px Helvetica';
        ctx.fillText(data.notes, leftMargin, y);
        y += 20;
    }
    
    // === TERMS & CONDITIONS ===
    if (data.terms && data.terms.length > 0) {
        y += 10;
        ctx.fillStyle = COLORS.textLight;
        ctx.font = 'bold 10px Helvetica';
        ctx.fillText('Terms & Conditions', leftMargin, y);
        y += 14;
        ctx.font = '8px Helvetica';
        data.terms.forEach((term, i) => {
            ctx.fillText(`${i + 1}. ${term}`, leftMargin, y);
            y += 12;
        });
    }
    
    // === FOOTER ===
    const footerY = A4_HEIGHT - 60;
    
    // Divider
    ctx.strokeStyle = COLORS.border;
    ctx.beginPath();
    ctx.moveTo(leftMargin, footerY);
    ctx.lineTo(rightMargin, footerY);
    ctx.stroke();
    
    // Company legal info
    ctx.fillStyle = COLORS.textLight;
    ctx.font = '8px Helvetica';
    ctx.textAlign = 'center';
    
    // For individual seller (not GST registered)
    let legalInfo = data.company.name;
    if (data.company.gst) legalInfo += ` | GSTIN: ${data.company.gst}`;
    if (data.company.pan) legalInfo += ` | PAN: ${data.company.pan}`;
    ctx.fillText(legalInfo, A4_WIDTH / 2, footerY + 18);
    
    ctx.fillText('This is a computer-generated receipt and does not require a signature.', A4_WIDTH / 2, footerY + 32);
    ctx.fillText(`Thank you for your purchase! | ${data.company.email}`, A4_WIDTH / 2, footerY + 46);
    
    ctx.textAlign = 'left';
    
    // Return PDF buffer
    return canvas.toBuffer('application/pdf');
};

// Generate invoice number
export const generateInvoiceNumber = (paymentId: string, date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const shortId = paymentId.slice(-8).toUpperCase();
    return `MT-${year}${month}-${shortId}`;
};
