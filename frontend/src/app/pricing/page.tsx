import StaticPageLayout from '@/components/StaticPageLayout';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Pricing - Free Event Ticketing | MakeTicket',
    description: 'MakeTicket pricing plans: Free tier for small events, Pro for growing organizers, Enterprise for large organizations. Start creating tickets for free today.',
    keywords: [
        'free event ticketing',
        'ticketing pricing',
        'event software pricing',
        'free ticket generator',
        'event management cost',
        'affordable ticketing',
        'ticket platform pricing'
    ],
    openGraph: {
        title: 'MakeTicket Pricing - Start Free, Scale as You Grow',
        description: 'Free tier for small events. Pro features for growing organizers. Enterprise solutions for large organizations.',
        url: 'https://maketicket.app/pricing',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/pricing',
    },
};

export default function PricingPage() {
    const plans = [
        {
            name: 'Free',
            price: '₹0',
            period: 'forever',
            description: 'Perfect for small events and getting started.',
            features: [
                'Up to 100 attendees per event',
                'Unlimited events',
                'QR code tickets',
                'Email confirmations',
                'Basic analytics',
                'Community support'
            ],
            cta: 'Get Started',
            popular: false
        },
        {
            name: 'Pro',
            price: '₹999',
            period: '/month',
            description: 'For growing organizers who need more power.',
            features: [
                'Up to 1,000 attendees per event',
                'Custom branding',
                'Priority email delivery',
                'Advanced analytics',
                'Team members (up to 5)',
                'Email support',
                'Custom email templates',
                'Export attendee data'
            ],
            cta: 'Start Free Trial',
            popular: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'For large organizations with complex needs.',
            features: [
                'Unlimited attendees',
                'White-label solution',
                'API access',
                'Dedicated support',
                'Custom integrations',
                'SLA guarantee',
                'On-premise option',
                'Training & onboarding'
            ],
            cta: 'Contact Sales',
            popular: false
        }
    ];

    return (
        <StaticPageLayout
            title="Pricing"
            subtitle="Simple, transparent pricing. No hidden fees."
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {plans.map((plan, i) => (
                    <div
                        key={i}
                        className={`rounded-2xl border p-8 ${plan.popular
                            ? 'border-indigo-200 bg-indigo-50/50 ring-2 ring-indigo-600 relative'
                            : 'border-slate-200 bg-white'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                Most Popular
                            </div>
                        )}
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                            <span className="text-slate-500">{plan.period}</span>
                        </div>
                        <p className="text-slate-600 mb-6">{plan.description}</p>
                        <Link href="/login">
                            <Button className={`w-full rounded-full mb-6 ${plan.popular
                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                : 'bg-slate-900 hover:bg-slate-800'
                                }`}>
                                {plan.cta}
                            </Button>
                        </Link>
                        <ul className="space-y-3">
                            {plan.features.map((feature, j) => (
                                <li key={j} className="flex items-start gap-3 text-sm text-slate-600">
                                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </StaticPageLayout>
    );
}
