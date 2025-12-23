'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Calendar,
    Settings,
    LogOut,
    Ticket,
    Users,
    TrendingUp,
    ChevronRight,
    Bell
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [userEmail, setUserEmail] = useState('');

    useEffect(() => {
        // Parse token from URL (if redirected from Google Auth)
        const params = new URLSearchParams(window.location.search);
        const tokenFromUrl = params.get('token');
        if (tokenFromUrl) {
            localStorage.setItem('auth_token', tokenFromUrl);
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
        } else {
            try {
                const userPayload = JSON.parse(atob(token.split('.')[1]));
                setUserEmail(userPayload.email);
            } catch (e) {
                // ignore
            }
        }
    }, [router]);

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Events', href: '/dashboard/events', icon: Calendar },
        { name: 'Attendees', href: '/dashboard/attendees', icon: Users },
        { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-indigo-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col fixed inset-y-0 z-50">
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Ticket className="h-6 w-6" />
                        <span className="font-bold text-xl tracking-tight text-slate-900">GrabMyPass</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Button
                                key={item.href}
                                variant="ghost"
                                className={`w-full justify-start font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                                onClick={() => router.push(item.href)}
                            >
                                <Icon className="mr-3 h-5 w-5" />
                                {item.name}
                            </Button>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100 space-y-1">
                    <Button
                        variant="ghost"
                        className={`w-full justify-start font-medium ${pathname === '/dashboard/settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                        onClick={() => router.push('/dashboard/settings')}
                    >
                        <Settings className="mr-3 h-5 w-5" />
                        Settings
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { localStorage.removeItem('auth_token'); router.push('/login'); }}
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center md:hidden">
                        <Ticket className="h-6 w-6 text-indigo-600" />
                    </div>

                    <div className="hidden md:flex items-center text-slate-500 text-sm">
                        <span>Dashboard</span>
                        <ChevronRight className="h-4 w-4 mx-2" />
                        <span className="font-medium text-slate-900">
                            {pathname === '/dashboard' ? 'Overview' : pathname.split('/').pop()?.charAt(0).toUpperCase() + pathname.split('/').pop()?.slice(1)!}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div id="header-actions" className="flex items-center gap-3"></div>
                        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-indigo-600 relative">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
                        </Button>
                        <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
                            {userEmail ? userEmail[0].toUpperCase() : 'U'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-8 flex-1">
                    {children}
                </div>
            </main>
        </div>
    );
}
