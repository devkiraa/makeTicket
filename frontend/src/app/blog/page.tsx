import StaticPageLayout from '@/components/StaticPageLayout';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Blog - Event Ticketing Tips & Guides | MakeTicket',
    description: 'Event ticketing tips, best practices, and industry insights. Learn how to create better events, boost attendance, and streamline check-in.',
    keywords: [
        'event ticketing blog',
        'event management tips',
        'ticket creating guide',
        'event planning blog',
        'QR code tickets guide',
        'event industry news'
    ],
    openGraph: {
        title: 'MakeTicket Blog - Event Ticketing Insights',
        description: 'Tips, guides, and best practices for event organizers.',
        url: 'https://maketicket.app/blog',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/blog',
    },
};

export default function BlogPage() {
    const posts = [
        {
            title: 'Best Event Ticketing Platforms in 2026 — MakeTicket vs Eventbrite vs Zoho',
            excerpt: 'A comprehensive comparison of the top event ticketing platforms. Compare features, pricing, and find the best fit for your next event.',
            date: 'Apr 10, 2026',
            category: 'Comparison',
            readTime: '8 min read',
            href: '/blog/best-event-ticketing-platforms',
        },
        {
            title: 'How to Make Tickets for an Event (Free) — Step-by-Step',
            excerpt: 'Everything you need to know about creating professional event tickets for free, from setup to check-in scanning.',
            date: 'Mar 15, 2026',
            category: 'Guides',
            readTime: '7 min read',
            href: '/blog/how-to-make-tickets-for-an-event',
        },
        {
            title: 'How to Create QR Code Event Tickets (Step-by-Step)',
            excerpt: 'QR code tickets are faster, safer, and free. Learn how to generate them for your event in minutes.',
            date: 'Mar 15, 2026',
            category: 'How-To',
            readTime: '5 min read',
            href: '/blog/how-to-create-qr-code-event-tickets',
        },
        {
            title: '10 Tips for Running a Successful Virtual Event',
            excerpt: 'Virtual events are here to stay. Learn how to make yours stand out with these proven strategies.',
            date: 'Dec 20, 2025',
            category: 'Tips & Tricks',
            readTime: '5 min read',
            href: '#',
        },
        {
            title: 'Why QR Code Check-in is the Future',
            excerpt: 'Paper lists are so 2010. Discover why smart event organizers are switching to QR-based check-ins.',
            date: 'Dec 15, 2025',
            category: 'Technology',
            readTime: '4 min read',
            href: '#',
        },
    ];

    return (
        <StaticPageLayout
            title="Blog"
            subtitle="Insights, guides, and updates from the MakeTicket team."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                {posts.map((post, i) => (
                    <Link href={post.href} key={i} className="group">
                        <article className="p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-lg transition-shadow h-full">
                            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                                    {post.category}
                                </span>
                                <span>·</span>
                                <span>{post.readTime}</span>
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                {post.title}
                            </h2>
                            <p className="text-slate-600 mb-4">{post.excerpt}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Calendar className="w-4 h-4" />
                                {post.date}
                            </div>
                        </article>
                    </Link>
                ))}
            </div>
        </StaticPageLayout>
    );
}
