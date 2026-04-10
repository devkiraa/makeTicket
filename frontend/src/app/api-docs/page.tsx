import StaticPageLayout from '@/components/StaticPageLayout';
import { Button } from '@/components/ui/button';
import { 
    Code, 
    Key, 
    Terminal, 
    FileJson, 
    AlertTriangle, 
    ExternalLink, 
    Layers, 
    ShieldCheck, 
    Activity 
} from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'API Documentation - Event Ticketing API | MakeTicket',
    description: 'Build custom integrations with MakeTicket REST API. Create events, manage attendees, validate tickets programmatically. Full API reference and examples.',
    keywords: [
        'ticketing API',
        'event API',
        'ticket validation API',
        'event management API',
        'RESTful ticketing',
        'developer API documentation'
    ],
    openGraph: {
        title: 'MakeTicket API Documentation',
        description: 'Build custom integrations with our RESTful event ticketing API.',
        url: 'https://maketicket.app/api-docs',
        type: 'website',
    },
    alternates: {
        canonical: 'https://maketicket.app/api-docs',
    },
};

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
            <div className="max-w-4xl pb-20">
                {/* Developer Quick Links */}
                <div className="flex flex-wrap gap-4 mb-12">
                    <a href="https://www.postman.com/maketicket/workspace/public-api" target="_blank" rel="noopener noreferrer">
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white gap-2 font-semibold">
                            <Layers className="w-4 h-4" />
                            Run in Postman
                        </Button>
                    </a>
                    <a href="https://github.com/maketicket/api-examples" target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="gap-2">
                            <Code className="w-4 h-4" />
                            View on GitHub
                        </Button>
                    </a>
                    <a href="/dashboard/api-keys">
                        <Button variant="secondary" className="gap-2">
                            <Key className="w-4 h-4" />
                            My API Keys
                        </Button>
                    </a>
                </div>

                {/* Core Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                        <ShieldCheck className="w-8 h-8 text-indigo-600 mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">DDoS Protection</h3>
                        <p className="text-sm text-slate-600">Our API is protected by advanced rate-limiting and DDoS mitigation to ensure high availability.</p>
                    </div>
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                        <Activity className="w-8 h-8 text-indigo-600 mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">Detailed Logs</h3>
                        <p className="text-sm text-slate-600">Monitor your integration performance with real-time access logs in your developer dashboard.</p>
                    </div>
                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-100">
                        <Key className="w-8 h-8 text-indigo-600 mb-4" />
                        <h3 className="font-semibold text-slate-900 mb-2">Secure Auth</h3>
                        <p className="text-sm text-slate-600">Authenticate via X-API-Key headers. Keys can be scoped with fine-grained permissions.</p>
                    </div>
                </div>

                {/* Endpoints */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">API Reference</h2>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">v1.2.0</span>
                    </div>
                    <div className="space-y-3">
                        {endpoints.map((endpoint, i) => (
                            <div key={i} className="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors">
                                <span className={`w-20 text-center py-1 rounded-lg text-xs font-bold ${endpoint.method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {endpoint.method}
                                </span>
                                <code className="font-mono text-slate-900 font-semibold">{endpoint.path}</code>
                                <span className="text-slate-500 md:ml-auto text-sm">{endpoint.description}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Code Examples */}
                <div className="mt-12 p-6 rounded-xl bg-slate-900 text-white shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-indigo-400" />
                            <span className="font-semibold">cURL Implementation</span>
                        </div>
                        <span className="text-xs text-slate-400">Copy code</span>
                    </div>
                    <pre className="text-sm font-mono text-slate-300 overflow-x-auto p-2 bg-slate-800/50 rounded border border-slate-700">
                        {`curl -X GET "https://api.maketicket.app/v1/events" \\
-H "X-API-Key: mt_live_xxxxxxxxxxxx" \\
-H "Content-Type: application/json"`}
                    </pre>
                </div>

                {/* Disclaimer */}
                <div className="mt-16 p-6 rounded-2xl border-2 border-amber-100 bg-amber-50/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Liability & Data Disclaimer</h3>
                    </div>
                    <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
                        <p>
                            <strong>No Responsibility for Data Loss:</strong> MakeTicket and its parent organization shall not be held responsible for any loss of data, corruption of records, or integration failures resulting from the use of our API or programmatic tools. Users are solely responsible for maintaining their own backups of event and attendee data.
                        </p>
                        <p>
                            <strong>DDoS Protection:</strong> Automated requests are strictly monitored. Any attempt to disrupt service via flood attacks, brute-forcing, or other high-frequency patterns will result in an immediate and permanent IP block.
                        </p>
                        <p>
                            <strong>Integration Costs:</strong> By using this API, you acknowledge that MakeTicket is not liable for any third-party computing or bandwidth costs incurred during your development process.
                        </p>
                    </div>
                </div>
            </div>
        </StaticPageLayout>
    );
}
