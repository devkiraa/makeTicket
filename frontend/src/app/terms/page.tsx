import StaticPageLayout from '@/components/StaticPageLayout';
import { FileText, User, AlertTriangle, CreditCard, Scale, Shield, RefreshCw, Mail } from 'lucide-react';

export default function TermsPage() {
    const sections = [
        {
            icon: FileText,
            number: '01',
            title: 'Acceptance of Terms',
            content: 'By accessing or using MakeTicket, you agree to be bound by these Terms of Service. If you do not agree to all the terms, you may not use our services.'
        },
        {
            icon: User,
            number: '02',
            title: 'User Accounts',
            list: [
                'You must provide accurate and complete information when creating an account',
                'You are responsible for maintaining the security of your account',
                'You must notify us immediately of any unauthorized use',
                'You must be at least 18 years old to use our services'
            ]
        },
        {
            icon: AlertTriangle,
            number: '03',
            title: 'Acceptable Use',
            content: 'You agree not to use the service for illegal purposes, violate applicable laws, infringe on rights of others, transmit harmful code, or attempt unauthorized access to our systems.'
        },
        {
            icon: Shield,
            number: '04',
            title: 'Event Content',
            content: 'You are solely responsible for the content of your events. You must not create events that are illegal, harmful, threatening, abusive, or otherwise objectionable.'
        },
        {
            icon: CreditCard,
            number: '05',
            title: 'Payments and Fees',
            list: [
                'Free tier is available with usage limits',
                'Paid plans are billed monthly or annually',
                'Transaction fees may apply for paid events',
                'Refund policies are set by event organizers'
            ]
        },
        {
            icon: Scale,
            number: '06',
            title: 'Limitation of Liability',
            content: 'MakeTicket is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.'
        },
        {
            icon: RefreshCw,
            number: '07',
            title: 'Termination',
            content: 'We may terminate or suspend your account at any time for violations of these terms. You may cancel your account at any time from your account settings.'
        }
    ];

    return (
        <StaticPageLayout
            title="Terms of Service"
            subtitle="Please read these terms carefully before using MakeTicket."
        >
            <div className="max-w-4xl">
                {/* Last Updated Banner */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-12">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <span className="text-amber-800">Last updated: December 23, 2025</span>
                </div>

                {/* Quick Summary */}
                <div className="p-6 rounded-2xl bg-slate-900 text-white mb-12">
                    <h2 className="text-lg font-semibold mb-3">Quick Summary</h2>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        In plain English: Use MakeTicket responsibly, don't do anything illegal or harmful,
                        keep your account secure, and we'll provide you with a great event management platform.
                        For the full legal details, read below.
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-8 mb-16">
                    {sections.map((section, i) => {
                        const Icon = section.icon;
                        return (
                            <div key={i} className="flex gap-6 p-6 rounded-2xl border border-slate-200 bg-white hover:shadow-md transition-shadow">
                                <div className="shrink-0">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">
                                        {section.number}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icon className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-xl font-bold text-slate-900">{section.title}</h3>
                                    </div>
                                    {section.content && (
                                        <p className="text-slate-600">{section.content}</p>
                                    )}
                                    {section.list && (
                                        <ul className="space-y-2">
                                            {section.list.map((item, j) => (
                                                <li key={j} className="flex items-start gap-2 text-slate-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Changes Notice */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 mb-12">
                    <div className="flex items-center gap-3 mb-3">
                        <RefreshCw className="w-5 h-5 text-slate-600" />
                        <h3 className="font-semibold text-slate-900">Changes to Terms</h3>
                    </div>
                    <p className="text-slate-600">
                        We may update these terms from time to time. We'll notify you of significant changes via email.
                        Continued use of the service after changes constitutes acceptance of the new terms.
                    </p>
                </div>

                {/* Contact Section */}
                <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Questions about these terms?</h3>
                            <p className="text-slate-600 mb-4">
                                Our legal team is happy to clarify anything that's unclear.
                            </p>
                            <a href="mailto:legal@maketicket.app" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline">
                                legal@maketicket.app
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </StaticPageLayout>
    );
}
