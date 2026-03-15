import type { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How to Create QR Code Event Tickets for Free | MakeTicket Guide',
  description:
    'Step-by-step guide to creating QR code event tickets. Generate unique, scannable QR tickets for your event in minutes — completely free with MakeTicket.',
  keywords: [
    'how to create qr code tickets',
    'event qr code ticket',
    'qr code ticket generator',
    'make event tickets with qr code',
  ],
  openGraph: {
    title: 'How to Create QR Code Event Tickets for Free | MakeTicket Guide',
    description:
      'Step-by-step guide to creating QR code event tickets. Generate unique, scannable QR tickets for your event in minutes — completely free with MakeTicket.',
    url: 'https://maketicket.app/blog/how-to-create-qr-code-event-tickets',
    type: 'website',
  },
  alternates: {
    canonical: 'https://maketicket.app/blog/how-to-create-qr-code-event-tickets',
  },
};

export default function HowToCreateQrCodeTicketsPage() {
  return (
    <StaticPageLayout
      title="How to Create QR Code Event Tickets (Free, Step-by-Step)"
      subtitle="QR code tickets are faster, safer, and completely free to generate. Here's how."
      backLink="/blog"
    >
      <div className="max-w-3xl prose prose-slate prose-lg mx-auto">
        {/* Intro */}
        <p>
          Paper tickets feel like a relic of the past — and for good reason. They get lost, forged,
          or crumpled in pockets. QR code tickets, on the other hand, live on your attendees&apos;
          phones, can&apos;t be duplicated, and scan in under a second. In this guide, we&apos;ll
          show you exactly how to create QR code event tickets for free using{' '}
          <strong>MakeTicket</strong>.
        </p>

        <hr className="my-8 border-slate-100" />

        {/* What Are QR Tickets */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          What Are QR Code Event Tickets?
        </h2>
        <p>
          QR code tickets are digital tickets that contain a unique 2D barcode — a QR code — that
          uniquely identifies each attendee. When scanned at your event, the system instantly
          verifies the ticket and marks the attendee as checked in.
        </p>
        <ul className="space-y-2 text-slate-600">
          <li>Small, scannable 2D barcodes that uniquely identify each attendee</li>
          <li>Fraud-proof, fast to scan, and work entirely on mobile</li>
          <li>No printing required — attendees show them on any device screen</li>
        </ul>

        <hr className="my-8 border-slate-100" />

        {/* Why Use QR Tickets */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          Why You Should Use QR Tickets for Your Next Event
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose mb-4">
          {[
            { emoji: '⚡', title: 'Speed', desc: 'Sub-1-second scan time. No bottlenecks at the door.' },
            { emoji: '🌿', title: 'No Printing', desc: 'Saves money and is eco-friendly.' },
            { emoji: '📊', title: 'Real-Time Tracking', desc: 'Live check-in data from any device.' },
            { emoji: '🔒', title: 'No Duplicates', desc: 'Each code is unique and server-verified.' },
          ].map((item, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border border-slate-100 bg-white flex gap-3 items-start"
            >
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <div className="font-semibold text-slate-900">{item.title}</div>
                <div className="text-slate-600 text-sm">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <hr className="my-8 border-slate-100" />

        {/* How To Create with MakeTicket */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          How to Create QR Code Tickets with MakeTicket (Free)
        </h2>
        <ol className="space-y-4 text-slate-600">
          <li>
            <strong>Step 1:</strong> Sign up free at{' '}
            <Link href="/" className="text-indigo-600 hover:underline">
              maketicket.app
            </Link>{' '}
            — no credit card required.
          </li>
          <li>
            <strong>Step 2:</strong> Create an event by entering your event name, date, location,
            and uploading a banner image.
          </li>
          <li>
            <strong>Step 3:</strong> Once attendees register, the system automatically generates a
            unique encrypted QR code for each one.
          </li>
          <li>
            <strong>Step 4:</strong> The QR code ticket is emailed automatically to the attendee —
            no manual steps needed.
          </li>
          <li>
            <strong>Step 5:</strong> On event day, scan QR codes with any smartphone using the
            MakeTicket check-in tool.
          </li>
        </ol>

        <hr className="my-8 border-slate-100" />

        {/* How Attendees Use QR Tickets */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          How Attendees Use QR Code Tickets
        </h2>
        <ul className="space-y-2 text-slate-600">
          <li>Open the ticket email on any device — phone, tablet, or laptop</li>
          <li>Show the QR code at the entry point</li>
          <li>Works on iPhone, Android, or even printed out — any format goes</li>
          <li>Attendees can also save the ticket to Apple Wallet or Google Wallet</li>
        </ul>

        <hr className="my-8 border-slate-100" />

        {/* How to Scan */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          How to Scan QR Code Tickets at Your Event
        </h2>
        <p>
          You don&apos;t need any special hardware — any smartphone works as a scanner.
        </p>
        <ol className="space-y-3 text-slate-600">
          <li>
            Open MakeTicket on any phone or tablet and go to your event&apos;s{' '}
            <strong>Check-in</strong> page
          </li>
          <li>Point your camera at the attendee&apos;s QR code</li>
          <li>
            The app verifies and marks the attendee as arrived in under a second —{' '}
            <span className="text-green-600 font-medium">green for valid</span>,{' '}
            <span className="text-red-500 font-medium">red for invalid or duplicate</span>
          </li>
          <li>
            Your real-time dashboard updates live, so you always know how many people have arrived
          </li>
        </ol>

        <hr className="my-8 border-slate-100" />

        {/* Tips */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-4">
          QR Code Ticket Tips for Event Organizers
        </h2>
        <ul className="space-y-2 text-slate-600">
          <li>Test your QR scanner before the event — do a dry run with a teammate</li>
          <li>Have a backup manual attendee list downloaded just in case of network issues</li>
          <li>Set up multiple check-in stations for large events to prevent queuing</li>
          <li>
            Brief your team — anyone with the MakeTicket app on their phone can scan tickets
          </li>
        </ul>

        <hr className="my-8 border-slate-100" />

        {/* FAQ */}
        <h2 className="text-2xl font-bold text-slate-900 mt-10 mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">
              Are QR code tickets free to generate?
            </h3>
            <p className="text-slate-600">
              Yes, with MakeTicket. The free plan includes QR code generation for up to 50 attendees
              per event, with no credit card required.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">
              Can QR codes be duplicated or faked?
            </h3>
            <p className="text-slate-600">
              No. Each QR code is uniquely encrypted and server-verified. If someone tries to use the
              same code twice, the second scan is immediately flagged as invalid.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">
              Do attendees need to print the QR code?
            </h3>
            <p className="text-slate-600">
              No. Showing the QR code on a phone screen is perfectly fine and is the most common
              method. Printing is also supported if attendees prefer it.
            </p>
          </div>
        </div>

        <hr className="my-8 border-slate-100" />

        {/* Closing */}
        <p className="text-slate-600">
          QR code tickets are the gold standard for modern events — and with MakeTicket, generating
          them is completely free and takes just minutes. Whether you&apos;re running a 20-person
          workshop or a 500-person conference, QR code check-in will make your event smooth,
          professional, and stress-free.
        </p>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full px-8 py-3 transition-colors"
          >
            Generate QR Code Tickets Free →
          </Link>
        </div>

        <hr className="my-12 border-slate-100" />

        {/* Also Read */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Also Read</h3>
          <ul className="space-y-2">
            <li>
              <Link href="/blog/how-to-make-tickets-for-an-event" className="text-indigo-600 hover:underline">
                How to Make Tickets for an Event (Free) — Step-by-Step Guide
              </Link>
            </li>
            <li>
              <Link href="#" className="text-indigo-600 hover:underline">
                Free vs Paid Ticketing Platforms — What You Need to Know
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
