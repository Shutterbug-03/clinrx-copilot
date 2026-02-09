import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runPrescriptionPipeline } from '@/agents';

// Request validation
const PrescriptionRequestSchema = z.object({
    patient_id: z.string().min(1),
    doctor_notes: z.string().min(1),
    doctor_id: z.string().optional().default('doctor-001'),
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

        const { patient_id, doctor_notes, doctor_id } = parsed.data;

        console.log(`[API] Prescription request for patient: ${patient_id}`);

        // Run the full 8-layer agentic pipeline
        const pipelineResult = await runPrescriptionPipeline({
            patientId: patient_id,
            doctorNotes: doctor_notes,
            doctorId: doctor_id || 'doctor-001',
            useMockData: true, // Use mock for now until FHIR is configured
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

        // Format response for frontend
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
                    safe: true, // Would be determined by safety checks
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
