import StaticPageLayout from '@/components/StaticPageLayout';
import { Shield, Eye, Lock, Download, Mail, Cookie, Users, Server, Globe, Database, Trash2, Bell, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

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
    return (
        <StaticPageLayout
            title="Privacy Policy"
            subtitle="Your privacy matters. Here's how we protect it."
        >
            <div className="max-w-4xl">
                {/* Last Updated Banner */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-8">
                    <Shield className="w-5 h-5 text-slate-600" />
                    <span className="text-slate-600">Last updated: December 29, 2025</span>
                </div>

                {/* Introduction */}
                <div className="prose prose-slate max-w-none mb-12">
                    <p className="text-lg text-slate-600 leading-relaxed">
                        MakeTicket (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our event ticketing platform at <Link href="https://maketicket.app" className="text-indigo-600 hover:underline">maketicket.app</Link>.
                    </p>
                </div>

                {/* Table of Contents */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 mb-12">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Contents</h2>
                    <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[
                            'Information We Collect',
                            'How We Use Your Information',
                            'Google API Services',
                            'Information Sharing',
                            'Data Security',
                            'Data Retention',
                            'Your Privacy Rights',
                            'Cookies & Tracking',
                            'Third-Party Services',
                            'Children\'s Privacy',
                            'International Transfers',
                            'Contact Us'
                        ].map((item, i) => (
                            <a key={i} href={`#section-${i + 1}`} className="text-indigo-600 hover:underline text-sm">
                                {i + 1}. {item}
                            </a>
                        ))}
                    </nav>
                </div>

                {/* Section 1: Information We Collect */}
                <section id="section-1" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">1. Information We Collect</h2>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-3">Information You Provide</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Account Information:</strong> Name, email address, password, profile picture</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Event Information:</strong> Event titles, descriptions, dates, locations, ticket types, pricing</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Attendee Information:</strong> Names, email addresses, registration responses, check-in data</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Payment Information:</strong> Billing address, payment method (processed by third-party payment processors)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Communications:</strong> Support requests, feedback, and correspondence with us</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-3">Information Collected Automatically</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Device Information:</strong> Browser type, operating system, device identifiers</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Log Data:</strong> IP address, access times, referring URLs, error logs</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                    <span><strong>Location Data:</strong> Approximate location based on IP address (country/city level)</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Section 2: How We Use Your Information */}
                <section id="section-2" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Server className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">2. How We Use Your Information</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { title: 'Service Delivery', desc: 'Provide, operate, and maintain our event ticketing platform' },
                            { title: 'Account Management', desc: 'Create and manage your user account, authenticate access' },
                            { title: 'Event Management', desc: 'Process registrations, generate tickets, manage check-ins' },
                            { title: 'Communications', desc: 'Send ticket confirmations, event reminders, and important updates' },
                            { title: 'Customer Support', desc: 'Respond to your inquiries and resolve issues' },
                            { title: 'Analytics', desc: 'Analyze usage patterns to improve our services' },
                            { title: 'Security', desc: 'Detect, prevent, and address fraud and security issues' },
                            { title: 'Legal Compliance', desc: 'Comply with legal obligations and enforce our terms' }
                        ].map((item, i) => (
                            <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                                <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                                <p className="text-sm text-slate-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 3: Google API Services - CRITICAL FOR OAUTH */}
                <section id="section-3" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">3. Google API Services</h2>
                    </div>
                    
                    <div className="p-6 rounded-2xl bg-red-50 border border-red-200 mb-6">
                        <p className="text-red-800 text-sm">
                            <strong>Important:</strong> MakeTicket&apos;s use and transfer of information received from Google APIs adheres to the{' '}
                            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="underline">
                                Google API Services User Data Policy
                            </a>, including the Limited Use requirements.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-3">Google Sign-In</h3>
                            <p className="text-slate-600 mb-3">When you sign in with Google, we access:</p>
                            <ul className="space-y-2 text-slate-600 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                                    <span><strong>Email address:</strong> To create and identify your account</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                                    <span><strong>Profile information:</strong> Name and profile picture for your account</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-3">Google Forms Integration</h3>
                            <p className="text-slate-600 mb-3">If you connect Google Forms, we access:</p>
                            <ul className="space-y-2 text-slate-600 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                                    <span><strong>Form structure:</strong> Questions and fields to map registration data</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                                    <span><strong>Form responses:</strong> Attendee responses to import registrations and generate tickets</span>
                                </li>
                            </ul>
                            <p className="text-slate-500 text-xs mt-3">We only read form data. We never modify, delete, or share your Google Forms.</p>
                        </div>

                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-3">Gmail Integration</h3>
                            <p className="text-slate-600 mb-3">If you authorize Gmail sending, we use it to:</p>
                            <ul className="space-y-2 text-slate-600 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                                    <span><strong>Send ticket emails:</strong> Deliver tickets to attendees from your email address</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                                    <span><strong>Send event updates:</strong> Reminders and notifications on your behalf</span>
                                </li>
                            </ul>
                            <p className="text-slate-500 text-xs mt-3">We only send emails you explicitly authorize. We never read your inbox or access other emails.</p>
                        </div>

                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-3">Google Drive / Sheets Integration</h3>
                            <p className="text-slate-600 mb-3">If you connect Google Drive, we access:</p>
                            <ul className="space-y-2 text-slate-600 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                                    <span><strong>Selected spreadsheets:</strong> Only files you explicitly select to import attendee lists</span>
                                </li>
                            </ul>
                            <p className="text-slate-500 text-xs mt-3">We only read data from files you select. We never browse, modify, or access other files in your Drive.</p>
                        </div>

                        <div className="p-5 rounded-xl border border-amber-200 bg-amber-50">
                            <h3 className="font-semibold text-amber-900 mb-3">Revoking Google Access</h3>
                            <p className="text-amber-800 text-sm">
                                You can revoke MakeTicket&apos;s access to your Google account at any time by visiting{' '}
                                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline">
                                    Google Account Permissions
                                </a>. This will disconnect the integration but will not delete data already imported.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section 4: Information Sharing */}
                <section id="section-4" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">4. Information Sharing</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <p className="text-slate-600">We do not sell your personal information. We may share information in these circumstances:</p>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { title: 'With Event Organizers', desc: 'Attendee information is shared with the event organizer for the events you register for.' },
                                { title: 'With Service Providers', desc: 'Trusted third parties who assist in operating our platform (hosting, email delivery, analytics) under strict confidentiality agreements.' },
                                { title: 'With Your Consent', desc: 'When you explicitly authorize sharing with third-party integrations.' },
                                { title: 'For Legal Reasons', desc: 'When required by law, legal process, or to protect rights, safety, and property.' },
                                { title: 'Business Transfers', desc: 'In connection with a merger, acquisition, or sale of assets, with notice to you.' }
                            ].map((item, i) => (
                                <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                                    <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                                    <p className="text-sm text-slate-600">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Section 5: Data Security */}
                <section id="section-5" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">5. Data Security</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { title: 'Encryption in Transit', desc: 'All data transmitted using TLS 1.3 encryption' },
                            { title: 'Encryption at Rest', desc: 'Data encrypted using AES-256 encryption' },
                            { title: 'Access Controls', desc: 'Strict role-based access with multi-factor authentication' },
                            { title: 'Regular Audits', desc: 'Continuous security monitoring and vulnerability testing' },
                            { title: 'Secure Infrastructure', desc: 'Hosted on enterprise-grade cloud infrastructure' },
                            { title: 'Incident Response', desc: 'Documented procedures for security incident handling' }
                        ].map((item, i) => (
                            <div key={i} className="p-4 rounded-xl border border-green-200 bg-green-50">
                                <h3 className="font-semibold text-green-900 mb-1">{item.title}</h3>
                                <p className="text-sm text-green-700">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 6: Data Retention */}
                <section id="section-6" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                            <Database className="w-5 h-5 text-orange-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">6. Data Retention</h2>
                    </div>
                    
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <ul className="space-y-3 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                                <span><strong>Account data:</strong> Retained while your account is active, deleted within 30 days of account deletion request</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                                <span><strong>Event data:</strong> Retained for 2 years after event completion for organizer access</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                                <span><strong>Transaction records:</strong> Retained for 7 years as required for tax and legal compliance</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 shrink-0" />
                                <span><strong>Log data:</strong> Automatically deleted after 90 days</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Section 7: Your Privacy Rights */}
                <section id="section-7" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">7. Your Privacy Rights</h2>
                    </div>
                    
                    <p className="text-slate-600 mb-6">Depending on your location, you may have the following rights:</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[
                            { icon: Eye, title: 'Access', desc: 'Request a copy of your personal data' },
                            { icon: Shield, title: 'Correction', desc: 'Update or correct inaccurate data' },
                            { icon: Download, title: 'Portability', desc: 'Export your data in a portable format' },
                            { icon: Trash2, title: 'Deletion', desc: 'Request deletion of your data' },
                            { icon: Bell, title: 'Opt-out', desc: 'Unsubscribe from marketing emails' },
                            { icon: Cookie, title: 'Cookies', desc: 'Manage cookie preferences' }
                        ].map((right, i) => {
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
                    
                    <p className="text-slate-600 mt-6 text-sm">
                        To exercise these rights, contact us at <a href="mailto:privacy@maketicket.app" className="text-indigo-600 hover:underline">privacy@maketicket.app</a>. We will respond within 30 days.
                    </p>
                </section>

                {/* Section 8: Cookies */}
                <section id="section-8" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Cookie className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">8. Cookies & Tracking</h2>
                    </div>
                    
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">We use cookies and similar technologies for:</p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span><strong>Essential cookies:</strong> Required for the platform to function (authentication, security)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span><strong>Analytics cookies:</strong> Help us understand how you use our service</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span><strong>Preference cookies:</strong> Remember your settings and preferences</span>
                            </li>
                        </ul>
                        <p className="text-slate-500 text-sm mt-4">
                            Manage your preferences on our <Link href="/cookies" className="text-indigo-600 hover:underline">Cookie Settings</Link> page.
                        </p>
                    </div>
                </section>

                {/* Section 9: Third-Party Services */}
                <section id="section-9" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                            <ExternalLink className="w-5 h-5 text-slate-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">9. Third-Party Services</h2>
                    </div>
                    
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">We use the following third-party services:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {[
                                { name: 'Google Cloud', purpose: 'Authentication, API integrations' },
                                { name: 'MongoDB Atlas', purpose: 'Database hosting' },
                                { name: 'Vercel', purpose: 'Website hosting' },
                                { name: 'Stripe/Razorpay', purpose: 'Payment processing' }
                            ].map((service, i) => (
                                <div key={i} className="flex justify-between p-3 rounded-lg bg-slate-50">
                                    <span className="font-medium text-slate-900">{service.name}</span>
                                    <span className="text-slate-500">{service.purpose}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-slate-500 text-sm mt-4">
                            Each service has its own privacy policy governing their data practices.
                        </p>
                    </div>
                </section>

                {/* Section 10: Children's Privacy */}
                <section id="section-10" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-pink-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">10. Children&apos;s Privacy</h2>
                    </div>
                    
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600">
                            MakeTicket is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately at <a href="mailto:privacy@maketicket.app" className="text-indigo-600 hover:underline">privacy@maketicket.app</a>.
                        </p>
                    </div>
                </section>

                {/* Section 11: International Transfers */}
                <section id="section-11" className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-cyan-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">11. International Data Transfers</h2>
                    </div>
                    
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600">
                            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place, including standard contractual clauses and compliance with applicable data protection laws.
                        </p>
                    </div>
                </section>

                {/* Section 12: Contact Us */}
                <section id="section-12" className="mb-12">
                    <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                                <Mail className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">12. Contact Us</h3>
                                <p className="text-slate-600 mb-4">
                                    If you have questions about this Privacy Policy or our data practices:
                                </p>
                                <div className="space-y-2 text-slate-600">
                                    <p><strong>Email:</strong> <a href="mailto:privacy@maketicket.app" className="text-indigo-600 hover:underline">privacy@maketicket.app</a></p>
                                    <p><strong>Website:</strong> <a href="https://maketicket.app" className="text-indigo-600 hover:underline">https://maketicket.app</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Changes Notice */}
                <div className="p-6 rounded-2xl bg-slate-900 text-white">
                    <h3 className="font-semibold mb-3">Changes to This Policy</h3>
                    <p className="text-slate-300 text-sm">
                        We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. We encourage you to review this page periodically.
                    </p>
                </div>
            </div>
        </StaticPageLayout>
    );
}
