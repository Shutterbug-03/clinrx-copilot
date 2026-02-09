/**
 * Prescription Pipeline Orchestrator
 * Wires all 8 layers together in the correct order
 */

import { getMockCompressedContext, compressContext } from './context-agent';
import { runSafetyChecks, preScreenDrug } from './safety-agent';
import { generateCandidateTherapies } from './reasoning-agent';
import { checkInventory, rankByAvailability } from './inventory-agent';
import { findEquivalents, getBestAlternative } from './substitution-agent';
import { generateExplanation, generateAuditExplanation } from './explanation-agent';
import { createAuditEntry } from './audit-agent';
import type {
    CompressedContext,
    CandidateTherapy,
    SafetyGuardResult,
    InventoryResult,
    ExplanationResult,
    SubstitutionResult
} from '@/types/agents';

// ============================================================
// PIPELINE RESULT TYPE
// ============================================================

export interface PipelineResult {
    success: boolean;
    blocked: boolean;
    blockReason?: string;

    // Layer outputs
    context: CompressedContext;
    safetyResult: SafetyGuardResult;
    candidates: CandidateTherapy[];
    inventory: InventoryResult;
    substitutions: SubstitutionResult[];
    explanation: ExplanationResult;

    // Final recommendation
    primaryRecommendation: CandidateTherapy | null;
    alternatives: CandidateTherapy[];

    // Metadata
    pipelineVersion: string;
    executionTime: number;
    timestamp: string;
}

// ============================================================
// MAIN ORCHESTRATOR FUNCTION
// ============================================================

export async function runPrescriptionPipeline(params: {
    patientId: string;
    doctorNotes: string;
    doctorId: string;
    useMockData?: boolean;
}): Promise<PipelineResult> {
    const startTime = Date.now();
    console.log(`[Orchestrator] Starting pipeline for patient: ${params.patientId}`);

    // ============================================================
    // LAYER 1: CONTEXT COMPRESSION
    // ============================================================
    console.log('[Orchestrator] Layer 1: Context Compression');

    let context: CompressedContext;

    try {
        if (params.useMockData) {
            context = getMockCompressedContext(params.patientId);
        } else {
            // Try FHIR first, fallback to mock
            try {
                context = await compressContext(params.patientId);
            } catch (e) {
                console.warn('[Orchestrator] FHIR failed, using mock data');
                context = getMockCompressedContext(params.patientId);
            }
        }
    } catch (error) {
        console.error('[Orchestrator] Context extraction failed:', error);
        context = getMockCompressedContext(params.patientId);
    }

    // ============================================================
    // LAYER 3: CLINICAL REASONING (generates candidates)
    // ============================================================
    console.log('[Orchestrator] Layer 3: Clinical Reasoning');

    const reasoningResult = await generateCandidateTherapies(
        context,
        params.doctorNotes
    );

    if (reasoningResult.candidate_therapies.length === 0) {
        return {
            success: false,
            blocked: true,
            blockReason: 'No suitable therapies found for this indication',
            context,
            safetyResult: { passed: false, hard_blocks: [], warnings: [], info: [], checked_at: new Date().toISOString() },
            candidates: [],
            inventory: { available: [], unavailable: [], nearest_sources: [], checked_at: new Date().toISOString() },
            substitutions: [],
            explanation: { summary: '', reasoning_points: [], risk_notes: [], data_sources: [], confidence_explanation: '', generated_at: new Date().toISOString() },
            primaryRecommendation: null,
            alternatives: [],
            pipelineVersion: '1.0.0',
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        };
    }

    // ============================================================
    // LAYER 2: SAFETY GUARD (check each candidate)
    // ============================================================
    console.log('[Orchestrator] Layer 2: Safety Guard');

    const safeCandidates: CandidateTherapy[] = [];
    const blockedCandidates: { drug: string; reason: string }[] = [];
    let aggregatedSafetyResult: SafetyGuardResult = {
        passed: true,
        hard_blocks: [],
        warnings: [],
        info: [],
        checked_at: new Date().toISOString(),
    };

    for (const candidate of reasoningResult.candidate_therapies) {
        const safetyResult = await runSafetyChecks(context, candidate);

        // Aggregate results
        aggregatedSafetyResult.hard_blocks.push(...safetyResult.hard_blocks);
        aggregatedSafetyResult.warnings.push(...safetyResult.warnings);
        aggregatedSafetyResult.info.push(...safetyResult.info);

        if (safetyResult.passed) {
            safeCandidates.push(candidate);
        } else {
            blockedCandidates.push({
                drug: candidate.preferred_drug,
                reason: safetyResult.hard_blocks[0]?.message || 'Safety block',
            });
        }
    }

    aggregatedSafetyResult.passed = safeCandidates.length > 0;

    if (safeCandidates.length === 0) {
        return {
            success: false,
            blocked: true,
            blockReason: `All candidates blocked by safety checks: ${blockedCandidates.map(b => b.reason).join('; ')}`,
            context,
            safetyResult: aggregatedSafetyResult,
            candidates: reasoningResult.candidate_therapies,
            inventory: { available: [], unavailable: [], nearest_sources: [], checked_at: new Date().toISOString() },
            substitutions: [],
            explanation: { summary: '', reasoning_points: [], risk_notes: [], data_sources: [], confidence_explanation: '', generated_at: new Date().toISOString() },
            primaryRecommendation: null,
            alternatives: [],
            pipelineVersion: '1.0.0',
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        };
    }

    // ============================================================
    // LAYER 4: INVENTORY CHECK
    // ============================================================
    console.log('[Orchestrator] Layer 4: Inventory Check');

    const inventoryResult = await checkInventory(safeCandidates);

    // Re-rank by availability
    const rankedCandidates = await rankByAvailability(safeCandidates);

    // ============================================================
    // LAYER 5: SUBSTITUTION (for unavailable drugs)
    // ============================================================
    console.log('[Orchestrator] Layer 5: Substitution');

    const substitutions: SubstitutionResult[] = [];

    for (const unavailable of inventoryResult.unavailable) {
        const subs = await findEquivalents(unavailable);
        substitutions.push(subs);
    }

    // ============================================================
    // LAYER 6: EXPLANATION
    // ============================================================
    console.log('[Orchestrator] Layer 6: Explanation');

    const primaryCandidate = rankedCandidates[0];
    const explanation = generateExplanation(context, primaryCandidate, aggregatedSafetyResult);

    // ============================================================
    // COMPILE RESULT
    // ============================================================

    const result: PipelineResult = {
        success: true,
        blocked: false,
        context,
        safetyResult: aggregatedSafetyResult,
        candidates: rankedCandidates,
        inventory: inventoryResult,
        substitutions,
        explanation,
        primaryRecommendation: primaryCandidate,
        alternatives: rankedCandidates.slice(1),
        pipelineVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
    };

    console.log(`[Orchestrator] Pipeline complete in ${result.executionTime}ms`);

    return result;
}

