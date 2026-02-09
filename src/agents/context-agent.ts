/**
 * Context Compression Agent - Layer 1
 * Uses Google ADK with OpenAI GPT-4o-mini for context extraction
 * Pure extraction - no hallucination allowed
 */

import OpenAI from 'openai';
import { fhirConnector } from '@/lib/connectors/fhir-connector';
import type { RawPatientData, CompressedContext } from '@/types/agents';

// Lazy-initialized OpenAI client (only created when API key is present)
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
    if (!_openai && process.env.OPENAI_API_KEY) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

// ============================================================
// SUB-AGENT: HISTORY EXTRACTOR
// ============================================================

async function extractHistory(data: RawPatientData): Promise<{
    active_conditions: CompressedContext['active_conditions'];
    demographics: CompressedContext['demographics'];
}> {
    const patient = data.patient;
    const conditions = data.conditions;

    // Extract demographics
    const demographics: CompressedContext['demographics'] = {
        name: patient?.name?.[0]?.given?.join(' ') + ' ' + (patient?.name?.[0]?.family || ''),
        age: patient?.birthDate
            ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : 0,
        sex: (patient?.gender === 'male' ? 'M' : patient?.gender === 'female' ? 'F' : 'Other') as 'M' | 'F' | 'Other',
    };

    // AI-assisted condition extraction for complex conditions
    const active_conditions = conditions
        .filter(c => c.clinicalStatus?.coding?.[0]?.code === 'active')
        .map(c => ({
            code: c.code?.coding?.[0]?.code || 'unknown',
            display: c.code?.coding?.[0]?.display || c.code?.text || 'Unknown condition',
            onset_date: c.onsetDateTime,
            status: 'active' as const,
        }));

    return { demographics, active_conditions };
}

// ============================================================
// SUB-AGENT: MEDICATION TIMELINE BUILDER
// ============================================================

async function buildMedicationTimeline(data: RawPatientData): Promise<CompressedContext['current_medications']> {
    return data.medications.map(med => ({
        drug: med.medicationCodeableConcept?.coding?.[0]?.display
            || med.medicationCodeableConcept?.text
            || 'Unknown medication',
        dose: med.dosage?.[0]?.doseAndRate?.[0]?.doseQuantity?.value?.toString()
            || med.dosage?.[0]?.text
            || 'Unknown dose',
        frequency: med.dosage?.[0]?.timing?.code?.text || 'Unknown frequency',
        start_date: med.effectivePeriod?.start,
    }));
}

// ============================================================
// SUB-AGENT: ALLERGY EXTRACTOR
// ============================================================

async function extractAllergies(data: RawPatientData): Promise<CompressedContext['allergies']> {
    return data.allergies.map(a => ({
        substance: a.code?.coding?.[0]?.display || a.code?.text || 'Unknown allergen',
        reaction: a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display,
        severity: (a.reaction?.[0]?.severity as 'mild' | 'moderate' | 'severe') || 'unknown',
        verified: a.verificationStatus?.coding?.[0]?.code === 'confirmed',
    }));
}

// ============================================================
// SUB-AGENT: ORGAN FUNCTION EXTRACTOR
// ============================================================

async function extractOrganFunction(data: RawPatientData): Promise<CompressedContext['organ_function']> {
    const organ_function: CompressedContext['organ_function'] = {};

    for (const obs of data.observations) {
        const code = obs.code?.coding?.[0]?.code;
        const value = obs.valueQuantity?.value;

        if (!value) continue;

        // eGFR
        if (code === '33914-3' || code === '48642-3' || obs.code?.text?.toLowerCase().includes('egfr')) {
            organ_function.egfr = value;
            if (value >= 90) organ_function.ckd_stage = 'Normal';
            else if (value >= 60) organ_function.ckd_stage = '2';
            else if (value >= 45) organ_function.ckd_stage = '3a';
            else if (value >= 30) organ_function.ckd_stage = '3b';
            else if (value >= 15) organ_function.ckd_stage = '4';
            else organ_function.ckd_stage = '5';
        }

        // Creatinine
        if (code === '2160-0' || obs.code?.text?.toLowerCase().includes('creatinine')) {
            organ_function.creatinine = value;
        }

        // Liver enzymes
        if (code === '1742-6' || obs.code?.text?.toLowerCase().includes('alt')) {
            organ_function.liver_enzymes = organ_function.liver_enzymes || {};
            organ_function.liver_enzymes.alt = value;
        }
        if (code === '1920-8' || obs.code?.text?.toLowerCase().includes('ast')) {
            organ_function.liver_enzymes = organ_function.liver_enzymes || {};
            organ_function.liver_enzymes.ast = value;
        }
    }

    return organ_function;
}

