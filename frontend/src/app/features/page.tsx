import StaticPageLayout from '@/components/StaticPageLayout';
import { Ticket, QrCode, Mail, BarChart3, Users, Globe, Zap, Shield, Smartphone, Clock } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Features - Event Ticketing Software | MakeTicket',
    description: 'Discover all MakeTicket features: QR code tickets, instant check-in scanning, automated emails, real-time analytics, team collaboration, and custom event pages. Start free.',
    keywords: [
        'event ticketing features',
        'QR code tickets',
        'event check-in system',
        'ticket scanning app',
        'event management software',
        'online ticketing features',
        'event registration features',
        'ticket generator features'
    ],
    openGraph: {
        title: 'MakeTicket Features - Complete Event Ticketing Solution',
        description: 'QR tickets, instant scanning, automated emails, analytics, and more. Everything you need to run successful events.',
        url: 'https://maketicket.app/features',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/features',
    },
};

export default function FeaturesPage() {
    const features = [
        {
            icon: Ticket,
            title: 'Smart Ticketing',
            description: 'Generate unique QR codes for each attendee with built-in fraud protection. Each ticket is encrypted and tamper-proof.',
            color: 'indigo'
        },
        {
            icon: QrCode,
            title: 'Instant Check-in',
            description: 'Scan tickets in under a second with our mobile-optimized scanner. Works offline too!',
            color: 'green'
        },
        {
            icon: Mail,
            title: 'Automated Emails',
            description: 'Customizable email templates with your branding. Send confirmations, reminders, and updates automatically.',
            color: 'blue'
        },
        {
            icon: BarChart3,
            title: 'Real-time Analytics',
            description: 'Track registrations, check-ins, revenue, and attendee demographics with beautiful dashboards.',
            color: 'purple'
        },
        {
            icon: Users,
            title: 'Team Collaboration',
            description: 'Add coordinators with custom permissions. Control who can scan, who can edit, and who can view.',
            color: 'amber'
        },
        {
            icon: Globe,
            title: 'Custom Event Pages',
            description: 'Beautiful, branded registration pages that convert. No coding required.',
            color: 'rose'
        },
        {
            icon: Zap,
            title: 'Instant Setup',
            description: 'Go from zero to live event in under 5 minutes. Our intuitive builder makes it effortless.',
            color: 'yellow'
        },
        {
            icon: Shield,
            title: 'Secure & Reliable',
            description: '99.9% uptime guarantee. Your data is encrypted and backed up automatically.',
            color: 'emerald'
        },
        {
            icon: Smartphone,
            title: 'Mobile First',
            description: 'Everything works beautifully on any device. Attendees can register, view tickets, and check-in from their phones.',
            color: 'cyan'
        },
        {
            icon: Clock,
            title: '24/7 Support',
            description: 'Our team is here to help whenever you need us. Chat, email, or call.',
            color: 'slate'
        }
    ];

    const colorClasses: Record<string, string> = {
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        green: 'bg-green-50 text-green-600 border-green-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
        slate: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    return (
        <StaticPageLayout
            title="Features"
            subtitle="Everything you need to run successful events, from registration to check-in."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                        <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow">
                            <div className={`w-12 h-12 rounded-xl ${colorClasses[feature.color]} border flex items-center justify-center mb-4`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                            <p className="text-slate-600">{feature.description}</p>
                        </div>
                    );
                })}
            </div>
        </StaticPageLayout>
    );
}