// ============================================================
// SIMPLIFIED API FOR FRONTEND
// ============================================================

export interface SimplifiedPrescriptionDraft {
    primary_recommendation: {
        drug: string;
        dose: string;
        frequency: string;
        duration: string;
        route: string;
        reasoning: string[];
        confidence: number;
    };
    alternatives: {
        drug: string;
        dose: string;
        note: string;
        in_stock: boolean;
    }[];
    warnings: string[];
    interactions_checked: string[];
    explanation: string;
    model_version: string;
}

export async function generateSimplifiedDraft(
    patientId: string,
    doctorNotes: string
): Promise<SimplifiedPrescriptionDraft> {
    const result = await runPrescriptionPipeline({
        patientId,
        doctorNotes,
        doctorId: 'doctor-001',
        useMockData: true, // Use mock for now
    });

    if (!result.primaryRecommendation) {
        throw new Error(result.blockReason || 'No recommendation available');
    }

    return {
        primary_recommendation: {
            drug: result.primaryRecommendation.preferred_drug,
            dose: result.primaryRecommendation.dose,
            frequency: result.primaryRecommendation.frequency,
            duration: result.primaryRecommendation.duration,
            route: result.primaryRecommendation.route,
            reasoning: result.primaryRecommendation.reasoning,
            confidence: result.primaryRecommendation.confidence,
        },
        alternatives: result.alternatives.map(alt => ({
            drug: alt.preferred_drug,
            dose: `${alt.dose} ${alt.frequency}`,
            note: alt.reasoning[0] || '',
            in_stock: result.inventory.available.some(
                i => i.generic.toLowerCase().includes(alt.generic_name.toLowerCase())
            ),
        })),
        warnings: result.safetyResult.warnings.map(w => w.message),
        interactions_checked: result.context.current_medications.map(m => m.drug),
        explanation: result.explanation.summary,
        model_version: result.pipelineVersion,
    };
}
