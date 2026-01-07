'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronDown, LogOut, LayoutDashboard, User, Ticket } from 'lucide-react';

interface UserProfile {
    name: string;
    email: string;
    avatar?: string;
}

export function LandingNavbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (res.ok) {
                    const userData = await res.json();
                    setUser({
                        name: userData.name,
                        email: userData.email,
                        avatar: userData.avatar
                    });
                    setIsLoggedIn(true);
                } else {
                    // Token invalid, clear it
                    localStorage.removeItem('auth_token');
                }
            } catch (error) {
                // Network error or timeout - silently fail and show guest UI
                // Don't clear token in case it's just a network issue
                console.debug('Auth check skipped - API unavailable');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        setIsLoggedIn(false);
        setUser(null);
        setIsDropdownOpen(false);
        window.location.href = '/';
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header className="px-4 lg:px-6 h-16 flex items-center border-b border-slate-100/50 backdrop-blur-xl sticky top-0 z-50 bg-white/80" role="banner">
            <Link className="flex items-center justify-center gap-2.5" href="/" aria-label="MakeTicket - Home">
                <img src="/logo.png" alt="MakeTicket - Free Event Ticketing Platform" className="h-10 w-10 rounded-xl shadow-lg shadow-indigo-200" width={40} height={40} />
                <span className="font-bold text-xl tracking-tight text-slate-900">MakeTicket</span>
            </Link>
            <nav className="ml-auto flex items-center gap-1" role="navigation" aria-label="Main navigation">
                <Link className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50 hidden md:block" href="#features">
                    Features
                </Link>
                <Link className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50 hidden md:block" href="#testimonials">
                    Reviews
                </Link>
                <Link className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors rounded-lg hover:bg-slate-50 hidden md:block" href="#pricing">
                    Pricing
                </Link>
                <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block" aria-hidden="true" />

                {isLoading ? (
                    // Loading skeleton
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-24 bg-slate-100 rounded-full animate-pulse hidden md:block" />
                        <div className="h-10 w-10 bg-slate-100 rounded-full animate-pulse" />
                    </div>
                ) : isLoggedIn && user ? (
                    // Logged in - show user profile
                    <div className="relative">
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-50 transition-colors"
                            aria-expanded={isDropdownOpen}
                            aria-haspopup="true"
                        >
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-9 h-9 rounded-full border-2 border-indigo-100"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm">
                                    {getInitials(user.name)}
                                </div>
                            )}
                            <span className="hidden md:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                                {user.name.split(' ')[0]}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform hidden md:block ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsDropdownOpen(false)}
                                />
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-slate-100">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="py-1">
                                        <Link
                                            href="/dashboard"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <LayoutDashboard className="w-4 h-4 text-slate-400" />
                                            Dashboard
                                        </Link>
                                        <Link
                                            href="/dashboard/events"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <Ticket className="w-4 h-4 text-slate-400" />
                                            My Events
                                        </Link>
                                        <Link
                                            href="/dashboard/profile"
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                            onClick={() => setIsDropdownOpen(false)}
                                        >
                                            <User className="w-4 h-4 text-slate-400" />
                                            Profile
                                        </Link>
                                    </div>

                                    {/* Logout */}
                                    <div className="border-t border-slate-100 pt-1">
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    // Not logged in - show Sign In and Get Started
                    <>
                        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 hidden md:block">
                            Sign In
                        </Link>
                        <Link href="/login">
                            <Button className="h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all hover:scale-105 font-semibold shadow-lg shadow-slate-200">
                                Get Started Free
                            </Button>
                        </Link>
                    </>
                )}
            </nav>
        </header>
    );
}
