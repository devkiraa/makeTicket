'use client';

import { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ValidatorPage() {
    const [data, setData] = useState('No result');
    const [status, setStatus] = useState('');

    const handleScan = async (result: any, error: any) => {
        if (!!result) {
            setData(result?.text);
            if (result?.text) {
                validate(result.text);
            }
        }
        if (!!error) {
            // console.info(error);
        }
    };

    const validate = async (hash: string) => {
        try {
            const res = await fetch('http://localhost:5000/api/api/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add Authorization header ideally
                },
                body: JSON.stringify({ hash })
            });
            const json = await res.json();
            if (res.ok) {
                setStatus('✅ Approved: ' + json.ticket._id);
            } else {
                setStatus('❌ Error: ' + json.message);
            }
        } catch (e) {
            setStatus('❌ Network Error');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4">
            <Card className="w-full max-w-sm bg-slate-900 border-slate-800">
                <CardHeader>
                    <CardTitle className="text-center text-white">Scan Ticket</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-hidden rounded-lg border-2 border-indigo-500">
                        <QrReader
                            onResult={handleScan}
                            constraints={{ facingMode: 'environment' }}
                            className="w-full"
                        />
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-slate-400 text-sm">Result: {data}</p>
                        <p className="text-xl font-bold mt-2 text-white">{status}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
