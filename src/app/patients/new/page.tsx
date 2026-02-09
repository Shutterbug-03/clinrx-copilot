'use client';

import { useState } from 'react';
import Link from 'next/link';

interface NewPatient {
    name: string;
    age: string;
    sex: 'M' | 'F' | 'Other';
    phone: string;
    allergies: string;
    conditions: string;
    currentMeds: string;
}

export default function NewPatientPage() {
    const [patient, setPatient] = useState<NewPatient>({
        name: '',
        age: '',
        sex: 'M',
        phone: '',
        allergies: '',
        conditions: '',
        currentMeds: '',
    });

    const [ocrImage, setOcrImage] = useState<string | null>(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Handle image upload for OCR
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setOcrImage(base64);

            // Call OCR API
            setOcrLoading(true);
            try {
                const res = await fetch('/api/ocr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64 }),
                });

                if (res.ok) {
                    const data = await res.json();
                    // Auto-fill medications from OCR
                    if (data.medications) {
                        setPatient(prev => ({
                            ...prev,
                            currentMeds: data.medications.join('\n'),
                        }));
                    }
                    if (data.patientName) {
                        setPatient(prev => ({ ...prev, name: data.patientName }));
                    }
                }
            } catch (error) {
                console.error('OCR failed:', error);
            } finally {
                setOcrLoading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const savePatient = async () => {
        setSaving(true);
        // Save to localStorage for demo
        const patients = JSON.parse(localStorage.getItem('clinrx_patients') || '[]');
        const newPatient = {
            id: `patient-${Date.now()}`,
            ...patient,
            allergies: patient.allergies.split(',').map(a => a.trim()).filter(Boolean),
            conditions: patient.conditions.split(',').map(c => c.trim()).filter(Boolean),
            currentMeds: patient.currentMeds.split('\n').map(m => m.trim()).filter(Boolean),
            createdAt: new Date().toISOString(),
        };
        patients.push(newPatient);
        localStorage.setItem('clinrx_patients', JSON.stringify(patients));

        setTimeout(() => {
            setSaving(false);
            window.location.href = '/dashboard';
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600">
                            ← Dashboard
                        </Link>
                        <h1 className="text-xl font-semibold text-slate-900">Add New Patient</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Manual Entry Form */}
                    <section className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-6">Patient Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    value={patient.name}
                                    onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                                    style={{ color: '#000' }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="Enter patient name"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Age *</label>
                                    <input
                                        type="number"
                                        value={patient.age}
                                        onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                                        style={{ color: '#000' }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        placeholder="Age"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sex *</label>
                                    <select
                                        value={patient.sex}
                                        onChange={(e) => setPatient({ ...patient, sex: e.target.value as 'M' | 'F' | 'Other' })}
                                        style={{ color: '#000' }}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    >
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={patient.phone}
                                    onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
                                    style={{ color: '#000' }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="+91 98765 43210"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Allergies</label>
                                <input
                                    type="text"
                                    value={patient.allergies}
                                    onChange={(e) => setPatient({ ...patient, allergies: e.target.value })}
                                    style={{ color: '#000' }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="Penicillin, Sulfa (comma-separated)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Chronic Conditions</label>
                                <input
                                    type="text"
                                    value={patient.conditions}
                                    onChange={(e) => setPatient({ ...patient, conditions: e.target.value })}
                                    style={{ color: '#000' }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="Diabetes, Hypertension (comma-separated)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Current Medications</label>
                                <textarea
                                    value={patient.currentMeds}
                                    onChange={(e) => setPatient({ ...patient, currentMeds: e.target.value })}
                                    rows={4}
                                    style={{ color: '#000' }}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                    placeholder="Metformin 500mg BD&#10;Amlodipine 5mg OD&#10;(one per line)"
                                />
                            </div>

                            <button
                                onClick={savePatient}
                                disabled={!patient.name || !patient.age || saving}
                                className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? 'Saving...' : 'Save Patient'}
                            </button>
                        </div>
                    </section>

                    {/* OCR Upload */}
                    <section className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Upload Previous Prescription</h2>
                        <p className="text-sm text-slate-500 mb-6">
                            Upload a photo of an existing prescription to auto-extract medications using AI.
                        </p>

                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
                            {ocrImage ? (
                                <div className="space-y-4">
                                    <img
                                        src={ocrImage}
                                        alt="Uploaded prescription"
                                        className="max-h-48 mx-auto rounded-lg shadow"
                                    />
                                    <button
                                        onClick={() => setOcrImage(null)}
                                        className="text-sm text-red-600 hover:text-red-700"
                                    >
                                        Remove Image
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <div className="text-slate-400">
                                        <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-sm font-medium text-slate-600">Click to upload prescription image</p>
                                        <p className="text-xs text-slate-400 mt-1">JPG, PNG up to 10MB</p>
                                    </div>
                                </label>
                            )}
                        </div>

                        {ocrLoading && (
                            <div className="mt-4 p-4 bg-indigo-50 rounded-lg text-center">
                                <p className="text-sm text-indigo-600">🔍 Extracting medications with AI...</p>
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                            <h3 className="text-sm font-medium text-slate-700 mb-2">How OCR Works</h3>
                            <ul className="text-xs text-slate-500 space-y-1">
                                <li>• Upload a photo of previous prescription</li>
                                <li>• GPT-4o Vision extracts medicine names</li>
                                <li>• Auto-fills the medications field</li>
                                <li>• Review and edit before saving</li>
                            </ul>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
