import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login - MakeTicket | Event Ticketing Platform',
    description: 'Log in to MakeTicket to manage your events, create tickets, and track registrations. Access your event dashboard securely.',
    keywords: [
        'maketicket login',
        'event management login',
        'ticketing login',
        'event dashboard'
    ],
    openGraph: {
        title: 'Login to MakeTicket',
        description: 'Access your event management dashboard. Create tickets, manage registrations, and more.',
        url: 'https://maketicket.app/login',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/login',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
