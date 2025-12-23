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
    Globe
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
        const url = `${window.location.origin}/u/${user.username}`;
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
                                {user.avatar ? (
                                    <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-4xl font-bold text-slate-400">
                                        {user.email[0].toUpperCase()}
                                    </div>
                                )}
                                {/* Edit Overlay */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                    <label className="cursor-pointer bg-white/90 hover:bg-white text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                                        Upload
                                        <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                    </label>
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
                                                {typeof window !== 'undefined' ? `${window.location.host}/u/${user.username}` : `/u/${user.username}`}
                                            </span>
                                            <button onClick={handleCopyProfileLink} className="p-1 hover:bg-white rounded-full transition-colors" title="Copy Link">
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                            <a href={`/u/${user.username}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-white rounded-full transition-colors" title="Open Public Profile">
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

            {/* Logged In Devices Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-semibold text-slate-900">Active Sessions ({activeSessions.length})</h2>
                </div>

                <div className="space-y-3">
                    {activeSessions.map((session) => {
                        const { browser, os } = getDeviceDetails(session.userAgent);
                        const ipDisplay = (session.ipAddress === '::1' || session.ipAddress === '127.0.0.1') ? 'Localhost' : session.ipAddress;

                        return (
                            <Card key={session.id} className={`border-slate-200 shadow-sm transition-colors ${session.isCurrent ? 'border-indigo-200 ring-1 ring-indigo-100' : ''}`}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                            {os === 'Android' || os === 'iOS' ? <Monitor className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900">
                                                {browser} on {os}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span className="truncate max-w-[200px] md:max-w-md" title={session.userAgent}>{ipDisplay}</span>
                                                <span>•</span>
                                                <span className="text-slate-400">Last Active: {new Date(session.lastActiveAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {session.isCurrent ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                This Device
                                            </span>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => handleRevokeSession(session.id)} className="border-slate-200 hover:bg-slate-50 text-slate-600">
                                                Revoke
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Past Logouts */}
            <div className="space-y-4 pt-4">
                <h2 className="text-lg font-semibold text-slate-900 px-1">Session History</h2>
                <div className="space-y-2">
                    {pastSessions.length === 0 ? (
                        <div className="text-sm text-slate-500 px-1">No recent history found.</div>
                    ) : (
                        pastSessions.map((session) => {
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
                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">Revoked / Expired</span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

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
