import StaticPageLayout from '@/components/StaticPageLayout';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

export default function BlogPage() {
    const posts = [
        {
            title: '10 Tips for Running a Successful Virtual Event',
            excerpt: 'Virtual events are here to stay. Learn how to make yours stand out with these proven strategies.',
            date: 'Dec 20, 2025',
            category: 'Tips & Tricks',
            readTime: '5 min read'
        },
        {
            title: 'Why QR Code Check-in is the Future',
            excerpt: 'Paper lists are so 2010. Discover why smart event organizers are switching to QR-based check-ins.',
            date: 'Dec 15, 2025',
            category: 'Technology',
            readTime: '4 min read'
        },
        {
            title: 'How We Scaled to 100K Events',
            excerpt: 'A behind-the-scenes look at our infrastructure and the lessons we learned along the way.',
            date: 'Dec 10, 2025',
            category: 'Engineering',
            readTime: '8 min read'
        },
        {
            title: 'The Complete Guide to Event Email Marketing',
            excerpt: 'From confirmation emails to post-event surveys, learn how to communicate effectively with attendees.',
            date: 'Dec 5, 2025',
            category: 'Marketing',
            readTime: '6 min read'
        },
    ];

    return (
        <StaticPageLayout
            title="Blog"
            subtitle="Insights, guides, and updates from the MakeTicket team."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                {posts.map((post, i) => (
                    <Link href="#" key={i} className="group">
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
