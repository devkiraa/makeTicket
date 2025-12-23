import { notFound } from 'next/navigation';
import { Mail, Calendar, MapPin, Share2, Twitter, Linkedin, Instagram, Github, Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

async function getPublicProfile(username: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/${username}`, {
        cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    const data = await getPublicProfile(username);

    if (!data) {
        notFound();
    }

    const { user, events } = data;
    const socials = user.socials || {};

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Banner */}
            <div className="relative h-48 md:h-64 bg-slate-200">
                {user.banner ? (
                    <img src={user.banner} alt="Banner" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600" />
                )}
            </div>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10 space-y-8 pb-12">
                {/* Profile Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row items-center md:items-end gap-6">
                    <div className="relative">
                        <div className="h-32 w-32 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center bg-slate-100">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-4xl font-bold text-slate-400">
                                    {(user.name || user.username || user.email || 'U')[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-1 mb-2">
                        <h1 className="text-3xl font-bold text-slate-900">{user.name || user.username}</h1>
                        <p className="text-slate-500 font-medium">@{user.username || 'user'}</p>

                        <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-slate-500 mt-3">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{events.length} Events Hosted</span>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-4">
                            {socials.website && (
                                <a href={socials.website} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600 transition-colors">
                                    <Globe className="w-5 h-5" />
                                </a>
                            )}
                            {socials.twitter && (
                                <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 transition-colors">
                                    <Twitter className="w-5 h-5" />
                                </a>
                            )}
                            {socials.linkedin && (
                                <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-700 transition-colors">
                                    <Linkedin className="w-5 h-5" />
                                </a>
                            )}
                            {socials.instagram && (
                                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-pink-600 transition-colors">
                                    <Instagram className="w-5 h-5" />
                                </a>
                            )}
                            {socials.github && (
                                <a href={socials.github} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
                                    <Github className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 mb-2">
                        <Button variant="outline" size="sm">
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>

                {/* Events Grid */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-slate-900">Events</h2>

                    {events.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-100">
                            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900">No events found</h3>
                            <p className="text-slate-500">This user hasn't published any events yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {events.map((event: any) => (
                                <Link href={`/${username}/${event.slug}`} key={event._id} className="group">
                                    <Card className="h-full hover:shadow-lg transition-shadow border-slate-200">
                                        <div className="h-40 bg-slate-100 relative overflow-hidden rounded-t-lg">
                                            {/* Placeholder for event banner if we had one, or abstract pattern */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                                <Calendar className="w-8 h-8 text-slate-300" />
                                            </div>
                                        </div>
                                        <CardHeader>
                                            <CardTitle className="group-hover:text-indigo-600 transition-colors line-clamp-1">{event.title}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2 text-sm text-slate-500">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span className="truncate">{event.location || 'Online'}</span>
                                                </div>
                                            </div>
                                            <p className="mt-4 text-sm text-slate-600 line-clamp-2">
                                                {event.description || 'No description provided.'}
                                            </p>
                                        </CardContent>
                                        <CardFooter className="pt-0">
                                            <span className="text-indigo-600 font-semibold text-sm">
                                                {event.price > 0 ? `₹${event.price}` : 'Free'}
                                            </span>
                                        </CardFooter>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
