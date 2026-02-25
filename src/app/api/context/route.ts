import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMockCompressedContext } from '@/agents';
import { supabase, isDbConnected } from '@/lib/supabase';
import type { CompressedContext } from '@/types/agents';

// Request validation schema
const ContextRequestSchema = z.object({
    patient_id: z.string().min(1),
    doctor_notes: z.string().optional(),
});

// Convert CompressedContext to legacy PatientSummary format for frontend compatibility
function toLegacyFormat(context: CompressedContext) {
    return {
        patient_id: context.patient_id,
        name: context.demographics.name,
        age: context.demographics.age,
        sex: context.demographics.sex,
        chronic_conditions: context.active_conditions.map(c => c.display),
        renal_status: {
            egfr: context.organ_function.egfr,
            ckd_stage: context.organ_function.ckd_stage,
        },
        allergies: context.allergies.map(a => a.substance),
        current_meds: context.current_medications.map(m => ({
            drug: m.drug,
            dose: m.dose,
            frequency: m.frequency,
        })),
        prior_failures: context.prior_failures,
        key_vitals: {
            bp: '142/88', // Would come from observations
            weight: context.demographics.weight_kg || 75,
            temperature: 37.0,
        },
        risk_flags: context.risk_flags,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = ContextRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { patient_id } = parsed.data;

        let summary: any = null;
        let compressedContext: any = null;

        // 1. Try to fetch from Supabase first
        if (isDbConnected && supabase) {
            const { data, error } = await supabase
                .from('patients')
                .select('summary')
                .eq('fhir_id', patient_id)
                .single();

            if (!error && data) {
                summary = data.summary;
                // For compressed_context, we can map it back or just use a mock if it doesn't exist separately
                compressedContext = summary; // Approximation
            }
        }

        // 2. Fallback to Layer 1 Agent (FHIR or Mock)
        if (!summary) {
            const useFHIR = process.env.ENABLE_FHIR_INTEGRATION === 'true';

            if (useFHIR) {
                console.log(`[Context API] Fetching real FHIR context for: ${patient_id}`);
                try {
                    const { compressContext } = await import('@/agents/context-agent');
                    compressedContext = await compressContext(patient_id);
                    summary = toLegacyFormat(compressedContext);
                } catch (e) {
                    console.error('[Context API] FHIR Fetch failed, falling back to mock:', e);
                    const { getMockCompressedContext } = await import('@/agents/context-agent');
                    compressedContext = getMockCompressedContext(patient_id);
                    summary = toLegacyFormat(compressedContext);
                }
            } else {
                console.log(`[Context API] Fetching mock context for: ${patient_id}`);
                const { getMockCompressedContext } = await import('@/agents/context-agent');
                compressedContext = getMockCompressedContext(patient_id);
                summary = toLegacyFormat(compressedContext);
            }
        }

        return NextResponse.json({
            summary,
            compressed_context: compressedContext,
            generated_at: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Context API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
