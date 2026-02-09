'use client';

import Link from 'next/link';

const LAYERS = [
    { num: 1, name: 'Context', desc: 'FHIR extraction', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { num: 2, name: 'Safety', desc: 'Deterministic rules', color: 'bg-red-50 border-red-200 text-red-700' },
    { num: 3, name: 'Reasoning', desc: 'GPT-4o-mini', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { num: 4, name: 'Inventory', desc: 'Drug availability', color: 'bg-green-50 border-green-200 text-green-700' },
    { num: 5, name: 'Substitution', desc: 'Alternatives', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { num: 6, name: 'Explanation', desc: 'Human rationale', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { num: 7, name: 'Doctor', desc: 'Edit & approve', color: 'bg-teal-50 border-teal-200 text-teal-700' },
    { num: 8, name: 'Audit', desc: 'Compliance log', color: 'bg-slate-50 border-slate-200 text-slate-700' },
];

const FEATURES = [
    { title: 'Allergy Detection', desc: 'Cross-reactivity analysis across drug classes', icon: '🛡️' },
    { title: 'Renal Dosing', desc: 'Automatic adjustment based on eGFR', icon: '🔬' },
    { title: 'Drug Interactions', desc: 'Real-time screening via OpenFDA', icon: '⚠️' },
    { title: 'Inventory Aware', desc: 'Availability-first recommendations', icon: '📦' },
];

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">Rx</span>
                        </div>
                        <span className="text-lg font-semibold text-slate-900">ClinRx</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
                        <a href="#architecture" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Architecture</a>
                        <a href="#about" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">About</a>
                    </nav>
                    <Link
                        href="/dashboard"
                        className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Open Dashboard
                    </Link>
                </div>
            </header>

            {/* Hero */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full mb-6">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        8-Layer Agentic Architecture
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-6">
                        AI-Assisted Prescription
                        <br />
                        <span className="text-indigo-600">That Puts Safety First</span>
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
                        Deterministic safety rules bounded by GPT-4o-mini intelligence.
                        Context-aware drug recommendations with human-in-the-loop always.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/dashboard"
                            className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            Try the Dashboard →
                        </Link>
                        <a
                            href="#architecture"
                            className="px-8 py-3 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            See How It Works
                        </a>
                    </div>
                </div>
            </section>

            {/* Stats */}
            <section className="py-12 bg-slate-50 border-y border-slate-100">
                <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                        <p className="text-3xl font-bold text-slate-900">85%</p>
                        <p className="text-sm text-slate-500 mt-1">Confidence Accuracy</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-slate-900">4ms</p>
                        <p className="text-sm text-slate-500 mt-1">Pipeline Speed</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-slate-900">8</p>
                        <p className="text-sm text-slate-500 mt-1">Safety Layers</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-slate-900">0%</p>
                        <p className="text-sm text-slate-500 mt-1">Hallucination Tolerance</p>
                    </div>
                </div>
            </section>

            {/* 8-Layer Architecture */}
            <section id="architecture" className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">8 Layers of Intelligent Safety</h2>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            Each layer adds verification, from context extraction to compliance logging
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {LAYERS.map((layer) => (
                            <div
                                key={layer.num}
                                className={`p-4 rounded-xl border ${layer.color} transition-transform hover:-translate-y-1`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center text-xs font-bold">
                                        {layer.num}
                                    </span>
                                    <span className="font-semibold">{layer.name}</span>
                                </div>
                                <p className="text-sm opacity-80">{layer.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features */}
            <section id="features" className="py-20 px-6 bg-slate-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Clinical Safety Features</h2>
                        <p className="text-slate-600">Built for real-world prescribing challenges</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        {FEATURES.map((feature, i) => (
                            <div
                                key={i}
                                className="p-6 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                            >
                                <span className="text-3xl mb-3 block">{feature.icon}</span>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                                <p className="text-slate-600 text-sm">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* About / Mission */}
            <section id="about" className="py-20 px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Mission</h2>
                    <p className="text-xl text-slate-600 leading-relaxed mb-8">
                        &quot;Eliminate preventable prescription errors through
                        <span className="text-indigo-600 font-medium"> AI-human collaboration</span>.&quot;
                    </p>
                    <p className="text-slate-500">
                        Safe prescribing that doctors can trust. AI suggestions are always advisory—the final decision is yours.
                    </p>
                </div>
            </section>

            {/* CTA */}
            <section className="py-16 px-6 bg-indigo-600">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Ready to prescribe smarter?</h2>
                    <p className="text-indigo-100 mb-8">Experience the 8-layer prescription system</p>
                    <Link
                        href="/dashboard"
                        className="inline-block px-8 py-3 bg-white text-indigo-600 font-medium rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                        Open Dashboard →
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-slate-100">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">Rx</span>
                        </div>
                        <span className="text-sm text-slate-500">ClinRx Copilot © 2026</span>
                    </div>
                    <p className="text-xs text-slate-400">Human-in-the-Loop CDSS • Not for clinical use without validation</p>
                    <div className="flex gap-6 text-sm text-slate-500">
                        <a href="#" className="hover:text-slate-900">Privacy</a>
                        <a href="#" className="hover:text-slate-900">Terms</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
