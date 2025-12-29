import StaticPageLayout from '@/components/StaticPageLayout';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function StatusPage() {
    const services = [
        { name: 'Web Application', status: 'operational', uptime: '99.99%' },
        { name: 'API', status: 'operational', uptime: '99.98%' },
        { name: 'Mobile Scanner', status: 'operational', uptime: '99.97%' },
        { name: 'Email Delivery', status: 'operational', uptime: '99.95%' },
        { name: 'QR Generation', status: 'operational', uptime: '100%' },
        { name: 'Analytics', status: 'operational', uptime: '99.99%' },
    ];

    const incidents = [
        { date: 'Dec 15, 2025', title: 'Scheduled Maintenance', status: 'resolved', description: 'Database upgrade completed successfully.' },
        { date: 'Dec 1, 2025', title: 'Email Delays', status: 'resolved', description: 'Some emails were delayed by up to 10 minutes.' },
    ];

    return (
        <StaticPageLayout
            title="System Status"
            subtitle="Current operational status of all MakeTicket services."
        >
            <div className="max-w-3xl">
                {/* Overall Status */}
                <div className="p-6 rounded-2xl bg-green-50 border border-green-200 mb-8 flex items-center gap-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                        <h2 className="text-xl font-semibold text-green-800">All Systems Operational</h2>
                        <p className="text-green-700">Everything is running smoothly.</p>
                    </div>
                </div>

                {/* Services */}
                <h2 className="text-xl font-bold text-slate-900 mb-4">Services</h2>
                <div className="space-y-3 mb-12">
                    {services.map((service, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="font-medium text-slate-900">{service.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-slate-500">{service.uptime} uptime</span>
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                                    Operational
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Recent Incidents */}
                <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Incidents</h2>
                <div className="space-y-4">
                    {incidents.map((incident, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-900">{incident.title}</h3>
                                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">
                                    {incident.status}
                                </span>
                            </div>
                            <p className="text-slate-600 text-sm mb-2">{incident.description}</p>
                            <p className="text-xs text-slate-400">{incident.date}</p>
                        </div>
                    ))}
                </div>
            </div>
        </StaticPageLayout>
    );
}
