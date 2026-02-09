'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { PatientSummary, PrescriptionDraft } from '@/types';

// Mock patient IDs for demo
const DEMO_PATIENTS = [
  { id: 'patient-001', name: 'Rajesh Kumar', details: '62M • DM/HTN/CKD', avatar: '👨‍🦳' },
  { id: 'patient-002', name: 'Priya Sharma', details: '45F • Asthma/Thyroid', avatar: '👩' },
];

export default function Dashboard() {
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [draft, setDraft] = useState<PrescriptionDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelVersion, setModelVersion] = useState<string>('');

  // Load patient context
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
      if (!res.ok) throw new Error('Failed to load patient');
      const data = await res.json();
      setPatientSummary(data.summary);
      setSelectedPatient(patientId);
    } catch {
      setError('Failed to load patient context');
    } finally {
      setLoading(false);
    }
  }, []);

  // Generate prescription draft
  const generateDraft = useCallback(async () => {
    if (!selectedPatient || !doctorNotes.trim()) {
      setError('Please load a patient and enter your notes');
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
      if (!res.ok) throw new Error('Failed to generate draft');
      const data = await res.json();
      if (data.draft) {
        setDraft(data.draft);
        setModelVersion(data.model_version || 'v1.0');
      } else if (data.blocked) {
        setError(data.block_reason || 'No suitable prescription found');
      }
    } catch {
      setError('Failed to generate prescription draft');
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, doctorNotes]);

  const approvePrescription = useCallback(() => {
    if (!draft) return;
    alert('Prescription approved and logged! (Demo mode)');
    setDraft(null);
    setDoctorNotes('');
  }, [draft]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 animated-gradient opacity-40" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)]" />

      {/* Header */}
      <header className="relative z-50 header-blur border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center glow-pulse transition-transform group-hover:scale-110">
              <span className="text-white font-bold text-lg">Rx</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">ClinRx Copilot</h1>
              <p className="text-[10px] text-blue-300 tracking-wider uppercase">Dashboard</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-white/60">8-Layer Pipeline Active</span>
            </div>
            <Badge variant="outline" className="text-blue-300 border-blue-500/30 bg-blue-500/10">
              Human-in-the-Loop
            </Badge>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Patient Selector */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">👥</span> Select Patient
              </h2>
              <div className="grid gap-3">
                {DEMO_PATIENTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadPatient(p.id)}
                    className={`layer-card glass-card rounded-xl p-4 text-left transition-all ${selectedPatient === p.id
                        ? 'border-blue-500/50 bg-blue-500/10 glow'
                        : 'hover:bg-white/5'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{p.avatar}</span>
                      <div>
                        <p className="font-medium text-white">{p.name}</p>
                        <p className="text-sm text-white/50">{p.details}</p>
                      </div>
                      {selectedPatient === p.id && (
                        <Badge className="ml-auto bg-blue-500/20 text-blue-300">Selected</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Summary */}
            {patientSummary && (
              <div className="glass-card rounded-2xl p-6 fade-in-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">📋</span> Patient Snapshot
                  </h2>
                  <p className="text-sm text-white/50">
                    {patientSummary.name} • {patientSummary.age}{patientSummary.sex}
                  </p>
                </div>

                <div className="grid gap-4">
                  {/* Conditions */}
                  <div className="glass rounded-xl p-4">
                    <p className="text-xs text-blue-400 uppercase tracking-wider mb-2">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {patientSummary.chronic_conditions.map((c, i) => (
                        <Badge key={i} className="bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 transition-colors">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Allergies */}
                  <div className="glass rounded-xl p-4 border-red-500/20">
                    <p className="text-xs text-red-400 uppercase tracking-wider mb-2">⚠️ Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {patientSummary.allergies.map((a, i) => (
                        <Badge key={i} className="bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Renal & Meds Grid */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="glass rounded-xl p-4">
                      <p className="text-xs text-yellow-400 uppercase tracking-wider mb-2">🔬 Renal Status</p>
                      <p className="text-2xl font-bold text-white">
                        eGFR {patientSummary.renal_status.egfr}
                      </p>
                      {patientSummary.renal_status.ckd_stage && (
                        <p className="text-sm text-white/50">CKD Stage {patientSummary.renal_status.ckd_stage}</p>
                      )}
                    </div>

                    <div className="glass rounded-xl p-4">
                      <p className="text-xs text-green-400 uppercase tracking-wider mb-2">💊 Current Meds</p>
                      <div className="space-y-1">
                        {patientSummary.current_meds.slice(0, 3).map((m, i) => (
                          <p key={i} className="text-sm text-white/80 truncate">
                            {m.drug} {m.dose}
                          </p>
                        ))}
                        {patientSummary.current_meds.length > 3 && (
                          <p className="text-xs text-white/40">+{patientSummary.current_meds.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Risk Flags */}
                  {patientSummary.risk_flags.length > 0 && (
                    <div className="glass rounded-xl p-4 border-orange-500/20">
                      <p className="text-xs text-orange-400 uppercase tracking-wider mb-2">🚩 Risk Flags</p>
                      <div className="flex flex-wrap gap-2">
                        {patientSummary.risk_flags.map((f, i) => (
                          <Badge key={i} className="bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors">
                            {f.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Doctor Notes */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span className="text-2xl">🩺</span> Clinical Notes
              </h2>
              <p className="text-sm text-white/50 mb-4">Post-investigation findings & intended treatment</p>

              <Textarea
                placeholder="e.g., Fever 3 days, productive cough, suspect bacterial respiratory infection..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                className="min-h-[140px] bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
              />

              <Button
                onClick={generateDraft}
                disabled={loading || !patientSummary}
                className="w-full mt-4 btn-premium py-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl font-semibold text-lg glow"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing Pipeline...
                  </span>
                ) : (
                  '✨ Generate AI Draft'
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <Alert className="glass-card rounded-xl border-red-500/30 bg-red-500/10">
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            {/* AI Draft Result */}
            {draft && (
              <div className="glass-card rounded-2xl p-6 fade-in-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <span className="text-2xl">🤖</span> AI Prescription Draft
                  </h2>
                  <Badge className="bg-emerald-500/20 text-emerald-300 glow-pulse">
                    {modelVersion}
                  </Badge>
                </div>

                {/* Warnings */}
                {draft.warnings.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {draft.warnings.map((w, i) => (
                      <div key={i} className="glass rounded-xl p-3 border-yellow-500/30 bg-yellow-500/10">
                        <p className="text-sm text-yellow-200">
                          {w.drug && <span className="font-semibold text-yellow-300">{w.drug}: </span>}
                          {w.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Primary Recommendation */}
                <div className="layer-card rounded-xl p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 mb-4">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs text-blue-400 uppercase tracking-wider">Primary Recommendation</p>
                    <Badge className="bg-blue-500/30 text-blue-200">
                      {Math.round(draft.primary_recommendation.confidence * 100)}% confidence
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <p className="text-2xl font-bold text-white mb-1">
                      {draft.primary_recommendation.drug} {draft.primary_recommendation.dose}
                    </p>
                    <p className="text-blue-200">
                      {draft.primary_recommendation.frequency} × {draft.primary_recommendation.duration} ({draft.primary_recommendation.route})
                    </p>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <p className="text-xs text-blue-400 uppercase tracking-wider mb-2">AI Reasoning</p>
                    <ul className="space-y-1">
                      {draft.primary_recommendation.reasoning.slice(0, 4).map((r, i) => (
                        <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                          <span className="text-blue-400 mt-1">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Alternatives */}
                {draft.alternatives.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs text-white/50 uppercase tracking-wider mb-3">Alternatives</p>
                    <div className="grid gap-2">
                      {draft.alternatives.map((alt, i) => (
                        <div key={i} className="layer-card glass rounded-xl p-3 flex justify-between items-center">
                          <div>
                            <p className="text-white font-medium">{alt.drug}</p>
                            <p className="text-xs text-white/50">{alt.note}</p>
                          </div>
                          <Badge className={alt.in_stock ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}>
                            {alt.in_stock ? '✓ In Stock' : '✗ Out'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setDraft(null)}
                    className="flex-1 btn-premium bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl py-5"
                  >
                    ✏️ Edit Manually
                  </Button>
                  <Button
                    onClick={approvePrescription}
                    className="flex-1 btn-premium bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 rounded-xl py-5"
                  >
                    ✅ Approve & Sign
                  </Button>
                </div>

                <p className="text-xs text-white/30 text-center mt-4">
                  Final prescription authored by you. AI suggestions are advisory only.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/10 mt-12">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-white/30">
            ClinRx Copilot © 2026 • Human-in-the-Loop CDSS
          </p>
          <p className="text-xs text-white/30">
            Not for clinical use without validation
          </p>
        </div>
      </footer>
    </div>
  );
}
