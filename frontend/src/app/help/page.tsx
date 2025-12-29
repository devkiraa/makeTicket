import StaticPageLayout from '@/components/StaticPageLayout';
import { HelpCircle, MessageCircle, Book, Mail } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function HelpCenterPage() {
    const faqs = [
        { q: 'How do I create an event?', a: 'Click "Create Event" in your dashboard, fill in the details, and publish.' },
        { q: 'Can I customize my event page?', a: 'Yes! You can add logos, banners, and custom colors to match your brand.' },
        { q: 'How does check-in work?', a: 'Use our mobile scanner to scan QR codes on attendees\' tickets.' },
        { q: 'Can I export my attendee list?', a: 'Yes, you can export to CSV or Excel from the Attendees page.' },
        { q: 'Is there a limit on attendees?', a: 'Free plan: 100/event. Pro plan: 1,000/event. Enterprise: Unlimited.' },
        { q: 'How do I get support?', a: 'Email us at support@maketicket.app or use the live chat.' },
    ];

    return (
        <StaticPageLayout
            title="Help Center"
            subtitle="Find answers to common questions."
        >
            <div className="max-w-3xl">
                {/* Search */}
                <div className="mb-12">
                    <div className="relative max-w-xl">
                        <Input
                            placeholder="Search for help..."
                            className="h-12 pl-12 pr-4 rounded-full border-slate-200"
                        />
                        <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                    <Link href="/docs" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                        <Book className="w-6 h-6 text-indigo-600" />
                        <span className="font-medium text-slate-900">Documentation</span>
                    </Link>
                    <Link href="/contact" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                        <MessageCircle className="w-6 h-6 text-green-600" />
                        <span className="font-medium text-slate-900">Live Chat</span>
                    </Link>
                    <Link href="/contact" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                        <Mail className="w-6 h-6 text-amber-600" />
                        <span className="font-medium text-slate-900">Email Support</span>
                    </Link>
                </div>

                {/* FAQs */}
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                    {faqs.map((faq, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                            <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                            <p className="text-slate-600">{faq.a}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-8 rounded-2xl bg-indigo-50 text-center">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">Still need help?</h3>
                    <p className="text-slate-600 mb-4">Our support team is here to assist you.</p>
                    <Link href="/contact">
                        <Button className="rounded-full bg-indigo-600 hover:bg-indigo-700">
                            Contact Support
                        </Button>
                    </Link>
                </div>
            </div>
        </StaticPageLayout>
    );
}
