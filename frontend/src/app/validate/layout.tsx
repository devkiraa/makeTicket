import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Validate Ticket - QR Code Scanner | MakeTicket',
    description: 'Validate event tickets instantly. Scan QR codes or enter ticket codes manually to verify authenticity. Free ticket validation tool.',
    keywords: [
        'validate ticket',
        'ticket verification',
        'QR code scanner',
        'check ticket authenticity',
        'event ticket validator',
        'scan ticket QR code'
    ],
    openGraph: {
        title: 'Ticket Validator - MakeTicket',
        description: 'Validate event tickets by scanning QR codes or entering ticket codes.',
        url: 'https://maketicket.app/validate',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/validate',
    },
};

export default function ValidateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
