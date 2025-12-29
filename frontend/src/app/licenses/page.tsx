import StaticPageLayout from '@/components/StaticPageLayout';
import { ExternalLink, Heart, Github } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Open Source Licenses | MakeTicket',
    description: 'MakeTicket is built on open source. View the licenses for the libraries and frameworks we use.',
    alternates: {
        canonical: 'https://maketicket.app/licenses',
    },
};

export default function LicensesPage() {
    const licenses = [
        { name: 'React', version: '18.2.0', license: 'MIT', url: 'https://github.com/facebook/react', description: 'A JavaScript library for building user interfaces' },
        { name: 'Next.js', version: '14.0.0', license: 'MIT', url: 'https://github.com/vercel/next.js', description: 'The React Framework for the Web' },
        { name: 'Tailwind CSS', version: '3.4.0', license: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss', description: 'A utility-first CSS framework' },
        { name: 'Lucide Icons', version: '0.300.0', license: 'ISC', url: 'https://github.com/lucide-icons/lucide', description: 'Beautiful & consistent icons' },
        { name: 'Radix UI', version: '1.0.0', license: 'MIT', url: 'https://github.com/radix-ui/primitives', description: 'Unstyled, accessible UI components' },
        { name: 'QRCode.js', version: '1.5.0', license: 'MIT', url: 'https://github.com/soldair/node-qrcode', description: 'QR code generator' },
        { name: 'Express', version: '4.18.0', license: 'MIT', url: 'https://github.com/expressjs/express', description: 'Fast, unopinionated web framework for Node.js' },
        { name: 'Mongoose', version: '8.0.0', license: 'MIT', url: 'https://github.com/Automattic/mongoose', description: 'MongoDB object modeling for Node.js' },
    ];

    const licenseColors: Record<string, string> = {
        'MIT': 'bg-green-100 text-green-700',
        'ISC': 'bg-blue-100 text-blue-700',
        'Apache 2.0': 'bg-amber-100 text-amber-700'
    };

    return (
        <StaticPageLayout
            title="Open Source Licenses"
            subtitle="Built with love and open source software."
        >
            <div className="max-w-4xl">
                {/* Hero Card */}
                <div className="p-8 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
                        <h2 className="text-2xl font-bold text-slate-900">Thank You, Open Source!</h2>
                    </div>
                    <p className="text-slate-600 mb-6">
                        MakeTicket is built on the shoulders of giants. We're incredibly grateful to the open source
                        community for creating and maintaining these amazing projects that make our work possible.
                    </p>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-slate-900">{licenses.length}+</div>
                            <div className="text-sm text-slate-500">Open source packages</div>
                        </div>
                        <div className="w-px h-12 bg-rose-200" />
                        <div className="text-center">
                            <div className="text-3xl font-bold text-slate-900">100%</div>
                            <div className="text-sm text-slate-500">Compliant</div>
                        </div>
                    </div>
                </div>

                {/* Dependencies Grid */}
                <h2 className="text-xl font-bold text-slate-900 mb-6">Core Dependencies</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {licenses.map((lib, i) => (
                        <Link
                            key={i}
                            href={lib.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group p-5 rounded-xl border border-slate-200 bg-white hover:shadow-lg hover:border-indigo-200 transition-all"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                        {lib.name}
                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h3>
                                    <p className="text-xs text-slate-400">v{lib.version}</p>
                                </div>
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${licenseColors[lib.license] || 'bg-slate-100 text-slate-600'}`}>
                                    {lib.license}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600">{lib.description}</p>
                        </Link>
                    ))}
                </div>

                {/* Our Commitment */}
                <div className="p-8 rounded-2xl bg-slate-900 text-white">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <Github className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-2">Our Commitment to Open Source</h3>
                            <p className="text-slate-300 mb-4">
                                We believe in giving back. While MakeTicket is a commercial product, we actively:
                            </p>
                            <ul className="space-y-2">
                                {[
                                    'Contribute fixes and features to projects we use',
                                    'Sponsor maintainers through GitHub Sponsors',
                                    'Open source internal tools when possible',
                                    'Comply with all license requirements'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-slate-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </StaticPageLayout>
    );
}
