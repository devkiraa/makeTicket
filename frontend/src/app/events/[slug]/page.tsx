'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function RegistrationPage() {
    const { slug } = useParams();
    const [event, setEvent] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetch(`http://localhost:5000/api/api/events/${slug}`)
            .then(res => res.json())
            .then(data => setEvent(data))
            .catch(err => console.error(err));
    }, [slug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`http://localhost:5000/api/api/events/${event._id}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    formData,
                    email: formData.email || courseFieldEmail() // Need to ensure email is captured 
                })
            });

            if (res.ok) {
                setSuccess(true);
            }
        } catch (err) {
            alert('Failed to register');
        } finally {
            setLoading(false);
        }
    };

    const courseFieldEmail = () => {
        // Helper to find email in dynamic form if exists, or assume one field is email
        return Object.values(formData).find((val: any) => typeof val === 'string' && val.includes('@'));
    }

    if (!event) return <div className="text-center p-10 text-white">Loading Event...</div>;

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <Card className="max-w-md bg-slate-900 border-green-900">
                    <CardHeader>
                        <CardTitle className="text-green-400">Registration Confirmed!</CardTitle>
                        <CardDescription>Check your email for the ticket.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4">
            <Card className="max-w-lg mx-auto bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-3xl text-indigo-400">{event.title}</CardTitle>
                    <CardDescription>{new Date(event.date).toLocaleDateString()} at {event.location}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Always ask for email if not in schema, but usually schema has it. 
                For safety, let's add a default Email field if schema doesn't seem to enforce it,
                OR just rely on schema having an email type field. */}

                        <div className="space-y-2">
                            <Label className="text-white">Email Address (for Ticket)</Label>
                            <Input
                                type="email"
                                required
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="bg-slate-950 border-slate-700 text-white"
                            />
                        </div>

                        {event.formSchema?.map((field: any) => (
                            <div key={field.id} className="space-y-2">
                                <Label className="text-white">{field.label}</Label>
                                {field.type === 'select' ? (
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                                        required={field.required}
                                        onChange={e => setFormData({ ...formData, [field.label]: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <Input
                                        type={field.type}
                                        required={field.required}
                                        className="bg-slate-950 border-slate-700 text-white"
                                        onChange={e => setFormData({ ...formData, [field.label]: e.target.value })}
                                    />
                                )}
                            </div>
                        ))}

                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4" disabled={loading}>
                            {loading ? 'Registering...' : 'Get Ticket'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
