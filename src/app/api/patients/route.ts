import { NextRequest, NextResponse } from 'next/server';
import { supabase, isDbConnected } from '@/lib/supabase';
import type { PatientSummary } from '@/types';

// Fallback mock patients if no DB connection
const MOCK_PATIENTS: PatientSummary[] = [
    {
        patient_id: 'PT001',
        name: 'Rajesh Kumar',
        age: 62,
        sex: 'M',
        chronic_conditions: ['Type 2 Diabetes', 'Hypertension', 'CKD Stage 3a'],
        renal_status: { egfr: 48, ckd_stage: '3a' },
        allergies: ['Penicillin', 'Sulfa drugs'],
        current_meds: [
            { drug: 'Metformin', dose: '500mg', frequency: 'BD' },
            { drug: 'Losartan', dose: '50mg', frequency: 'OD' },
            { drug: 'Amlodipine', dose: '5mg', frequency: 'OD' },
        ],
        prior_failures: [{ drug: 'Metformin', year: 2019, reason: 'GI intolerance at 1000mg' }],
        key_vitals: { bp: '142/88', weight: 78 },
        risk_flags: ['renal_dose_adjust', 'beta_lactam_allergy', 'elderly_patient', 'polypharmacy'],
    },
    {
        patient_id: 'PT002',
        name: 'Priya Sharma',
        age: 45,
        sex: 'F',
        chronic_conditions: ['Asthma', 'Hypothyroidism'],
        renal_status: { egfr: 92 },
        allergies: [],
        current_meds: [
            { drug: 'Levothyroxine', dose: '75mcg', frequency: 'OD' },
            { drug: 'Salbutamol MDI', dose: '2 puffs', frequency: 'PRN' },
        ],
        prior_failures: [],
        key_vitals: { bp: '118/76', weight: 62 },
        risk_flags: [],
    },
];

export async function GET(request: NextRequest) {
    try {
        if (!isDbConnected || !supabase) {
            console.log('[API] DB not connected. Falling back to mock patients.');
            return NextResponse.json({ success: true, patients: MOCK_PATIENTS });
        }

        const { data, error } = await supabase
            .from('patients')
            .select('summary')
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        // Map the stored JSONB `summary` back into our PatientSummary format
        const patients = data?.map(row => row.summary) || [];

        // If the table was empty, fallback to mock patients just to keep the app functional
        if (patients.length === 0) {
            console.log('[API] Patients table empty. Falling back to mock patients.');
            return NextResponse.json({ success: true, patients: MOCK_PATIENTS });
        }

        return NextResponse.json({ success: true, patients });
    } catch (error) {
        console.error('Failed to fetch patients:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
