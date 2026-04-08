import type { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';
import Link from 'next/link';
import LiveTicketPreview from '@/components/marketing/LiveTicketPreview';
import {
  PlusCircle,
  Ticket,
  QrCode,
  Music,
  GraduationCap,
  Briefcase,
  PartyPopper,
  BookOpen,
  Trophy,
  Star,
  Zap,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Create Event Tickets Online Free | MakeTicket',
  description:
    'Need to create event tickets online for free? MakeTicket lets you design, generate, and email QR code tickets for any event instantly.',
  keywords: [
    'create event tickets online free',
    'create ticket online free',
    'make event tickets online free',
    'free event ticket creator',
    'create a ticket online',
  ],
  openGraph: {
    title: 'Create Event Tickets Online Free | MakeTicket',
    description:
      'Create professional event tickets with QR codes online for free. Setup in 60 seconds.',
    url: 'https://maketicket.app/create-event-tickets-online-free',
    type: 'website',
  },
  alternates: {
    canonical: 'https://maketicket.app/create-event-tickets-online-free',
  },
};

const steps = [
  {
    icon: PlusCircle,
    title: 'Create Your Event',
    description: 'Fill in your event name, date, location, and upload a banner image.',
    color: 'indigo',
  },
  {
    icon: Ticket,
    title: 'Customize Your Ticket',
    description: 'Choose your ticket design, add your branding, and set attendee fields.',
    color: 'blue',
  },
  {
    icon: QrCode,
    title: 'Share & Scan',
    description:
      'Share the registration link. Each attendee gets a unique QR-code ticket. Scan them at the door.',
    color: 'green',
  },
];

const useCases = [
  {
    icon: Music,
    title: 'Concert Tickets',
    description: 'Sell or distribute tickets for live music shows and performances.',
    color: 'rose',
  },
  {
    icon: GraduationCap,
    title: 'College Events',
    description: 'Manage fests, seminars, workshops, and cultural nights.',
    color: 'indigo',
  },
  {
    icon: Briefcase,
    title: 'Corporate Events',
    description: 'Conferences, town halls, product launches, and networking events.',
    color: 'blue',
  },
  {
    icon: PartyPopper,
    title: 'Parties & Celebrations',
    description: 'Birthday parties, weddings, reunions, and social gatherings.',
    color: 'amber',
  },
  {
    icon: BookOpen,
    title: 'Workshops & Classes',
    description: 'Skill sessions, bootcamps, training programs, and classes.',
    color: 'purple',
  },
  {
    icon: Trophy,
    title: 'Sports & Competitions',
    description: 'Tournaments, marathons, hackathons, and competitions.',
    color: 'emerald',
  },
];

const featureStrip = [
  { icon: Star, label: 'Free Forever' },
  { icon: Zap, label: '60-Second Setup' },
  { icon: QrCode, label: 'QR Code Tickets' },
  { icon: Shield, label: 'Fraud-Proof' },
];

const faqs = [
  {
    q: 'Is MakeTicket really free?',
    a: 'Yes. Our free plan allows you to create and distribute tickets for up to 2 events per month with up to 50 attendees each. No credit card required.',
  },
  {
    q: 'Do I need design skills to make tickets?',
    a: 'None at all. MakeTicket handles all the design automatically. Just enter your event details.',
  },
  {
    q: 'Can attendees access tickets on mobile?',
    a: "Absolutely. All tickets are mobile-optimized and can be saved to Apple Wallet or Google Wallet.",
  },
  {
    q: 'How does QR code scanning work?',
    a: "Each ticket has a unique QR code. At your event, open MakeTicket on any device and scan attendees in under a second.",
  },
  {
    q: 'How many tickets can I create?',
    a: 'On the free plan, up to 50 per event. Upgrade to Pro for up to 1,000 attendees per event with unlimited events.',
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

export default function CreateEventTicketsPage() {
  return (
    <StaticPageLayout
      title="Create Event Tickets Online — 100% Free"
      subtitle="Instantly generate, distribute, and scan event tickets. The easiest way to create a ticket online."
    >
      {/* JSON-LD Schema (Software + FAQ) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'MakeTicket Event Ticket Creator',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              url: 'https://maketicket.app/create-event-tickets-online-free',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
              description: 'Create event tickets online for free with QR codes instantly.',
            },
            {
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map(faq => ({
                '@type': 'Question',
                name: faq.q,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.a
                }
              }))
            }
          ]),
        }}
      />

      <div className="space-y-20">
        
        {/* Interactive Preview Layer */}
        <LiveTicketPreview />

        {/* How It Works */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">How It Works</h2>
          <p className="text-slate-600 text-center mb-10 max-w-xl mx-auto">
            Three simple steps to go from zero to fully-ticketed event.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${colorMap[step.color]} border flex items-center justify-center`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-4xl font-bold text-indigo-100 mb-2">{`0${i + 1}`}</div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* What You Can Make */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            What You Can Make
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-xl mx-auto">
            From concerts to corporate events, MakeTicket works for any occasion.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${colorMap[uc.color]} border flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{uc.title}</h3>
                  <p className="text-slate-600">{uc.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Feature Strip */}
        <section className="bg-slate-50 rounded-2xl p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featureStrip.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-slate-900 text-center">{f.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-3">Ready to make your first ticket?</h2>
          <p className="text-white/80 mb-8 text-lg">
            Join thousands of event organizers who use MakeTicket every day.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-indigo-600 font-semibold rounded-full px-8 py-3 hover:bg-slate-100 transition-colors"
          >
            Create Free Tickets →
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
                  <span className="text-indigo-600 text-xl group-open:rotate-45 transition-transform">
                    +
                  </span>
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
