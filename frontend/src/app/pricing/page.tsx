'use client';

import StaticPageLayout from '@/components/StaticPageLayout';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function PricingPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Check if user is logged in
        const token = localStorage.getItem('auth_token');
        setIsLoggedIn(!!token);
    }, []);

    const plans = [
        {
            id: 'free',
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
            id: 'pro',
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
            ctaLoggedIn: 'Upgrade Now',
            popular: true
        },
        {
            id: 'enterprise',
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

    const getButtonLink = (plan: typeof plans[0]) => {
        if (plan.id === 'enterprise') {
            return '/contact?subject=Enterprise%20Plan';
        }
        if (isLoggedIn) {
            return '/dashboard/billing';
        }
        return '/register';
    };

    const getButtonText = (plan: typeof plans[0]) => {
        if (isLoggedIn && plan.id === 'pro') {
            return plan.ctaLoggedIn || plan.cta;
        }
        return plan.cta;
    };

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
                        <Link href={getButtonLink(plan)}>
                            <Button className={`w-full rounded-full mb-6 ${plan.popular
                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                : 'bg-slate-900 hover:bg-slate-800'
                                }`}>
                                {getButtonText(plan)}
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

            {/* Trust badges */}
            <div className="mt-16 text-center">
                <p className="text-sm text-slate-500 mb-4">Secure payments powered by</p>
                <div className="flex items-center justify-center gap-8">
                    <div className="flex items-center gap-2 text-slate-600">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        <span className="text-sm font-medium">PCI-DSS Compliant</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                        <span className="text-sm font-medium">256-bit SSL</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                        <img src="https://cdn.razorpay.com/static/assets/logo/payment.svg" alt="Razorpay" className="h-6" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        <span className="text-sm font-medium">Razorpay</span>
                    </div>
                </div>
            </div>
        </StaticPageLayout>
    );
}
