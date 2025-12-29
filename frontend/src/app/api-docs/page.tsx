import StaticPageLayout from '@/components/StaticPageLayout';
import { Code, Key, Terminal, FileJson } from 'lucide-react';

export default function APIPage() {
    const endpoints = [
        { method: 'GET', path: '/events', description: 'List all your events' },
        { method: 'POST', path: '/events', description: 'Create a new event' },
        { method: 'GET', path: '/events/:id/attendees', description: 'Get attendees for an event' },
        { method: 'POST', path: '/tickets/validate', description: 'Validate a ticket QR code' },
    ];

    return (
        <StaticPageLayout
            title="API Documentation"
            subtitle="Build custom integrations with our RESTful API."
        >
            <div className="max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                        <Key className="w-8 h-8 text-indigo-600 mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">Authentication</h3>
                        <p className="text-sm text-slate-600">Use API keys to authenticate requests. Generate keys in your dashboard.</p>
                    </div>
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                        <FileJson className="w-8 h-8 text-indigo-600 mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">JSON Format</h3>
                        <p className="text-sm text-slate-600">All requests and responses use JSON format with proper error handling.</p>
                    </div>
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                        <Terminal className="w-8 h-8 text-indigo-600 mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">Rate Limiting</h3>
                        <p className="text-sm text-slate-600">1000 requests per minute for Pro plans. Contact us for higher limits.</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-6">Endpoints</h2>
                <div className="space-y-3">
                    {endpoints.map((endpoint, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${endpoint.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {endpoint.method}
                            </span>
                            <code className="font-mono text-slate-900">{endpoint.path}</code>
                            <span className="text-slate-500 ml-auto">{endpoint.description}</span>
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-6 rounded-xl bg-slate-900 text-white">
                    <div className="flex items-center gap-2 mb-4">
                        <Code className="w-5 h-5" />
                        <span className="font-semibold">Example Request</span>
                    </div>
                    <pre className="text-sm font-mono text-slate-300 overflow-x-auto">
                        {`curl -X GET "https://api.maketicket.app/v1/events" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                    </pre>
                </div>
            </div>
        </StaticPageLayout>
    );
}