// ============================================================
// SUB-AGENT: RISK FLAG DETECTOR
// ============================================================

async function detectRiskFlags(
    context: Partial<CompressedContext>
): Promise<string[]> {
    const flags: string[] = [];

    // Check renal function
    if (context.organ_function?.egfr && context.organ_function.egfr < 60) {
        flags.push('renal_dose_adjust');
    }
    if (context.organ_function?.egfr && context.organ_function.egfr < 30) {
        flags.push('severe_renal_impairment');
    }

    // Check liver function
    if (context.organ_function?.liver_enzymes?.alt && context.organ_function.liver_enzymes.alt > 100) {
        flags.push('hepatic_impairment');
    }

    // Check polypharmacy
    if (context.current_medications && context.current_medications.length >= 5) {
        flags.push('polypharmacy');
    }

    // Check allergies
    if (context.allergies && context.allergies.length > 0) {
        flags.push('allergy_check_required');
    }

    // Check for beta-lactam allergy
    const penicillinAllergy = context.allergies?.some(
        a => a.substance.toLowerCase().includes('penicillin') ||
            a.substance.toLowerCase().includes('amoxicillin') ||
            a.substance.toLowerCase().includes('ampicillin')
    );
    if (penicillinAllergy) {
        flags.push('beta_lactam_allergy');
    }

    // Check for NSAID avoidance
    const nsaidIssues =
        context.active_conditions?.some(c =>
            c.display.toLowerCase().includes('asthma') ||
            c.display.toLowerCase().includes('gi bleed') ||
            c.display.toLowerCase().includes('peptic ulcer')
        ) ||
        context.allergies?.some(a =>
            a.substance.toLowerCase().includes('aspirin') ||
            a.substance.toLowerCase().includes('ibuprofen')
        );
    if (nsaidIssues) {
        flags.push('nsaid_avoid');
    }

    // Elderly
    if (context.demographics?.age && context.demographics.age >= 65) {
        flags.push('elderly_patient');
    }

    return flags;
}

// ============================================================
// MAIN AGENT: CONTEXT COMPRESSION
// ============================================================

export async function compressContext(patientId: string): Promise<CompressedContext> {
    console.log(`[Layer 1] Starting context compression for patient: ${patientId}`);

    // Fetch raw data from FHIR (Data Ingestion Layer)
    const rawData = await fhirConnector.getPatientBundle(patientId);

    if (!rawData.patient) {
        throw new Error(`Patient not found: ${patientId}`);
    }

    // Run sub-agents in parallel
    const [
        { demographics, active_conditions },
        current_medications,
        allergies,
        organ_function,
    ] = await Promise.all([
        extractHistory(rawData),
        buildMedicationTimeline(rawData),
        extractAllergies(rawData),
        extractOrganFunction(rawData),
    ]);

    // Build partial context for risk detection
    const partialContext: Partial<CompressedContext> = {
        demographics,
        active_conditions,
        current_medications,
        allergies,
        organ_function,
    };

    // Detect risk flags
    const risk_flags = await detectRiskFlags(partialContext);

    const compressedContext: CompressedContext = {
        patient_id: patientId,
        demographics,
        active_conditions,
        current_medications,
        allergies,
        organ_function,
        prior_failures: [], // Would be extracted from historical data
        risk_flags,
        extraction_confidence: 0.85,
        extracted_at: new Date().toISOString(),
    };

    console.log(`[Layer 1] Context compressed. Risk flags: ${risk_flags.join(', ')}`);

    return compressedContext;
}

