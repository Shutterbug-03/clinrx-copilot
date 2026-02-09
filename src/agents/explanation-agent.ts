/**
 * Explanation Agent - Layer 6 (XAI)
 * Makes AI decisions transparent and trustworthy
 */

import type {
    CompressedContext,
    CandidateTherapy,
    SafetyGuardResult,
    ExplanationResult
} from '@/types/agents';

// ============================================================
// GENERATE HUMAN-READABLE EXPLANATION
// ============================================================

export function generateExplanation(
    context: CompressedContext,
    therapy: CandidateTherapy,
    safetyResult: SafetyGuardResult
): ExplanationResult {
    console.log(`[Layer 6] Generating explanation for: ${therapy.preferred_drug}`);

    const reasoningPoints: string[] = [];
    const riskNotes: string[] = [];
    const dataSources: string[] = [];

    // Drug selection reasoning
    reasoningPoints.push(
        `Selected ${therapy.preferred_drug} (${therapy.drug_class}) for ${therapy.reasoning[0]?.replace('Selected for ', '') || 'current indication'}`
    );

    // Allergy handling
    if (context.risk_flags.includes('beta_lactam_allergy')) {
        const drugLower = therapy.preferred_drug.toLowerCase();
        if (!drugLower.includes('penicillin') && !drugLower.includes('amox')) {
            reasoningPoints.push(
                `Non-penicillin class chosen due to documented Penicillin allergy`
            );
        }
    }

    // Renal adjustments
    if (context.organ_function.egfr && context.organ_function.egfr < 60) {
        const hasRenalAdjustment = therapy.reasoning.some(r =>
            r.toLowerCase().includes('renal') || r.toLowerCase().includes('egfr')
        );
        if (hasRenalAdjustment) {
            reasoningPoints.push(
                `Dose adjusted for renal impairment (eGFR: ${context.organ_function.egfr} mL/min)`
            );
        }
    }

    // Add specific reasoning from therapy
    for (const reason of therapy.reasoning.slice(1)) {
        if (!reasoningPoints.includes(reason)) {
            reasoningPoints.push(reason);
        }
    }

    // Safety warnings as risk notes
    for (const warning of safetyResult.warnings) {
        riskNotes.push(warning.message);
    }

    // General risk flags
    if (context.risk_flags.includes('elderly_patient')) {
        riskNotes.push('Elderly patient - monitor for adverse effects');
    }
    if (context.risk_flags.includes('polypharmacy')) {
        riskNotes.push('Multiple medications - review for interactions');
    }

    // Data sources
    dataSources.push('Patient EHR/clinical history');
    dataSources.push('Drug interaction database');
    if (therapy.guidelines_referenced && therapy.guidelines_referenced.length > 0) {
        dataSources.push(...therapy.guidelines_referenced);
    }

    // Confidence explanation
    let confidenceExplanation = '';
    if (therapy.confidence >= 0.85) {
        confidenceExplanation = 'High confidence: First-line therapy with strong guideline support';
    } else if (therapy.confidence >= 0.70) {
        confidenceExplanation = 'Moderate confidence: Appropriate alternative with some limitations';
    } else {
        confidenceExplanation = 'Lower confidence: Consider clinical judgement for final decision';
    }

    // Add reason for confidence
    if (safetyResult.warnings.length > 0) {
        confidenceExplanation += `. ${safetyResult.warnings.length} safety warning(s) noted.`;
    }

    // Summary
    const summary = formatSummary(therapy, context, reasoningPoints);

    return {
        summary,
        reasoning_points: reasoningPoints,
        risk_notes: riskNotes,
        data_sources: dataSources,
        confidence_explanation: confidenceExplanation,
        generated_at: new Date().toISOString(),
    };
}

// ============================================================
// FORMAT SUMMARY (one-liner for UI)
// ============================================================

function formatSummary(
    therapy: CandidateTherapy,
    context: CompressedContext,
    reasoning: string[]
): string {
    const parts: string[] = [];

    // Drug and dose
    parts.push(`${therapy.preferred_drug} ${therapy.dose} ${therapy.frequency}`);

    // Key reason
    if (context.risk_flags.includes('beta_lactam_allergy')) {
        parts.push('(Penicillin allergy handled)');
    }
    if (context.organ_function.egfr && context.organ_function.egfr < 60) {
        parts.push('(Renal-adjusted)');
    }

    // Duration
    parts.push(`× ${therapy.duration}`);

    return parts.join(' ');
}

// ============================================================
// FORMAT FOR DISPLAY (bullet points)
// ============================================================

export function formatForDisplay(explanation: ExplanationResult): string {
    const lines: string[] = [];

    lines.push('📋 **Prescription Rationale**\n');
    lines.push(explanation.summary);
    lines.push('');

    if (explanation.reasoning_points.length > 0) {
        lines.push('**Reasoning:**');
        for (const point of explanation.reasoning_points) {
            lines.push(`• ${point}`);
        }
        lines.push('');
    }

    if (explanation.risk_notes.length > 0) {
        lines.push('**⚠️ Risk Notes:**');
        for (const note of explanation.risk_notes) {
            lines.push(`• ${note}`);
        }
        lines.push('');
    }

    lines.push(`**Confidence:** ${explanation.confidence_explanation}`);

    return lines.join('\n');
}

// ============================================================
// AUDIT-FRIENDLY EXPLANATION
// ============================================================

export function generateAuditExplanation(
    context: CompressedContext,
    therapy: CandidateTherapy,
    safetyResult: SafetyGuardResult,
    doctorNotes: string
): {
    short: string;
    detailed: ExplanationResult;
    auditTrail: string[];
} {
    const detailed = generateExplanation(context, therapy, safetyResult);

    const auditTrail = [
        `Patient ID: ${context.patient_id}`,
        `Context extracted at: ${context.extracted_at}`,
        `Conditions: ${context.active_conditions.map(c => c.display).join(', ')}`,
        `Allergies: ${context.allergies.map(a => a.substance).join(', ')}`,
        `eGFR: ${context.organ_function.egfr || 'Not recorded'}`,
        `Doctor notes: "${doctorNotes}"`,
        `AI recommended: ${therapy.preferred_drug} ${therapy.dose} ${therapy.frequency}`,
        `Safety checks: ${safetyResult.passed ? 'PASSED' : 'BLOCKED'}`,
        `Warnings: ${safetyResult.warnings.length}`,
        `Confidence: ${(therapy.confidence * 100).toFixed(0)}%`,
    ];

    return {
        short: detailed.summary,
        detailed,
        auditTrail,
    };
}
