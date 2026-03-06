import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runPrescriptionPipeline } from '@/agents';
import { generatePrescriptionDraft } from '@/agents/prescription-generator';
import { db } from '@/lib/database-adapter';
import type { PatientSummary } from '@/types';

// Allow this API route to run for up to 60 seconds on AWS Lambda/Amplify
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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

        const startTime = Date.now();
        const { patient_id, doctor_notes, doctor_id, use_multi_drug } = parsed.data;

        console.log(`[API_START] Patient: ${patient_id} | Multi-Drug: ${use_multi_drug}`);

        // Use database adapter
        const dbStart = Date.now();
        const patient = await db.getPatient(patient_id);
        console.log(`[API_DB_END] Patient lookup took ${Date.now() - dbStart}ms`);

        if (!patient) {
            return NextResponse.json(
                { error: 'Patient not found', patient_id },
                { status: 404 }
            );
        }

        // Use new multi-drug generator
        if (use_multi_drug) {
            console.log('[API_AI_START] Triggering Llama 3 Reasoning...');
            const aiStart = Date.now();
            const draft = await generatePrescriptionDraft(patient, doctor_notes, true);
            console.log(`[API_AI_END] AI Reasoning took ${Date.now() - aiStart}ms`);

            const totalTime = Date.now() - startTime;
            console.log(`[API_FINISH] Total execution: ${totalTime}ms`);

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
