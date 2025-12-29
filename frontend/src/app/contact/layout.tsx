import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contact Us - MakeTicket Support',
    description: 'Get in touch with MakeTicket support. Email us at support@maketicket.app or use our contact form. We\'re here to help with your event ticketing needs.',
    keywords: [
        'contact maketicket',
        'ticketing support',
        'event help',
        'customer service'
    ],
    openGraph: {
        title: 'Contact MakeTicket - We\'re Here to Help',
        description: 'Have questions about event ticketing? Contact our team for support.',
        url: 'https://maketicket.app/contact',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/contact',
    },
};

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
