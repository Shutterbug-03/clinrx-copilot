/**
 * Audit Agent - Layer 8
 * Records all decisions for compliance, learning, and improvement
 */

import { supabase, isDbConnected } from '@/lib/supabase';
import type {
    CompressedContext,
    CandidateTherapy,
    SafetyGuardResult,
    DoctorDecision,
    AuditEntry
} from '@/types/agents';

// In-memory audit log for dev (replace with Supabase in production)
const auditLog: AuditEntry[] = [];

// ============================================================
// CREATE AUDIT ENTRY
// ============================================================

export async function createAuditEntry(params: {
    prescription_id: string;
    patient_id: string;
    doctor_id: string;
    ai_draft: CandidateTherapy;
    action: 'accepted' | 'modified' | 'rejected' | 'wrote_from_scratch';
    modifications?: { field: string; from: string; to: string }[];
    override_reason?: string;
    final_prescription: DoctorDecision['final_prescription'];
    model_version: string;
    context_snapshot: CompressedContext;
    safety_checks: SafetyGuardResult;
}): Promise<AuditEntry> {
    const entry: AuditEntry = {
        id: crypto.randomUUID(),
        prescription_id: params.prescription_id,
        patient_id: params.patient_id,
        doctor_id: params.doctor_id,
        ai_draft: params.ai_draft,
        action: params.action,
        modifications: params.modifications,
        override_reason: params.override_reason,
        final_prescription: params.final_prescription,
        model_version: params.model_version,
        context_snapshot: params.context_snapshot,
        safety_checks: params.safety_checks,
        created_at: new Date().toISOString(),
        outcome_recorded: false,
    };

    console.log(`[Layer 8] Creating audit entry: ${entry.id}, action: ${entry.action}`);

    // Save to database if connected
    if (isDbConnected && supabase) {
        try {
            // For clinical notes, normally we'd get this from the context, 
            // but assuming the frontend will update the row later, or we just keep it blank.
            const clinicalNotes = '';

            // Map action to status
            let status = 'draft';
            if (entry.action === 'accepted' || entry.action === 'wrote_from_scratch') status = 'approved';
            else if (entry.action === 'modified') status = 'modified';
            else if (entry.action === 'rejected') status = 'rejected';

            const { error } = await supabase
                .from('prescriptions')
                .insert({
                    id: entry.id,
                    patient_id: entry.patient_id,
                    clinical_notes: clinicalNotes,
                    ai_draft: entry.ai_draft,
                    final_prescription: entry.final_prescription,
                    status: status,
                    created_at: entry.created_at,
                    updated_at: entry.created_at
                });

            if (error) {
                console.error('[Layer 8] Failed to save to database:', error);
            }
        } catch (e) {
            console.error('[Layer 8] Database error:', e);
        }
    }

    // Also keep in memory
    auditLog.push(entry);

    return entry;
}

// ============================================================
// GET AUDIT STATS
// ============================================================

export function getAuditStats(): {
    total: number;
    accepted: number;
    modified: number;
    rejected: number;
    acceptanceRate: number;
    modificationRate: number;
    topModifiedFields: { field: string; count: number }[];
    topOverrideReasons: { reason: string; count: number }[];
} {
    const total = auditLog.length;
    const accepted = auditLog.filter(e => e.action === 'accepted').length;
    const modified = auditLog.filter(e => e.action === 'modified').length;
    const rejected = auditLog.filter(e => e.action === 'rejected' || e.action === 'wrote_from_scratch').length;

    // Count modified fields
    const fieldCounts: Record<string, number> = {};
    for (const entry of auditLog) {
        if (entry.modifications) {
            for (const mod of entry.modifications) {
                fieldCounts[mod.field] = (fieldCounts[mod.field] || 0) + 1;
            }
        }
    }

    // Count override reasons
    const reasonCounts: Record<string, number> = {};
    for (const entry of auditLog) {
        if (entry.override_reason) {
            reasonCounts[entry.override_reason] = (reasonCounts[entry.override_reason] || 0) + 1;
        }
    }

    return {
        total,
        accepted,
        modified,
        rejected,
        acceptanceRate: total > 0 ? accepted / total : 0,
        modificationRate: total > 0 ? modified / total : 0,
        topModifiedFields: Object.entries(fieldCounts)
            .map(([field, count]) => ({ field, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
        topOverrideReasons: Object.entries(reasonCounts)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5),
    };
}

// ============================================================
// RECORD OUTCOME (for learning)
// ============================================================

export async function recordOutcome(
    auditId: string,
    outcome: {
        effective: boolean;
        side_effects?: string[];
        notes?: string;
    }
): Promise<void> {
    const entry = auditLog.find(e => e.id === auditId);
    if (entry) {
        entry.outcome_recorded = true;
        entry.outcome_notes = outcome.notes;
    }

    // Update in database
    if (isDbConnected && supabase) {
        await supabase
            .from('audit_log')
            .update({
                outcome_recorded: true,
                outcome_effective: outcome.effective,
                outcome_side_effects: outcome.side_effects,
                outcome_notes: outcome.notes,
            })
            .eq('id', auditId);
    }
}

// ============================================================
// GET ENTRIES FOR PATIENT
// ============================================================

export function getPatientHistory(patientId: string): AuditEntry[] {
    return auditLog.filter(e => e.patient_id === patientId);
}

// ============================================================
// EXPORT FOR COMPLIANCE
// ============================================================

export function exportAuditLog(
    startDate?: string,
    endDate?: string
): AuditEntry[] {
    let entries = [...auditLog];

    if (startDate) {
        entries = entries.filter(e => e.created_at >= startDate);
    }
    if (endDate) {
        entries = entries.filter(e => e.created_at <= endDate);
    }

    return entries;
}

// ============================================================
// LEARNING INSIGHTS
// ============================================================

export function getLearningInsights(): {
    commonOverrides: string[];
    suggestionAccuracy: number;
    modelFeedback: string[];
} {
    const stats = getAuditStats();

    const commonOverrides = stats.topOverrideReasons.map(r => r.reason);
    const suggestionAccuracy = stats.acceptanceRate;

    const modelFeedback: string[] = [];

    if (stats.acceptanceRate < 0.7) {
        modelFeedback.push('AI acceptance rate below 70% - review suggestion quality');
    }
    if (stats.modificationRate > 0.3) {
        modelFeedback.push('High modification rate - consider improving dose calculations');
    }
    if (stats.topModifiedFields.some(f => f.field === 'dose')) {
        modelFeedback.push('Dose is frequently modified - review renal adjustment logic');
    }

    return {
        commonOverrides,
        suggestionAccuracy,
        modelFeedback,
    };
}
