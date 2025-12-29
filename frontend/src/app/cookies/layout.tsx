import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cookie Policy | MakeTicket',
    description: 'MakeTicket cookie policy. Learn about the cookies we use and manage your preferences.',
    alternates: {
        canonical: 'https://maketicket.app/cookies',
    },
};

export default function CookiesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
