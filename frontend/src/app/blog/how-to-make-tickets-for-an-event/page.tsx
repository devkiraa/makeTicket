import type { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Make Tickets for an Event (Free) — Step-by-Step Guide | MakeTicket',
  description:
    'Learn how to make tickets for an event in minutes, completely free. This step-by-step guide covers design, QR codes, registration, and check-in scanning.',
  keywords: [
    'how to make tickets for an event',
    'how to make tickets for an event for free',
    'how to create tickets for an event',
    'how to make event tickets',
    'how to make a ticket for an event',
  ],
  openGraph: {
    title: 'How to Make Tickets for an Event (Free) — Step-by-Step Guide | MakeTicket',
    description:
      'Learn how to make tickets for an event in minutes, completely free. This step-by-step guide covers design, QR codes, registration, and check-in scanning.',
    url: 'https://maketicket.app/blog/how-to-make-tickets-for-an-event',
    type: 'website',
  },
  alternates: {
    canonical: 'https://maketicket.app/blog/how-to-make-tickets-for-an-event',
  },
};

export default function HowToMakeTicketsPage() {
  return (
    <StaticPageLayout
      title="How to Make Tickets for an Event (Free, in Under 5 Minutes)"
      subtitle="A complete step-by-step guide to creating professional event tickets online — for free."
      backLink="/blog"
    >
      <div className="max-w-3xl prose prose-slate prose-lg mx-auto">
        {/* Intro */}
        <p>
          Event tickets do more than just control entry — they set the tone for your event, confirm
          registrations, and make check-in fast and smooth. Whether you&apos;re organizing a college
          fest, a corporate conference, or a birthday party, this guide shows you exactly how to make
          professional event tickets for free.
        </p>

        <hr className="my-8 border-slate-100" />

        {/* Section 1 */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          What You Need Before You Start
        </h2>
        <ul className="space-y-2 text-slate-600">
          <li>Your event name, date, time, and location</li>
          <li>A banner image or logo for your event (optional, but recommended)</li>
          <li>A list of custom fields to collect from attendees (name, phone, etc.)</li>
        </ul>

        <hr className="my-8 border-slate-100" />

        {/* Step 1 */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          Step 1 — Choose Your Ticketing Tool
        </h2>
        <p>
          There are two ways to make event tickets. The old way involves designing a ticket in Canva
          or Photoshop, printing copies, and distributing them manually. This is time-consuming and
          prone to fraud — anyone can duplicate a printed ticket.
        </p>
        <p>
          The modern way uses online platforms like{' '}
          <strong>
            <Link href="/" className="text-indigo-600 hover:underline">
              MakeTicket
            </Link>
          </strong>{' '}
          that auto-generate QR-code tickets and handle registration, email delivery, and check-in
          scanning all in one place.
        </p>
        <p>
          MakeTicket is free to get started — no credit card required. The free plan supports up to
          2 events per month with 50 attendees each, with unique QR codes for every ticket.
        </p>

        <hr className="my-8 border-slate-100" />

        {/* Step 2 */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          Step 2 — Create Your Event
        </h2>
        <ol className="space-y-3 text-slate-600">
          <li>
            Go to{' '}
            <Link href="/" className="text-indigo-600 hover:underline">
              maketicket.app
            </Link>{' '}
            and create a free account
          </li>
          <li>
            Click <strong>&quot;Create Event&quot;</strong>
          </li>
          <li>Fill in your event name, description, date, time, and location</li>
          <li>Upload your event banner image (1200×628px recommended)</li>
          <li>Set whether the event is free or paid</li>
        </ol>

        <hr className="my-8 border-slate-100" />

        {/* Step 3 */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          Step 3 — Set Up Your Ticket
        </h2>
        <ol className="space-y-3 text-slate-600">
          <li>
            Choose a ticket name (e.g., <em>General Admission</em>, <em>VIP</em>,{' '}
            <em>Student Pass</em>)
          </li>
          <li>Set the quantity limit (or leave it unlimited)</li>
          <li>Add custom registration fields — name, phone number, college, etc.</li>
          <li>
            Enable <strong>&quot;Email Confirmation&quot;</strong> so attendees auto-receive their
            ticket
          </li>
        </ol>

        <hr className="my-8 border-slate-100" />

        {/* Step 4 */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          Step 4 — Publish and Share Your Registration Link
        </h2>
        <ol className="space-y-3 text-slate-600">
          <li>
            Click <strong>&quot;Publish Event&quot;</strong>
          </li>
          <li>Copy your unique event registration URL</li>
          <li>Share it on WhatsApp, Instagram, college portals, and email newsletters</li>
          <li>Optional: Embed the registration form on your own website</li>
        </ol>

        <hr className="my-8 border-slate-100" />

        {/* Step 5 */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          Step 5 — Scan Tickets at Your Event
        </h2>
        <ol className="space-y-3 text-slate-600">
          <li>On the day of your event, open MakeTicket on your phone or tablet</li>
          <li>
            Go to <strong>your event → Check-in</strong>
          </li>
          <li>Scan attendee QR codes using the camera</li>
          <li>
            Verified attendees show a <span className="text-green-600 font-medium">green checkmark</span>;
            invalid tickets show <span className="text-red-500 font-medium">red</span>
          </li>
        </ol>

        <hr className="my-8 border-slate-100" />

        {/* Tips */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          Tips for Making Great Event Tickets
        </h2>
        <ul className="space-y-3 text-slate-600">
          <li>Use a high-quality horizontal banner image (1200×628px recommended)</li>
          <li>Keep registration fields minimal — only ask for what you truly need</li>
          <li>Send a reminder email 24 hours before the event</li>
          <li>Assign a dedicated scanner team so check-in is fast</li>
        </ul>

        <hr className="my-8 border-slate-100" />

        {/* Common Mistakes */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          Common Mistakes to Avoid
        </h2>
        <div className="space-y-4">
          {[
            {
              mistake: 'Using paper tickets',
              problem: 'They can be lost, duplicated, or forged easily.',
            },
            {
              mistake: 'Manual attendance lists',
              problem: 'Slow check-in, data entry errors, and no real-time visibility.',
            },
            {
              mistake: 'Collecting unnecessary info',
              problem: 'Attendees abandon long registration forms. Keep it short.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-rose-100 bg-rose-50 flex gap-4 items-start"
            >
              <span className="text-rose-500 font-bold text-lg mt-0.5">✗</span>
              <div>
                <span className="font-semibold text-slate-800">{item.mistake} —</span>{' '}
                <span className="text-slate-600">{item.problem}</span>
              </div>
            </div>
          ))}
        </div>

        <hr className="my-8 border-slate-100" />

        {/* FAQ */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Can I make tickets for free?</h3>
            <p className="text-slate-600">
              Yes. MakeTicket&apos;s free plan supports up to 2 events/month with 50 attendees each.
              No credit card needed.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Do I need design skills?</h3>
            <p className="text-slate-600">
              No. The ticket design is automated. Just add your event details.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">How do QR code tickets work?</h3>
            <p className="text-slate-600">
              Each registered attendee receives a unique QR code by email. At the event, you scan it
              with the MakeTicket check-in tool to verify and mark them as arrived.
            </p>
          </div>
        </div>

        <hr className="my-8 border-slate-100" />

        {/* Closing */}
        <p className="text-slate-600">
          Making tickets for your event has never been easier or faster. Tools like MakeTicket mean
          any event organizer — from first-timers to seasoned pros — can create professional,
          QR-code tickets in minutes. Don&apos;t let ticketing slow you down. Set it up once and let
          the platform handle the rest.
        </p>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full px-8 py-3 transition-colors"
          >
            Create Your Event Tickets Free →
          </Link>
        </div>

        <hr className="my-12 border-slate-100" />

        {/* Also Read */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Also Read</h3>
          <ul className="space-y-2">
            <li>
              <Link href="#" className="text-indigo-600 hover:underline">
                Free vs Paid Ticketing Platforms — What You Need to Know
              </Link>
            </li>
            <li>
              <Link href="/blog/how-to-create-qr-code-event-tickets" className="text-indigo-600 hover:underline">
                How to Create QR Code Event Tickets in 5 Minutes
              </Link>
            </li>
            <li>
              <Link href="#" className="text-indigo-600 hover:underline">
                Event Ticket Generator: Everything You Need to Know
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </StaticPageLayout>
  );
}
