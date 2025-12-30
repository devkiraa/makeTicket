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
    Bell,
    QrCode,
    Mail,
    FileText,
    CreditCard,
    Contact,
    ShieldCheck,
    Menu,
    X,
    Ghost,
    Monitor,
    Wallet,
    Server
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [userEmail, setUserEmail] = useState('');
    const [hasCoordinatorEvents, setHasCoordinatorEvents] = useState(false);
    const [coordinatorCount, setCoordinatorCount] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isUserRole, setIsUserRole] = useState(false); // Track if user has 'user' role (not host/admin)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isImpersonating, setIsImpersonating] = useState(false);

    const stopImpersonating = () => {
        const adminToken = localStorage.getItem('admin_token');
        if (adminToken) {
            localStorage.setItem('auth_token', adminToken);
            localStorage.removeItem('admin_token');
            setIsImpersonating(false);
            window.location.href = '/dashboard/admin/users';
        }
    };

    useEffect(() => {
        // Parse token from URL (if redirected from Google Auth)
        const params = new URLSearchParams(window.location.search);
        const tokenFromUrl = params.get('token');
        if (tokenFromUrl) {
            localStorage.setItem('auth_token', tokenFromUrl);
            window.history.replaceState({}, document.title, window.location.pathname);
            // Dispatch event to notify other components that token is ready
            window.dispatchEvent(new Event('tokenReady'));
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
        } else {
            try {
                const userPayload = JSON.parse(atob(token.split('.')[1]));
                setUserEmail(userPayload.email);
                setIsImpersonating(!!localStorage.getItem('admin_token'));
            } catch (e) {
                // ignore
            }

            // Check if user has any coordinated events
            const checkUserStatus = async () => {
                try {
                    // Check Coordinator Status
                    const coordRes = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/coordinators/my-events`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );

                    // Handle session terminated
                    if (coordRes.status === 401) {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('admin_token');
                        router.push('/login?sessionExpired=true');
                        return;
                    }

                    if (coordRes.ok) {
                        const events = await coordRes.json();
                        setHasCoordinatorEvents(events.length > 0);
                        setCoordinatorCount(events.length);
                    }

                    // Check Admin Status (fetch me)
                    const meRes = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`,
                        { headers: { 'Authorization': `Bearer ${token}` } }
                    );

                    // Handle session terminated
                    if (meRes.status === 401) {
                        localStorage.removeItem('auth_token');
                        localStorage.removeItem('admin_token');
                        router.push('/login?sessionExpired=true');
                        return;
                    }

                    if (meRes.ok) {
                        const me = await meRes.json();
                        if (me.role === 'admin') setIsAdmin(true);
                        if (me.role === 'user') setIsUserRole(true);
                    }
                } catch (e) {
                    console.error('Failed to check user status', e);
                }
            };
            checkUserStatus();
        }
    }, [router]);

    // Different nav items for user vs host/admin
    const navItems = isUserRole ? [
        { name: 'My Tickets', href: '/dashboard/user', icon: Ticket },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ] : [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'My Events', href: '/dashboard/events', icon: Calendar },
        { name: 'Attendees', href: '/dashboard/attendees', icon: Users },
        { name: 'Analytics', href: '/dashboard/analytics', icon: TrendingUp },
    ];

    const isUserRoute = pathname.startsWith('/dashboard/user');

    const isAdminRoute = pathname.startsWith('/dashboard/admin');

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 selection:bg-indigo-100 overflow-x-hidden">
            {/* Sidebar */}
            <aside className={`w-64 ${isAdminRoute ? 'bg-slate-900' : 'bg-white'} border-r ${isAdminRoute ? 'border-slate-800' : 'border-slate-200'} hidden md:flex flex-col fixed inset-y-0 z-50`}>
                <div className={`h-16 flex items-center px-6 border-b ${isAdminRoute ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className={`flex items-center gap-2 ${isAdminRoute ? 'text-purple-400' : 'text-indigo-600'}`}>
                        {isAdminRoute ? <ShieldCheck className="h-6 w-6" /> : <img src="/logo.png" alt="MakeTicket" className="h-8 w-8 rounded-lg" />}
                        <span className={`font-bold text-xl tracking-tight ${isAdminRoute ? 'text-white' : 'text-slate-900'}`}>
                            {isAdminRoute ? 'Admin Panel' : 'MakeTicket'}
                        </span>
                    </div>
                </div>

                {isAdminRoute ? (
                    /* ===== ADMIN SIDEBAR ===== */
                    <>
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            <div className="mb-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">Admin</span>
                            </div>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin')}
                            >
                                <LayoutDashboard className="mr-3 h-5 w-5" />
                                Overview
                            </Button>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/users' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/users')}
                            >
                                <Users className="mr-3 h-5 w-5" />
                                Users
                            </Button>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/logs' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/logs')}
                            >
                                <FileText className="mr-3 h-5 w-5" />
                                System Logs
                            </Button>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/sessions' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/sessions')}
                            >
                                <Monitor className="mr-3 h-5 w-5" />
                                Sessions
                            </Button>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/email' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/email')}
                            >
                                <Mail className="mr-3 h-5 w-5" />
                                System Email
                            </Button>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/status' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/status')}
                            >
                                <Server className="mr-3 h-5 w-5" />
                                Server Status
                            </Button>

                            <div className="pt-4 mt-4 border-t border-slate-800">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">Templates</span>
                            </div>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/email-templates' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/email-templates')}
                            >
                                <Mail className="mr-3 h-5 w-5" />
                                Email Templates
                            </Button>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/ticket-templates' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/ticket-templates')}
                            >
                                <CreditCard className="mr-3 h-5 w-5" />
                                Ticket Templates
                            </Button>

                            <div className="pt-4 mt-4 border-t border-slate-800">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">Billing</span>
                            </div>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/plans' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/plans')}
                            >
                                <CreditCard className="mr-3 h-5 w-5" />
                                Plan Limits
                            </Button>

                            <div className="pt-4 mt-4 border-t border-slate-800">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">System</span>
                            </div>
                            <Button
                                variant="ghost"
                                className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/security' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                onClick={() => router.push('/dashboard/admin/security')}
                            >
                                <Settings className="mr-3 h-5 w-5" />
                                Security
                            </Button>
                        </nav>

                        <div className="p-4 border-t border-slate-800 space-y-1">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
                                onClick={() => router.push('/dashboard')}
                            >
                                <ChevronRight className="mr-3 h-5 w-5 rotate-180" />
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
                    </>
                ) : (
                    /* ===== USER SIDEBAR ===== */
                    <>
                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {/* Main Navigation */}
                            <div className="mb-2">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Main</span>
                            </div>
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

                            {/* Coordinator Section */}
                            {hasCoordinatorEvents && (
                                <>
                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">
                                            Coordinating
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className={`w-full justify-start font-medium ${pathname === '/dashboard/coordinator'
                                            ? 'bg-purple-50 text-purple-700'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                            }`}
                                        onClick={() => router.push('/dashboard/coordinator')}
                                    >
                                        <QrCode className="mr-3 h-5 w-5" />
                                        Co-Events
                                        <span className="ml-auto bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                            {coordinatorCount}
                                        </span>
                                    </Button>
                                </>
                            )}

                            {/* Communications Section - only for hosts/admins */}
                            {!isUserRole && (
                                <>
                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">
                                            Communications
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className={`w-full justify-start font-medium ${pathname === '/dashboard/settings/emails' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                                        onClick={() => router.push('/dashboard/settings/emails')}
                                    >
                                        <Mail className="mr-3 h-5 w-5" />
                                        Email Accounts
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className={`w-full justify-start font-medium ${pathname === '/dashboard/settings/email-templates' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                                        onClick={() => router.push('/dashboard/settings/email-templates')}
                                    >
                                        <FileText className="mr-3 h-5 w-5" />
                                        Email Templates
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className={`w-full justify-start font-medium ${pathname === '/dashboard/settings/ticket-templates' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                                        onClick={() => router.push('/dashboard/settings/ticket-templates')}
                                    >
                                        <CreditCard className="mr-3 h-5 w-5" />
                                        Ticket Designer
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className={`w-full justify-start font-medium ${pathname === '/dashboard/contacts' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                                        onClick={() => router.push('/dashboard/contacts')}
                                    >
                                        <Contact className="mr-3 h-5 w-5" />
                                        Contacts
                                    </Button>
                                </>
                            )}
                        </nav>

                        <div className="p-4 border-t border-slate-100 space-y-1">
                            {/* Admin Link for admin users */}
                            {isAdmin && (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 mb-2"
                                    onClick={() => router.push('/dashboard/admin')}
                                >
                                    <ShieldCheck className="mr-3 h-5 w-5" />
                                    Admin Panel
                                </Button>
                            )}

                            {/* Billing - only for hosts/admins */}
                            {!isUserRole && (
                                <Button
                                    variant="ghost"
                                    className={`w-full justify-start font-medium ${pathname === '/dashboard/billing' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                                    onClick={() => router.push('/dashboard/billing')}
                                >
                                    <Wallet className="mr-3 h-5 w-5" />
                                    Billing
                                </Button>
                            )}

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
                    </>
                )}
            </aside>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />

                    {/* Drawer */}
                    <aside className={`fixed inset-y-0 left-0 w-72 ${isAdminRoute ? 'bg-slate-900' : 'bg-white'} shadow-xl flex flex-col`}>
                        <div className={`h-16 flex items-center justify-between px-6 border-b ${isAdminRoute ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div className={`flex items-center gap-2 ${isAdminRoute ? 'text-purple-400' : 'text-indigo-600'}`}>
                                {isAdminRoute ? <ShieldCheck className="h-6 w-6" /> : <img src="/logo.png" alt="MakeTicket" className="h-8 w-8 rounded-lg" />}
                                <span className={`font-bold text-xl tracking-tight ${isAdminRoute ? 'text-white' : 'text-slate-900'}`}>
                                    {isAdminRoute ? 'Admin Panel' : 'MakeTicket'}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className={isAdminRoute ? 'text-slate-400 hover:text-white' : ''}>
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {isAdminRoute ? (
                            /* Mobile Admin Sidebar */
                            <>
                                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                    <div className="mb-2">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">Admin</span>
                                    </div>
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/admin' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} onClick={() => { router.push('/dashboard/admin'); setMobileMenuOpen(false); }}>
                                        <LayoutDashboard className="mr-3 h-5 w-5" /> Overview
                                    </Button>
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/users' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} onClick={() => { router.push('/dashboard/admin/users'); setMobileMenuOpen(false); }}>
                                        <Users className="mr-3 h-5 w-5" /> Users
                                    </Button>
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/logs' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} onClick={() => { router.push('/dashboard/admin/logs'); setMobileMenuOpen(false); }}>
                                        <FileText className="mr-3 h-5 w-5" /> System Logs
                                    </Button>
                                    <div className="pt-4 mt-4 border-t border-slate-800">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">Templates</span>
                                    </div>
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/email-templates' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} onClick={() => { router.push('/dashboard/admin/email-templates'); setMobileMenuOpen(false); }}>
                                        <Mail className="mr-3 h-5 w-5" /> Email Templates
                                    </Button>
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/ticket-templates' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} onClick={() => { router.push('/dashboard/admin/ticket-templates'); setMobileMenuOpen(false); }}>
                                        <CreditCard className="mr-3 h-5 w-5" /> Ticket Templates
                                    </Button>
                                    <div className="pt-4 mt-4 border-t border-slate-800">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">System</span>
                                    </div>
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/admin/security' ? 'bg-purple-900/50 text-purple-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`} onClick={() => { router.push('/dashboard/admin/security'); setMobileMenuOpen(false); }}>
                                        <Settings className="mr-3 h-5 w-5" /> Security
                                    </Button>
                                </nav>
                                <div className="p-4 border-t border-slate-800 space-y-1">
                                    <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800" onClick={() => { router.push('/dashboard'); setMobileMenuOpen(false); }}>
                                        <ChevronRight className="mr-3 h-5 w-5 rotate-180" /> Back to App
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => { localStorage.removeItem('auth_token'); router.push('/login'); }}>
                                        <LogOut className="mr-3 h-5 w-5" /> Logout
                                    </Button>
                                </div>
                            </>
                        ) : (
                            /* Mobile User Sidebar */
                            <>
                                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                    <div className="mb-2">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Main</span>
                                    </div>
                                    {navItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = pathname === item.href;
                                        return (
                                            <Button key={item.href} variant="ghost" className={`w-full justify-start font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`} onClick={() => { router.push(item.href); setMobileMenuOpen(false); }}>
                                                <Icon className="mr-3 h-5 w-5" /> {item.name}
                                            </Button>
                                        );
                                    })}
                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Communications</span>
                                    </div>
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/settings/emails' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`} onClick={() => { router.push('/dashboard/settings/emails'); setMobileMenuOpen(false); }}>
                                        <Mail className="mr-3 h-5 w-5" /> Email Accounts
                                    </Button>
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/contacts' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`} onClick={() => { router.push('/dashboard/contacts'); setMobileMenuOpen(false); }}>
                                        <Contact className="mr-3 h-5 w-5" /> Contacts
                                    </Button>
                                </nav>
                                <div className="p-4 border-t border-slate-100 space-y-1">
                                    {isAdmin && (
                                        <Button variant="ghost" className="w-full justify-start font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 mb-2" onClick={() => { router.push('/dashboard/admin'); setMobileMenuOpen(false); }}>
                                            <ShieldCheck className="mr-3 h-5 w-5" /> Admin Panel
                                        </Button>
                                    )}
                                    {!isUserRole && (
                                        <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/billing' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`} onClick={() => { router.push('/dashboard/billing'); setMobileMenuOpen(false); }}>
                                            <Wallet className="mr-3 h-5 w-5" /> Billing
                                        </Button>
                                    )}
                                    <Button variant="ghost" className={`w-full justify-start font-medium ${pathname === '/dashboard/settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`} onClick={() => { router.push('/dashboard/settings'); setMobileMenuOpen(false); }}>
                                        <Settings className="mr-3 h-5 w-5" /> Settings
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { localStorage.removeItem('auth_token'); router.push('/login'); }}>
                                        <LogOut className="mr-3 h-5 w-5" /> Logout
                                    </Button>
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            )}

            {/* Main Content Wrapper */}
            <main className="flex-1 md:pl-64 flex flex-col min-h-screen min-w-0">
                {isImpersonating && (
                    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium sticky top-0 z-[60]">
                        <div className="flex items-center gap-2">
                            <Ghost className="h-4 w-4" />
                            <span>Viewing platform as <b>{userEmail}</b> (Impersonation Mode)</span>
                        </div>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-white text-amber-600 hover:bg-amber-50 h-8"
                            onClick={stopImpersonating}
                        >
                            Stop Impersonating
                        </Button>
                    </div>
                )}
                {/* Header */}
                <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 md:hidden">
                        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
                            <Menu className="h-6 w-6 text-slate-600" />
                        </Button>
                        <div className={`flex items-center gap-2 ${isAdminRoute ? 'text-purple-600' : 'text-indigo-600'}`}>
                            {isAdminRoute ? <ShieldCheck className="h-5 w-5" /> : <img src="/logo.png" alt="MakeTicket" className="h-6 w-6 rounded-md" />}
                            <span className="font-bold text-sm">{isAdminRoute ? 'Admin' : 'MakeTicket'}</span>
                        </div>
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
                        <NotificationBell />
                        <ProfileDropdown userEmail={userEmail} />
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 md:p-8 flex-1 overflow-x-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
}

