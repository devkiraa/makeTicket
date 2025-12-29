import Link from 'next/link';
import { Ticket, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StaticPageLayoutProps {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    backLink?: string;
}

export default function StaticPageLayout({ title, subtitle, children, backLink = '/' }: StaticPageLayoutProps) {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="px-4 lg:px-6 h-16 flex items-center border-b border-slate-100 sticky top-0 z-50 bg-white/90 backdrop-blur-xl">
                <Link className="flex items-center justify-center gap-2.5" href="/">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                        <Ticket className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-900">MakeTicket</span>
                </Link>
                <nav className="ml-auto flex items-center gap-4">
                    <Link href="/login">
                        <Button className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-semibold">
                            Get Started
                        </Button>
                    </Link>
                </nav>
            </header>

            {/* Page Header */}
            <div className="bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
                <div className="container px-4 md:px-6">
                    <Link href={backLink} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Link>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">{title}</h1>
                    {subtitle && <p className="text-lg text-slate-600 max-w-2xl">{subtitle}</p>}
                </div>
            </div>

            {/* Content */}
            <main className="container px-4 md:px-6 py-12 md:py-16">
                {children}
            </main>

            {/* Footer */}
            <footer className="py-8 border-t border-slate-100 bg-slate-50">
                <div className="container px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-500">© 2025 MakeTicket. All rights reserved.</p>
                    <div className="flex gap-6 text-sm text-slate-500">
                        <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
                        <Link href="/terms" className="hover:text-slate-900">Terms</Link>
                        <Link href="/contact" className="hover:text-slate-900">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
