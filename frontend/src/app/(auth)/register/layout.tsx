import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sign Up Free - Create Event Tickets | MakeTicket',
    description: 'Create your free MakeTicket account and start making event tickets in minutes. No credit card required. Generate QR codes, manage registrations, instant check-in.',
    keywords: [
        'create ticket account',
        'sign up ticketing',
        'free event registration',
        'register maketicket',
        'create event tickets free',
        'free ticket generator signup'
    ],
    openGraph: {
        title: 'Sign Up Free - Start Creating Event Tickets',
        description: 'Join MakeTicket free. Create professional event tickets with QR codes in minutes. No credit card required.',
        url: 'https://maketicket.app/register',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/register',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RegisterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
