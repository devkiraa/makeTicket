'use client';

import StaticPageLayout from '@/components/StaticPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, MapPin, Phone, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);

    return (
        <StaticPageLayout
            title="Contact Us"
            subtitle="Have a question? We'd love to hear from you."
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
                <div>
                    <div className="space-y-6 mb-8">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                                <Mail className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Email</h3>
                                <p className="text-slate-600">support@maketicket.app</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                                <Phone className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Phone</h3>
                                <p className="text-slate-600">+91 98765 43210</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                <MapPin className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Office</h3>
                                <p className="text-slate-600">Bangalore, Karnataka, India</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                                <MessageSquare className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Live Chat</h3>
                                <p className="text-slate-600">Available 9 AM - 9 PM IST</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 md:p-8">
                    {submitted ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">Message Sent!</h3>
                            <p className="text-slate-600">We'll get back to you within 24 hours.</p>
                        </div>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <Input placeholder="Your name" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <Input type="email" placeholder="you@example.com" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                <Input placeholder="How can we help?" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                <textarea
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                                    placeholder="Tell us more..."
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-full">
                                Send Message
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </StaticPageLayout>
    );
}
