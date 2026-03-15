import type { Metadata } from 'next';
import StaticPageLayout from '@/components/StaticPageLayout';
import Link from 'next/link';
import {
  Palette,
  Mail,
  QrCode,
  Users,
  Download,
  Presentation,
  Utensils,
  CalendarRange,
  School,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Online Ticket Creator — Create Digital Event Tickets Free | MakeTicket',
  description:
    "Use MakeTicket's free online ticket creator to design and distribute digital event tickets with QR codes. Simple, fast, and professional.",
  keywords: [
    'ticket creator',
    'ticket creator online',
    'online ticket creator',
    'online ticket creator free',
    'create digital tickets',
    'create a ticket online',
    'create a ticket online free',
  ],
  openGraph: {
    title: 'Online Ticket Creator — Create Digital Event Tickets Free | MakeTicket',
    description:
      "Use MakeTicket's free online ticket creator to design and distribute digital event tickets with QR codes. Simple, fast, and professional.",
    url: 'https://maketicket.app/ticket-creator',
    type: 'website',
  },
  alternates: {
    canonical: 'https://maketicket.app/ticket-creator',
  },
};

const creatorFeatures = [
  {
    icon: Palette,
    title: 'Branded Design',
    description: 'Your event banner, colors, and logo automatically applied to every ticket.',
    color: 'indigo',
  },
  {
    icon: Presentation,
    title: 'Custom Attendee Fields',
    description: 'Collect any info you need — name, phone, college, t-shirt size, or dietary restrictions.',
    color: 'blue',
  },
  {
    icon: Mail,
    title: 'Auto Email Delivery',
    description: 'Every ticket is emailed to attendees automatically upon registration.',
    color: 'purple',
  },
  {
    icon: QrCode,
    title: 'Unique QR Codes',
    description: 'Each ticket gets an encrypted QR code. No two are alike.',
    color: 'green',
  },
  {
    icon: Users,
    title: 'Multi-Role Team',
    description: 'Add coordinators who can scan tickets without accessing your full dashboard.',
    color: 'amber',
  },
  {
    icon: Download,
    title: 'Export Attendee Data',
    description: 'Download your full attendee list as CSV anytime.',
    color: 'rose',
  },
];

const testimonials = [
  {
    quote:
      "MakeTicket made our annual college fest ticketing seamless. We sold 800 tickets in just 3 days and check-in took under 2 minutes per batch. Absolutely love it!",
    name: 'Maria Santos',
    role: 'Student Event Organizer, Manila, Philippines',
    avatar: 'MS',
    color: 'from-violet-500 to-indigo-600',
  },
  {
    quote:
      "We switched from a paid platform to MakeTicket for our quarterly town halls. The QR scanning is lightning fast and the free tier handles all our internal events perfectly.",
    name: 'Ankit Verma',
    role: 'Corporate Events Manager, Bengaluru, India',
    avatar: 'AV',
    color: 'from-indigo-500 to-blue-600',
  },
  {
    quote:
      "I organize a monthly community cooking workshop. MakeTicket helped me cap seats at 20 people, collect dietary restrictions, and send tickets automatically. Game changer!",
    name: 'Priya Nair',
    role: 'Community Workshop Organizer',
    avatar: 'PN',
    color: 'from-emerald-500 to-teal-600',
  },
];

const useCases = [
  {
    icon: Presentation,
    title: 'Conference Organizers',
    description:
      'Manage hundreds of registrations, multiple ticket types, and team check-in scanning. MakeTicket scales with your conference, from 50 to 5,000 attendees.',
  },
  {
    icon: Utensils,
    title: 'Workshop Hosts',
    description:
      'Limit seats, collect dietary info, send reminders, and track who showed up. Perfect for skill sessions, cooking classes, and training programs.',
  },
  {
    icon: CalendarRange,
    title: 'Festival Coordinators',
    description:
      'Handle multi-day events, gate access, and real-time headcounts with ease.',
  },
  {
    icon: School,
    title: 'School & College Events',
    description:
      'Free tier perfect for student-organized fests, seminars, and sports days. No budget? No problem.',
  },
];

const faqs = [
  {
    q: 'Is the ticket creator really free?',
    a: 'Yes. Create up to 2 events per month with up to 50 attendees each, completely free. No credit card required.',
  },
  {
    q: 'Do I need to know how to code or design?',
    a: 'No skills needed at all. Just fill in your event details and MakeTicket does the rest.',
  },
  {
    q: 'Can I create tickets for paid events?',
    a: 'Yes. MakeTicket supports payment collection via UPI and card, so you can sell tickets and collect payments directly.',
  },
  {
    q: 'What devices can attendees use to view their ticket?',
    a: 'Any smartphone, tablet, or computer. Tickets are web-based and also work in Apple Wallet and Google Wallet.',
  },
  {
    q: 'How do I scan tickets at my event?',
    a: "Open MakeTicket on any phone or tablet, go to your event's check-in page, and scan QR codes using the camera. No special hardware needed.",
  },
];

const colorMap: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
};

export default function TicketCreatorPage() {
  return (
    <StaticPageLayout
      title="Online Ticket Creator"
      subtitle="Design and share professional digital tickets for any event — completely free."
    >
      <div className="space-y-20">
        {/* Creator Features */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-4 text-center">
            Everything the Creator Needs
          </h2>
          <p className="text-slate-600 text-center mb-10 max-w-xl mx-auto">
            Powerful tools that make ticket creation simple, professional, and completely free.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creatorFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${colorMap[f.color]} border flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-600">{f.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Testimonials */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Loved by Event Organizers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-amber-400 text-lg">
                      ★
                    </span>
                  ))}
                </div>
                <p className="text-slate-600 italic flex-1 mb-6">&quot;{t.quote}&quot;</p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-sm text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Use Case Deep Dive */}
        <section>
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Built for Every Event Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <div
                  key={i}
                  className="p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-lg transition-shadow"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{uc.title}</h3>
                  <p className="text-slate-600 mb-4">{uc.description}</p>
                  <Link
                    href="/features"
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                  >
                    → See how it works
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-3">Start Creating Tickets for Free</h2>
          <p className="text-white/80 mb-8 text-lg">
            No credit card. No design knowledge. Just a great event.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-indigo-600 font-semibold rounded-full px-8 py-3 hover:bg-slate-100 transition-colors"
          >
            Create My First Ticket →
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
