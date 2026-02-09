// Patient Summary (CCE Output)
export interface PatientSummary {
    patient_id: string;
    name: string;
    age: number;
    sex: 'M' | 'F' | 'Other';
    chronic_conditions: string[];
    renal_status: {
        egfr: number;
        ckd_stage?: string;
    };
    allergies: string[];
    current_meds: {
        drug: string;
        dose: string;
        frequency: string;
    }[];
    prior_failures: {
        drug: string;
        year: number;
        reason?: string;
    }[];
    key_vitals: {
        bp?: string;
        weight?: number;
        temperature?: number;
    };
    risk_flags: string[];
}

// Drug from catalog
export interface Drug {
    id: string;
    gtin?: string;
    inn: string; // Generic name
    brand?: string;
    manufacturer?: string;
    strength: string;
    formulation: string;
    release_type?: 'IR' | 'MR' | 'ER';
    excipients?: string[];
    price?: number;
    in_stock: boolean;
}

// Prescription Draft (PRL Output)
export interface PrescriptionDraft {
    primary_recommendation: {
        drug: string;
        brand?: string;
        dose: string;
        frequency: string;
        duration: string;
        route: string;
        reasoning: string[];
        confidence: number;
    };
    alternatives: {
        drug: string;
        brand?: string;
        dose?: string;
        note: string;
        in_stock: boolean;
    }[];
    warnings: {
        type: string;
        message: string;
        drug?: string;
    }[];
    interactions_checked: {
        drug: string;
        safe: boolean;
    }[];
    explanation?: string;
}

// API Request/Response types
export interface ContextRequest {
    patient_id: string;
    doctor_notes?: string;
}

export interface ContextResponse {
    summary: PatientSummary;
    generated_at: string;
}

export interface PrescriptionRequest {
    patient_summary: PatientSummary;
    doctor_notes: string;
    check_inventory?: boolean;
}

export interface PrescriptionResponse {
    draft: PrescriptionDraft;
    model_version: string;
    generated_at: string;
}

// Audit Log
export interface AuditEntry {
    prescription_id: string;
    ai_used: boolean;
    model_version: string;
    doctor_edits: string[];
    final_author: string;
    timestamp: string;
}