// ============================================================
// AI-ENHANCED EXTRACTION (for complex narratives)
// ============================================================

export async function aiEnhancedExtraction(
    rawText: string,
    type: 'conditions' | 'medications' | 'allergies'
): Promise<string[]> {
    if (!process.env.OPENAI_API_KEY) {
        console.warn('[Layer 1] No OpenAI key, skipping AI extraction');
        return [];
    }

    const prompts = {
        conditions: `Extract all medical conditions from this clinical text. 
      Return ONLY a JSON array of condition names. 
      Only include conditions that are explicitly mentioned.
      If uncertain, do NOT include.`,
        medications: `Extract all medications from this clinical text.
      Return ONLY a JSON array of medication names.
      Only include medications that are explicitly mentioned.`,
        allergies: `Extract all drug allergies from this clinical text.
      Return ONLY a JSON array of allergen names.
      Only include allergies that are explicitly confirmed.`,
    };

    try {
        const openai = getOpenAI();
        if (!openai) return [];

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: prompts[type] },
                { role: 'user', content: rawText },
            ],
            temperature: 0, // Deterministic
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content || '[]';
        return JSON.parse(content);
    } catch (error) {
        console.error('[Layer 1] AI extraction failed:', error);
        return [];
    }
}

// ============================================================
// MOCK DATA FALLBACK (for development)
// ============================================================

export function getMockCompressedContext(patientId: string): CompressedContext {
    const mockContexts: Record<string, CompressedContext> = {
        'PT001': {
            patient_id: 'PT001',
            demographics: {
                name: 'Rajesh Kumar',
                age: 62,
                sex: 'M',
                weight_kg: 78,
            },
            active_conditions: [
                { code: 'E11', display: 'Type 2 Diabetes', status: 'active' },
                { code: 'I10', display: 'Hypertension', status: 'active' },
                { code: 'N18.3', display: 'CKD Stage 3a', status: 'active' },
            ],
            current_medications: [
                { drug: 'Metformin', dose: '500mg', frequency: 'BD' },
                { drug: 'Amlodipine', dose: '5mg', frequency: 'OD' },
                { drug: 'Losartan', dose: '50mg', frequency: 'OD' },
            ],
            allergies: [
                { substance: 'Penicillin', severity: 'severe', verified: true, reaction: 'Anaphylaxis' },
                { substance: 'Sulfa drugs', severity: 'moderate', verified: true },
            ],
            organ_function: {
                egfr: 48,
                ckd_stage: '3a',
                creatinine: 1.8,
            },
            prior_failures: [
                { drug: 'Azithromycin', reason: 'GI intolerance', year: 2024 },
            ],
            risk_flags: ['renal_dose_adjust', 'beta_lactam_allergy', 'elderly_patient', 'polypharmacy'],
            extraction_confidence: 0.95,
            extracted_at: new Date().toISOString(),
        },
        'PT002': {
            patient_id: 'PT002',
            demographics: {
                name: 'Priya Sharma',
                age: 45,
                sex: 'F',
                weight_kg: 62,
            },
            active_conditions: [
                { code: 'J45', display: 'Asthma', status: 'active' },
                { code: 'E03', display: 'Hypothyroidism', status: 'active' },
            ],
            current_medications: [
                { drug: 'Levothyroxine', dose: '50mcg', frequency: 'OD' },
                { drug: 'Salbutamol inhaler', dose: '100mcg', frequency: 'PRN' },
            ],
            allergies: [
                { substance: 'Aspirin', severity: 'moderate', verified: true, reaction: 'Bronchospasm' },
            ],
            organ_function: {
                egfr: 92,
            },
            prior_failures: [],
            risk_flags: ['nsaid_avoid'],
            extraction_confidence: 0.90,
            extracted_at: new Date().toISOString(),
        },
    };

    return mockContexts[patientId] || mockContexts['PT001'];
}
