import type { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';
import Link from 'next/link';
import { Ban, Zap, ShieldCheck, BarChart3, Music, GraduationCap, Briefcase, PartyPopper, BookOpen, Trophy } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Free Event Ticket Generator — QR Code Tickets Instantly | MakeTicket',
  description:
    "Generate professional event tickets with QR codes for free. MakeTicket's event ticket generator creates unique, scannable tickets for any event in minutes.",
  keywords: [
    'event ticket generator',
    'event ticket generator free',
    'free event ticket generator',
    'generate ticket',
    'ticket generator',
  ],
  openGraph: {
    title: 'Free Event Ticket Generator — QR Code Tickets Instantly | MakeTicket',
    description:
      "Generate professional event tickets with QR codes for free. MakeTicket's event ticket generator creates unique, scannable tickets for any event in minutes.",
    url: 'https://maketicket.app/event-ticket-generator',
    type: 'website',
  },
  alternates: {
    canonical: 'https://maketicket.app/event-ticket-generator',
  },
};

const benefits = [
  {
    icon: Ban,
    title: 'Eliminate Paper',
    description: 'No printing, no queues, no lost tickets. Digital QR tickets live on attendees\u2019 phones.',
    color: 'rose',
  },
  {
    icon: Zap,
    title: 'Instant Delivery',
    description: 'Tickets are emailed to attendees the moment they register. No manual steps.',
    color: 'amber',
  },
  {
    icon: ShieldCheck,
    title: 'Fraud-Proof',
    description: 'Every QR code is unique and encrypted. Duplicates are detected and blocked instantly.',
    color: 'green',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Tracking',
    description: 'See who has and hasn\u2019t checked in, live, from any device.',
    color: 'indigo',
  },
];

const useCases = [
  { icon: Music, title: 'Concert Tickets', description: 'Sell or distribute tickets for live music shows and performances.', color: 'rose' },
  { icon: GraduationCap, title: 'College Events', description: 'Manage fests, seminars, workshops, and cultural nights.', color: 'indigo' },
  { icon: Briefcase, title: 'Corporate Events', description: 'Conferences, town halls, product launches, and networking events.', color: 'blue' },
  { icon: PartyPopper, title: 'Parties & Celebrations', description: 'Birthday parties, weddings, reunions, and social gatherings.', color: 'amber' },
  { icon: BookOpen, title: 'Workshops & Classes', description: 'Skill sessions, bootcamps, training programs, and classes.', color: 'purple' },
  { icon: Trophy, title: 'Sports & Competitions', description: 'Tournaments, marathons, hackathons, and competitions.', color: 'emerald' },
];

const processSteps = [
  'Create Event',
  'Set Up Ticket Fields',
  'Publish Registration Link',
  'Auto-generate QR Tickets',
  'Scan at the Door',
];

const faqs = [
  {
    q: 'How are QR code tickets generated?',
    a: 'When an attendee registers, MakeTicket automatically generates a unique encrypted QR code tied to their registration. No manual work on your part.',
  },
  {
    q: 'Can I generate tickets in bulk?',
    a: 'Yes. For group registrations or manual imports, you can upload a CSV of attendees and bulk-generate their tickets.',
  },
  {
    q: 'What format are the tickets in?',
    a: 'Tickets are delivered by email as a stylized HTML email with an embedded QR code. Attendees can also view them on the MakeTicket website.',
  },
  {
    q: 'Can I customize what\u2019s printed on the ticket?',
    a: 'Yes \u2014 event name, date, venue, attendee name, ticket number, and your event banner are all included by default. You can add custom fields.',
  },
  {
    q: 'Is there a limit on ticket generation on the free plan?',
    a: 'Free plan supports up to 50 tickets per event. Starter and Pro plans raise this to 200 and 1,000 respectively.',
  },
];

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
};

export default function EventTicketGeneratorPage() {
  return (
    <StaticPageLayout
      title="Free Event Ticket Generator"
      subtitle="Generate unique QR-code event tickets instantly. Share, scan, and manage — all for free."
    >
      <div className="space-y-20">
        {/* Why Generate Tickets Digitally */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            Why Generate Tickets Digitally?
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-xl mx-auto">
            Digital QR tickets are faster, safer, and completely free to generate with MakeTicket.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((b, i) => {
              const Icon = b.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-xl ${colorMap[b.color]} border flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{b.title}</h3>
                  <p className="text-slate-600">{b.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Comparison Table */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Old Way vs MakeTicket Generator
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left p-4 font-semibold text-slate-700"></th>
                  <th className="text-left p-4 font-semibold text-slate-500">Old Way (Paper / Manual)</th>
                  <th className="text-left p-4 font-semibold text-indigo-700 bg-indigo-50">
                    MakeTicket Generator
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Ticket creation time', 'Hours', '60 seconds'],
                  ['Cost', 'Printing + design fees', 'Free'],
                  ['Check-in speed', '2–3 min per person', 'Under 1 second'],
                  ['Fraud protection', 'None', 'QR encryption'],
                  ['Real-time data', 'No', 'Yes'],
                ].map(([label, old, newVal], i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-medium text-slate-700">{label}</td>
                    <td className="p-4 text-slate-500">{old}</td>
                    <td className="p-4 text-green-700 font-semibold bg-indigo-50/30">{newVal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Works For Any Event */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            Works For Any Event
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-xl mx-auto">
            Whatever type of event you&apos;re running, MakeTicket&apos;s ticket generator handles it.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-xl ${colorMap[uc.color]} border flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{uc.title}</h3>
                  <p className="text-slate-600">{uc.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step-by-step process */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            How the Generator Works
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {processSteps.map((step, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center gap-2">
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm mb-2">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[100px]">{step}</span>
                </div>
                {i < processSteps.length - 1 && (
                  <div className="hidden md:block text-slate-300 text-2xl">→</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-3">Generate your first event ticket free</h2>
          <p className="text-white/80 mb-8 text-lg">
            No credit card. No design skills. Just your event details.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-indigo-600 font-semibold rounded-full px-8 py-3 hover:bg-slate-100 transition-colors"
          >
            Start Generating Tickets
          </Link>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <details
                key={i}
                className="group p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-md transition-shadow"
              >
                <summary className="font-semibold text-slate-900 cursor-pointer list-none flex justify-between items-center gap-4">
                  {faq.q}
                  <span className="text-indigo-600 text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-slate-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </StaticPageLayout>
  );
}
