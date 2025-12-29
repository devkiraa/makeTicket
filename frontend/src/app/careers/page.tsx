import StaticPageLayout from '@/components/StaticPageLayout';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function CareersPage() {
    const jobs = [
        {
            title: 'Senior Frontend Engineer',
            department: 'Engineering',
            location: 'Remote / Bangalore',
            type: 'Full-time',
            description: 'Build beautiful, performant interfaces using React and Next.js.'
        },
        {
            title: 'Product Designer',
            department: 'Design',
            location: 'Remote',
            type: 'Full-time',
            description: 'Shape the future of event management with intuitive designs.'
        },
        {
            title: 'Customer Success Manager',
            department: 'Operations',
            location: 'Bangalore',
            type: 'Full-time',
            description: 'Help our customers get the most out of MakeTicket.'
        },
        {
            title: 'Backend Engineer',
            department: 'Engineering',
            location: 'Remote / Bangalore',
            type: 'Full-time',
            description: 'Scale our infrastructure to handle millions of events.'
        },
    ];

    return (
        <StaticPageLayout
            title="Careers"
            subtitle="Join us in building the future of event management."
        >
            <div className="max-w-3xl">
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl p-8 mb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Why MakeTicket?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <div className="text-3xl font-bold text-indigo-600">100%</div>
                            <div className="text-slate-600">Remote-friendly</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-indigo-600">Unlimited</div>
                            <div className="text-slate-600">PTO policy</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-indigo-600">Equity</div>
                            <div className="text-slate-600">For all employees</div>
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-6">Open Positions</h2>
                <div className="space-y-4">
                    {jobs.map((job, i) => (
                        <div key={i} className="p-6 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{job.title}</h3>
                                    <p className="text-slate-600 mb-3">{job.description}</p>
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Briefcase className="w-4 h-4" />
                                            {job.department}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-4 h-4" />
                                            {job.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {job.type}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="outline" className="rounded-full shrink-0">
                                    Apply
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </StaticPageLayout>
    );
}
