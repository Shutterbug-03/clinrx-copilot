/**
 * Multi-Drug Prescription Generator - Enhanced Layer 3
 * Generates complete prescriptions with multiple medications based on:
 * 1. Detected conditions from doctor notes
 * 2. Patient's chronic conditions (continuation drugs)
 * 3. Drug combinations for symptom management
 * 4. Real drug data with Indian brands
 */

import OpenAI from 'openai';
import {
    DISEASE_DRUG_DATABASE,
    detectConditionsFromNotes,
    type ConditionMapping,
    type DrugInfo
} from '@/data/disease-drug-database';
import type {
    PrescriptionDraft,
    PrescriptionMedication,
    PatientSummary
} from '@/types';
import type { CompressedContext } from '@/types/agents';
import { preScreenDrug } from './safety-agent';

// Lazy-initialized OpenAI client
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
    if (!_openai && process.env.OPENAI_API_KEY) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

// ============================================================
// CHRONIC CONDITION MAPPING (for continuation drugs)
// ============================================================

const CHRONIC_CONDITION_MAP: Record<string, string> = {
    'Type 2 Diabetes': 'diabetes_type2',
    'Diabetes Mellitus': 'diabetes_type2',
    'DM': 'diabetes_type2',
    'Hypertension': 'hypertension',
    'HTN': 'hypertension',
    'High Blood Pressure': 'hypertension',
    'Hyperlipidemia': 'hyperlipidemia',
    'Dyslipidemia': 'hyperlipidemia',
    'High Cholesterol': 'hyperlipidemia',
    'Hypothyroidism': 'hypothyroidism',
    'Thyroid': 'hypothyroidism',
    'CKD': 'ckd',
    'Chronic Kidney Disease': 'ckd',
    'Asthma': 'asthma_chronic',
    'COPD': 'copd',
};

// ============================================================
// MAIN MULTI-DRUG GENERATOR
// ============================================================

