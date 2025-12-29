import StaticPageLayout from '@/components/StaticPageLayout';
import { Book, FileText, Video, Code } from 'lucide-react';
import Link from 'next/link';

export default function DocsPage() {
    const sections = [
        {
            icon: Book,
            title: 'Getting Started',
            description: 'Learn the basics of MakeTicket in 5 minutes.',
            links: ['Create Your First Event', 'Setting Up Check-in', 'Inviting Team Members']
        },
        {
            icon: FileText,
            title: 'Guides',
            description: 'In-depth tutorials for common use cases.',
            links: ['Email Template Customization', 'Advanced Analytics', 'Integrations Setup']
        },
        {
            icon: Video,
            title: 'Video Tutorials',
            description: 'Watch and learn at your own pace.',
            links: ['Platform Overview', 'Mobile Scanner App', 'Dashboard Walkthrough']
        },
        {
            icon: Code,
            title: 'API Reference',
            description: 'Build custom integrations with our API.',
            links: ['Authentication', 'Events API', 'Tickets API']
        }
    ];

    return (
        <StaticPageLayout
            title="Documentation"
            subtitle="Everything you need to know about using MakeTicket."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                {sections.map((section, i) => {
                    const Icon = section.icon;
                    return (
                        <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-white">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-4">
                                <Icon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">{section.title}</h3>
                            <p className="text-slate-600 mb-4">{section.description}</p>
                            <ul className="space-y-2">
                                {section.links.map((link, j) => (
                                    <li key={j}>
                                        <Link href="#" className="text-indigo-600 hover:underline text-sm">
                                            {link} →
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>
        </StaticPageLayout>
    );
}
