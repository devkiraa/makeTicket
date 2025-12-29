import StaticPageLayout from '@/components/StaticPageLayout';
import { Users, MessageSquare, Calendar, Github } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Community - Event Organizers | MakeTicket',
    description: 'Join the MakeTicket community of event organizers. Discord, GitHub, events, and resources for event professionals.',
    alternates: {
        canonical: 'https://maketicket.app/community',
    },
};

export default function CommunityPage() {
    const resources = [
        {
            icon: MessageSquare,
            title: 'Discord Server',
            description: 'Join 2,000+ event organizers sharing tips and tricks.',
            action: 'Join Discord',
            color: 'indigo'
        },
        {
            icon: Github,
            title: 'GitHub Discussions',
            description: 'Feature requests, bug reports, and open-source contributions.',
            action: 'View on GitHub',
            color: 'slate'
        },
        {
            icon: Calendar,
            title: 'Community Events',
            description: 'Monthly webinars, workshops, and meetups.',
            action: 'See Events',
            color: 'green'
        },
        {
            icon: Users,
            title: 'Ambassador Program',
            description: 'Become a MakeTicket ambassador and earn rewards.',
            action: 'Apply Now',
            color: 'purple'
        }
    ];

    const colorClasses: Record<string, string> = {
        indigo: 'bg-indigo-100 text-indigo-600',
        slate: 'bg-slate-100 text-slate-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600'
    };

    return (
        <StaticPageLayout
            title="Community"
            subtitle="Connect with fellow event organizers."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
                {resources.map((resource, i) => {
                    const Icon = resource.icon;
                    return (
                        <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-white flex flex-col">
                            <div className={`w-12 h-12 rounded-xl ${colorClasses[resource.color]} flex items-center justify-center mb-4`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">{resource.title}</h3>
                            <p className="text-slate-600 mb-4 flex-1">{resource.description}</p>
                            <Button variant="outline" className="rounded-full w-fit">
                                {resource.action}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </StaticPageLayout>
    );
}