export async function generateMultiDrugPrescription(
    patientSummary: PatientSummary,
    context: CompressedContext,
    doctorNotes: string
): Promise<PrescriptionDraft> {
    console.log('[MultiDrug] Generating comprehensive prescription...');
    console.log('[MultiDrug] Doctor notes:', doctorNotes);

    const medications: PrescriptionMedication[] = [];
    const warnings: { type: string; message: string; drug?: string }[] = [];
    const interactionsChecked: { drug: string; safe: boolean }[] = [];
    const usedDrugs = new Set<string>(); // Prevent duplicates

    // Step 1: Detect conditions from doctor notes
    const detectedConditions = detectConditionsFromNotes(doctorNotes);
    console.log('[MultiDrug] Detected conditions:', detectedConditions);

    // Step 2: Add medications for each detected condition
    for (const conditionKey of detectedConditions) {
        const conditionData = DISEASE_DRUG_DATABASE[conditionKey];
        if (!conditionData) continue;

        // Add all drugs for this condition
        for (const drugInfo of conditionData.drugs) {
            // Check if already added (same generic)
            if (usedDrugs.has(drugInfo.generic.toLowerCase())) continue;

            // Safety screening
            const isSafe = await checkDrugSafety(drugInfo.generic, context, patientSummary);
            if (!isSafe.safe) {
                warnings.push({
                    type: 'contraindication',
                    message: isSafe.reason,
                    drug: drugInfo.generic
                });
                // Try alternative
                const alternative = conditionData.alternatives.find(alt =>
                    !usedDrugs.has(alt.generic.toLowerCase())
                );
                if (alternative) {
                    addMedication(
                        medications,
                        alternative.generic,
                        alternative.brands[0] || '',
                        alternative.dose,
                        'BD', // Default
                        '5-7 days',
                        'oral',
                        drugInfo.category,
                        conditionData.name,
                        `Alternative to ${drugInfo.generic}: ${alternative.reason}`,
                        0.75,
                        usedDrugs
                    );
                }
                continue;
            }

            addMedication(
                medications,
                drugInfo.generic,
                drugInfo.brands[0] || '',
                drugInfo.dose,
                drugInfo.frequency,
                drugInfo.duration,
                drugInfo.route,
                drugInfo.category,
                conditionData.name,
                conditionData.notes,
                0.85,
                usedDrugs
            );

            interactionsChecked.push({ drug: drugInfo.generic, safe: true });
        }
    }

    // Step 3: Add continuation medications for chronic conditions
    const continuations: { drug: string; dose: string; frequency: string; reason: string }[] = [];

    for (const med of patientSummary.current_meds) {
        // Check if this is for a chronic condition that should continue
        if (usedDrugs.has(med.drug.toLowerCase())) continue;

        const shouldContinue = await shouldContinueMedication(med.drug, patientSummary.chronic_conditions);
        if (shouldContinue) {
            addMedication(
                medications,
                med.drug,
                '', // No brand specified
                med.dose,
                med.frequency,
                'Continue as prescribed',
                'oral',
                'continuation',
                'Chronic condition management',
                'Continuation of existing therapy',
                0.95,
                usedDrugs
            );

            continuations.push({
                drug: med.drug,
                dose: med.dose,
                frequency: med.frequency,
                reason: 'Continue current therapy for chronic condition'
            });
        }
    }

    // Step 4: Add GI protection if NSAIDs prescribed
    const hasNSAID = medications.some(m =>
        m.drug.toLowerCase().includes('diclofenac') ||
        m.drug.toLowerCase().includes('ibuprofen') ||
        m.drug.toLowerCase().includes('aceclofenac') ||
        m.drug.toLowerCase().includes('naproxen')
    );

    if (hasNSAID && !usedDrugs.has('pantoprazole')) {
        addMedication(
            medications,
            'Pantoprazole',
            'Pantocid',
            '40mg',
            'OD AC',
            'With NSAID course',
            'oral',
            'prophylaxis',
            'GI Protection',
            'PPI co-prescription with NSAID to prevent gastric ulceration',
            0.90,
            usedDrugs
        );
    }

    // Step 5: AI-powered enhancement (if available)
    if (process.env.OPENAI_API_KEY) {
        const aiEnhancements = await getAIEnhancements(
            patientSummary,
            doctorNotes,
            medications,
            detectedConditions
        );

        if (aiEnhancements.additionalWarnings) {
            warnings.push(...aiEnhancements.additionalWarnings);
        }
    }

    // Build the prescription draft
    const draft: PrescriptionDraft = {
        medications,
        primary_recommendation: medications[0] ? {
            drug: medications[0].drug,
            brand: medications[0].brand,
            dose: medications[0].dose,
            frequency: medications[0].frequency,
            duration: medications[0].duration,
            route: medications[0].route,
            reasoning: [medications[0].reasoning],
            confidence: medications[0].confidence
        } : {
            drug: '',
            dose: '',
            frequency: '',
            duration: '',
            route: '',
            reasoning: ['No medications generated'],
            confidence: 0
        },
        alternatives: getAllAlternatives(detectedConditions),
        warnings,
        interactions_checked: interactionsChecked,
        explanation: generateExplanation(medications, detectedConditions),
        continuations
    };

    console.log(`[MultiDrug] Generated ${medications.length} medications, ${warnings.length} warnings`);

    return draft;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function addMedication(
    medications: PrescriptionMedication[],
    generic: string,
    brand: string,
    dose: string,
    frequency: string,
    duration: string,
    route: string,
    category: 'primary' | 'adjunct' | 'continuation' | 'prophylaxis' | 'symptomatic',
    indication: string,
    reasoning: string,
    confidence: number,
    usedDrugs: Set<string>
): void {
    usedDrugs.add(generic.toLowerCase());

    const conditionKey = Object.keys(DISEASE_DRUG_DATABASE).find(key =>
        DISEASE_DRUG_DATABASE[key].name === indication
    );

    const conditionData = conditionKey ? DISEASE_DRUG_DATABASE[conditionKey] : null;

    medications.push({
        id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category,
        drug: generic,
        brand,
        dose,
        frequency,
        duration,
        route,
        indication,
        reasoning,
        confidence,
        alternatives: conditionData?.alternatives.slice(0, 2).map(alt => ({
            drug: alt.generic,
            dose: alt.dose,
            reason: alt.reason
        })) || [],
        editable: true
    });
}

async function checkDrugSafety(
    drug: string,
    context: CompressedContext,
    patient: PatientSummary
): Promise<{ safe: boolean; reason: string }> {
    // Check allergies
    const allergies = context.allergies.map(a => a.substance.toLowerCase());
    const drugLower = drug.toLowerCase();

    for (const allergy of allergies) {
        if (drugLower.includes(allergy) ||
            (allergy.includes('penicillin') && drugLower.includes('amox')) ||
            (allergy.includes('sulfa') && drugLower.includes('sulfamethoxazole')) ||
            (allergy.includes('beta-lactam') && (drugLower.includes('cef') || drugLower.includes('amox')))) {
            return { safe: false, reason: `Contraindicated: ${allergy} allergy` };
        }
    }

    // Check renal function
    const egfr = context.organ_function.egfr || patient.renal_status.egfr;

    if (egfr && egfr < 30) {
        if (drugLower === 'metformin') {
            return { safe: false, reason: 'Metformin contraindicated in severe renal impairment (eGFR <30)' };
        }
        if (drugLower === 'nitrofurantoin') {
            return { safe: false, reason: 'Nitrofurantoin contraindicated in severe renal impairment' };
        }
    }

    // Check risk flags
    const riskFlags = context.risk_flags || patient.risk_flags;

    if (riskFlags.includes('nsaid_avoid') &&
        (drugLower.includes('ibuprofen') || drugLower.includes('diclofenac') || drugLower.includes('naproxen'))) {
        return { safe: false, reason: 'NSAIDs avoided per patient flags' };
    }

    return { safe: true, reason: '' };
}

async function shouldContinueMedication(drug: string, chronicConditions: string[]): Promise<boolean> {
    const drugLower = drug.toLowerCase();

    // Common chronic medications to continue
    const chronicDrugs: Record<string, string[]> = {
        'diabetes': ['metformin', 'glimepiride', 'sitagliptin', 'empagliflozin', 'insulin'],
        'hypertension': ['amlodipine', 'losartan', 'telmisartan', 'atenolol', 'hydrochlorothiazide'],
        'thyroid': ['levothyroxine', 'thyronorm', 'eltroxin'],
        'cholesterol': ['atorvastatin', 'rosuvastatin'],
    };

    for (const condition of chronicConditions) {
        const conditionLower = condition.toLowerCase();

        for (const [key, drugs] of Object.entries(chronicDrugs)) {
            if (conditionLower.includes(key)) {
                if (drugs.some(d => drugLower.includes(d))) {
                    return true;
                }
            }
        }
    }

    return false;
}

function getAllAlternatives(detectedConditions: string[]): { drug: string; brand?: string; dose?: string; note: string; in_stock: boolean }[] {
    const alternatives: { drug: string; brand?: string; dose?: string; note: string; in_stock: boolean }[] = [];

    for (const conditionKey of detectedConditions) {
        const conditionData = DISEASE_DRUG_DATABASE[conditionKey];
        if (!conditionData) continue;

        for (const alt of conditionData.alternatives.slice(0, 2)) {
            alternatives.push({
                drug: alt.generic,
                brand: alt.brands[0],
                dose: alt.dose,
                note: alt.reason,
                in_stock: true // Default, should come from inventory
            });
        }
    }

    return alternatives.slice(0, 5); // Max 5 alternatives
}

function generateExplanation(medications: PrescriptionMedication[], conditions: string[]): string {
    const numMeds = medications.length;
    const primaryMeds = medications.filter(m => m.category === 'primary');
    const adjunctMeds = medications.filter(m => m.category === 'adjunct');
    const continuations = medications.filter(m => m.category === 'continuation');

    let explanation = `This prescription contains ${numMeds} medication(s) for ${conditions.length} identified condition(s). `;

    if (primaryMeds.length > 0) {
        explanation += `Primary treatments: ${primaryMeds.map(m => m.drug).join(', ')}. `;
    }
    if (adjunctMeds.length > 0) {
        explanation += `Supporting medications: ${adjunctMeds.map(m => m.drug).join(', ')}. `;
    }
    if (continuations.length > 0) {
        explanation += `Continuation of chronic therapy: ${continuations.map(m => m.drug).join(', ')}. `;
    }

    return explanation;
}

async function getAIEnhancements(
    patient: PatientSummary,
    notes: string,
    medications: PrescriptionMedication[],
    conditions: string[]
): Promise<{ additionalWarnings?: { type: string; message: string; drug?: string }[] }> {
    const openai = getOpenAI();
    if (!openai) return {};

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a clinical pharmacist reviewing a prescription. Check for:
1. Drug-drug interactions between the medications
2. Age-related dosing concerns
3. Any critical warnings based on patient conditions

Return JSON: { "warnings": [{ "type": "interaction|age|condition", "message": "...", "drug": "..." }] }
Return empty warnings array if no issues found.`
                },
                {
                    role: 'user',
                    content: `
Patient: ${patient.age}${patient.sex}, ${patient.chronic_conditions.join(', ')}
Allergies: ${patient.allergies.join(', ')}
eGFR: ${patient.renal_status.egfr}
Current meds: ${patient.current_meds.map(m => m.drug).join(', ')}

New prescription:
${medications.map(m => `- ${m.drug} ${m.dose} ${m.frequency}`).join('\n')}

Check for interactions and warnings.`
                }
            ],
            temperature: 0.2,
            max_tokens: 500
        });

        const content = response.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(content.replace(/```json\n?/g, '').replace(/```/g, ''));
        return { additionalWarnings: parsed.warnings || [] };
    } catch (error) {
        console.error('[MultiDrug] AI enhancement failed:', error);
        return {};
    }
}

// ============================================================
// EXPORT LEGACY WRAPPER
// ============================================================

export async function generatePrescriptionDraft(
    patient: PatientSummary,
    notes: string,
    _checkInventory: boolean = true
): Promise<PrescriptionDraft> {
    // Convert PatientSummary to CompressedContext for compatibility
    const context: CompressedContext = {
        patient_id: patient.patient_id,
        demographics: {
            name: patient.name,
            age: patient.age,
            sex: patient.sex,
            weight_kg: patient.key_vitals.weight || 70
        },
        active_conditions: patient.chronic_conditions.map((c, i) => ({
            code: `COND-${i}`,
            display: c,
            onset_date: undefined,
            status: 'active' as const
        })),
        allergies: patient.allergies.map(a => ({
            substance: a,
            severity: 'moderate' as const,
            reaction: 'unknown',
            verified: true
        })),
        current_medications: patient.current_meds.map(m => ({
            drug: m.drug,
            dose: m.dose,
            frequency: m.frequency,
            prescriber: 'unknown'
        })),
        organ_function: {
            egfr: patient.renal_status.egfr,
            ckd_stage: patient.renal_status.ckd_stage
        },
        prior_failures: patient.prior_failures.map(f => ({
            drug: f.drug,
            reason: f.reason || 'unknown',
            year: f.year
        })),
        risk_flags: patient.risk_flags,
        extraction_confidence: 0.95,
        extracted_at: new Date().toISOString()
    };

    return generateMultiDrugPrescription(patient, context, notes);
}

