'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 8-Layer Architecture Data
const LAYERS = [
    {
        number: 1,
        name: 'Context Compression',
        description: 'FHIR → 31 critical fields extraction',
        icon: '📋',
        color: 'from-blue-500/20 to-cyan-500/20',
        borderColor: 'border-blue-500/30',
    },
    {
        number: 2,
        name: 'Safety Guard',
        description: '100% deterministic safety rules',
        icon: '🛡️',
        color: 'from-red-500/20 to-orange-500/20',
        borderColor: 'border-red-500/30',
    },
    {
        number: 3,
        name: 'Clinical Reasoning',
        description: 'GPT-4o-mini bounded intelligence',
        icon: '🧠',
        color: 'from-purple-500/20 to-pink-500/20',
        borderColor: 'border-purple-500/30',
    },
    {
        number: 4,
        name: 'Inventory Check',
        description: 'Real-world drug availability',
        icon: '📦',
        color: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'border-green-500/30',
    },
    {
        number: 5,
        name: 'Substitution Engine',
        description: 'Therapeutic alternatives & generics',
        icon: '🔄',
        color: 'from-yellow-500/20 to-amber-500/20',
        borderColor: 'border-yellow-500/30',
    },
    {
        number: 6,
        name: 'Explainability (XAI)',
        description: 'Human-readable rationale',
        icon: '💡',
        color: 'from-indigo-500/20 to-violet-500/20',
        borderColor: 'border-indigo-500/30',
    },
    {
        number: 7,
        name: 'Doctor Control',
        description: 'Edit, override, and sign',
        icon: '👨‍⚕️',
        color: 'from-teal-500/20 to-cyan-500/20',
        borderColor: 'border-teal-500/30',
    },
    {
        number: 8,
        name: 'Audit Logger',
        description: 'Compliance & continuous learning',
        icon: '📝',
        color: 'from-slate-500/20 to-gray-500/20',
        borderColor: 'border-slate-500/30',
    },
];

const STATS = [
    { value: '85%', label: 'Confidence Accuracy', suffix: '' },
    { value: '4', label: 'Pipeline Execution', suffix: 'ms' },
    { value: '0', label: 'Hallucination Tolerance', suffix: '%' },
    { value: '24/7', label: 'Availability', suffix: '' },
];

