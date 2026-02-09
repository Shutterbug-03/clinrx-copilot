// Core types for the 8-layer agentic system
import type { Patient, Condition, MedicationStatement, AllergyIntolerance, Observation } from 'fhir/r4';

// ============================================================
// DATA INGESTION LAYER TYPES
// ============================================================

export interface FHIRBundle<T> {
    resourceType: 'Bundle';
    type: 'searchset';
    total: number;
    entry?: Array<{ resource: T }>;
}

export interface RawPatientData {
    patient: Patient | null;
    conditions: Condition[];
    medications: MedicationStatement[];
    allergies: AllergyIntolerance[];
    observations: Observation[];
    fetchedAt: string;
}

// ============================================================
// LAYER 1: CONTEXT COMPRESSION OUTPUT SCHEMA
// ============================================================

export interface CompressedContext {
    patient_id: string;
    demographics: {
        name: string;
        age: number;
        sex: 'M' | 'F' | 'Other';
        weight_kg?: number;
    };
    active_conditions: {
        code: string;
        display: string;
        onset_date?: string;
        status: 'active' | 'resolved' | 'unknown';
    }[];
    current_medications: {
        drug: string;
        dose: string;
        frequency: string;
        start_date?: string;
        prescriber?: string;
    }[];
    allergies: {
        substance: string;
        reaction?: string;
        severity: 'mild' | 'moderate' | 'severe' | 'unknown';
        verified: boolean;
    }[];
    organ_function: {
        egfr?: number;
        ckd_stage?: string;
        liver_enzymes?: {
            alt?: number;
            ast?: number;
            bilirubin?: number;
        };
        creatinine?: number;
    };
    prior_failures: {
        drug: string;
        reason: string;
        year: number;
    }[];
    risk_flags: string[];
    extraction_confidence: number;
    extracted_at: string;
}

// ============================================================
// LAYER 2: SAFETY GUARD OUTPUT
// ============================================================

export type SafetySeverity = 'info' | 'warning' | 'hard_block';

export interface SafetyCheck {
    type: 'drug_interaction' | 'allergy' | 'renal' | 'hepatic' | 'pregnancy' | 'age' | 'contraindication';
    severity: SafetySeverity;
    message: string;
    drug_involved?: string;
    recommendation?: string;
    source?: string;
}

export interface SafetyGuardResult {
    passed: boolean;
    hard_blocks: SafetyCheck[];
    warnings: SafetyCheck[];
    info: SafetyCheck[];
    checked_at: string;
}

// ============================================================
// LAYER 3: CLINICAL REASONING OUTPUT
// ============================================================

export interface CandidateTherapy {
    drug_class: string;
    preferred_drug: string;
    generic_name: string;
    dose: string;
    frequency: string;
    duration: string;
    route: 'oral' | 'iv' | 'im' | 'topical' | 'inhaled' | 'other';
    confidence: number;
    reasoning: string[];
    guidelines_referenced?: string[];
}

export interface ClinicalReasoningResult {
    indication: string;
    candidate_therapies: CandidateTherapy[];
    contraindicated_classes: string[];
    dose_adjustments: {
        reason: string;
        adjustment: string;
    }[];
    generated_at: string;
    model_version: string;
}

// ============================================================
// LAYER 4: INVENTORY RESULT
// ============================================================

export interface InventoryItem {
    drug_id: string;
    brand: string;
    generic: string;
    strength: string;
    formulation: string;
    quantity_available: number;
    price?: number;
    location: string;
    source: 'local_pharmacy' | 'external_api' | 'hospital';
    last_updated: string;
}

export interface InventoryResult {
    available: InventoryItem[];
    unavailable: string[];
    nearest_sources: {
        drug: string;
        location: string;
        distance_km?: number;
    }[];
    checked_at: string;
}

// ============================================================
// LAYER 5: SUBSTITUTION RESULT
// ============================================================

export type EquivalenceType = 'same_salt' | 'same_strength' | 'same_formulation' | 'same_class' | 'therapeutic_alternative';

export interface DrugEquivalent {
    drug: string;
    brand?: string;
    type: EquivalenceType;
    confidence: number;
    pk_differences?: string;
    note?: string;
    available: boolean;
}

export interface SubstitutionResult {
    primary: {
        drug: string;
        brand?: string;
        available: boolean;
    };
    equivalents: DrugEquivalent[];
    generated_at: string;
}

// ============================================================
// LAYER 6: EXPLANATION OUTPUT
// ============================================================

export interface ExplanationResult {
    summary: string;
    reasoning_points: string[];
    risk_notes: string[];
    data_sources: string[];
    confidence_explanation: string;
    generated_at: string;
}

// ============================================================
// LAYER 7: DOCTOR DECISION
// ============================================================

export interface DoctorDecision {
    prescription_id: string;
    ai_suggestion: CandidateTherapy;
    doctor_edits: {
        field: string;
        original: string;
        modified: string;
    }[];
    final_prescription: {
        drug: string;
        dose: string;
        frequency: string;
        duration: string;
        route: string;
        instructions?: string;
    };
    override_reason?: string;
    approved_by: string;
    approved_at: string;
}

// ============================================================
// LAYER 8: AUDIT LOG
// ============================================================

export interface AuditEntry {
    id: string;
    prescription_id: string;
    patient_id: string;
    doctor_id: string;

    // What AI suggested
    ai_draft: CandidateTherapy;

    // What doctor did
    action: 'accepted' | 'modified' | 'rejected' | 'wrote_from_scratch';
    modifications?: {
        field: string;
        from: string;
        to: string;
    }[];
    override_reason?: string;

    // Final output
    final_prescription: DoctorDecision['final_prescription'];

    // Metadata
    model_version: string;
    context_snapshot: CompressedContext;
    safety_checks: SafetyGuardResult;

    // Timestamps
    created_at: string;

    // For learning
    outcome_recorded?: boolean;
    outcome_notes?: string;
}

// ============================================================
// OPENFDA TYPES
// ============================================================

export interface OpenFDADrugLabel {
    id: string;
    openfda: {
        brand_name?: string[];
        generic_name?: string[];
        manufacturer_name?: string[];
        route?: string[];
        substance_name?: string[];
    };
    drug_interactions?: string[];
    contraindications?: string[];
    warnings?: string[];
    dosage_and_administration?: string[];
    pregnancy?: string[];
}

export interface OpenFDASearchResult {
    meta: {
        results: {
            total: number;
        };
    };
    results: OpenFDADrugLabel[];
}
