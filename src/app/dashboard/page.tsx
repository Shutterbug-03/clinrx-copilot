'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { PrescriptionTemplate } from '@/components/PrescriptionTemplate';
import type { PatientSummary, PrescriptionDraft } from '@/types';

// Demo patients - load from localStorage if available
const DEFAULT_PATIENTS = [
  { id: 'patient-001', name: 'Rajesh Kumar', age: 62, sex: 'M', conditions: 'DM, HTN, CKD' },
  { id: 'patient-002', name: 'Priya Sharma', age: 45, sex: 'F', conditions: 'Asthma, Thyroid' },
];

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

export default function Dashboard() {
  const [patients, setPatients] = useState(DEFAULT_PATIENTS);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [draft, setDraft] = useState<PrescriptionDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrescription, setShowPrescription] = useState(false);
  const [hospital, setHospital] = useState<HospitalSettings | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);

  // Load settings and custom patients from localStorage
  useEffect(() => {
    const savedHospital = localStorage.getItem('clinrx_hospital');
    const savedDoctor = localStorage.getItem('clinrx_doctor');
    const savedPatients = localStorage.getItem('clinrx_patients');

    if (savedHospital) setHospital(JSON.parse(savedHospital));
    if (savedDoctor) setDoctor(JSON.parse(savedDoctor));
    if (savedPatients) {
      const customPatients = JSON.parse(savedPatients);
      setPatients([...DEFAULT_PATIENTS, ...customPatients.map((p: { id: string; name: string; age: string; sex: string; conditions: string[] }) => ({
        id: p.id,
        name: p.name,
        age: parseInt(p.age),
        sex: p.sex,
        conditions: Array.isArray(p.conditions) ? p.conditions.join(', ') : p.conditions,
      }))]);
    }
  }, []);

  const loadPatient = useCallback(async (patientId: string) => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    setDraft(null);
    try {
      const res = await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setPatientSummary(data.summary);
      setSelectedPatient(patientId);
    } catch {
      setError('Failed to load patient');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDraft = useCallback(async () => {
    if (!selectedPatient || !doctorNotes.trim()) {
      setError('Please select a patient and enter notes');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/prescription-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: selectedPatient, doctor_notes: doctorNotes }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.draft) setDraft(data.draft);
      else if (data.blocked) setError(data.block_reason || 'Blocked');
    } catch {
      setError('Failed to generate draft');
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, doctorNotes]);

  const approve = () => {
    setShowPrescription(true);
  };

  // Generate prescription data for template
  const getPrescriptionData = () => {
    if (!draft || !patientSummary) return null;

    const patient = patients.find(p => p.id === selectedPatient);
    const rxNumber = `RX-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    return {
      hospital: hospital || {
        name: 'City Medical Center',
        address: '123 Healthcare Avenue, Mumbai - 400001',
        phone: '+91 22 1234 5678',
        email: 'info@citymedical.com',
        logo: '',
      },
      doctor: doctor || {
        name: 'Dr. Demo Physician',
        qualifications: 'MBBS, MD',
        regNumber: 'MCI-00000',
        specialty: 'General Medicine',
      },
      patient: {
        name: patientSummary.name,
        age: patientSummary.age,
        sex: patientSummary.sex,
        id: patient?.id || 'N/A',
      },
      prescription: {
        rxNumber,
        date: new Date().toLocaleDateString('en-IN'),
        medications: [
          {
            drug: draft.primary_recommendation.drug,
            dose: draft.primary_recommendation.dose,
            frequency: draft.primary_recommendation.frequency,
            duration: draft.primary_recommendation.duration,
            route: draft.primary_recommendation.route,
          },
        ],
        warnings: draft.warnings?.map(w => `${w.drug}: ${w.message}`) || [],
      },
    };
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">Rx</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">ClinRx Copilot</h1>
            <p className="text-xs text-slate-500">AI-Assisted Prescriptions</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/patients/new"
            className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            + Add Patient
          </Link>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            ⚙️ Settings
          </Link>
          <span className="text-xs text-emerald-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Pipeline Ready
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Panel */}
        <div className="col-span-5 flex flex-col gap-4 min-h-0">
          {/* Patient Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shrink-0">
            <h2 className="text-sm font-medium text-slate-700 mb-3">Select Patient</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-left sticky top-0">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Age</th>
                    <th className="px-3 py-2 font-medium">Conditions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => loadPatient(p.id)}
                      className={`cursor-pointer transition-colors border-t border-slate-100 ${selectedPatient === p.id
                          ? 'bg-indigo-50 text-indigo-900'
                          : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2">{p.age}{p.sex}</td>
                      <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]">{p.conditions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Patient Snapshot */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 overflow-auto min-h-0">
            <h2 className="text-sm font-medium text-slate-700 mb-3">Patient Snapshot</h2>
            {!patientSummary ? (
              <p className="text-sm text-slate-400 text-center py-6">Select a patient above</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {/* Allergies */}
                <div className="col-span-2 p-2 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 font-medium mb-1">⚠️ Allergies</p>
                  <div className="flex flex-wrap gap-1">
                    {patientSummary.allergies.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">{a}</span>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-medium mb-1">Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {patientSummary.chronic_conditions.map((c, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">{c}</span>
                    ))}
                  </div>
                </div>

                {/* Renal */}
                <div className="p-2 bg-amber-50 rounded-lg">
                  <p className="text-xs text-amber-600 font-medium">Renal</p>
                  <p className="text-base font-semibold text-amber-800">eGFR {patientSummary.renal_status.egfr}</p>
                </div>

                {/* Current Meds */}
                <div className="col-span-2 p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 font-medium mb-1">Current Medications</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                    {patientSummary.current_meds.slice(0, 4).map((m, i) => (
                      <span key={i} className="truncate">{m.drug} {m.dose}</span>
                    ))}
                  </div>
                </div>

                {/* Risk Flags */}
                {patientSummary.risk_flags.length > 0 && (
                  <div className="col-span-2 p-2 bg-orange-50 rounded-lg">
                    <p className="text-xs text-orange-600 font-medium mb-1">🚩 Risk Flags</p>
                    <div className="flex flex-wrap gap-1">
                      {patientSummary.risk_flags.map((f, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{f.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="col-span-7 flex flex-col gap-4 min-h-0">
          {/* Clinical Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shrink-0">
            <h2 className="text-sm font-medium text-slate-700 mb-2">Clinical Notes</h2>
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Enter findings and intended treatment..."
              className="w-full h-16 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={generateDraft}
                disabled={loading || !patientSummary}
                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : '✨ Generate AI Draft'}
              </button>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          </div>

          {/* AI Draft */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex-1 overflow-auto min-h-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-slate-700">AI Prescription Draft</h2>
              {draft && (
                <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">Ready</span>
              )}
            </div>

            {!draft ? (
              <p className="text-sm text-slate-400 text-center py-8">Generate a draft to see AI recommendations</p>
            ) : (
              <div className="space-y-3">
                {/* Warnings */}
                {draft.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {draft.warnings.map((w, i) => (
                      <div key={i} className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        {w.drug && <span className="font-medium">{w.drug}: </span>}
                        {w.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Primary Recommendation */}
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-indigo-600 uppercase">Primary</span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                      {Math.round(draft.primary_recommendation.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {draft.primary_recommendation.drug} {draft.primary_recommendation.dose}
                  </p>
                  <p className="text-sm text-slate-600">
                    {draft.primary_recommendation.frequency} × {draft.primary_recommendation.duration}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setDraft(null)}
                    className="flex-1 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={approve}
                    className="flex-1 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
                  >
                    ✅ Approve & Print
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-center shrink-0">
        <p className="text-xs text-slate-400">ClinRx Copilot © 2026 • Human-in-the-Loop CDSS</p>
      </footer>

      {/* Prescription Modal */}
      {showPrescription && getPrescriptionData() && (
        <PrescriptionTemplate
          data={getPrescriptionData()!}
          onClose={() => {
            setShowPrescription(false);
            setDraft(null);
            setDoctorNotes('');
          }}
        />
      )}
    </div>
  );
}
