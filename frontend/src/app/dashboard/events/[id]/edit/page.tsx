'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronLeft, Save, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormBuilder } from '@/components/FormBuilder';

export default function EditEventPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // UI State
    const [noDate, setNoDate] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        date: '',
        location: '',

        description: '',
        price: 0,
        status: 'active',
        formSchema: [] as any[]
    });

    useEffect(() => {
        const fetchEvent = async () => {
            const token = localStorage.getItem('auth_token');
            try {
                // Fetch specific event directly if possible, or filter from list
                // Using list for now as per previous pattern, but direct GET /events/:slug or :id would be better if available
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/my`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const events = await res.json();
                    const event = events.find((e: any) => e._id === eventId);
                    if (event) {
                        let formattedDate = '';
                        if (event.date) {
                            const d = new Date(event.date);
                            formattedDate = d.toISOString().slice(0, 16);
                        } else {
                            setNoDate(true);
                        }

                        setFormData({
                            title: event.title,
                            date: formattedDate,
                            location: event.location || '',
                            description: event.description || '',
                            price: event.price || 0,
                            status: event.status || 'active',
                            formSchema: event.formSchema || []
                        });
                    } else {
                        setError('Event not found');
                    }
                }
            } catch (err) {
                console.error(err);
                setError('Failed to fetch event');
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem('auth_token');

        try {
            const payload = {
                ...formData,
                date: noDate ? null : (formData.date ? new Date(formData.date).toISOString() : null)
            };

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                router.push('/dashboard/events');
            } else {
                setError('Failed to update event');
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
            </div>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Edit Event</h1>
                        <p className="text-slate-500">Update event details and form questions.</p>
                    </div>
                </div>
                <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save All Changes
                </Button>
            </div>

            <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="details">Event Details</TabsTrigger>
                    <TabsTrigger value="form">Registration Form</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <Card className="border-slate-200">
                        <CardHeader>
                            <CardTitle>General Information</CardTitle>
                            <CardDescription>Basic details about your event.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Event Title</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="date">Date & Time</Label>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={noDate}
                                                onCheckedChange={setNoDate}
                                                id="no-date-mode"
                                            />
                                            <Label htmlFor="no-date-mode" className="text-xs font-normal text-slate-500">
                                                No specific time
                                            </Label>
                                        </div>
                                    </div>
                                    <Input
                                        id="date"
                                        name="date"
                                        type="datetime-local"
                                        value={formData.date}
                                        onChange={handleChange}
                                        required={!noDate}
                                        disabled={noDate}
                                        title={noDate ? "Date is hidden" : "Event Date"}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        name="location"
                                        value={formData.location}
                                        onChange={handleChange}
                                        placeholder="e.g. Convention Center or Online"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (USD)</Label>
                                <Input
                                    id="price"
                                    name="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="flex min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Describe your event..."
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <Label className="text-base">Event Status</Label>
                                    <p className="text-sm text-slate-500">
                                        {formData.status === 'active' ? 'Event is open for registration.' : 'Registration is closed.'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={formData.status === 'active'}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked ? 'active' : 'closed' }))}
                                    />
                                    <span className="text-sm font-medium w-16 text-right">
                                        {formData.status === 'active' ? 'Active' : 'Closed'}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="form">
                    <FormBuilder
                        questions={formData.formSchema}
                        onChange={(newQuestions) => setFormData(prev => ({ ...prev, formSchema: newQuestions }))}
                    />
                </TabsContent>
            </Tabs >
        </div >
    );
}
