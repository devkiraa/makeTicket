import StaticPageLayout from '@/components/StaticPageLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Integrations - Connect Your Tools | MakeTicket',
    description: 'Connect MakeTicket with Google Calendar, Zapier, Stripe, Slack, Mailchimp, and more. Automate your event workflow with powerful integrations.',
    keywords: [
        'ticketing integrations',
        'event zapier',
        'ticket stripe integration',
        'google calendar events',
        'event automation',
        'ticket software integrations'
    ],
    openGraph: {
        title: 'MakeTicket Integrations - Connect Your Tools',
        description: 'Integrate with Google Calendar, Zapier, Stripe, Slack, and more.',
        url: 'https://maketicket.app/integrations',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/integrations',
    },
};

export default function IntegrationsPage() {
    const integrations = [
        { name: 'Google Calendar', description: 'Sync events automatically', category: 'Productivity', status: 'Available' },
        { name: 'Zapier', description: 'Connect to 5000+ apps', category: 'Automation', status: 'Available' },
        { name: 'Stripe', description: 'Accept payments globally', category: 'Payments', status: 'Coming Soon' },
        { name: 'Razorpay', description: 'Indian payment gateway', category: 'Payments', status: 'Coming Soon' },
        { name: 'Slack', description: 'Get notifications in Slack', category: 'Communication', status: 'Available' },
        { name: 'Discord', description: 'Community notifications', category: 'Communication', status: 'Coming Soon' },
        { name: 'Mailchimp', description: 'Sync attendees to lists', category: 'Marketing', status: 'Available' },
        { name: 'Google Sheets', description: 'Export data automatically', category: 'Productivity', status: 'Available' },
    ];

    return (
        <StaticPageLayout
            title="Integrations"
            subtitle="Connect MakeTicket with the tools you already use."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {integrations.map((integration, i) => (
                    <div key={i} className="p-6 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 mb-4">
                            {integration.name[0]}
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1">{integration.name}</h3>
                        <p className="text-sm text-slate-500 mb-3">{integration.description}</p>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${integration.status === 'Available'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                            {integration.status}
                        </span>
                    </div>
                ))}
            </div>
        </StaticPageLayout>
    );
}
