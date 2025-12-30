'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    FileText,
    Settings,
    ShieldCheck,
    LogOut,
    ArrowLeft,
    Server,
    Mail
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const navItems = [
        { name: 'Overview', href: '/admin', icon: LayoutDashboard },
        { name: 'System Logs', href: '/admin/logs', icon: FileText },
        { name: 'Email Templates', href: '/admin/email-templates', icon: Mail },
        { name: 'Server Status', href: '/admin/status', icon: Server },
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

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
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
