'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Mail,
    Monitor,
    Edit2,
    Lock,
    Share2,
    Calendar,
    Loader2,
    LogOut,
    Copy,
    ExternalLink,
    Twitter,
    Linkedin,
    Instagram,
    Github,
    Globe,
    Trash2,
    ChevronDown
} from 'lucide-react';

const getDeviceDetails = (ua: string) => {
    let browser = "Unknown Browser";
    let os = "Unknown OS";

    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac/i.test(ua)) os = "macOS";
    else if (/Linux/i.test(ua)) os = "Linux";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";

    if (/Edg/i.test(ua)) browser = "Edge";
    else if (/Chrome/i.test(ua)) browser = "Chrome";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Safari/i.test(ua)) browser = "Safari";

    return { browser, os };
};

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);

    // User Edit State
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

    // Password State
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    // Image Loading States
    const [bannerLoading, setBannerLoading] = useState(false);

    // Socials State
    const [socials, setSocials] = useState({ twitter: '', linkedin: '', instagram: '', website: '', github: '' });

    // Session view state
    const [showAllSessions, setShowAllSessions] = useState(false);
    const [showAllHistory, setShowAllHistory] = useState(false);

    // Global Message
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;

            try {
                // Profile
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data);
                    setName(data.name || '');
                    setUsername(data.username || '');
                    setSocials(data.socials || { twitter: '', linkedin: '', instagram: '', website: '', github: '' });
                }

                // Sessions
                const sessionRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/sessions`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (sessionRes.ok) {
                    const sessionData = await sessionRes.json();
                    setSessions(sessionData);
                }

            } catch (err) {
                console.error('Failed to load profile', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const updateProfile = async (updates: any) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/me`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            const data = await res.json();

            if (res.ok) {
                setUser(data.user);
                // Update local inputs if changed
                if (updates.name) setName(updates.name);
                if (updates.username) setUsername(updates.username);
                return { success: true, data };
            } else {
                return { success: false, message: data.message };
            }
        } catch (err) {
            console.error('Failed to update profile', err);
            return { success: false, message: 'Network error' };
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024) {
            alert("File too large. Max 1MB.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            updateProfile({ avatar: base64 });
        };
        reader.readAsDataURL(file);
    };

    const handleRandomAvatar = () => {
        const randomId = Math.floor(Math.random() * 826) + 1;
        const url = `https://rickandmortyapi.com/api/character/avatar/${randomId}.jpeg`;
        updateProfile({ avatar: url });
    };

    const handleRemoveAvatar = () => {
        updateProfile({ avatar: null });
    };

    const handleUseGoogleAvatar = async () => {
        if (user?.googleId) {
            // Check if we have a valid googleAvatar URL
            const googleAvatarUrl = user.googleAvatar;
            if (googleAvatarUrl && googleAvatarUrl.startsWith('http')) {
                await updateProfile({ avatar: googleAvatarUrl });
                setMessage({ type: 'success', text: 'Google profile picture set!' });
            } else {
                // googleAvatar is missing or invalid - need to re-login to sync
                setMessage({ type: 'error', text: 'Google avatar not synced. Please log out and sign in with Google again.' });
            }
            setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        } else {
            setMessage({ type: 'error', text: 'No Google account linked. Sign in with Google first.' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    // Banner Handlers
    const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("File too large. Max 2MB.");
            return;
        }

        setBannerLoading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            updateProfile({ banner: base64 });
        };
        reader.readAsDataURL(file);
    };

    const handleRandomBanner = () => {
        setBannerLoading(true);
        const seed = Math.floor(Math.random() * 10000);
        // Use accessible AI generation for relevant banners
        const url = `https://image.pollinations.ai/prompt/rick%20and%20morty%20space%20landscape%20art?width=1200&height=400&nologo=true&seed=${seed}`;
        updateProfile({ banner: url });
    };

    const handleRemoveBanner = () => {
        updateProfile({ banner: null });
    };

    const handleRevokeSession = async (sessionId: string) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isValid: false } : s));
        } catch (e) {
            console.error('Failed to revoke', e);
        }
    };

    const checkUsername = async (val: string) => {
        if (!val || val === user.username) {
            setUsernameAvailable(null);
            return;
        }
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/auth/username?username=${val}`);
            const data = await res.json();
            setUsernameAvailable(data.available);
        } catch (e) {
            setUsernameAvailable(false);
        }
    };

    const handleUpdateBasicInfo = async () => {
        if (usernameAvailable === false) return;
        const res = await updateProfile({ name, username });
        if (res?.success) {
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } else {
            setMessage({ type: 'error', text: res?.message || 'Update failed' });
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleUpdateSocials = async () => {
        const res = await updateProfile({ socials });
        if (res?.success) {
            setMessage({ type: 'success', text: 'Socials updated successfully!' });
        } else {
            setMessage({ type: 'error', text: res?.message || 'Update failed' });
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleChangePassword = async () => {
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }
        if (passwords.new.length < 6) {
            setMessage({ type: 'error', text: 'Password too short' });
            return;
        }

        const res = await updateProfile({
            password: passwords.current,
            newPassword: passwords.new
        });

        if (res?.success) {
            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswords({ current: '', new: '', confirm: '' });
        } else {
            setMessage({ type: 'error', text: res?.message || 'Failed to change password' });
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    const handleCopyProfileLink = () => {
        if (!user.username) return;
        const url = `${window.location.origin}/${user.username}`;
        navigator.clipboard.writeText(url);
        setMessage({ type: 'success', text: 'Profile link copied!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    // Skeleton Loading
    if (loading) return (
        <div className="space-y-8 max-w-5xl mx-auto animate-pulse">
            {/* Banner and Profile Skeleton */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="h-32 bg-slate-200" />
                <div className="p-6 flex gap-6">
                    <div className="w-24 h-24 rounded-full bg-slate-200 -mt-16 border-4 border-white" />
                    <div className="space-y-3 flex-1 pt-2">
                        <div className="h-6 w-40 bg-slate-200 rounded" />
                        <div className="h-4 w-32 bg-slate-100 rounded" />
                        <div className="h-4 w-48 bg-slate-100 rounded" />
                    </div>
                </div>
            </div>

            {/* Settings Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="h-5 w-32 bg-slate-200 rounded mb-4" />
                        <div className="space-y-4">
                            <div className="h-10 w-full bg-slate-100 rounded" />
                            <div className="h-10 w-full bg-slate-100 rounded" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Sessions Skeleton */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                            <div className="space-y-2 flex-1">
                                <div className="h-4 w-32 bg-slate-200 rounded" />
                                <div className="h-3 w-48 bg-slate-100 rounded" />
                            </div>
                            <div className="h-8 w-20 bg-slate-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (!user) return <div className="text-center p-8">Failed to load user data</div>;

    const activeSessions = sessions.filter(s => s.isValid);
    const pastSessions = sessions.filter(s => !s.isValid);

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Profile Main Card */}
            <Card className="border-slate-200 shadow-sm overflow-hidden group/banner">
                <div className="relative h-32 bg-slate-100">
                    {user.banner ? (
                        <img
                            src={user.banner}
                            alt="Cover"
                            className={`w-full h-full object-cover transition-opacity duration-300 ${bannerLoading ? 'opacity-50' : 'opacity-100'}`}
                            onLoad={() => setBannerLoading(false)}
                            onError={() => setBannerLoading(false)}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600" />
                    )}

                    {/* Loader Overlay */}
                    {bannerLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        </div>
                    )}

                    {/* Banner Controls Overlay */}
                    <div className="absolute top-4 right-4 opacity-0 group-hover/banner:opacity-100 transition-opacity flex gap-2 z-20">
                        <label className="cursor-pointer bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm transition-colors">
                            Change Cover
                            <input type="file" className="hidden" accept="image/*" onChange={handleBannerUpload} />
                        </label>
                        <button onClick={handleRandomBanner} className="bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm transition-colors">
                            Random
                        </button>
                        {user.banner && (
                            <button onClick={handleRemoveBanner} className="bg-red-500/80 hover:bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm backdrop-blur-sm transition-colors">
                                Remove
                            </button>
                        )}
                    </div>
                </div>
                <CardContent className="pt-0 relative">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Avatar */}
                        <div className="-mt-12 p-1 bg-white rounded-2xl shadow-lg relative group">
                            <div className="h-24 w-24 md:h-32 md:w-32 rounded-xl bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-100 relative">
                                {(user.avatar || user.googleAvatar) ? (
                                    <img src={user.avatar || user.googleAvatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-4xl font-bold text-slate-400">
                                        {user.email[0].toUpperCase()}
                                    </div>
                                )}
                                {/* Edit Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                                    <label className="cursor-pointer bg-white/90 hover:bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                        Upload
                                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                    </label>
                                    {user.googleId && user.googleAvatar?.startsWith('http') && (
                                        <button onClick={handleUseGoogleAvatar} className="bg-white/90 hover:bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                                            <svg className="w-3 h-3" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            Google
                                        </button>
                                    )}
                                    <button onClick={handleRandomAvatar} className="bg-white/90 hover:bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                        Random
                                    </button>
                                    {user.avatar && (
                                        <button onClick={handleRemoveAvatar} className="bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 mt-4 md:mt-2 space-y-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900">{user.name || user.email.split('@')[0]}</h1>
                                    <p className="text-slate-500 font-medium mb-1">@{user.username || user.email.split('@')[0]}</p>

                                    {user.username && (
                                        <div className="flex items-center gap-2 text-xs md:text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit">
                                            <span className="truncate max-w-[150px] md:max-w-xs font-medium">
                                                {typeof window !== 'undefined' ? `${window.location.host}/${user.username}` : `/${user.username}`}
                                            </span>
                                            <button onClick={handleCopyProfileLink} className="p-1 hover:bg-white rounded-full transition-colors" title="Copy Link">
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <a href={`/${user.username}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white rounded-full transition-colors" title="Open Public Profile">
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {/* Edit Basic Info Sheet */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
                                                <Edit2 className="w-3.5 h-3.5 mr-2" />
                                                Edit Basic Info
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent>
                                            <SheetHeader>
                                                <SheetTitle>Edit Profile</SheetTitle>
                                                <SheetDescription>
                                                    Make changes to your profile here. Click save when you're done.
                                                </SheetDescription>
                                            </SheetHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="name">Name</Label>
                                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="username">Username</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="username"
                                                            value={username}
                                                            onChange={(e) => {
                                                                setUsername(e.target.value);
                                                                checkUsername(e.target.value);
                                                            }}
                                                            className={usernameAvailable === false ? 'border-red-500' : usernameAvailable === true ? 'border-green-500' : ''}
                                                        />
                                                        {usernameAvailable === false && <span className="text-xs text-red-500 absolute -bottom-5 right-0">Username taken</span>}
                                                        {usernameAvailable === true && <span className="text-xs text-green-500 absolute -bottom-5 right-0">Available</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <SheetFooter>
                                                <SheetClose asChild>
                                                    <Button type="submit" onClick={handleUpdateBasicInfo}>Save changes</Button>
                                                </SheetClose>
                                            </SheetFooter>
                                        </SheetContent>
                                    </Sheet>

                                    {/* Change Password Sheet */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
                                                <Lock className="w-3.5 h-3.5 mr-2" />
                                                Change Password
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent>
                                            <SheetHeader>
                                                <SheetTitle>Change Password</SheetTitle>
                                                <SheetDescription>
                                                    Ensure your account is using a long, random password to stay secure.
                                                </SheetDescription>
                                            </SheetHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="current">Current Password</Label>
                                                    <Input id="current" type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="new">New Password</Label>
                                                    <Input id="new" type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="confirm">Confirm Password</Label>
                                                    <Input id="confirm" type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
                                                </div>
                                            </div>
                                            <SheetFooter>
                                                <SheetClose asChild>
                                                    <Button type="submit" onClick={handleChangePassword}>Update Password</Button>
                                                </SheetClose>
                                            </SheetFooter>
                                        </SheetContent>
                                    </Sheet>

                                    {/* Update Socials Sheet */}
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="sm" className="h-8 border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
                                                <Share2 className="w-3.5 h-3.5 mr-2" />
                                                Update Socials
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent>
                                            <SheetHeader>
                                                <SheetTitle>Social Profiles</SheetTitle>
                                                <SheetDescription>
                                                    Add links to your social media profiles to display them on your public page.
                                                </SheetDescription>
                                            </SheetHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="website" className="flex items-center gap-2"><Globe className="w-4 h-4" /> Website</Label>
                                                    <Input id="website" placeholder="https://yourwebsite.com" value={socials.website} onChange={(e) => setSocials({ ...socials, website: e.target.value })} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="twitter" className="flex items-center gap-2"><Twitter className="w-4 h-4" /> Twitter</Label>
                                                    <Input id="twitter" placeholder="https://twitter.com/username" value={socials.twitter} onChange={(e) => setSocials({ ...socials, twitter: e.target.value })} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="linkedin" className="flex items-center gap-2"><Linkedin className="w-4 h-4" /> LinkedIn</Label>
                                                    <Input id="linkedin" placeholder="https://linkedin.com/in/username" value={socials.linkedin} onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="instagram" className="flex items-center gap-2"><Instagram className="w-4 h-4" /> Instagram</Label>
                                                    <Input id="instagram" placeholder="https://instagram.com/username" value={socials.instagram} onChange={(e) => setSocials({ ...socials, instagram: e.target.value })} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="github" className="flex items-center gap-2"><Github className="w-4 h-4" /> GitHub</Label>
                                                    <Input id="github" placeholder="https://github.com/username" value={socials.github} onChange={(e) => setSocials({ ...socials, github: e.target.value })} />
                                                </div>
                                            </div>
                                            <SheetFooter>
                                                <SheetClose asChild>
                                                    <Button type="submit" onClick={handleUpdateSocials}>Save changes</Button>
                                                </SheetClose>
                                            </SheetFooter>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                <div className="flex items-center gap-1">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    {user.email}
                                </div>
                            </div>

                            <div className="pt-4 flex items-center gap-6">
                                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100">
                                    <Calendar className="w-4 h-4" />
                                    <span>Hosted: {user.hostedEvents || 0} Events</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Email Settings */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-100 rounded-lg">
                                <Mail className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Email Configuration</h3>
                                <p className="text-sm text-slate-500">Connect Gmail accounts and manage email templates</p>
                            </div>
                        </div>
                        <a href="/dashboard/settings/emails">
                            <Button variant="outline" className="border-slate-200">
                                Manage Emails
                            </Button>
                        </a>
                    </div>
                </CardContent>
            </Card>

            {/* Logged In Devices Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-semibold text-slate-900">Active Sessions ({activeSessions.length})</h2>
                </div>

                <div className="space-y-3">
                    {(showAllSessions ? activeSessions : activeSessions.slice(0, 2)).map((session) => {
                        const { browser, os } = getDeviceDetails(session.userAgent);
                        const ipDisplay = (session.ipAddress === '::1' || session.ipAddress === '127.0.0.1') ? 'Localhost' : session.ipAddress;

                        return (
                            <Card key={session.id} className={`border-slate-200 shadow-sm transition-colors ${session.isCurrent ? 'border-indigo-200 ring-1 ring-indigo-100' : ''}`}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                            <Monitor className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-slate-900 text-sm">
                                                {browser} on {os}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {ipDisplay} • {new Date(session.lastActiveAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {session.isCurrent ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                Current
                                            </span>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRevokeSession(session.id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {activeSessions.length > 2 && (
                    <Button
                        variant="ghost"
                        className="w-full text-slate-600 hover:text-slate-900"
                        onClick={() => setShowAllSessions(!showAllSessions)}
                    >
                        <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showAllSessions ? 'rotate-180' : ''}`} />
                        {showAllSessions ? 'Show Less' : `Show ${activeSessions.length - 2} More`}
                    </Button>
                )}
            </div>

            {/* Past Logouts */}
            {pastSessions.length > 0 && (
                <div className="space-y-4 pt-4">
                    <h2 className="text-lg font-semibold text-slate-900 px-1">Session History ({pastSessions.length})</h2>
                    <div className="space-y-2">
                        {(showAllHistory ? pastSessions : pastSessions.slice(0, 2)).map((session) => {
                            const { browser, os } = getDeviceDetails(session.userAgent);
                            return (
                                <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                                    <div className="flex items-center gap-3">
                                        <LogOut className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <span className="text-slate-700 font-medium">{browser} on {os}</span>
                                            <span className="text-slate-400 mx-2">•</span>
                                            <span className="text-slate-500">{new Date(session.lastActiveAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Expired</span>
                                </div>
                            );
                        })}
                    </div>

                    {pastSessions.length > 2 && (
                        <Button
                            variant="ghost"
                            className="w-full text-slate-600 hover:text-slate-900"
                            onClick={() => setShowAllHistory(!showAllHistory)}
                        >
                            <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showAllHistory ? 'rotate-180' : ''}`} />
                            {showAllHistory ? 'Show Less' : `Show ${pastSessions.length - 2} More`}
                        </Button>
                    )}
                </div>
            )}

            {/* Footer Branding */}
            <div className="flex justify-between items-center pt-8 border-t border-slate-200 mt-12 mb-8">
                <div className="font-bold text-slate-400">GrabMyPass</div>
                <div className="flex gap-4 text-slate-400">
                    <Share2 className="w-5 h-5 cursor-pointer hover:text-indigo-600 transition-colors" />
                </div>
            </div>

            {/* Success/Error Message */}
            {message.text && (
                <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg text-white ${message.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    {message.text}
                </div>
            )}
        </div>
    )
}
