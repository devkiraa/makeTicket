'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    FileText,
    Settings,
    ShieldCheck,
    ShieldAlert,
    LogOut,
    ArrowLeft,
    Server,
    Mail,
    Users,
    Monitor,
    MessageSquare,
    DollarSign,
    Wallet,
    CreditCard,
    Ticket
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const navSections = [
        {
            title: 'General',
            items: [
                { name: 'Overview', href: '/admin', icon: LayoutDashboard },
                { name: 'Revenue', href: '/admin/revenue', icon: DollarSign },
            ]
        },
        {
            title: 'Users & Support',
            items: [
                { name: 'All Users', href: '/admin/users', icon: Users },
                { name: 'Active Sessions', href: '/admin/sessions', icon: Monitor },
                { name: 'Support Tickets', href: '/admin/support', icon: MessageSquare },
            ]
        },
        {
            title: 'System & Security',
            items: [
                { name: 'System Logs', href: '/admin/logs', icon: FileText },
                { name: 'Server Status', href: '/admin/status', icon: Server },
                { name: 'Security Overview', href: '/admin/security', icon: ShieldCheck },
                { name: 'Threat Events', href: '/admin/security/events', icon: ShieldAlert },
            ]
        },
        {
            title: 'Communications',
            items: [
                { name: 'System Email', href: '/admin/email', icon: Mail },
                { name: 'Email Logs', href: '/admin/email-logs', icon: Mail },
                { name: 'Email Templates', href: '/admin/email-templates', icon: FileText },
            ]
        },
        {
            title: 'Billing & Configuration',
            items: [
                { name: 'Plan Limits', href: '/admin/plans', icon: CreditCard },
                { name: 'Payment Verification', href: '/admin/payments', icon: Wallet },
                { name: 'Ticket Templates', href: '/admin/ticket-templates', icon: Ticket },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-purple-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 z-50">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-purple-400">
                        <ShieldCheck className="h-6 w-6" />
                        <span className="font-bold text-xl tracking-tight text-white">Admin Panel</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                    {navSections.map((section, idx) => (
                        <div key={idx}>
                            {section.title && (
                                <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    {section.title}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname === item.href;
                                    return (
                                        <Button
                                            key={item.href}
                                            variant="ghost"
                                            className={`w-full justify-start font-medium ${isActive ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                            onClick={() => router.push(item.href)}
                                        >
                                            <Icon className="mr-3 h-5 w-5" />
                                            {item.name}
                                        </Button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                        onClick={() => router.push('/dashboard')}
                    >
                        <ArrowLeft className="mr-3 h-5 w-5" />
                        Back to App
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        onClick={() => { localStorage.removeItem('auth_token'); router.push('/login'); }}
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
