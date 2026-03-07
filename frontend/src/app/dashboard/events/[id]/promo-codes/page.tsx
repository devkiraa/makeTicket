'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PromoCodesPage({ params }: { params: { id: string } }) {
    const { toast } = useToast();
    const eventId = params.id;
    const [promoCodes, setPromoCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState('');
    const [maxUses, setMaxUses] = useState('');

    useEffect(() => {
        fetchPromoCodes();
    }, [eventId]);

    const fetchPromoCodes = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/promo-codes/event/${eventId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPromoCodes(data);
            }
        } catch (error) {
            console.error('Failed to fetch promo codes', error);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/promo-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    eventId,
                    code,
                    discountType,
                    discountValue: Number(discountValue),
                    maxUses: maxUses ? Number(maxUses) : 0
                })
            });

            if (res.ok) {
                toast({ title: 'Success', description: 'Promo code created' });
                setCode('');
                setDiscountValue('');
                setMaxUses('');
                fetchPromoCodes();
            } else {
                const data = await res.json();
                toast({ title: 'Error', description: data.message || 'Failed to create promo code', variant: 'destructive' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Server error', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/promo-codes/${id}/toggle`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchPromoCodes();
                toast({ title: 'Success', description: 'Promo code status updated' });
            }
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Promo Codes</h1>
            <p className="text-gray-500 mb-6">Create and manage discount codes for your event checkout.</p>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Create New Promo Code</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Code (e.g. EARLYBIRD20)</label>
                                <Input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="EARLYBIRD20" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Discount Type</label>
                                <Select value={discountType} onValueChange={setDiscountType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Discount Value</label>
                                <Input required type="number" min="1" max={discountType === 'percentage' ? "100" : undefined} value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percentage' ? "20" : "10"} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Max Uses (Optional, 0 = unlimited)</label>
                                <Input type="number" min="0" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="0" />
                            </div>
                        </div>
                        <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Promo Code'}</Button>
                    </form>
                </CardContent>
            </Card>

            <div>
                <h2 className="text-xl font-semibold mb-4">Active & Inactive Codes</h2>
                {promoCodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground bg-gray-50 p-4 rounded-md border">No promo codes created yet.</p>
                ) : (
                    <div className="space-y-3">
                        {promoCodes.map((promo: any) => (
                            <Card key={promo._id} className={!promo.isActive ? 'opacity-60 bg-gray-50' : ''}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg flex items-center gap-2">
                                            {promo.code}
                                            {!promo.isActive && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Inactive</span>}
                                        </h3>
                                        <div className="text-sm text-gray-500 mt-1 space-x-4">
                                            <span>{promo.discountType === 'percentage' ? `${promo.discountValue}% off` : `$${promo.discountValue} off`}</span>
                                            <span>Uses: {promo.currentUses} / {promo.maxUses === 0 ? 'Unlimited' : promo.maxUses}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant={promo.isActive ? 'destructive' : 'default'}
                                        size="sm"
                                        onClick={() => handleToggle(promo._id)}
                                    >
                                        {promo.isActive ? 'Deactivate' : 'Activate'}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
