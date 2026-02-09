'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HospitalSettings {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo: string;
}

interface DoctorProfile {
    name: string;
    qualifications: string;
    regNumber: string;
    specialty: string;
}

const inputStyle = { color: '#000000' };

export default function SettingsPage() {
    const [hospital, setHospital] = useState<HospitalSettings>({
        name: 'City Medical Center',
        address: '123 Healthcare Avenue, Mumbai - 400001',
        phone: '+91 22 1234 5678',
        email: 'info@citymedical.com',
        logo: '',
    });

    const [doctor, setDoctor] = useState<DoctorProfile>({
        name: 'Dr. Arun Sharma',
        qualifications: 'MBBS, MD (Medicine)',
        regNumber: 'MCI-12345',
        specialty: 'Internal Medicine',
    });

    const [saved, setSaved] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const savedHospital = localStorage.getItem('clinrx_hospital');
        const savedDoctor = localStorage.getItem('clinrx_doctor');
        if (savedHospital) setHospital(JSON.parse(savedHospital));
        if (savedDoctor) setDoctor(JSON.parse(savedDoctor));
    }, []);

    const saveSettings = () => {
        localStorage.setItem('clinrx_hospital', JSON.stringify(hospital));
        localStorage.setItem('clinrx_doctor', JSON.stringify(doctor));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
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
                        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
                    </div>
                    <button
                        onClick={saveSettings}
                        className="px-5 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        {saved ? '✓ Saved' : 'Save Settings'}
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
                {/* Hospital Settings */}
                <section className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6">Hospital / Clinic Information</h2>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Hospital Name</label>
                            <input
                                type="text"
                                value={hospital.name}
                                onChange={(e) => setHospital({ ...hospital, name: e.target.value })}
                                style={inputStyle}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                            <textarea
                                value={hospital.address}
                                onChange={(e) => setHospital({ ...hospital, address: e.target.value })}
                                rows={2}
                                style={inputStyle}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={hospital.phone}
                                    onChange={(e) => setHospital({ ...hospital, phone: e.target.value })}
                                    style={inputStyle}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={hospital.email}
                                    onChange={(e) => setHospital({ ...hospital, email: e.target.value })}
                                    style={inputStyle}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL (optional)</label>
                            <input
                                type="text"
                                value={hospital.logo}
                                onChange={(e) => setHospital({ ...hospital, logo: e.target.value })}
                                placeholder="https://example.com/logo.png"
                                style={inputStyle}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                        </div>
                    </div>
                </section>

                {/* Doctor Profile */}
                <section className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6">Doctor Profile</h2>
                    <div className="grid gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={doctor.name}
                                onChange={(e) => setDoctor({ ...doctor, name: e.target.value })}
                                style={inputStyle}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Qualifications</label>
                            <input
                                type="text"
                                value={doctor.qualifications}
                                onChange={(e) => setDoctor({ ...doctor, qualifications: e.target.value })}
                                placeholder="MBBS, MD, etc."
                                style={inputStyle}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Registration Number</label>
                                <input
                                    type="text"
                                    value={doctor.regNumber}
                                    onChange={(e) => setDoctor({ ...doctor, regNumber: e.target.value })}
                                    style={inputStyle}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Specialty</label>
                                <input
                                    type="text"
                                    value={doctor.specialty}
                                    onChange={(e) => setDoctor({ ...doctor, specialty: e.target.value })}
                                    style={inputStyle}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Preview */}
                <section className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Prescription Header Preview</h2>
                    <div className="p-6 border border-dashed border-slate-300 rounded-lg bg-slate-50">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{hospital.name}</h3>
                                <p className="text-sm text-slate-600">{hospital.address}</p>
                                <p className="text-sm text-slate-600">📞 {hospital.phone} | ✉️ {hospital.email}</p>
                            </div>
                            {hospital.logo && (
                                <img src={hospital.logo} alt="Hospital Logo" className="h-16 object-contain" />
                            )}
                        </div>
                        <hr className="my-4 border-slate-200" />
                        <div className="flex justify-between">
                            <div>
                                <p className="font-semibold text-slate-900">{doctor.name}</p>
                                <p className="text-sm text-slate-600">{doctor.qualifications}</p>
                                <p className="text-sm text-slate-500">Reg. No: {doctor.regNumber}</p>
                            </div>
                            <div className="text-right text-sm text-slate-500">
                                <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                                <p>Rx No: RX-2026-0001</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
