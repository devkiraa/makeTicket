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
  Play
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100">

      {/* Navbar */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-slate-100 backdrop-blur-md sticky top-0 z-50 bg-white/80">
        <Link className="flex items-center justify-center gap-2" href="#">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 font-inter">GrabMyPass</span>
        </Link>
        <nav className="ml-auto flex items-center gap-6 sm:gap-8">
          <Link className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors hidden md:block" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors hidden md:block" href="#testimonials">
            Testimonials
          </Link>
          <Link href="/login">
            <Button className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-all hover:scale-105 font-medium shadow-sm hover:shadow-md">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">

        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 flex flex-col items-center justify-center relative overflow-hidden bg-slate-50/50">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-200/40 blur-[120px] rounded-full pointer-events-none opacity-60" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-green-200/30 blur-[100px] rounded-full pointer-events-none opacity-50" />

          <div className="container px-4 md:px-6 relative z-10 text-center">
            <div className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 mb-8 backdrop-blur-sm shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-indigo-600 mr-2 animate-pulse"></span>
              The Future of Ticketing is Here
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6 text-slate-900 leading-tight">
              Where Events <span className="text-indigo-600 relative whitespace-nowrap">
                Begin
                <svg className="absolute w-full h-3 -bottom-1 lg:-bottom-2 left-0 text-indigo-200 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>, <br className="hidden md:block" />
              and Memories <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-green-500">Get Made</span>.
            </h1>

            <p className="mx-auto max-w-[700px] text-slate-600 md:text-xl leading-relaxed mb-10 font-medium">
              Launch your event in minutes. Validated by thousands. <br />
              No-code builder, secure QR ticketing, and instant analytics.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login">
                <Button className="h-12 px-8 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-full text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                  Create Event
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" className="h-12 px-8 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-lg shadow-sm">
                  <Play className="w-4 h-4 mr-2 fill-slate-700" />
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Floating UI Elements Mockup */}
            <div className="mt-20 relative w-full max-w-4xl mx-auto h-[300px] md:h-[400px] perspective-1000 hidden md:block">
              {/* Center Card */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">T</div>
                    <div>
                      <div className="h-2 w-24 bg-slate-200 rounded mb-2"></div>
                      <div className="h-2 w-16 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-32 bg-slate-50 rounded-lg w-full border-2 border-slate-100 border-dashed flex items-center justify-center">
                    <div className="text-slate-400 text-sm font-medium">Event Banner Placeholder</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-slate-100 rounded"></div>
                    <div className="h-10 bg-indigo-600 rounded shadow-md shadow-indigo-200"></div>
                  </div>
                </div>
              </div>

              {/* Floating Badge Left */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 transform -rotate-6 bg-white border border-slate-100 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-20 animate-bounce delay-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Zap className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Sales Velocity</div>
                    <div className="font-bold text-slate-900 text-lg">+124%</div>
                  </div>
                </div>
              </div>

              {/* Floating Badge Right */}
              <div className="absolute top-1/3 right-0 transform rotate-12 bg-white border border-slate-100 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-10 animate-bounce delay-1000">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Total Check-ins</div>
                    <div className="font-bold text-slate-900 text-lg">2,451</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features Section */}
        <section id="features" className="w-full py-24 bg-white relative">
          <div className="container px-4 md:px-6">
            <div className="mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">
                Get Started with <br />
                <span className="text-indigo-600">Your Favourite Features</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
              {/* Large Card 1 */}
              <div className="md:col-span-2 rounded-[2rem] bg-indigo-50 border border-indigo-100 p-8 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Ticket className="w-48 h-48 text-indigo-600" />
                </div>
                <div className="relative z-10 h-full flex flex-col justify-end">
                  <div className="p-3 w-fit bg-white rounded-2xl mb-4 shadow-sm">
                    <Ticket className="text-indigo-600 w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Build Better Platforms</h3>
                  <p className="text-slate-600 max-w-md">Customize your event page with our drag-and-drop builder. No coding required, just pure creativity.</p>
                </div>
              </div>

              {/* Tall Card */}
              <div className="md:row-span-2 rounded-[2rem] bg-green-50 border border-green-100 p-8 relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-100/50" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="p-3 w-fit bg-white text-green-600 rounded-2xl mb-auto shadow-sm">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div className="mt-8 flex justify-center">
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
                      <QrCode className="w-32 h-32 text-slate-900" />
                    </div>
                  </div>
                  <div className="mt-8 text-center">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Scan for Decisions</h3>
                    <p className="text-slate-600 text-sm">Real-time check-ins with our mobile validator app. Fast and secure.</p>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-[2rem] bg-slate-50 border border-slate-100 p-8 flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
                <div className="p-3 w-fit bg-white text-purple-600 rounded-2xl shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Your Crew, Your Control</h3>
                  <p className="text-slate-600 text-sm">Assign roles to helpers, manage permissions, and keep your data safe.</p>
                </div>
                <div className="flex -space-x-2 mt-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                      U{i}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wide Card Bottom */}
              <div className="md:col-span-2 rounded-[2rem] bg-blue-50 border border-blue-100 p-8 flex items-center justify-between group hover:shadow-lg transition-all duration-300">
                <div className="max-w-md">
                  <div className="p-3 w-fit bg-white text-blue-600 rounded-2xl mb-4 shadow-sm">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Community First</h3>
                  <p className="text-slate-600">We don't own your data. You do. Export your attendee list anytime.</p>
                </div>
                <div className="hidden md:block">
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl flex items-center justify-center bg-blue-100">
                    <div className="w-24 h-24 rounded-full bg-blue-500 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Browse by Feature List */}
        <section className="w-full py-24 bg-white border-t border-slate-100">
          <div className="container px-4 md:px-6">
            <h2 className="text-4xl md:text-6xl font-bold mb-16 text-center text-slate-900 tracking-tight">Browse by Feature</h2>

            <div className="grid gap-1">
              {['Event Branding', 'Gamification', 'Registration', 'Coupons', 'Networking', 'Insights', 'Staff Privileges'].map((item, index) => (
                <div key={item} className="group flex items-center justify-between py-6 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer px-4">
                  <div className="flex items-center gap-6">
                    <span className="text-xl md:text-2xl font-mono text-slate-400 group-hover:text-indigo-600 transition-colors">0{index + 1}.</span>
                    <span className="text-2xl md:text-4xl font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{item}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center bg-white group-hover:border-indigo-600 group-hover:bg-indigo-600 transition-all">
                    <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden bg-slate-50">
          <div className="container px-4 md:px-6 relative z-10">
            <div className="rounded-[3rem] bg-slate-900 p-8 md:p-16 text-center md:text-left relative overflow-hidden shadow-2xl">
              {/* Decorative Circles */}
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[100px] opacity-40" />
              <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-green-500 rounded-full blur-[100px] opacity-30" />

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="max-w-2xl">
                  <div className="inline-block bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 text-sm text-indigo-200 mb-6 font-medium border border-white/10">
                    🚀 Start for Free
                  </div>
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                    Create Jaw Dropping Events, <br /> No-Code, No-Tech.
                  </h2>
                  <p className="text-slate-400 text-lg mb-8 max-w-lg">
                    Join thousands of organizers who trust GrabMyPass to handle their most important moments.
                  </p>
                  <Button size="lg" className="bg-green-500 hover:bg-green-400 text-slate-900 rounded-full h-14 px-8 text-lg font-bold transition-all hover:scale-105 shadow-[0_0_30px_-5px_rgba(34,197,94,0.6)]">
                    Create Event Now
                  </Button>
                </div>
                <div className="hidden md:block relative">
                  <div className="w-72 h-72 bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700 backdrop-blur-sm">
                    <div className="w-56 h-56 bg-slate-900 rounded-full flex items-center justify-center shadow-2xl border border-slate-800 relative">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500/20 to-green-500/20 animate-spin-slow" />
                      <Zap className="w-24 h-24 text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 bg-white">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li><a href="#" className="hover:text-indigo-600">Features</a></li>
                <li><a href="#" className="hover:text-indigo-600">Pricing</a></li>
                <li><a href="#" className="hover:text-indigo-600">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li><a href="#" className="hover:text-indigo-600">Docs</a></li>
                <li><a href="#" className="hover:text-indigo-600">Community</a></li>
                <li><a href="#" className="hover:text-indigo-600">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li><a href="#" className="hover:text-indigo-600">About</a></li>
                <li><a href="#" className="hover:text-indigo-600">Careers</a></li>
                <li><a href="#" className="hover:text-indigo-600">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-500 text-sm">
                <li><a href="#" className="hover:text-indigo-600">Privacy</a></li>
                <li><a href="#" className="hover:text-indigo-600">Terms</a></li>
                <li><a href="#" className="hover:text-indigo-600">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 pt-8 border-t border-slate-100">
            <p>&copy; 2024 GrabMyPass. All rights reserved.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              {/* Socials can go here */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
