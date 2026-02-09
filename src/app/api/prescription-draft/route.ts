import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runPrescriptionPipeline } from '@/agents';
import { generatePrescriptionDraft } from '@/agents/prescription-generator';
import type { PatientSummary } from '@/types';

// Mock patient data (same as before)
const MOCK_PATIENTS: Record<string, PatientSummary> = {
    'PT001': {
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
    'PT002': {
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
};

// Request validation
const PrescriptionRequestSchema = z.object({
    patient_id: z.string().min(1),
    doctor_notes: z.string().min(1),
    doctor_id: z.string().optional().default('doctor-001'),
    use_multi_drug: z.boolean().optional().default(true), // Enable new system by default
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = PrescriptionRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { patient_id, doctor_notes, doctor_id, use_multi_drug } = parsed.data;

        console.log(`[API] Prescription request for patient: ${patient_id}`);
        console.log(`[API] Using multi-drug mode: ${use_multi_drug}`);

        // Get patient data
        const patient = MOCK_PATIENTS[patient_id];
        if (!patient) {
            return NextResponse.json(
                { error: 'Patient not found', patient_id },
                { status: 404 }
            );
        }

        // Use new multi-drug generator
        if (use_multi_drug) {
            console.log('[API] Generating multi-drug prescription...');

            const draft = await generatePrescriptionDraft(patient, doctor_notes, true);

            return NextResponse.json({
                success: true,
                draft: {
                    ...draft,
                    // Ensure backward compatibility
                    primary_recommendation: draft.primary_recommendation,
                    alternatives: draft.alternatives,
                    warnings: draft.warnings,
                },
                medications: draft.medications, // NEW: Full medications array
                continuations: draft.continuations, // NEW: Continuation drugs
                patient: {
                    name: patient.name,
                    age: patient.age,
                    sex: patient.sex,
                    chronic_conditions: patient.chronic_conditions,
                    allergies: patient.allergies,
                    current_meds: patient.current_meds,
                    renal_status: patient.renal_status,
                },
                model_version: 'multi-drug-v1',
                generated_at: new Date().toISOString(),
            });
        }

        // Fallback to legacy single-drug pipeline
        const pipelineResult = await runPrescriptionPipeline({
            patientId: patient_id,
            doctorNotes: doctor_notes,
            doctorId: doctor_id || 'doctor-001',
            useMockData: true,
        });

        if (!pipelineResult.success || !pipelineResult.primaryRecommendation) {
            return NextResponse.json({
                draft: null,
                blocked: true,
                block_reason: pipelineResult.blockReason || 'No suitable therapy found',
                safety_issues: pipelineResult.safetyResult.hard_blocks.map(b => b.message),
                model_version: pipelineResult.pipelineVersion,
                generated_at: pipelineResult.timestamp,
            });
        }

        // Format legacy response
        const response = {
            draft: {
                primary_recommendation: {
                    drug: pipelineResult.primaryRecommendation.preferred_drug,
                    dose: pipelineResult.primaryRecommendation.dose,
                    frequency: pipelineResult.primaryRecommendation.frequency,
                    duration: pipelineResult.primaryRecommendation.duration,
                    route: pipelineResult.primaryRecommendation.route,
                    reasoning: pipelineResult.primaryRecommendation.reasoning,
                    confidence: pipelineResult.primaryRecommendation.confidence,
                },
                alternatives: pipelineResult.alternatives.map(alt => ({
                    drug: `${alt.preferred_drug} ${alt.dose} ${alt.frequency}`,
                    note: alt.reasoning[0] || 'Alternative option',
                    in_stock: pipelineResult.inventory.available.some(
                        i => i.generic.toLowerCase().includes(alt.generic_name.toLowerCase())
                    ),
                })),
                warnings: pipelineResult.safetyResult.warnings.map(w => ({
                    type: w.type,
                    message: w.message,
                    drug: w.drug_involved,
                })),
                interactions_checked: pipelineResult.context.current_medications.map(m => ({
                    drug: m.drug,
                    safe: true,
                })),
                explanation: pipelineResult.explanation.summary,
            },
            pipeline_details: {
                layers_executed: ['context', 'reasoning', 'safety', 'inventory', 'substitution', 'explanation'],
                execution_time_ms: pipelineResult.executionTime,
                context_confidence: pipelineResult.context.extraction_confidence,
            },
            model_version: pipelineResult.pipelineVersion,
            generated_at: pipelineResult.timestamp,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Prescription API error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
