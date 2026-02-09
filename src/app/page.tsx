'use client';

import Link from 'next/link';

const LAYERS = [
    { num: 1, name: 'Context Compression', desc: 'Extract & compress patient data from FHIR/EHR', note: 'This layer must be lossless. No summarization.', icon: '📋', color: 'bg-slate-100' },
    { num: 2, name: 'Safety & Constraint Guard', desc: 'Prevent harm before reasoning starts.', note: 'If this layer fails → system stops.', icon: '🛡️', color: 'bg-red-50' },
    { num: 3, name: 'Clinical Reasoning', desc: 'Generate clinical options, not decisions.', note: 'This layer suggests and explains. Never finalizes.', icon: '🧠', color: 'bg-teal-50' },
    { num: 4, name: 'Inventory & Availability', desc: 'Ground clinical logic in real-world availability.', note: 'Solves the #1 doctor frustration.', icon: '📦', color: 'bg-amber-50' },
    { num: 5, name: 'Equivalence & Substitution', desc: "Answer: What's the next best alternative?", note: 'Must always show confidence + caveat.', icon: '🔄', color: 'bg-purple-50' },
    { num: 6, name: 'Explanation & Transparency', desc: 'Make AI trustable to doctors & regulators.', note: 'No explanation → no adoption.', icon: '📄', color: 'bg-blue-50' },
    { num: 7, name: 'Doctor Control & Decision', desc: 'Return authority to the clinician.', note: 'Legally decisive layer.', icon: '👨‍⚕️', color: 'bg-green-50' },
    { num: 8, name: 'Audit, Learning & Feedback', desc: 'Improve system without risking patients.', note: 'Learning happens here — never live.', icon: '📊', color: 'bg-slate-50' },
];

const TRUST_BADGES = [
    { icon: '🔒', label: 'HIPAA Compliant' },
    { icon: '🛡️', label: 'FDA-Aware Design' },
    { icon: '✓', label: 'SOC 2 Ready' },
    { icon: '📊', label: 'Full Audit Trail' },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">∿</span>
                        </div>
                        <span className="text-xl font-bold text-slate-900">ClinRx</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#architecture" className="text-slate-600 hover:text-slate-900 transition-colors">Architecture</a>
                        <a href="#features" className="text-slate-600 hover:text-slate-900 transition-colors">Features</a>
                    </nav>
                    <Link
                        href="/dashboard"
                        className="px-6 py-2.5 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        Open Dashboard
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20 px-6 text-center">
                <div className="max-w-4xl mx-auto">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-teal-200 text-teal-600 text-sm font-medium rounded-full mb-8">
                        <span>⚡</span>
                        Production-Ready Clinical AI
                    </div>

                    {/* Headline */}
                    <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
                        Agentic Intelligence for{' '}
                        <span className="text-teal-500">Clinical Medicine</span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-10">
                        8 layered, gated, auditable agents. Deterministic safety gates.
                        Bounded AI reasoning. The doctor always signs the output.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                        <Link
                            href="/dashboard"
                            className="px-8 py-3.5 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition-colors inline-flex items-center gap-2"
                        >
                            Explore Dashboard <span>→</span>
                        </Link>
                        <a
                            href="#architecture"
                            className="px-8 py-3.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
                        >
                            View Architecture <span>›</span>
                        </a>
                    </div>

                    {/* Trust Badges */}
                    <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-500">
                        {TRUST_BADGES.map((badge, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 8-Layer Architecture */}
            <section id="architecture" className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">8 Layers of Clinical Safety</h2>
                        <p className="text-lg text-slate-600">Each layer adds verification and accountability</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {LAYERS.map((layer) => (
                            <div
                                key={layer.num}
                                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`w-12 h-12 ${layer.color} rounded-xl flex items-center justify-center text-2xl shrink-0`}>
                                        {layer.icon}
                                    </div>

                                    <div className="flex-1">
                                        {/* Layer Label */}
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
                                            Layer {layer.num}
                                        </p>

                                        {/* Title */}
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{layer.name}</h3>

                                        {/* Description */}
                                        <p className="text-slate-600 text-sm mb-3">{layer.desc}</p>

                                        {/* Warning Note */}
                                        <p className="text-sm text-red-400 flex items-center gap-1">
                                            <span>⚠</span> {layer.note}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4">Built for Clinical Reality</h2>
                        <p className="text-lg text-slate-600">Safety features that doctors can trust</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-6">
                        {[
                            { icon: '🛡️', title: 'Allergy Detection', desc: 'Cross-reactivity analysis' },
                            { icon: '🔬', title: 'Renal Dosing', desc: 'Automatic eGFR adjustment' },
                            { icon: '⚠️', title: 'Drug Interactions', desc: 'Real-time screening' },
                            { icon: '📦', title: 'Inventory Aware', desc: 'Availability-first Rx' },
                        ].map((f, i) => (
                            <div key={i} className="text-center p-6 bg-slate-50 rounded-xl">
                                <span className="text-4xl mb-4 block">{f.icon}</span>
                                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                                <p className="text-sm text-slate-600">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-teal-500">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">Ready to prescribe smarter?</h2>
                    <p className="text-teal-100 mb-8">Experience the 8-layer prescription safety system</p>
                    <Link
                        href="/dashboard"
                        className="inline-block px-8 py-3.5 bg-white text-teal-600 font-medium rounded-lg hover:bg-teal-50 transition-colors"
                    >
                        Open Dashboard →
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 bg-white border-t border-slate-100">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">∿</span>
                        </div>
                        <span className="text-sm text-slate-500">ClinRx Copilot © 2026</span>
                    </div>
                    <p className="text-xs text-slate-400">Human-in-the-Loop CDSS • Not for clinical use without validation</p>
                </div>
            </footer>
        </div>
    );
}