const FEATURES = [
    {
        title: 'Allergy Intelligence',
        description: 'Cross-reactivity detection across drug classes. Penicillin → Cephalosporin warnings.',
        icon: '🚨',
    },
    {
        title: 'Renal Dosing',
        description: 'Auto-adjustment based on eGFR. CKD Stage 3-5 dose modifications.',
        icon: '🔬',
    },
    {
        title: 'Drug Interactions',
        description: 'Real-time screening against current medications. OpenFDA integration.',
        icon: '⚠️',
    },
    {
        title: 'Inventory Aware',
        description: 'Availability-first recommendations. Generic & brand alternatives.',
        icon: '📦',
    },
];

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-black text-white overflow-x-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 animated-gradient opacity-50" />
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]" />

            {/* Header */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'header-blur py-3' : 'bg-transparent py-6'
                    }`}
            >
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center glow-pulse">
                            <span className="text-white font-bold text-lg">Rx</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold text-white">ClinRx</h1>
                            <p className="text-[10px] text-blue-300 tracking-wider uppercase">Copilot</p>
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#architecture" className="text-sm text-white/70 hover:text-white transition-colors">Architecture</a>
                        <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors">Features</a>
                        <a href="#mission" className="text-sm text-white/70 hover:text-white transition-colors">Mission</a>
                    </nav>

                    <Link
                        href="/dashboard"
                        className="btn-premium px-6 py-2.5 bg-white text-black font-medium rounded-full text-sm"
                    >
                        Open Dashboard →
                    </Link>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center pt-20">
                <div className="container mx-auto px-6 text-center">
                    <div className="max-w-4xl mx-auto">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 mb-8 fade-in-up">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-sm text-white/70">8-Layer Agentic Architecture</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 fade-in-up delay-100">
                            The AI Copilot That
                            <br />
                            <span className="gradient-text-blue">Prescribes Safer</span>
                        </h1>

                        {/* Tagline */}
                        <p className="text-xl md:text-2xl text-white/60 mb-4 fade-in-up delay-200">
                            Deterministic safety. Human-in-the-loop always.
                        </p>

                        {/* Sub-copy */}
                        <p className="text-base text-white/40 max-w-2xl mx-auto mb-10 fade-in-up delay-300">
                            Context-aware drug recommendations powered by GPT-4o-mini,
                            bounded by deterministic safety rules. Zero hallucination tolerance.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in-up delay-400">
                            <Link
                                href="/dashboard"
                                className="btn-premium px-8 py-4 bg-white text-black font-semibold rounded-full text-lg glow"
                            >
                                ✨ Open Dashboard
                            </Link>
                            <a
                                href="#architecture"
                                className="btn-premium px-8 py-4 border border-white/20 bg-white/5 text-white font-medium rounded-full text-lg"
                            >
                                Explore Architecture
                            </a>
                        </div>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 scroll-indicator">
                        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
                            <div className="w-1 h-3 bg-white/40 rounded-full" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="relative py-32">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            The Hidden Cost of <span className="text-red-400">Prescription Errors</span>
                        </h2>
                        <p className="text-white/50 max-w-2xl mx-auto">
                            Preventable medication errors remain a critical healthcare challenge
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <div className="glass-card rounded-2xl p-8 text-center">
                            <p className="text-4xl font-bold text-red-400 mb-2 stat-number">1.5M+</p>
                            <p className="text-white/60 text-sm">Adverse drug events annually in the US</p>
                        </div>
                        <div className="glass-card rounded-2xl p-8 text-center">
                            <p className="text-4xl font-bold text-orange-400 mb-2 stat-number">$177B+</p>
                            <p className="text-white/60 text-sm">Healthcare cost impact per year</p>
                        </div>
                        <div className="glass-card rounded-2xl p-8 text-center">
                            <p className="text-4xl font-bold text-green-400 mb-2 stat-number">70%</p>
                            <p className="text-white/60 text-sm">Could be prevented with better CDSS</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 8-Layer Architecture */}
            <section id="architecture" className="relative py-32">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <p className="text-blue-400 text-sm uppercase tracking-wider mb-4">Architecture</p>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            8 Layers of <span className="gradient-text-blue">Intelligent Safety</span>
                        </h2>
                        <p className="text-white/50 max-w-2xl mx-auto">
                            Each layer adds a dimension of verification, from context extraction to audit logging
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        {LAYERS.map((layer, index) => (
                            <div
                                key={layer.number}
                                className={`layer-card glass-card rounded-2xl p-6 border ${layer.borderColor} bg-gradient-to-br ${layer.color}`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl">{layer.icon}</span>
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                                        {layer.number}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{layer.name}</h3>
                                <p className="text-sm text-white/60">{layer.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="relative py-32">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <p className="text-blue-400 text-sm uppercase tracking-wider mb-4">Features</p>
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">
                            What Sets ClinRx <span className="gradient-text-blue">Apart</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                        {FEATURES.map((feature, index) => (
                            <div key={index} className="glass-card rounded-2xl p-8">
                                <span className="text-4xl mb-4 block">{feature.icon}</span>
                                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                                <p className="text-white/60">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative py-20">
                <div className="container mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                        {STATS.map((stat, index) => (
                            <div key={index} className="text-center">
                                <p className="text-4xl md:text-5xl font-bold gradient-text-blue mb-2 stat-number">
                                    {stat.value}{stat.suffix}
                                </p>
                                <p className="text-white/50 text-sm">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section id="mission" className="relative py-32">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="glass-card rounded-3xl p-12 text-center">
                            <p className="text-blue-400 text-sm uppercase tracking-wider mb-6">Our Mission</p>
                            <h2 className="text-2xl md:text-4xl font-bold mb-8 leading-relaxed">
                                &quot;Eliminate preventable prescription errors through
                                <span className="gradient-text-blue"> AI-human collaboration</span>&quot;
                            </h2>
                            <div className="line-divider w-24 mx-auto mb-8" />
                            <p className="text-white/50 text-lg">
                                A world where every prescription is safe, effective, and accessible
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-32">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">
                        Ready to Prescribe <span className="gradient-text-blue">Smarter</span>?
                    </h2>
                    <p className="text-white/50 mb-10 max-w-xl mx-auto">
                        Experience the 8-layer agentic prescription system designed for clinical safety
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/dashboard"
                            className="btn-premium px-10 py-5 bg-white text-black font-semibold rounded-full text-lg glow"
                        >
                            ✨ Open Dashboard
                        </Link>
                        <a
                            href="mailto:contact@clinrx.ai"
                            className="btn-premium px-10 py-5 border border-white/20 bg-white/5 text-white font-medium rounded-full text-lg"
                        >
                            Schedule Demo
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative py-12 border-t border-white/10">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                                <span className="text-white font-bold text-sm">Rx</span>
                            </div>
                            <span className="text-white/50 text-sm">ClinRx Copilot © 2026</span>
                        </div>
                        <p className="text-white/30 text-xs text-center">
                            Human-in-the-Loop CDSS • Not for clinical use without validation
                        </p>
                        <div className="flex gap-6">
                            <a href="#" className="text-white/40 hover:text-white text-sm transition-colors">Privacy</a>
                            <a href="#" className="text-white/40 hover:text-white text-sm transition-colors">Terms</a>
                            <a href="#" className="text-white/40 hover:text-white text-sm transition-colors">Contact</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
