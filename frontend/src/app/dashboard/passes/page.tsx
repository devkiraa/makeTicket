'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function PassesPage() {
    const { toast } = useToast();
    const [passes, setPasses] = useState([]);

    // Future Implementation:
    // 1. Fetch passes from \`/api/passes/host\`
    // 2. Fetch events from \`/api/events/my-events\` to populate dropdowns
    // 3. Form to create a Pass (Title, Price, Included Events)

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Multi-Event Passes</h1>
            <p className="text-gray-500 mb-6">Create and manage passes that bundle multiple events together.</p>

            <Card>
                <CardHeader>
                    <CardTitle>Create New Pass</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Coming soon! The backend infrastructure for passes is complete.
                        Connect this form to \`POST /api/passes\` with \`title\`, \`price\`, and an array of \`includedEvents\` IDs.
                    </p>
                    <Button disabled>Create Pass</Button>
                </CardContent>
            </Card>

            <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Your Passes</h2>
                {passes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No passes created yet.</p>
                ) : (
                    <div className="space-y-4">
                        {passes.map((pass: any) => (
                            <Card key={pass._id}>
                                <CardContent className="p-4">
                                    <h3 className="font-bold">{pass.title}</h3>
                                    <p>${pass.price}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
