import StaticPageLayout from '@/components/StaticPageLayout';
import { FileText, User, AlertTriangle, CreditCard, Scale, Shield, RefreshCw, Mail, Ban, Globe, Gavel, Clock, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Terms of Service | MakeTicket',
    description: 'MakeTicket terms of service. Read our terms and conditions for using the event ticketing platform.',
    alternates: {
        canonical: 'https://maketicket.app/terms',
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function TermsPage() {
    return (
        <StaticPageLayout
            title="Terms of Service"
            subtitle="Please read these terms carefully before using MakeTicket."
        >
            <div className="max-w-4xl">
                {/* Last Updated Banner */}
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-8">
                    <FileText className="w-5 h-5 text-amber-600" />
                    <span className="text-amber-800">Last updated: December 29, 2025</span>
                </div>

                {/* Quick Summary */}
                <div className="p-6 rounded-2xl bg-slate-900 text-white mb-12">
                    <h2 className="text-lg font-semibold mb-3">Quick Summary</h2>
                    <p className="text-slate-300 text-sm leading-relaxed">
                        In plain English: Use MakeTicket responsibly, don&apos;t do anything illegal or harmful,
                        keep your account secure, and we&apos;ll provide you with a great event management platform.
                        For the full legal details, read below.
                    </p>
                </div>

                {/* Table of Contents */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 mb-12">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Contents</h2>
                    <nav className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[
                            'Acceptance of Terms',
                            'Description of Service',
                            'User Accounts',
                            'User Responsibilities',
                            'Acceptable Use Policy',
                            'Event Content',
                            'Intellectual Property',
                            'Third-Party Integrations',
                            'Payments and Fees',
                            'Refund Policy',
                            'Privacy',
                            'Disclaimer of Warranties',
                            'Limitation of Liability',
                            'Indemnification',
                            'Termination',
                            'Governing Law',
                            'Changes to Terms',
                            'Contact Us'
                        ].map((item, i) => (
                            <a key={i} href={`#section-${i + 1}`} className="text-indigo-600 hover:underline text-sm">
                                {i + 1}. {item}
                            </a>
                        ))}
                    </nav>
                </div>

                {/* Section 1: Acceptance */}
                <section id="section-1" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">1. Acceptance of Terms</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">
                            By accessing or using MakeTicket (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). 
                            If you do not agree to all the terms and conditions, you may not access or use our services.
                        </p>
                        <p className="text-slate-600">
                            These Terms apply to all visitors, users, and others who access or use the Service, including event organizers 
                            and event attendees.
                        </p>
                    </div>
                </section>

                {/* Section 2: Description of Service */}
                <section id="section-2" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">2. Description of Service</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">
                            MakeTicket is an event ticketing platform that allows users to:
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <span>Create and manage events</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <span>Generate and distribute tickets with QR codes</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <span>Process event registrations</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <span>Scan and validate tickets at events</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <span>Access analytics and attendee management tools</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <span>Integrate with third-party services (Google Forms, Gmail, Google Sheets)</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Section 3: User Accounts */}
                <section id="section-3" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">3. User Accounts</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">When creating an account, you agree to:</p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span>Provide accurate, current, and complete information</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span>Maintain and promptly update your account information</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span>Maintain the security and confidentiality of your password</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span>Accept responsibility for all activities under your account</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span>Immediately notify us of any unauthorized use</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span>Be at least 18 years old or have parental consent</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Section 4: User Responsibilities */}
                <section id="section-4" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">4. User Responsibilities</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-3">Event Organizers are responsible for:</h3>
                            <ul className="space-y-2 text-slate-600 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                    <span>The accuracy of event information (dates, venues, descriptions)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                    <span>Compliance with local laws and regulations for their events</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                    <span>Handling attendee data in compliance with privacy laws</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                    <span>Communicating their own refund and cancellation policies</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                    <span>Delivering the event as advertised</span>
                                </li>
                            </ul>
                        </div>
                        <div className="p-5 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-3">Event Attendees are responsible for:</h3>
                            <ul className="space-y-2 text-slate-600 text-sm">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                    <span>Providing accurate registration information</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                    <span>Safeguarding their tickets and QR codes</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                                    <span>Reviewing event details and organizer policies before registering</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Section 5: Acceptable Use */}
                <section id="section-5" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <Ban className="w-5 h-5 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">5. Acceptable Use Policy</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-red-200 bg-red-50">
                        <p className="text-red-800 mb-4 font-medium">You agree NOT to use the Service to:</p>
                        <ul className="space-y-2 text-red-700 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <span>Violate any applicable laws or regulations</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <span>Create fraudulent events or tickets</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <span>Infringe on intellectual property rights of others</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <span>Transmit malware, viruses, or harmful code</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <span>Attempt to gain unauthorized access to our systems</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <span>Harass, abuse, or harm other users</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <span>Send spam or unauthorized promotional content</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                                <span>Resell or scalp tickets without authorization</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Section 6: Event Content */}
                <section id="section-6" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">6. Event Content</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">
                            You are solely responsible for the content of your events. Event content must not:
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span>Be illegal, harmful, threatening, abusive, defamatory, or obscene</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span>Promote discrimination, hatred, or violence</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span>Contain false or misleading information</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                <span>Infringe on third-party rights</span>
                            </li>
                        </ul>
                        <p className="text-slate-500 text-sm mt-4">
                            We reserve the right to remove any content that violates these terms without notice.
                        </p>
                    </div>
                </section>

                {/* Section 7: Intellectual Property */}
                <section id="section-7" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">7. Intellectual Property</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">
                            The Service and its original content, features, and functionality are owned by MakeTicket and are protected 
                            by international copyright, trademark, and other intellectual property laws.
                        </p>
                        <p className="text-slate-600">
                            You retain ownership of content you create (event descriptions, images, etc.) but grant us a license to 
                            use, display, and distribute that content as necessary to provide the Service.
                        </p>
                    </div>
                </section>

                {/* Section 8: Third-Party Integrations */}
                <section id="section-8" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-cyan-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">8. Third-Party Integrations</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">
                            MakeTicket integrates with third-party services including Google (Forms, Gmail, Drive/Sheets). 
                            By using these integrations:
                        </p>
                        <ul className="space-y-2 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
                                <span>You authorize us to access and use data from these services as described in our Privacy Policy</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
                                <span>You agree to the terms of service of those third-party providers</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
                                <span>We are not responsible for the availability or functionality of third-party services</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Section 9: Payments and Fees */}
                <section id="section-9" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">9. Payments and Fees</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <ul className="space-y-3 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span><strong>Free Tier:</strong> Basic features available at no cost with usage limits</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span><strong>Paid Plans:</strong> Billed monthly or annually as specified at time of purchase</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span><strong>Transaction Fees:</strong> May apply for paid events as disclosed on our pricing page</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span><strong>Payment Processing:</strong> Handled by third-party providers (Stripe, Razorpay)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                                <span><strong>Taxes:</strong> You are responsible for any applicable taxes</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Section 10: Refund Policy */}
                <section id="section-10" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-orange-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">10. Refund Policy</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600 mb-4">
                            <strong>For MakeTicket Subscriptions:</strong> You may cancel your subscription at any time. 
                            Refunds for annual subscriptions may be provided on a pro-rata basis at our discretion.
                        </p>
                        <p className="text-slate-600">
                            <strong>For Event Tickets:</strong> Refund policies are determined by individual event organizers. 
                            MakeTicket is not responsible for refunds of event tickets. Please contact the event organizer directly.
                        </p>
                    </div>
                </section>

                {/* Section 11: Privacy */}
                <section id="section-11" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">11. Privacy</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600">
                            Your use of the Service is also governed by our{' '}
                            <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>, 
                            which describes how we collect, use, and protect your personal information.
                        </p>
                    </div>
                </section>

                {/* Section 12: Disclaimer of Warranties */}
                <section id="section-12" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-slate-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">12. Disclaimer of Warranties</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-slate-50">
                        <p className="text-slate-600 text-sm uppercase font-medium mb-3">Important Notice:</p>
                        <p className="text-slate-600">
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, 
                            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
                            FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                    </div>
                </section>

                {/* Section 13: Limitation of Liability */}
                <section id="section-13" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <Scale className="w-5 h-5 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">13. Limitation of Liability</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, MAKETICKET SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                            INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO 
                            LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE 
                            OF THE SERVICE.
                        </p>
                    </div>
                </section>

                {/* Section 14: Indemnification */}
                <section id="section-14" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">14. Indemnification</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600">
                            You agree to indemnify and hold harmless MakeTicket and its officers, directors, employees, 
                            and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) 
                            arising out of your use of the Service or violation of these Terms.
                        </p>
                    </div>
                </section>

                {/* Section 15: Termination */}
                <section id="section-15" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <Ban className="w-5 h-5 text-rose-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">15. Termination</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <ul className="space-y-3 text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                <span>We may terminate or suspend your account immediately for violations of these Terms</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                <span>You may cancel your account at any time from your account settings</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                <span>Upon termination, your right to use the Service will immediately cease</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                <span>Data retention after termination is governed by our Privacy Policy</span>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* Section 16: Governing Law */}
                <section id="section-16" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Gavel className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">16. Governing Law</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600">
                            These Terms shall be governed by and construed in accordance with the laws of India, 
                            without regard to its conflict of law provisions. Any disputes arising from these Terms 
                            shall be subject to the exclusive jurisdiction of the courts in Bangalore, India.
                        </p>
                    </div>
                </section>

                {/* Section 17: Changes to Terms */}
                <section id="section-17" className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">17. Changes to Terms</h2>
                    </div>
                    <div className="p-5 rounded-xl border border-slate-200 bg-white">
                        <p className="text-slate-600">
                            We reserve the right to modify these Terms at any time. We will notify you of significant 
                            changes by posting the updated Terms on this page and updating the &quot;Last updated&quot; date. 
                            Your continued use of the Service after changes constitutes acceptance of the new Terms.
                        </p>
                    </div>
                </section>

                {/* Section 18: Contact Us */}
                <section id="section-18" className="mb-8">
                    <div className="p-8 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                                <Mail className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">18. Contact Us</h3>
                                <p className="text-slate-600 mb-4">
                                    If you have any questions about these Terms:
                                </p>
                                <div className="space-y-2 text-slate-600">
                                    <p><strong>Email:</strong> <a href="mailto:legal@maketicket.app" className="text-indigo-600 hover:underline">legal@maketicket.app</a></p>
                                    <p><strong>Website:</strong> <a href="https://maketicket.app" className="text-indigo-600 hover:underline">https://maketicket.app</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Acknowledgment */}
                <div className="p-6 rounded-2xl bg-slate-900 text-white">
                    <h3 className="font-semibold mb-3">Acknowledgment</h3>
                    <p className="text-slate-300 text-sm">
                        By using MakeTicket, you acknowledge that you have read, understood, and agree to be bound 
                        by these Terms of Service. If you do not agree, please do not use our Service.
                    </p>
                </div>
            </div>
        </StaticPageLayout>
    );
}
