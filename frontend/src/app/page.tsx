import Link from "next/link"
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
  Play
} from "lucide-react"

export default function LandingPage() {
  const stats = [
    { value: '10K+', label: 'Events Created' },
    { value: '500K+', label: 'Tickets Issued' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9★', label: 'User Rating' }
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

  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'Event Director, TechCon',
      content: 'MakeTicket made our 5000+ attendee conference a breeze. The QR check-in saved us hours!',
      avatar: 'SC'
    },
    {
      name: 'Rahul Sharma',
      role: 'College Fest Coordinator',
      content: 'From zero to launching our fest registration in 30 minutes. Absolutely incredible.',
      avatar: 'RS'
    },
    {
      name: 'Emily Watson',
      role: 'Wedding Planner',
      content: 'Finally, an elegant solution for managing RSVPs. My clients love the sleek tickets.',
      avatar: 'EW'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 antialiased">

      {/* Navbar */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-slate-100/50 backdrop-blur-xl sticky top-0 z-50 bg-white/80">
        <Link className="flex items-center justify-center gap-2.5" href="/">
          <img src="/logo.png" alt="MakeTicket" className="h-10 w-10 rounded-xl shadow-lg shadow-indigo-200" />
          <span className="font-bold text-xl tracking-tight text-slate-900">MakeTicket</span>
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          <Link className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50 hidden md:block" href="#features">
            Features
          </Link>
          <Link className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50 hidden md:block" href="#testimonials">
            Reviews
          </Link>
          <Link className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50 hidden md:block" href="#pricing">
            Pricing
          </Link>
          <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block" />
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 hidden md:block">
            Sign In
          </Link>
          <Link href="/login">
            <Button className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all hover:scale-105 font-semibold shadow-lg shadow-slate-200">
              Get Started Free
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/50 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-[100px] animate-pulse delay-1000" />
          <div className="absolute bottom-0 left-1/2 w-[800px] h-[400px] bg-green-100/30 rounded-full blur-[100px]" />

          <div className="container relative z-10 px-4 md:px-6 py-20 md:py-32 lg:py-40">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-indigo-700 mb-8 shadow-sm">
                <Sparkles className="w-4 h-4" />
                <span>Free forever for small events</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
                Event ticketing
                <br />
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  made effortless
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                Create stunning event pages, sell tickets, and check-in guests with QR codes.
                All in one beautiful platform.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Link href="/login">
                  <Button className="h-14 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-full text-lg transition-all hover:scale-105 shadow-xl shadow-indigo-200 gap-2">
                    Start Creating
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="h-14 px-8 border-slate-200 bg-white/80 backdrop-blur-sm hover:bg-slate-50 text-slate-700 rounded-full text-lg gap-2">
                  <Play className="w-5 h-5 fill-slate-600" />
                  Watch Demo
                </Button>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                {stats.map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-slate-900">{stat.value}</div>
                    <div className="text-sm text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image/Mockup */}
            <div className="mt-20 max-w-5xl mx-auto relative">
              <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-200/50 overflow-hidden">
                {/* Browser Chrome */}
                <div className="h-12 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="h-7 w-80 bg-white rounded-lg border border-slate-200 flex items-center px-3 text-xs text-slate-400">
                      <Globe className="w-3 h-3 mr-2" />
                      maketicket.app/dashboard
                    </div>
                  </div>
                </div>
                {/* Dashboard Preview */}
                <div className="p-6 bg-gradient-to-br from-slate-50 to-white min-h-[400px]">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {['Revenue', 'Tickets', 'Events'].map((label, i) => (
                      <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                        <div className="text-xs text-slate-500 mb-1">{label}</div>
                        <div className="text-xl font-bold text-slate-900">
                          {i === 0 ? '₹45,000' : i === 1 ? '1,247' : '8'}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-semibold text-slate-900">Recent Events</div>
                        <div className="text-xs text-indigo-600 font-medium">View all</div>
                      </div>
                      <div className="space-y-3">
                        {['Tech Conference 2025', 'Summer Music Fest', 'Product Launch'].map((event, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                              {event[0]}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-900">{event}</div>
                              <div className="text-xs text-slate-400">{200 - i * 50}+ attendees</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl p-4 text-white">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="w-5 h-5" />
                        <span className="text-sm font-semibold">Quick Check-in</span>
                      </div>
                      <div className="bg-white/20 backdrop-blur rounded-lg p-4 flex items-center justify-center">
                        <QrCode className="w-20 h-20 text-white/80" />
                      </div>
                      <div className="text-center mt-3 text-sm text-white/80">Scan to check-in</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -left-8 top-1/3 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 animate-bounce hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">New Registration</div>
                    <div className="text-sm font-semibold text-slate-900">John just signed up!</div>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-1/4 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 hidden lg:block" style={{ animation: 'bounce 2s infinite 0.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Check-in Success</div>
                    <div className="text-sm font-semibold text-slate-900">TKT-A3F2 verified ✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By */}
        <section className="py-16 border-y border-slate-100 bg-slate-50/50">
          <div className="container px-4 md:px-6">
            <p className="text-center text-sm text-slate-500 mb-8">Trusted by event organizers worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60">
              {['TechCrunch', 'ProductHunt', 'YCombinator', 'Stripe', 'Vercel'].map((brand) => (
                <div key={brand} className="text-xl md:text-2xl font-bold text-slate-400 tracking-tight">
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-white">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 mb-4">
                <Zap className="w-4 h-4" />
                Powerful Features
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                Everything you need to run
                <br className="hidden md:block" />
                <span className="text-indigo-600">successful events</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                From registration to check-in, we've got every step covered with delightful features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => {
                const colorClasses: Record<string, string> = {
                  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                  green: 'bg-green-50 text-green-600 border-green-100',
                  blue: 'bg-blue-50 text-blue-600 border-blue-100',
                  purple: 'bg-purple-50 text-purple-600 border-purple-100',
                  amber: 'bg-amber-50 text-amber-600 border-amber-100',
                  rose: 'bg-rose-50 text-rose-600 border-rose-100'
                };
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    className="group p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-xl hover:border-slate-200 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`w-12 h-12 rounded-xl ${colorClasses[feature.color]} border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
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

        {/* How It Works */}
        <section className="py-24 bg-slate-50">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                Get started in <span className="text-indigo-600">3 simple steps</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { step: '01', title: 'Create Event', desc: 'Set up your event with our beautiful drag-and-drop builder in minutes.' },
                { step: '02', title: 'Share Link', desc: 'Share your unique event page and start collecting registrations.' },
                { step: '03', title: 'Check-in', desc: 'Use our scanner app to verify tickets and welcome your guests.' }
              ].map((item, i) => (
                <div key={i} className="relative text-center">
                  <div className="text-6xl font-bold text-indigo-100 mb-4">{item.step}</div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600">{item.desc}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-8 -right-4 w-8">
                      <ChevronRight className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-24 bg-white">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                Loved by <span className="text-indigo-600">event organizers</span>
              </h2>
              <p className="text-lg text-slate-600">See what our users have to say about MakeTicket</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials.map((testimonial, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow"
                >
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-6">{testimonial.content}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{testimonial.name}</div>
                      <div className="text-sm text-slate-500">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

          <div className="container px-4 md:px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                Ready to create your first event?
              </h2>
              <p className="text-xl text-white/80 mb-10">
                Join thousands of organizers who trust MakeTicket. Start free, upgrade when you need.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button className="h-14 px-8 bg-white text-indigo-600 hover:bg-slate-100 font-semibold rounded-full text-lg transition-all hover:scale-105 shadow-xl gap-2">
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Button variant="outline" className="h-14 px-8 border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white rounded-full text-lg">
                  Talk to Sales
                </Button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-16 bg-slate-900 text-white">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="MakeTicket" className="h-8 w-8 rounded-lg" />
                <span className="font-bold text-lg">MakeTicket</span>
              </div>
              <p className="text-slate-400 text-sm">
                The modern event ticketing platform for organizers who want more.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white transition-colors">Integrations</Link></li>
                <li><Link href="/api-docs" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/community" className="hover:text-white transition-colors">Community</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
                <li><Link href="/licenses" className="hover:text-white transition-colors">Licenses</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">© 2025 MakeTicket. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
