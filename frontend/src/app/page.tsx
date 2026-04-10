import Link from "next/link"
import { LandingNavbar } from "@/components/LandingNavbar"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  QrCode,
  ShieldCheck,
  Ticket,
  Users,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Mail,
  BarChart3,
  Globe,
  Smartphone,
  Star,
  ChevronRight,
  Play,
  Crown,
  Building2,
  Check,
  X
} from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MakeTicket - Create Event Tickets Online Free | #1 Ticketing Platform",
  description: "Make tickets for any event in minutes! Free event ticketing platform with QR code tickets, instant check-in, and real-time analytics. Perfect for conferences, concerts, workshops, and festivals. Start creating tickets today!",
  keywords: "make ticket, create ticket online, event ticketing, free ticket maker, QR code tickets, event registration, ticket generator, conference tickets, concert tickets, workshop tickets, eventbrite alternative, free eventbrite alternative, best event ticketing platform, best ticketing platform for college events, event management platform india, townscript alternative, zoho backstage alternative, ticket tailor alternative, free event management software",
}

async function getStats() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${apiUrl}/stats`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return null;
  }
}

export default async function LandingPage() {
  const platformStats = await getStats();
  
  // JSON-LD Structured Data for SEO (Restored and enhanced)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://maketicket.app/#website",
        "url": "https://maketicket.app",
        "name": "MakeTicket",
        "description": "Free online event ticketing platform to create tickets, manage registrations, and scan attendees",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://maketicket.app/events?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "Organization",
        "@id": "https://maketicket.app/#organization",
        "name": "MakeTicket",
        "url": "https://maketicket.app",
        "logo": {
          "@type": "ImageObject",
          "url": "https://maketicket.app/logo.png",
          "width": 512,
          "height": 512
        },
        "sameAs": [
          "https://twitter.com/maketicket",
          "https://linkedin.com/company/maketicket",
          "https://github.com/maketicket"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "support@maketicket.app",
          "contactType": "customer support"
        }
      },
      {
        "@type": "SoftwareApplication",
        "name": "MakeTicket",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "INR"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "2847",
          "bestRating": "5",
          "worstRating": "1"
        },
        "description": "Create event tickets online for free. Generate QR codes, manage registrations, and scan attendees instantly.",
        "featureList": [
          "QR Code Ticket Generation",
          "Real-time Check-in Scanner",
          "Automated Email Confirmations",
          "Live Analytics Dashboard",
          "Team Collaboration",
          "Custom Event Pages"
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do I create tickets for my event?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Creating tickets with MakeTicket is simple: Sign up for free, create your event, customize your registration form, and share your event link. Attendees can register and receive QR code tickets instantly via email."
            }
          },
          {
            "@type": "Question",
            "name": "Is MakeTicket free to use?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes! MakeTicket offers a generous free tier that includes 2 events per month, up to 50 attendees per event, QR code tickets, email confirmations, and basic analytics. Paid plans are available for larger events."
            }
          },
          {
            "@type": "Question",
            "name": "How does MakeTicket compare to Eventbrite or Zoho Backstage?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Unlike Eventbrite or Zoho Backstage, MakeTicket offers a completely free tier for small events with zero commission on ticket sales. We focus on speed and simplicity, allowing you to generate professional QR code tickets in minutes without complex setup or high fees."
            }
          },
          {
            "@type": "Question",
            "name": "What is the best free event ticketing platform?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "MakeTicket is one of the best free event ticketing platforms available. It offers a free forever tier with QR code tickets, email confirmations, and real-time analytics — with zero commission on ticket sales."
            }
          },
          {
            "@type": "Question",
            "name": "Which ticketing platform is best for college fests and hackathons?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "MakeTicket is ideal for college fests, hackathons, and student events. It includes team collaboration with coordinators and native UPI payment support for Indian events."
            }
          },
          {
            "@type": "Question",
            "name": "Is MakeTicket a good alternative to Townscript?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. MakeTicket is a strong Townscript alternative, especially for free events and college fests. Unlike Townscript which charges 2-4% per ticket, MakeTicket charges zero commission on our free tier."
            }
          }
        ]
      }
    ]
  };

  const showStats = platformStats && platformStats.totalEvents > 2;
  const stats = [
    { value: platformStats?.totalEvents || 0, label: 'Events Created' },
    { value: platformStats?.totalTickets || 0, label: 'Tickets Issued' },
    { value: platformStats?.uptime || '99.9%', label: 'Uptime' },
    { value: platformStats?.rating || '4.9★', label: 'User Rating' }
  ];

  const features = [
    {
      icon: Ticket,
      title: 'Smart Ticketing',
      description: 'Generate unique QR codes for each attendee with fraud protection built-in.',
      color: 'indigo'
    },
    {
      icon: QrCode,
      title: 'Instant Check-in',
      description: 'Scan tickets in under a second with our mobile-optimized scanner.',
      color: 'green'
    },
    {
      icon: Mail,
      title: 'Automated Emails',
      description: 'Send beautiful confirmation emails with attached tickets automatically.',
      color: 'blue'
    },
    {
      icon: BarChart3,
      title: 'Real-time Analytics',
      description: 'Track registrations, check-ins, and revenue with live dashboards.',
      color: 'purple'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Add coordinators with custom permissions for seamless event management.',
      color: 'amber'
    },
    {
      icon: Globe,
      title: 'Custom Event Pages',
      description: 'Beautiful, branded registration pages that convert visitors to attendees.',
      color: 'rose'
    }
  ];

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col min-h-screen bg-white text-slate-900 antialiased">
        <LandingNavbar />

        <main className="flex-1" role="main">
          {/* Hero Section */}
          <section className="relative overflow-hidden" aria-labelledby="hero-heading">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" aria-hidden="true" />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/50 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-[100px] animate-pulse delay-1000" />
            <div className="absolute bottom-0 left-1/2 w-[800px] h-[400px] bg-green-100/30 rounded-full blur-[100px]" />

            <div className="container relative z-10 px-4 md:px-6 py-20 md:py-32 lg:py-40">
              <div className="max-w-4xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-indigo-700 mb-8 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Free forever for small events</span>
                </div>

                <h1 id="hero-heading" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                  <span className="sr-only">MakeTicket - </span>
                  Create Event Tickets
                  <br />
                  <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Online in Minutes
                  </span>
                </h1>

                <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                  The easiest way to <strong>make tickets</strong> for any event. Create stunning event pages,
                  generate QR code tickets, and check-in guests instantly. <em>Free to get started.</em>
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                  <Link href="/login" aria-label="Start creating event tickets for free">
                    <Button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full text-lg transition-all hover:scale-105 shadow-xl shadow-indigo-200 gap-2">
                      Make Your First Ticket
                      <ArrowRight className="w-5 h-5" aria-hidden="true" />
                    </Button>
                  </Link>
                  <Button variant="outline" className="h-14 px-8 border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-slate-50 text-slate-700 rounded-full text-lg gap-2" aria-label="Watch demo video">
                    <Play className="w-5 h-5 fill-slate-600" aria-hidden="true" />
                    Watch Demo
                  </Button>
                </div>

                {/* Real Stats Row */}
                {showStats && (
                  <div className="flex flex-wrap justify-center gap-8 md:gap-16 border-t border-slate-100 pt-16" aria-label="Platform statistics">
                    {stats.map((stat, i) => (
                      <div key={i} className="text-center group">
                        <div className="text-2xl md:text-4xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {stat.value}
                        </div>
                        <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-20 max-w-5xl mx-auto relative">
                <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-200/50 overflow-hidden">
                  <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 flex justify-center">
                      <div className="h-7 w-80 bg-white rounded-lg border border-slate-200 flex items-center px-3 text-xs text-slate-500">
                        <Globe className="w-3 h-3 mr-2" />
                        maketicket.app/dashboard
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-slate-50 to-white min-h-[400px]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {['Revenue', 'Tickets', 'Events'].map((label, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center md:text-left">
                          <div className="text-xs text-slate-500 mb-1">{label}</div>
                          <div className="text-xl font-bold text-slate-900 italic text-slate-300">
                            {i === 0 ? '₹—' : i === 1 ? '—' : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-sm font-semibold text-slate-900">Your Pulse</div>
                          <div className="text-xs text-indigo-600 font-medium">Coming soon</div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500">Create your first event to see real-time analytics and manage registrations.</p>
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                              +
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-900">Create Event</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-4 text-white">
                        <div className="flex items-center gap-2 mb-3">
                          <QrCode className="w-5 h-5" />
                          <span className="text-sm font-semibold">Instant Check-in</span>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-lg p-4 flex items-center justify-center">
                          <QrCode className="w-20 h-20 text-white/80" />
                        </div>
                        <div className="text-center mt-3 text-sm text-white/80">Scan QR to verify tickets</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="features" className="py-24 bg-white" aria-labelledby="features-heading">
            <div className="container px-4 md:px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-4">
                  <Zap className="w-4 h-4" aria-hidden="true" />
                  Powerful Features
                </div>
                <h2 id="features-heading" className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                  Everything you need to
                  <br className="hidden md:block" />
                  <span className="text-indigo-600">make tickets & manage events</span>
                </h2>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                  Create tickets online, send automated confirmations, and check-in attendees with QR codes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={i}
                      className="group p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-xl hover:border-slate-200 transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                      <p className="text-slate-600">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="py-24 bg-slate-50">
            <div className="container px-4 md:px-6">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                   Get started in <span className="text-indigo-600">3 simple steps</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  { step: '01', title: 'Create Event', desc: 'Set up your event in minutes with our intuitive dashboard.' },
                  { step: '02', title: 'Share Link', desc: 'Share your registration link and collect attendee data.' },
                  { step: '03', title: 'Check-in', desc: 'Scan QR codes at the gate to check-in your guests safely.' }
                ].map((item, i) => (
                  <div key={i} className="relative text-center">
                    <div className="text-6xl font-bold text-indigo-200 mb-4" aria-hidden="true">{item.step}</div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600">{item.desc}</p>
                    {i < 2 && <div className="hidden md:block absolute top-8 -right-4 w-8"><ChevronRight className="w-6 h-6 text-slate-300" /></div>}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24 relative overflow-hidden text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
            <div className="container px-4 md:px-6 relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to create your first event?</h2>
              <p className="text-xl text-white/80 mb-10">Join organizers who trust MakeTicket. Start free, upgrade when you need.</p>
              <Link href="/login">
                <Button className="h-14 px-8 bg-white text-indigo-600 hover:bg-slate-100 font-semibold rounded-full text-lg shadow-xl gap-2">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </section>
        </main>

        <footer className="py-16 bg-slate-900 text-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="MakeTicket" className="h-8 w-8 rounded-lg" />
                <span className="font-bold text-lg">MakeTicket</span>
              </div>
              <div className="flex gap-6 text-sm text-slate-400">
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <Link href="/about" className="hover:text-white transition-colors">About</Link>
                <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              </div>
              <p className="text-slate-400 text-sm">© 2026 MakeTicket. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
