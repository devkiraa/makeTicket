import StaticPageLayout from '@/components/StaticPageLayout';
import { Shield, Eye, Lock, Download, Mail, Cookie, Users, Server } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Privacy Policy | MakeTicket',
    description: 'MakeTicket privacy policy. Learn how we collect, use, and protect your data. Your privacy is important to us.',
    alternates: {
        canonical: 'https://maketicket.app/privacy',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function PrivacyPage() {
    const sections = [
        {
            icon: Eye,
            title: 'Information We Collect',
            color: 'indigo',
            items: [
                { label: 'Account Information', desc: 'Name, email address, password' },
                { label: 'Event Information', desc: 'Event details, attendee lists, check-in data' },
                { label: 'Payment Information', desc: 'Processed securely by our payment partners' },
                { label: 'Usage Data', desc: 'How you interact with our services' }
            ]
        },
        {
            icon: Server,
            title: 'How We Use Your Information',
            color: 'blue',
            items: [
                { label: 'Service Delivery', desc: 'Provide, maintain, and improve our services' },
                { label: 'Transactions', desc: 'Process transactions and send related information' },
                { label: 'Communication', desc: 'Send you technical notices and support messages' },
                { label: 'Analytics', desc: 'Analyze usage patterns to improve user experience' }
            ]
        },
        {
            icon: Users,
            title: 'Information Sharing',
            color: 'purple',
            items: [
                { label: 'Service Providers', desc: 'Who assist in our operations' },
                { label: 'Event Organizers', desc: 'For attendee information management' },
                { label: 'Legal Requirements', desc: 'When required by law' },
                { label: 'No Data Selling', desc: 'We never sell your personal information' }
            ]
        },
        {
            icon: Lock,
            title: 'Data Security',
            color: 'green',
            items: [
                { label: 'Encryption', desc: 'All data encrypted in transit (TLS) and at rest (AES-256)' },
                { label: 'Access Control', desc: 'Strict employee access policies' },
                { label: 'Regular Audits', desc: 'Continuous security monitoring and testing' },
                { label: 'Backups', desc: 'Automated daily backups with geo-redundancy' }
            ]
        }
    ];

    const rights = [
        { icon: Eye, title: 'Access', desc: 'Request a copy of your personal data' },
        { icon: Shield, title: 'Correct', desc: 'Update or correct inaccurate data' },
        { icon: Download, title: 'Export', desc: 'Download your data in a portable format' },
        { icon: Lock, title: 'Delete', desc: 'Request deletion of your data' },
        { icon: Mail, title: 'Opt-out', desc: 'Unsubscribe from marketing communications' },
        { icon: Cookie, title: 'Cookies', desc: 'Manage your cookie preferences' }
    ];

    const colorClasses: Record<string, string> = {
        indigo: 'bg-indigo-100 text-indigo-600',
        blue: 'bg-blue-100 text-blue-600',
        purple: 'bg-purple-100 text-purple-600',
        green: 'bg-green-100 text-green-600'
    };

    return (
        <StaticPageLayout
            title="Privacy Policy"
            subtitle="Your privacy matters. Here's how we protect it."
        >
            <div className="max-w-4xl">
                {/* Last Updated Banner */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-12">
                    <Shield className="w-5 h-5 text-slate-600" />
                    <span className="text-slate-600">Last updated: December 23, 2025</span>
                </div>

                {/* Main Sections */}
                <div className="space-y-12 mb-16">
                    {sections.map((section, i) => {
                        const Icon = section.icon;
                        return (
                            <div key={i}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`w-10 h-10 rounded-xl ${colorClasses[section.color]} flex items-center justify-center`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900">{section.title}</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {section.items.map((item, j) => (
                                        <div key={j} className="p-4 rounded-xl border border-slate-200 bg-white">
                                            <h3 className="font-semibold text-slate-900 mb-1">{item.label}</h3>
                                            <p className="text-sm text-slate-600">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Your Rights Section */}
                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Your Rights</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {rights.map((right, i) => {
                            const Icon = right.icon;
                            return (
                                <div key={i} className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 text-center">
                                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
                                        <Icon className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-1">{right.title}</h3>
                                    <p className="text-xs text-slate-500">{right.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Contact Section */}
                <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Questions about your privacy?</h3>
                            <p className="text-slate-600 mb-4">
                                If you have any questions about this Privacy Policy or how we handle your data,
                                we're here to help.
                            </p>
                            <a href="mailto:privacy@maketicket.app" className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:underline">
                                privacy@maketicket.app
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </StaticPageLayout>
    );
}