// Notification Bell Component
function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUnreadCount();
        // Poll for new notifications every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/notifications/unread-count`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unreadCount);
            }
        } catch (err) {
            console.error('Failed to fetch unread count');
        }
    };

    const fetchNotifications = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/notifications?limit=10`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
            }
        } catch (err) {
            console.error('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/notifications/read-all`,
                { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } }
            );
            setUnreadCount(0);
            setNotifications(notifications.map(n => ({ ...n, isRead: true })));
        } catch (err) {
            console.error('Failed to mark all as read');
        }
    };

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            fetchNotifications();
        }
    };

    const formatTime = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'registration': return <Ticket className="w-4 h-4 text-green-500" />;
            case 'check_in': return <QrCode className="w-4 h-4 text-blue-500" />;
            case 'coordinator_invite': return <Users className="w-4 h-4 text-purple-500" />;
            default: return <Bell className="w-4 h-4 text-slate-500" />;
        }
    };

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-indigo-600 relative"
                onClick={handleOpen}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-indigo-600 hover:text-indigo-700"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif._id}
                                        className={`p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notif.isRead ? 'bg-indigo-50/50' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5">{getIcon(notif.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                                                <p className="text-xs text-slate-500 truncate">{notif.message}</p>
                                                <p className="text-xs text-slate-400 mt-1">{formatTime(notif.createdAt)}</p>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Profile Dropdown Component
function ProfileDropdown({ userEmail }: { userEmail: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [profile, setProfile] = useState<{ name?: string; username?: string; avatar?: string; googleAvatar?: string } | null>(null);

    const fetchProfile = async () => {
        // Small delay to ensure token is available after OAuth
        await new Promise(resolve => setTimeout(resolve, 150));

        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (err) {
            console.error('Failed to fetch profile');
        }
    };

    useEffect(() => {
        fetchProfile();

        // Listen for token ready event (from OAuth callback)
        const handleTokenReady = () => {
            fetchProfile();
        };
        window.addEventListener('tokenReady', handleTokenReady);

        return () => {
            window.removeEventListener('tokenReady', handleTokenReady);
        };
    }, []);

    // Get the best available avatar
    const avatarUrl = profile?.avatar || profile?.googleAvatar;

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        router.push('/login');
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-slate-100 transition-colors"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Profile"
                        className="h-8 w-8 rounded-full object-cover border-2 border-indigo-200"
                    />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {userEmail ? userEmail[0].toUpperCase() : 'U'}
                    </div>
                )}
                <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {profile?.name || userEmail?.split('@')[0] || 'User'}
                </span>
                <ChevronRight className={`hidden md:block w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
                        {/* Profile Header */}
                        <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="Profile"
                                        className="h-12 w-12 rounded-full object-cover border-2 border-white shadow"
                                    />
                                ) : (
                                    <div className="h-12 w-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow">
                                        {userEmail ? userEmail[0].toUpperCase() : 'U'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 truncate">
                                        {profile?.name || userEmail?.split('@')[0] || 'User'}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{userEmail}</p>
                                    {profile?.username && (
                                        <p className="text-xs text-indigo-600">@{profile.username}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="p-2">
                            <button
                                onClick={() => { setIsOpen(false); router.push('/dashboard/settings'); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <Settings className="w-4 h-4 text-slate-400" />
                                Account Settings
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); router.push(`/${profile?.username || ''}`); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <Users className="w-4 h-4 text-slate-400" />
                                Public Profile
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* Logout */}
                        <div className="p-2">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
