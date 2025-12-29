import StaticPageLayout from '@/components/StaticPageLayout';
import { Target, Heart, Zap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'About Us - MakeTicket | Event Ticketing Platform',
    description: 'Learn about MakeTicket, the modern event ticketing platform. Our mission is to make event management delightful and accessible to everyone.',
    keywords: [
        'about maketicket',
        'event ticketing company',
        'ticketing platform story',
        'event management team'
    ],
    openGraph: {
        title: 'About MakeTicket - Our Mission & Team',
        description: 'We\'re on a mission to make event management delightful. Learn about our story and team.',
        url: 'https://maketicket.app/about',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/about',
    },
};

export default function AboutPage() {
    const team = [
        { name: 'Alex Chen', role: 'Founder & CEO', avatar: 'AC' },
        { name: 'Priya Sharma', role: 'Head of Product', avatar: 'PS' },
        { name: 'Marcus Johnson', role: 'Lead Engineer', avatar: 'MJ' },
        { name: 'Sarah Williams', role: 'Head of Design', avatar: 'SW' },
    ];

    return (
        <StaticPageLayout
            title="About Us"
            subtitle="We're on a mission to make event management delightful."
        >
            <div className="max-w-4xl">
                <div className="prose prose-slate prose-lg mb-16">
                    <p>
                        MakeTicket was born out of frustration. As event organizers ourselves, we were tired of clunky,
                        expensive ticketing platforms that felt like they were built in the 90s. So we decided to build
                        something better.
                    </p>
                    <p>
                        Today, MakeTicket powers thousands of events worldwide, from college fests to corporate conferences,
                        from weddings to workshops. Our mission is simple: make event management so easy that anyone can do it.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                            <Target className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-2">Our Mission</h3>
                        <p className="text-slate-600">Make event management accessible to everyone, everywhere.</p>
                    </div>
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
                            <Heart className="w-8 h-8 text-rose-600" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-2">Our Values</h3>
                        <p className="text-slate-600">Simplicity, reliability, and delightful user experiences.</p>
                    </div>
                    <div className="text-center p-6">
                        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                            <Zap className="w-8 h-8 text-amber-600" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-2">Our Promise</h3>
                        <p className="text-slate-600">Your events deserve the best. We'll keep building until you have it.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-8">Our Team</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {team.map((member, i) => (
                        <div key={i} className="text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                                {member.avatar}
                            </div>
                            <h3 className="font-semibold text-slate-900">{member.name}</h3>
                            <p className="text-sm text-slate-500">{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>
        </StaticPageLayout>
    );
}
