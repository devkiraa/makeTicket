import StaticPageLayout from '@/components/StaticPageLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cancellation and Refund Policy | MakeTicket',
    description: 'MakeTicket cancellation and refund policy. Learn about our 7-day money-back guarantee, subscription cancellation process, and refund eligibility.',
    alternates: {
        canonical: 'https://maketicket.app/refunds',
    },
};

export default function RefundPolicyPage() {
    return (
        <StaticPageLayout
            title="Cancellation and Refund Policy"
            subtitle="Last updated: December 30, 2025"
        >
            <div className="prose prose-slate max-w-3xl mx-auto">
                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Overview</h2>
                    <p className="text-slate-600 mb-4">
                        At MakeTicket, we want you to be completely satisfied with our service. This policy outlines 
                        our cancellation and refund procedures for subscription plans purchased on our platform.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">7-Day Money-Back Guarantee</h2>
                    <p className="text-slate-600 mb-4">
                        We offer a <strong>7-day money-back guarantee</strong> on all new Pro plan subscriptions. 
                        If you&apos;re not satisfied with MakeTicket Pro within the first 7 days of your purchase, 
                        you can request a full refund.
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                        <li>Refund requests must be made within 7 days of the initial purchase date</li>
                        <li>The guarantee applies to first-time Pro plan subscribers only</li>
                        <li>Refunds are processed to the original payment method within 5-7 business days</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Subscription Cancellation</h2>
                    <p className="text-slate-600 mb-4">
                        You can cancel your MakeTicket Pro subscription at any time from your dashboard:
                    </p>
                    <ol className="list-decimal list-inside text-slate-600 space-y-2 mb-4">
                        <li>Log in to your MakeTicket account</li>
                        <li>Navigate to <strong>Dashboard → Billing</strong></li>
                        <li>Click on <strong>&quot;Cancel Subscription&quot;</strong></li>
                        <li>Confirm your cancellation</li>
                    </ol>
                    <p className="text-slate-600 mb-4">
                        When you cancel your subscription:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                        <li>You will continue to have access to Pro features until the end of your current billing period</li>
                        <li>Your account will automatically revert to the Free plan after the billing period ends</li>
                        <li>No further charges will be made to your payment method</li>
                        <li>Your events and data will be preserved (subject to Free plan limits)</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Refund Eligibility</h2>
                    <p className="text-slate-600 mb-4">
                        Refunds may be granted in the following circumstances:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                        <li><strong>Within 7-day guarantee period:</strong> Full refund for first-time subscribers</li>
                        <li><strong>Service unavailability:</strong> Prorated refund if our service experiences significant downtime</li>
                        <li><strong>Duplicate charges:</strong> Full refund for any accidental duplicate payments</li>
                        <li><strong>Technical issues:</strong> Case-by-case basis for issues that prevent service usage</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Non-Refundable Items</h2>
                    <p className="text-slate-600 mb-4">
                        The following are generally not eligible for refunds:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                        <li>Subscription fees after the 7-day guarantee period</li>
                        <li>Partial month usage (cancellations are effective at the end of the billing cycle)</li>
                        <li>Accounts terminated due to violation of our Terms of Service</li>
                        <li>Enterprise plan custom agreements (governed by separate contracts)</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">How to Request a Refund</h2>
                    <p className="text-slate-600 mb-4">
                        To request a refund, please contact our support team:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                        <li><strong>Email:</strong> support@maketicket.app</li>
                        <li><strong>Contact Form:</strong> <a href="/contact" className="text-indigo-600 hover:underline">maketicket.app/contact</a></li>
                    </ul>
                    <p className="text-slate-600 mb-4">
                        Please include the following information in your refund request:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                        <li>Your registered email address</li>
                        <li>Date of purchase</li>
                        <li>Reason for refund request</li>
                        <li>Transaction ID or payment reference (if available)</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Refund Processing</h2>
                    <p className="text-slate-600 mb-4">
                        Once your refund request is approved:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2 mb-4">
                        <li>Refunds are processed within 5-7 business days</li>
                        <li>The refund will be credited to the original payment method</li>
                        <li>You will receive an email confirmation once the refund is processed</li>
                        <li>Bank processing times may vary (typically 5-10 additional business days)</li>
                    </ul>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Free Plan Users</h2>
                    <p className="text-slate-600 mb-4">
                        MakeTicket&apos;s Free plan is completely free to use and does not require any payment. 
                        There are no charges, subscriptions, or refunds associated with the Free plan.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Event Attendee Refunds</h2>
                    <p className="text-slate-600 mb-4">
                        MakeTicket is a ticketing platform that helps event organizers manage registrations. 
                        We do not process payments for event tickets directly. For refunds related to event 
                        registrations or tickets, please contact the event organizer directly.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Changes to This Policy</h2>
                    <p className="text-slate-600 mb-4">
                        We may update this Cancellation and Refund Policy from time to time. We will notify 
                        users of any material changes by posting the new policy on this page and updating 
                        the &quot;Last updated&quot; date.
                    </p>
                </section>

                <section className="mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-4">Contact Us</h2>
                    <p className="text-slate-600 mb-4">
                        If you have any questions about our Cancellation and Refund Policy, please contact us:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-2">
                        <li><strong>Email:</strong> support@maketicket.app</li>
                        <li><strong>Website:</strong> <a href="/contact" className="text-indigo-600 hover:underline">maketicket.app/contact</a></li>
                    </ul>
                </section>
            </div>
        </StaticPageLayout>
    );
}
