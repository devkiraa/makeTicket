'use client';

import React, { useState } from 'react';
import { Ticket, QrCode, MapPin, Calendar, Clock, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LiveTicketPreview() {
    const [eventName, setEventName] = useState('Epic Summer Concert 2026');
    const [date, setDate] = useState('Aug 15, 2026');
    const [location, setLocation] = useState('The Grand Arena, NY');
    const [time, setTime] = useState('8:00 PM');
    const [ticketType, setTicketType] = useState('VIP Pass');

    return (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 lg:p-12 mb-16 shadow-inner">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Form Controls */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Interactive Ticket Generator Tool</h3>
                        <p className="text-slate-600 mb-6">Type below and watch your event ticket build itself in real-time. No design experience required.</p>
                    </div>
                    
                    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                        <div className="space-y-2">
                            <Label htmlFor="eventName">Event Name</Label>
                            <Input 
                                id="eventName" 
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                placeholder="E.g. Tech Conference 2026"
                                className="focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="date">Date</Label>
                                <Input 
                                    id="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    placeholder="Oct 20, 2026"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="time">Time</Label>
                                <Input 
                                    id="time" 
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    placeholder="10:00 AM"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location / Venue</Label>
                            <Input 
                                id="location" 
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Central Park, NY"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ticketType">Ticket Type</Label>
                            <Input 
                                id="ticketType" 
                                value={ticketType}
                                onChange={(e) => setTicketType(e.target.value)}
                                placeholder="General Admission"
                            />
                        </div>
                    </div>
                </div>

                {/* Animated Ticket Preview */}
                <div className="flex justify-center perspective-[1000px]">
                    <div className="w-full max-w-sm transition-all duration-300 hover:rotate-y-[-5deg] hover:rotate-x-[5deg] hover:scale-105" style={{ transformStyle: 'preserve-3d' }}>
                        {/* Upper Half */}
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-t-3xl p-6 relative text-white overflow-hidden shadow-2xl">
                            {/* Decorative background elements */}
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-indigo-400/20 rounded-full blur-xl"></div>
                            
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 uppercase tracking-wide">
                                    <Crown className="w-3.5 h-3.5" />
                                    {ticketType || 'Pass'}
                                </div>
                                <Ticket className="w-6 h-6 text-white/50" />
                            </div>

                            <div className="relative z-10">
                                <h4 className="text-2xl font-bold tracking-tight mb-4 min-h-[64px] line-clamp-2">
                                    {eventName || 'Your Event Name Here'}
                                </h4>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5 text-white/90">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <div className="text-sm font-medium">{date || 'Select Date'}</div>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-white/90">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div className="text-sm font-medium">{time || 'Select Time'}</div>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-white/90">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div className="text-sm font-medium truncate pr-4">{location || 'Select Location'}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Cutout circles for realism */}
                            <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-50 rounded-full"></div>
                            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 rounded-full"></div>
                        </div>

                        {/* Dashed separator */}
                        <div className="w-full h-1 bg-white relative flex border-x-indigo-600 border-x">
                            <div className="absolute inset-x-4 top-[1px] border-t-2 border-dashed border-slate-200"></div>
                        </div>

                        {/* Lower Half */}
                        <div className="bg-white rounded-b-3xl p-6 relative shadow-2xl border border-slate-100 border-t-0 flex flex-col items-center justify-center text-center">
                            {/* Cutout circles for realism */}
                            <div className="absolute -top-3 -left-3 w-6 h-6 bg-slate-50 rounded-full"></div>
                            <div className="absolute -top-3 -right-3 w-6 h-6 bg-slate-50 rounded-full"></div>
                            
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full mb-3 flex flex-col items-center justify-center gap-2">
                                <QrCode className="w-24 h-24 text-slate-800" />
                                <div className="text-[10px] text-slate-400 font-mono tracking-widest">TKT-{Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium tracking-wide">
                                SCAN AT ENTRANCE
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
