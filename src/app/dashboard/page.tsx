'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { PrescriptionTemplate } from '@/components/PrescriptionTemplate';
import type { PatientSummary, PrescriptionDraft, PrescriptionMedication } from '@/types';

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

interface SelectableMedication extends PrescriptionMedication {
  selected: boolean;
  showAlternatives: boolean;
}

const DRUG_DETAILS: Record<string, { salt: string; class: string; effects: string }> = {
  'paracetamol': { salt: 'Acetaminophen', class: 'Analgesic', effects: 'Pain & fever relief' },
  'ambroxol': { salt: 'Ambroxol HCl', class: 'Mucolytic', effects: 'Loosens mucus' },
  'pantoprazole': { salt: 'Pantoprazole', class: 'PPI', effects: 'Reduces acid' },
  'guaifenesin': { salt: 'Guaifenesin', class: 'Expectorant', effects: 'Thins mucus' },
  'domperidone': { salt: 'Domperidone', class: 'Antiemetic', effects: 'Reduces nausea' },
  'metformin': { salt: 'Metformin HCl', class: 'Biguanide', effects: 'Lowers sugar' },
  'losartan': { salt: 'Losartan K', class: 'ARB', effects: 'Lowers BP' },
  'amlodipine': { salt: 'Amlodipine', class: 'CCB', effects: 'Lowers BP' },
  'cetirizine': { salt: 'Cetirizine', class: 'Antihistamine', effects: 'Allergies' },
  'azithromycin': { salt: 'Azithromycin', class: 'Antibiotic', effects: 'Infections' },
  'ibuprofen': { salt: 'Ibuprofen', class: 'NSAID', effects: 'Pain relief' },
};

function getDrugDetails(drugName: string) {
  const key = drugName.toLowerCase().split(' ')[0];
  return DRUG_DETAILS[key] || { salt: 'Active', class: 'Medication', effects: 'Therapeutic' };
}

