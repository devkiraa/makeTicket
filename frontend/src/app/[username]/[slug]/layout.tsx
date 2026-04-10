import { Metadata } from 'next';
import { ReactNode } from 'react';

async function getEventData(username: string, slug: string) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${apiUrl}/events/${username}/${slug}`, {
        next: { revalidate: 3600 }
    });
    if (!res.ok) return null;
    return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ username: string, slug: string }> }): Promise<Metadata> {
    const { username, slug } = await params;
    const event = await getEventData(username, slug);

    if (!event) {
        return {
            title: 'Event Not Found | MakeTicket',
            description: 'The requested event could not be found.'
        };
    }

    const title = `${event.title} | Hosted by ${event.host?.name || username}`;
    const description = event.description || `Register for ${event.title} on MakeTicket. Date: ${event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}. Location: ${event.location || 'Online'}.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'website',
            images: [event.formHeaderImage || '/icon.png'],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [event.formHeaderImage || '/icon.png'],
        }
    };
}

export default async function EventLayout({ children, params }: { children: ReactNode, params: Promise<{ username: string, slug: string }> }) {
    const { username, slug } = await params;
    const event = await getEventData(username, slug);

    if (!event) return <>{children}</>;

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Event',
        'name': event.title,
        'description': event.description,
        'startDate': event.eventStartTime || event.date,
        'endDate': event.eventEndTime || event.date,
        'eventStatus': event.status === 'active' ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventCancelled',
        'eventAttendanceMode': event.location?.toLowerCase().includes('online') ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
        'location': event.location?.toLowerCase().includes('online') ? {
            '@type': 'VirtualLocation',
            'url': `https://maketicket.app/${username}/${slug}`
        } : {
            '@type': 'Place',
            'name': event.location || 'TBA',
            'address': {
                '@type': 'PostalAddress',
                'streetAddress': event.location || '',
                'addressLocality': '',
                'addressRegion': '',
                'postalCode': '',
                'addressCountry': 'IN'
            }
        },
        'image': [event.formHeaderImage || 'https://maketicket.app/icon.png'],
        'organizer': {
            '@type': 'Person',
            'name': event.host?.name || username,
            'url': `https://maketicket.app/${username}`
        },
        'offers': {
            '@type': 'Offer',
            'url': `https://maketicket.app/${username}/${slug}`,
            'price': event.price || 0,
            'priceCurrency': 'INR',
            'availability': 'https://schema.org/InStock',
            'validFrom': event.createdAt
        }
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {children}
        </>
    );
}
