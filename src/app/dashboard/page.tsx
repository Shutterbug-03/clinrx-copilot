'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import type { PatientSummary, PrescriptionDraft } from '@/types';

// Demo patients
const PATIENTS = [
  { id: 'patient-001', name: 'Rajesh Kumar', age: 62, sex: 'M', conditions: 'DM, HTN, CKD' },
  { id: 'patient-002', name: 'Priya Sharma', age: 45, sex: 'F', conditions: 'Asthma, Thyroid' },
];

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [draft, setDraft] = useState<PrescriptionDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    alert('Prescription approved! (Demo)');
    setDraft(null);
    setDoctorNotes('');
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
        <div className="flex items-center gap-4">
          <span className="text-xs text-emerald-600 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Pipeline Ready
          </span>
          <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
            Human-in-the-Loop
          </span>
        </div>
      </header>

      {/* Main Content - Fixed Height */}
      <main className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Panel - Patient Selection & Context */}
        <div className="col-span-5 flex flex-col gap-4 min-h-0">
          {/* Patient Selector */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shrink-0">
            <h2 className="text-sm font-medium text-slate-700 mb-3">Select Patient</h2>
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Age</th>
                    <th className="px-3 py-2 font-medium">Conditions</th>
                  </tr>
                </thead>
                <tbody>
                  {PATIENTS.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => loadPatient(p.id)}
                      className={`cursor-pointer transition-colors border-t border-slate-100 ${selectedPatient === p.id
                          ? 'bg-indigo-50 text-indigo-900'
                          : 'hover:bg-slate-50 text-slate-700'
                        }`}
                    >
                      <td className="px-3 py-2.5 font-medium">{p.name}</td>
                      <td className="px-3 py-2.5">{p.age}{p.sex}</td>
                      <td className="px-3 py-2.5 text-slate-500">{p.conditions}</td>
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
              <p className="text-sm text-slate-400 text-center py-8">Select a patient above</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Allergies */}
                <div className="col-span-2 p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 font-medium mb-1.5">⚠️ Allergies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patientSummary.allergies.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">{a}</span>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {patientSummary.chronic_conditions.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">{c}</span>
                    ))}
                  </div>
                </div>

                {/* Renal */}
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs text-amber-600 font-medium mb-1">Renal Status</p>
                  <p className="text-lg font-semibold text-amber-800">eGFR {patientSummary.renal_status.egfr}</p>
                  {patientSummary.renal_status.ckd_stage && (
                    <p className="text-xs text-amber-600">CKD Stage {patientSummary.renal_status.ckd_stage}</p>
                  )}
                </div>

                {/* Current Meds */}
                <div className="col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Current Medications</p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
                    {patientSummary.current_meds.map((m, i) => (
                      <span key={i} className="truncate">{m.drug} {m.dose}</span>
                    ))}
                  </div>
                </div>

                {/* Risk Flags */}
                {patientSummary.risk_flags.length > 0 && (
                  <div className="col-span-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="text-xs text-orange-600 font-medium mb-1.5">🚩 Risk Flags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {patientSummary.risk_flags.map((f, i) => (
                        <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{f.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Notes & Draft */}
        <div className="col-span-7 flex flex-col gap-4 min-h-0">
          {/* Clinical Notes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shrink-0">
            <h2 className="text-sm font-medium text-slate-700 mb-2">Clinical Notes</h2>
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Enter findings and intended treatment..."
              className="w-full h-20 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={generateDraft}
                disabled={loading || !patientSummary}
                className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
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
                <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
                  Ready for Review
                </span>
              )}
            </div>

            {!draft ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-slate-400">Generate a draft to see AI recommendations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Warnings */}
                {draft.warnings.length > 0 && (
                  <div className="space-y-2">
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
                    <span className="text-xs font-medium text-indigo-600 uppercase">Primary Recommendation</span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                      {Math.round(draft.primary_recommendation.confidence * 100)}% conf
                    </span>
                  </div>
                  <p className="text-xl font-semibold text-slate-900 mb-1">
                    {draft.primary_recommendation.drug} {draft.primary_recommendation.dose}
                  </p>
                  <p className="text-sm text-slate-600 mb-3">
                    {draft.primary_recommendation.frequency} × {draft.primary_recommendation.duration} ({draft.primary_recommendation.route})
                  </p>
                  <div className="border-t border-indigo-200 pt-3">
                    <p className="text-xs text-indigo-600 font-medium mb-1">AI Reasoning</p>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {draft.primary_recommendation.reasoning.slice(0, 3).map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-indigo-400">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Alternatives */}
                {draft.alternatives.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-medium mb-2">Alternatives</p>
                    <div className="grid gap-2">
                      {draft.alternatives.map((alt, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                          <div>
                            <span className="font-medium text-slate-700">{alt.drug}</span>
                            <span className="text-slate-400 ml-2">{alt.note}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${alt.in_stock ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {alt.in_stock ? 'In Stock' : 'Out'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setDraft(null)}
                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={approve}
                    className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    ✅ Approve & Sign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-center shrink-0">
        <p className="text-xs text-slate-400">ClinRx Copilot © 2026 • Human-in-the-Loop CDSS • Not for clinical use</p>
      </footer>
    </div>
  );
}