// Mobile Step Indicator
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${i === current
            ? 'w-8 bg-teal-500'
            : i < current
              ? 'w-1.5 bg-teal-400'
              : 'w-1.5 bg-slate-200'
            }`}
        />
      ))}
    </div>
  );
}

function PatientCard({
  patient,
  selected,
  onClick
}: {
  patient: SelectablePatient;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${selected
        ? 'border-teal-500 bg-teal-50 shadow-lg shadow-teal-500/10'
        : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${selected ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
          {patient.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{patient.name}</p>
          <p className="text-sm text-slate-500">{patient.age} yrs • {patient.sex === 'M' ? 'Male' : 'Female'}{patient.phone ? ` • ${patient.phone}` : ''}</p>
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
            <span className="text-white text-sm">✓</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-400 truncate">{patient.conditions}</p>
    </button>
  );
}

// Mobile Medication Card
function MedicationCard({
  med,
  onToggle,
  onEdit,
  onAlternatives,
}: {
  med: SelectableMedication;
  onToggle: () => void;
  onEdit: () => void;
  onAlternatives: () => void;
}) {
  const details = getDrugDetails(med.drug);

  return (
    <div className={`rounded-xl border transition-all duration-200 ${med.selected
      ? 'border-teal-500/30 bg-white shadow-sm'
      : 'border-slate-50 bg-slate-50/30 opacity-40'
      }`}>
      <div className="p-3">
        <div className="flex items-center gap-4">
          {/* Checkbox - Minimalist Circle */}
          <button
            onClick={onToggle}
            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${med.selected
              ? 'bg-teal-500 border-teal-500'
              : 'bg-white border-slate-200'
              }`}
          >
            {med.selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>

          {/* Content - Typography Focused (Sober) */}
          <div className="flex-1 flex items-center justify-between min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-700 text-sm tracking-tight">{med.drug.toUpperCase()}</span>
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100/50">
                {med.category}
              </span>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-slate-600">{med.dose}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-tighter font-medium">{med.frequency}</span>
              </div>
              <div className="hidden xl:flex flex-col items-end border-l border-slate-100 pl-8">
                <span className="text-xs text-slate-400 font-normal">{med.duration}</span>
                <span className="text-[9px] text-slate-300 uppercase tracking-tighter font-medium">{med.route}</span>
              </div>
            </div>
          </div>

          {/* Actions Inline - Very Discreet */}
          <div className="flex gap-1 shrink-0 ml-4 opacity-40 group-hover:opacity-100 transition-opacity">
            {med.alternatives && med.alternatives.length > 0 && (
              <button
                onClick={onAlternatives}
                className="p-1 hover:text-amber-600 transition-colors"
                title="Alternatives"
              >
                <span className="text-xs">🔄</span>
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1 hover:text-teal-600 transition-colors"
              title="Edit"
            >
              <span className="text-xs">✏️</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alternatives Panel */}
      {med.showAlternatives && med.alternatives && (
        <div className="px-4 pb-4">
          <div className="bg-amber-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-bold text-amber-700">Substitutes if unavailable:</p>
            {med.alternatives.map((alt, i) => (
              <div key={i} className="bg-white rounded-lg p-2.5 border border-amber-200">
                <p className="font-medium text-sm text-slate-900">{alt.drug} {alt.dose}</p>
                <p className="text-xs text-amber-600 mt-0.5">{alt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Modal (Mobile Optimized)
function MobileEditModal({
  medication,
  onSave,
  onClose,
  onRemove,
}: {
  medication: SelectableMedication;
  onSave: (med: SelectableMedication) => void;
  onClose: () => void;
  onRemove: () => void;
}) {
  const [editMed, setEditMed] = useState({ ...medication });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-lg md:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-auto animate-slide-up">
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 md:hidden" />

        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-slate-900">Edit Medication</h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Drug Name</label>
              <input
                type="text"
                value={editMed.drug}
                onChange={(e) => setEditMed({ ...editMed, drug: e.target.value })}
                style={{ color: '#000' }}
                className="w-full mt-1.5 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Dose</label>
                <input
                  type="text"
                  value={editMed.dose}
                  onChange={(e) => setEditMed({ ...editMed, dose: e.target.value })}
                  style={{ color: '#000' }}
                  className="w-full mt-1.5 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Frequency</label>
                <select
                  value={editMed.frequency}
                  onChange={(e) => setEditMed({ ...editMed, frequency: e.target.value })}
                  style={{ color: '#000' }}
                  className="w-full mt-1.5 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="OD">OD</option>
                  <option value="BD">BD</option>
                  <option value="TDS">TDS</option>
                  <option value="QID">QID</option>
                  <option value="HS">HS</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Duration</label>
                <input
                  type="text"
                  value={editMed.duration}
                  onChange={(e) => setEditMed({ ...editMed, duration: e.target.value })}
                  style={{ color: '#000' }}
                  className="w-full mt-1.5 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Route</label>
                <select
                  value={editMed.route}
                  onChange={(e) => setEditMed({ ...editMed, route: e.target.value })}
                  style={{ color: '#000' }}
                  className="w-full mt-1.5 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="oral">Oral</option>
                  <option value="iv">IV</option>
                  <option value="im">IM</option>
                  <option value="topical">Topical</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onRemove}
              className="px-6 py-3.5 text-red-600 font-medium rounded-xl bg-red-50 active:bg-red-100 transition-colors"
            >
              Remove
            </button>
            <button
              onClick={() => { onSave(editMed); onClose(); }}
              className="flex-1 py-3.5 bg-teal-500 text-white font-bold rounded-xl active:bg-teal-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal type for the patient dropdown list
interface SelectablePatient {
  id: string;
  name: string;
  age: number;
  sex: string;
  conditions: string;
  phone?: string;
}

interface DesktopLayoutProps {
  patients: SelectablePatient[];
  selectedPatient: string;
  selectedPatientData: SelectablePatient | undefined;
  patientSummary: PatientSummary | null;
  doctorNotes: string;
  setDoctorNotes: (notes: string | ((prev: string) => string)) => void;
  loading: boolean;
  error: string | null;
  medications: SelectableMedication[];
  selectedCount: number;
  draft: PrescriptionDraft | null;
  loadPatient: (id: string) => void;
  generateDraft: () => void;
  toggleMedicationSelection: (id: string) => void;
  setEditingMed: (med: SelectableMedication) => void;
  toggleAlternatives: (id: string) => void;
  approve: () => void;
  hospital: HospitalSettings | null;
  doctor: DoctorProfile | null;
}

interface MobileLayoutProps {
  mobileStep: number;
  patients: SelectablePatient[];
  selectedPatient: string;
  selectedPatientData: SelectablePatient | undefined;
  patientSummary: PatientSummary | null;
  doctorNotes: string;
  setDoctorNotes: (notes: string | ((prev: string) => string)) => void;
  loading: boolean;
  error: string | null;
  medications: SelectableMedication[];
  selectedCount: number;
  draft: PrescriptionDraft | null;
  loadPatient: (id: string) => void;
  generateDraft: () => void;
  toggleMedicationSelection: (id: string) => void;
  setEditingMed: (med: SelectableMedication) => void;
  toggleAlternatives: (id: string) => void;
  approve: () => void;
  setMobileStep: (step: number | ((prev: number) => number)) => void;
}

// ... skipped down to DesktopLayout ...
const DesktopLayout = ({
  // ... 

  patients,
  selectedPatient,
  selectedPatientData,
  patientSummary,
  doctorNotes,
  setDoctorNotes,
  loading,
  error,
  medications,
  selectedCount,
  draft,
  loadPatient,
  generateDraft,
  toggleMedicationSelection,
  setEditingMed,
  toggleAlternatives,
  approve,
  hospital,
  doctor
}: DesktopLayoutProps) => (
  <div className="hidden lg:flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex-col">
    {/* Header */}
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-2 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <Link href="/" className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
          <span className="text-white font-bold text-lg">∿</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">ClinRx Copilot</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">AI-Assisted Prescriptions</p>
        </div>
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/patients/new" className="px-3 py-1.5 text-xs font-bold text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
          + ADD PATIENT
        </Link>
        <Link href="/settings" className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          ⚙️ SETTINGS
        </Link>
        <div className="px-2 py-1 bg-teal-100 text-teal-700 text-[10px] font-bold rounded-full">
          ● MULTI-DRUG
        </div>
      </div>
    </header>

    {/* Main Content Area */}
    <main className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0 overflow-hidden">

      {/* LEFT COLUMN: Compact One-Page Design */}
      <div className="col-span-3 flex flex-col gap-3 min-h-0 overflow-hidden">

        {/* Patient Selection - Ultra Compact */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Patient</p>
            <Link href="/patients/new" className="text-[10px] font-bold text-teal-600 hover:underline">+ ADD</Link>
          </div>
          <div className="space-y-1">
            {patients.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPatient(p.id)}
                className={`w-full p-2 rounded-lg border transition-all flex items-center justify-between group ${selectedPatient === p.id
                  ? 'border-teal-500/50 bg-teal-50/30'
                  : 'border-slate-50 bg-white hover:border-slate-200'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedPatient === p.id ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {p.name[0]}
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-bold ${selectedPatient === p.id ? 'text-teal-900' : 'text-slate-700'}`}>{p.name}</p>
                    <p className="text-[9px] text-slate-400 uppercase tracking-tighter">{p.age}Y • {p.conditions.split(',')[0]}{p.phone ? ` • ${p.phone}` : ''}</p>
                  </div>
                </div>
                {selectedPatient === p.id && <span className="text-teal-500 text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Patient Snapshot - Professional & Minimalist */}
        {patientSummary ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-50">
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs text-center">
                {patientSummary.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-sm tracking-tight">{patientSummary.name}</h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">
                  {patientSummary.age}Y • {patientSummary.sex[0]} • eGFR {patientSummary.renal_status.egfr}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto space-y-4 pr-1 scrollbar-hide">
              <div className="grid grid-cols-2 gap-4">
                {patientSummary.allergies.length > 0 && (
                  <div className="border-l-2 border-red-500/20 pl-2">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Allergies</p>
                    <p className="text-[11px] font-bold text-red-600/80 leading-tight">
                      {patientSummary.allergies.join(', ')}
                    </p>
                  </div>
                )}
                <div className="border-l-2 border-amber-500/20 pl-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Renal</p>
                  <p className="text-[11px] font-bold text-slate-800">eGFR {patientSummary.renal_status.egfr}</p>
                </div>
              </div>

              {patientSummary.chronic_conditions.length > 0 && (
                <div className="border-l-2 border-slate-200 pl-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conditions</p>
                  <div className="flex flex-wrap gap-1">
                    {patientSummary.chronic_conditions.map((c, i) => (
                      <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {patientSummary.current_meds.length > 0 && (
                <div className="border-l-2 border-blue-500/20 pl-2">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Meds</p>
                  <div className="space-y-1">
                    {patientSummary.current_meds.map((m, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-700">{m.drug}</span>
                        <span className="text-slate-400 font-medium px-1.5 py-0.5 rounded">{m.dose}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 border-dashed p-4 flex-1 flex items-center justify-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Select Patient Profile</p>
          </div>
        )}
      </div>

      <div className="col-span-9 flex flex-col gap-3 min-h-0 overflow-hidden">

        {/* Inline Clinical Notes Bar */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex items-center px-4 py-2 gap-4 shrink-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm">🩺</span>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Notes</p>
          </div>
          <div className="flex-1 relative">
            <input
              type="text"
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateDraft()}
              placeholder="Fever for 3 days, cough, joint pain..."
              style={{ color: '#000' }}
              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
            />
          </div>
          <button
            onClick={generateDraft}
            disabled={loading || !patientSummary}
            className="px-4 py-2 bg-teal-500 text-white font-bold text-[10px] rounded-lg disabled:opacity-30 hover:bg-teal-600 transition-all shadow-sm uppercase tracking-widest shrink-0"
          >
            {loading ? '...' : 'Enter'}
          </button>
        </div>

        {/* AI Prescription Panel - Medicines First */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Action Bar - Header */}
          <div className="px-4 py-2 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white shadow-sm z-10">
            <div className="flex items-center gap-3">
              <span className="text-sm">💊</span>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prescription Draft</h2>
              {medications.length > 0 && (
                <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[9px] font-bold rounded-full border border-teal-100/50">
                  {selectedCount}/{medications.length} SELECTED
                </span>
              )}
            </div>
            {medications.length > 0 && (
              <div className="flex gap-4">
                <button
                  onClick={() => medications.forEach(m => !m.selected && toggleMedicationSelection(m.id))}
                  className="text-[9px] font-bold text-teal-500 hover:text-teal-600 transition-colors uppercase tracking-wider"
                >
                  Select All
                </button>
                <button
                  onClick={() => medications.forEach(m => m.selected && toggleMedicationSelection(m.id))}
                  className="text-[9px] font-bold text-slate-300 hover:text-slate-400 transition-colors uppercase tracking-wider"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Medicines List - Primary View */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {medications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-20">
                <span className="text-2xl mb-2">📋</span>
                <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Input</p>
              </div>
            ) : (
              medications.map((med) => (
                <MedicationCard
                  key={med.id}
                  med={med}
                  onToggle={() => toggleMedicationSelection(med.id)}
                  onEdit={() => setEditingMed(med)}
                  onAlternatives={() => toggleAlternatives(med.id)}
                />
              ))
            )}
          </div>

          {/* Bottom Section: Reasoning & Alerts - Discreet & Minimalist */}
          {medications.length > 0 && (
            <div className="border-t border-slate-50 bg-slate-50/30 p-4 space-y-3 shrink-0">
              <div className="flex gap-6">
                {/* Clinical Reasoning - Side by Side */}
                {draft?.explanation && (
                  <div className="flex-1 border-l border-teal-500/10 pl-3">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mb-1 font-sans">Reasoning</p>
                    <p className="text-[10px] text-slate-400 leading-snug font-normal italic">
                      {draft.explanation}
                    </p>
                  </div>
                )}

                {/* Clinical Alerts - Side by Side */}
                {draft?.warnings && draft.warnings.length > 0 && (
                  <div className="flex-1 border-l border-amber-500/10 pl-3">
                    <p className="text-[9px] font-bold text-amber-500/30 uppercase tracking-widest mb-1 font-sans">Alerts</p>
                    <div className="space-y-1">
                      {draft.warnings.slice(0, 2).map((w, i) => (
                        <p key={i} className="text-[10px] text-slate-400 leading-tight font-normal">
                          <span className="text-slate-500 uppercase font-medium">{(w.drug || 'ALERT')}:</span> {w.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Approve & Print - Wide Spaced & Sharp */}
              <button
                onClick={approve}
                disabled={selectedCount === 0}
                className="w-full py-2.5 bg-slate-900 text-white font-bold text-[11px] rounded-lg disabled:opacity-20 hover:bg-black transition-all uppercase tracking-[0.2em] shadow-lg shadow-slate-200"
              >
                Approve & Print ({selectedCount} Meds)
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  </div>
);

const MobileLayout = ({
  mobileStep,
  patients,
  selectedPatient,
  selectedPatientData,
  patientSummary,
  doctorNotes,
  setDoctorNotes,
  loading,
  error,
  medications,
  selectedCount,
  draft,
  loadPatient,
  generateDraft,
  toggleMedicationSelection,
  setEditingMed,
  toggleAlternatives,
  approve,
  setMobileStep
}: MobileLayoutProps) => (
  <div className="lg:hidden min-h-screen bg-slate-50 flex flex-col">
    {/* Mobile Header */}
    <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 safe-top">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
          <span className="text-white font-bold">∿</span>
        </div>
        <span className="font-bold text-slate-900">ClinRx</span>
      </div>
      <Link href="/settings" className="p-2 text-slate-400">⚙️</Link>
    </header>

    {/* Step Indicator */}
    <StepIndicator current={mobileStep} total={3} />

    {/* Content Area */}
    <main className="flex-1 px-4 pb-24 overflow-auto">

      {/* Step 0: Select Patient */}
      {mobileStep === 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center py-4">
            <h1 className="text-2xl font-bold text-slate-900">Select Patient</h1>
            <p className="text-slate-500 mt-1">Choose patient for prescription</p>
          </div>
          <div className="space-y-3">
            {patients.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                selected={selectedPatient === p.id}
                onClick={() => loadPatient(p.id)}
              />
            ))}
          </div>
          <Link
            href="/patients/new"
            className="block w-full py-4 text-center text-teal-600 font-medium border-2 border-dashed border-teal-200 rounded-2xl"
          >
            + Add New Patient
          </Link>
        </div>
      )}

      {/* Step 1: Clinical Notes */}
      {mobileStep === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center py-4">
            <h1 className="text-2xl font-bold text-slate-900">Clinical Notes</h1>
            <p className="text-slate-500 mt-1">Describe symptoms for {selectedPatientData?.name}</p>
          </div>

          {/* Patient Quick Info */}
          {patientSummary && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                  {patientSummary.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{patientSummary.name}</p>
                  <p className="text-sm text-slate-500">{patientSummary.age}yrs • eGFR {patientSummary.renal_status.egfr}</p>
                </div>
              </div>
              {patientSummary.allergies.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {patientSummary.allergies.map((a, i) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-lg">⚠️ {a}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes Input */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-4 border border-teal-200">
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="Enter symptoms: fever, cough, acidity, back pain, UTI..."
              style={{ color: '#000' }}
              className="w-full h-32 p-4 text-slate-900 bg-white rounded-xl border border-teal-200 resize-none focus:ring-2 focus:ring-teal-500/30 text-base"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          {/* Quick Symptoms */}
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-2">
              {['Fever', 'Cough', 'Cold', 'Headache', 'Body pain', 'Acidity'].map((s) => (
                <button
                  key={s}
                  onClick={() => setDoctorNotes(prev => {
                    const current = typeof prev === 'function' ? (prev as any)() : prev;
                    return current ? `${current}, ${s.toLowerCase()}` : s.toLowerCase();
                  })}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 active:bg-slate-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review Medications */}
      {mobileStep === 2 && (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center py-4">
            <h1 className="text-2xl font-bold text-slate-900">Review Prescription</h1>
            <p className="text-slate-500 mt-1">{selectedCount} of {medications.length} medications selected</p>
          </div>

          {/* Warnings */}
          {draft?.warnings && draft.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-2">⚠️ Important Notes</p>
              {draft.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-700">{w.message}</p>
              ))}
            </div>
          )}

          {/* Medications List */}
          <div className="space-y-3">
            {medications.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                onToggle={() => toggleMedicationSelection(med.id)}
                onEdit={() => setEditingMed(med)}
                onAlternatives={() => toggleAlternatives(med.id)}
              />
            ))}
          </div>
        </div>
      )}
    </main>

    {/* Mobile Bottom Navigation */}
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 safe-bottom">
      <div className="flex gap-3">
        {mobileStep > 0 && (
          <button
            onClick={() => setMobileStep(s => (s as number) - 1)}
            className="px-6 py-3.5 font-medium text-slate-600 bg-slate-100 rounded-xl active:bg-slate-200"
          >
            ← Back
          </button>
        )}

        {mobileStep === 0 && (
          <button
            onClick={() => {
              if (selectedPatient && patientSummary) {
                setMobileStep(1);
              }
            }}
            disabled={!selectedPatient || loading}
            className="flex-1 py-3.5 bg-teal-500 text-white font-bold rounded-xl disabled:opacity-50 active:bg-teal-600"
          >
            {loading ? 'Loading...' : 'Continue →'}
          </button>
        )}

        {mobileStep === 1 && (
          <button
            onClick={generateDraft}
            disabled={loading || !doctorNotes.trim()}
            className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-lg shadow-teal-500/25"
          >
            {loading ? '⏳ Generating...' : '✨ Generate Prescription'}
          </button>
        )}

        {mobileStep === 2 && (
          <button
            onClick={approve}
            disabled={selectedCount === 0}
            className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 shadow-lg shadow-teal-500/25"
          >
            ✅ Approve & Print ({selectedCount})
          </button>
        )}
      </div>
    </nav>
  </div>
);

export default function Dashboard() {
  const [patients, setPatients] = useState<SelectablePatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [patientSummary, setPatientSummary] = useState<PatientSummary | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [draft, setDraft] = useState<PrescriptionDraft | null>(null);
  const [medications, setMedications] = useState<SelectableMedication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrescription, setShowPrescription] = useState(false);
  const [hospital, setHospital] = useState<HospitalSettings | null>(null);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [editingMed, setEditingMed] = useState<SelectableMedication | null>(null);
  const [patientsLoading, setPatientsLoading] = useState(true);

  // Mobile: Step-based navigation (0: Patient, 1: Notes, 2: Review)
  const [mobileStep, setMobileStep] = useState(0);

  useEffect(() => {
    const savedHospital = localStorage.getItem('clinrx_hospital');
    const savedDoctor = localStorage.getItem('clinrx_doctor');

    if (savedHospital) setHospital(JSON.parse(savedHospital));
    if (savedDoctor) setDoctor(JSON.parse(savedDoctor));

    // Fetch patients from Supabase API
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          const loadedPatients: SelectablePatient[] = data.patients.map((p: PatientSummary) => ({
            id: p.patient_id,
            name: p.name,
            age: p.age,
            sex: p.sex,
            phone: p.phone,
            conditions: p.chronic_conditions?.join(', ') || 'None',
          }));
          setPatients(loadedPatients);
        }
      } catch (err) {
        console.error('Failed to fetch patients:', err);
      } finally {
        setPatientsLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const loadPatient = useCallback(async (patientId: string) => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    setDraft(null);
    setMedications([]);
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
      setError('Please enter clinical notes');
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
          use_multi_drug: true
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();

      if (data.draft) {
        setDraft(data.draft);
        const rawMeds = data.medications || data.draft.medications || [];
        const selectableMeds: SelectableMedication[] = rawMeds.map((m: PrescriptionMedication) => ({
          ...m,
          selected: true,
          showAlternatives: false
        }));

        if (selectableMeds.length === 0 && data.draft.primary_recommendation) {
          selectableMeds.push({
            id: 'med-1',
            category: 'primary',
            drug: data.draft.primary_recommendation.drug,
            dose: data.draft.primary_recommendation.dose,
            frequency: data.draft.primary_recommendation.frequency,
            duration: data.draft.primary_recommendation.duration,
            route: data.draft.primary_recommendation.route,
            indication: 'Primary treatment',
            reasoning: data.draft.primary_recommendation.reasoning?.[0] || '',
            confidence: data.draft.primary_recommendation.confidence,
            alternatives: [],
            editable: true,
            selected: true,
            showAlternatives: false
          });
        }
        setMedications(selectableMeds);
        setMobileStep(2); // Go to review step
      } else if (data.blocked) {
        setError(data.block_reason || 'Blocked');
      }
    } catch {
      setError('Failed to generate');
    } finally {
      setLoading(false);
    }
  }, [selectedPatient, doctorNotes]);

  const toggleMedicationSelection = (id: string) => {
    setMedications(meds => meds.map(m =>
      m.id === id ? { ...m, selected: !m.selected } : m
    ));
  };

  const toggleAlternatives = (id: string) => {
    setMedications(meds => meds.map(m =>
      m.id === id ? { ...m, showAlternatives: !m.showAlternatives } : m
    ));
  };

  const updateMedication = (updated: SelectableMedication) => {
    setMedications(meds => meds.map(m => m.id === updated.id ? updated : m));
  };

  const removeMedication = (id: string) => {
    setMedications(meds => meds.filter(m => m.id !== id));
  };

  const approve = () => {
    const selectedMeds = medications.filter(m => m.selected);
    if (selectedMeds.length === 0) {
      setError('Select at least one medication');
      return;
    }
    setShowPrescription(true);
  };

  const getPrescriptionData = () => {
    if (!patientSummary) return null;
    const patient = patients.find(p => p.id === selectedPatient);
    const rxNumber = `RX-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const selectedMeds = medications.filter(m => m.selected);

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
        medications: selectedMeds.map(m => ({
          drug: m.drug,
          dose: m.dose,
          frequency: m.frequency,
          duration: m.duration,
          route: m.route,
          alternatives: m.alternatives?.map(alt => ({
            drug: alt.drug,
            dose: alt.dose || '',
            reason: alt.reason
          })) || [],
        })),
        warnings: draft?.warnings?.map(w => `${w.drug}: ${w.message}`) || [],
      },
    };
  };

  const selectedCount = medications.filter(m => m.selected).length;
  const selectedPatientData = patients.find(p => p.id === selectedPatient);





  return (
    <>
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .safe-top { padding-top: env(safe-area-inset-top); }
        .safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>

      <DesktopLayout
        patients={patients}
        selectedPatient={selectedPatient}
        selectedPatientData={selectedPatientData}
        patientSummary={patientSummary}
        doctorNotes={doctorNotes}
        setDoctorNotes={setDoctorNotes}
        loading={loading}
        error={error}
        medications={medications}
        selectedCount={selectedCount}
        draft={draft}
        loadPatient={loadPatient}
        generateDraft={generateDraft}
        toggleMedicationSelection={toggleMedicationSelection}
        setEditingMed={setEditingMed}
        toggleAlternatives={toggleAlternatives}
        approve={approve}
        hospital={hospital}
        doctor={doctor}
      />

      <MobileLayout
        mobileStep={mobileStep}
        patients={patients}
        selectedPatient={selectedPatient}
        selectedPatientData={selectedPatientData}
        patientSummary={patientSummary}
        doctorNotes={doctorNotes}
        setDoctorNotes={setDoctorNotes}
        loading={loading}
        error={error}
        medications={medications}
        selectedCount={selectedCount}
        draft={draft}
        loadPatient={loadPatient}
        generateDraft={generateDraft}
        toggleMedicationSelection={toggleMedicationSelection}
        setEditingMed={setEditingMed}
        toggleAlternatives={toggleAlternatives}
        approve={approve}
        setMobileStep={setMobileStep}
      />

      {editingMed && (
        <MobileEditModal
          medication={editingMed}
          onSave={updateMedication}
          onClose={() => setEditingMed(null)}
          onRemove={() => { removeMedication(editingMed.id); setEditingMed(null); }}
        />
      )}

      {showPrescription && getPrescriptionData() && (
        <PrescriptionTemplate
          data={getPrescriptionData()!}
          onClose={() => {
            setShowPrescription(false);
            setDraft(null);
            setMedications([]);
            setDoctorNotes('');
            setMobileStep(0);
          }}
        />
      )}
    </>
  );
}
