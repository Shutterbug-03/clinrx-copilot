'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PatientSummary, PrescriptionDraft } from '@/types';

// Mock patient IDs for demo
const DEMO_PATIENTS = [
  { id: 'patient-001', name: 'Rajesh Kumar (62M, DM/HTN/CKD)' },
  { id: 'patient-002', name: 'Priya Sharma (45F, Asthma/Thyroid)' },
];

export default function ClinRxCopilot() {
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
    } catch (err) {
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
        body: JSON.stringify({
          patient_id: selectedPatient,
          doctor_notes: doctorNotes,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate draft');

      const data = await res.json();

      // Handle the new API response format
      if (data.draft) {
        setDraft(data.draft);
        setModelVersion(data.model_version || 'v1.0');
      } else if (data.blocked) {
        setError(data.block_reason || 'No suitable prescription found');
      }
    } catch (err) {
      setError('Failed to generate prescription draft');
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, doctorNotes]);

  // Approve prescription (would save to DB in production)
  const approvePrescription = useCallback(() => {
    if (!draft) return;

    // In production: POST to /api/prescriptions with audit log
    alert('Prescription approved and logged! (Demo mode - not saved to DB)');

    // Reset for next patient
    setDraft(null);
    setDoctorNotes('');
  }, [draft]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <span className="text-white font-bold text-lg">Rx</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">ClinRx Copilot</h1>
              <p className="text-xs text-blue-300">AI-Assisted Prescription Draft</p>
            </div>
          </div>
          <Badge variant="outline" className="text-blue-300 border-blue-500/50">
            Human-in-the-Loop
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Patient Context */}
          <div className="space-y-6">
            {/* Patient Selector */}
            <Card className="bg-white/5 border-white/10 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Select Patient</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  {DEMO_PATIENTS.map((p) => (
                    <Button
                      key={p.id}
                      variant={selectedPatient === p.id ? 'default' : 'outline'}
                      className={`justify-start ${selectedPatient === p.id
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                        }`}
                      onClick={() => loadPatient(p.id)}
                    >
                      {p.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Patient Summary */}
            {patientSummary && (
              <Card className="bg-white/5 border-white/10 backdrop-blur">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <span>📋</span> Patient Snapshot
                  </CardTitle>
                  <CardDescription className="text-blue-200">
                    {patientSummary.name} • {patientSummary.age}{patientSummary.sex}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Conditions */}
                  <div>
                    <p className="text-xs text-blue-300 mb-1">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-1">
                      {patientSummary.chronic_conditions.map((c, i) => (
                        <Badge key={i} variant="secondary" className="bg-blue-500/20 text-blue-200">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Allergies */}
                  <div>
                    <p className="text-xs text-red-300 mb-1">⚠️ Allergies</p>
                    <div className="flex flex-wrap gap-1">
                      {patientSummary.allergies.map((a, i) => (
                        <Badge key={i} variant="destructive" className="bg-red-500/30">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Renal */}
                  <div>
                    <p className="text-xs text-yellow-300 mb-1">🔬 Renal Status</p>
                    <p className="text-white text-sm">
                      eGFR: {patientSummary.renal_status.egfr}
                      {patientSummary.renal_status.ckd_stage && ` (CKD ${patientSummary.renal_status.ckd_stage})`}
                    </p>
                  </div>

                  {/* Current Meds */}
                  <div>
                    <p className="text-xs text-green-300 mb-1">💊 Current Medications</p>
                    <div className="space-y-1">
                      {patientSummary.current_meds.map((m, i) => (
                        <p key={i} className="text-white text-sm">
                          {m.drug} {m.dose} {m.frequency}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Risk Flags */}
                  {patientSummary.risk_flags.length > 0 && (
                    <div>
                      <p className="text-xs text-orange-300 mb-1">🚩 Risk Flags</p>
                      <div className="flex flex-wrap gap-1">
                        {patientSummary.risk_flags.map((f, i) => (
                          <Badge key={i} className="bg-orange-500/30 text-orange-200">
                            {f.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Doctor Input & Draft */}
          <div className="space-y-6">
            {/* Doctor Notes Input */}
            <Card className="bg-white/5 border-white/10 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">🩺 Your Notes</CardTitle>
                <CardDescription className="text-blue-200">
                  Post-investigation findings & intended treatment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., Fever 3 days, productive cough, suspect LRTI. Needs oral antibiotics..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="min-h-[120px] bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
                <Button
                  onClick={generateDraft}
                  disabled={loading || !patientSummary}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
                >
                  {loading ? 'Generating...' : '✨ Generate Draft'}
                </Button>
              </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* AI Draft */}
            {draft && (
              <Card className="bg-white/5 border-white/10 backdrop-blur">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">📝 AI Draft</CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-300">
                      {modelVersion}
                    </Badge>
                  </div>
                  <CardDescription className="text-blue-200">
                    Review, edit, and approve
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Warnings */}
                  {draft.warnings.length > 0 && (
                    <div className="space-y-2">
                      {draft.warnings.map((w, i) => (
                        <Alert key={i} className="bg-yellow-500/20 border-yellow-500/50">
                          <AlertDescription className="text-yellow-200">
                            {w.drug && <span className="font-semibold">{w.drug}: </span>}
                            {w.message}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* Primary Recommendation */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs text-blue-300">Primary Recommendation</p>
                      <Badge className="bg-blue-500/30 text-blue-200">
                        {Math.round(draft.primary_recommendation.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <p className="text-white text-lg font-medium mb-1">
                      {draft.primary_recommendation.drug} {draft.primary_recommendation.dose}
                    </p>
                    <p className="text-blue-200 text-sm">
                      {draft.primary_recommendation.frequency} × {draft.primary_recommendation.duration} ({draft.primary_recommendation.route})
                    </p>
                    <Separator className="my-3 bg-white/10" />
                    <p className="text-xs text-blue-300 mb-1">Reasoning:</p>
                    <ul className="text-sm text-white/80 list-disc list-inside">
                      {draft.primary_recommendation.reasoning.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Alternatives */}
                  {draft.alternatives.length > 0 && (
                    <div>
                      <p className="text-xs text-blue-300 mb-2">Alternatives</p>
                      <div className="space-y-2">
                        {draft.alternatives.map((alt, i) => (
                          <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                            <div className="flex justify-between items-center">
                              <p className="text-white text-sm">
                                {alt.drug} {alt.dose}
                              </p>
                              <Badge variant={alt.in_stock ? 'default' : 'destructive'} className="text-xs">
                                {alt.in_stock ? 'In Stock' : 'Out of Stock'}
                              </Badge>
                            </div>
                            <p className="text-white/60 text-xs mt-1">{alt.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                      onClick={() => setDraft(null)}
                    >
                      ✏️ Edit Manually
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600"
                      onClick={approvePrescription}
                    >
                      ✅ Approve & Sign
                    </Button>
                  </div>

                  <p className="text-xs text-white/40 text-center">
                    Final prescription authored by you. AI suggestions are advisory only.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/20 mt-12">
        <div className="container mx-auto px-6 py-4 text-center">
          <p className="text-xs text-white/40">
            ClinRx Copilot MVP • Human-in-the-Loop CDSS • Not for clinical use without validation
          </p>
        </div>
      </footer>
    </div>
  );
}
