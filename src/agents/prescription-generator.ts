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
import { inventoryConnector } from '@/lib/connectors/inventory-connector';
import type {
    PrescriptionDraft,
    PrescriptionMedication,
    PatientSummary,
    PrescriptionAlternative
} from '@/types';
import type { CompressedContext } from '@/types/agents';
import { preScreenDrug } from './safety-agent';
import { openFDAClient } from '@/lib/connectors/openfda-client';
import { medicalDataAggregator } from '@/lib/connectors/medical-aggregator';
import { getBestAlternative } from './substitution-agent';

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

    // Step 1: Dynamic AI Medication Selection (replacing hardcoded database)
    const suggestedMeds = await aiSelectMedications(patientSummary, context, doctorNotes);
    console.log('[MultiDrug] AI Suggested Medications:', suggestedMeds.length);

    // Step 2: Safety Screen and Inventory Tagging for each suggestion
    for (const suggestedMed of suggestedMeds) {
        if (usedDrugs.has(suggestedMed.drug.toLowerCase())) continue;

        // Safety screening
        const isSafe = await checkDrugSafety(suggestedMed.drug, context, patientSummary);
        if (!isSafe.safe) {
            warnings.push({
                type: 'contraindication',
                message: isSafe.reason,
                drug: suggestedMed.drug
            });
            // AI suggested this, but safety agent blocked it - skip it
            continue;
        }

        // Check inventory for this specific drug
        const inventory = await inventoryConnector.findNearestWithStock(suggestedMed.drug);
        const finalBrand = inventory.item?.brand || suggestedMed.brand || '';

        addMedication(
            medications,
            suggestedMed.drug,
            finalBrand,
            suggestedMed.dose,
            suggestedMed.frequency || 'OD',
            suggestedMed.duration || '5 days',
            suggestedMed.route || 'oral',
            'primary',
            suggestedMed.indication || 'Detected Condition',
            `${suggestedMed.reasoning}${inventory.item ? ` (Match in Hospital Inventory: ${inventory.location})` : ''}`,
            0.9,
            usedDrugs,
            !!inventory.item // Corrected Stock status
        );

        if (inventory.item) {
            interactionsChecked.push({ drug: suggestedMed.drug, safe: true });
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
                usedDrugs,
                true // Assume chronic meds are in stock or available
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
            usedDrugs,
            true
        );
    }

    // Step 5: AI-powered enhancement (if available)
    if (process.env.OPENAI_API_KEY) {
        const aiEnhancements = await getAIEnhancements(
            patientSummary,
            doctorNotes,
            medications,
            suggestedMeds.map(m => m.indication)
        );

        if (aiEnhancements.additionalWarnings) {
            warnings.push(...aiEnhancements.additionalWarnings);
        }
    }

    const alternativesMap = await getAllAlternativesMapped(suggestedMeds.map(m => m.drug), patientSummary);
    const allAlternatives = Object.values(alternativesMap).flat();

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
        alternatives: allAlternatives,
        warnings,
        interactions_checked: interactionsChecked,
        explanation: generateExplanation(medications),
        continuations
    };

    // Step 7: Populate alternatives for individual medications correctly
    for (const med of medications) {
        med.alternatives = alternativesMap[med.drug] || [];
        // If not found by exact drug name, try partial match (for brand vs generic cases)
        if (med.alternatives.length === 0) {
            const entry = Object.entries(alternativesMap).find(([key]) =>
                med.drug.toLowerCase().includes(key.toLowerCase()) ||
                key.toLowerCase().includes(med.drug.toLowerCase())
            );
            if (entry) med.alternatives = entry[1];
        }
    }

    console.log(`[MultiDrug] Generated ${medications.length} medications, ${warnings.length} warnings`);

    return draft;
}

// ============================================================
// AI SELECTION ENGINE
// ============================================================

interface AISuggestion {
    drug: string;
    brand?: string;
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    indication: string;
    reasoning: string;
}

async function aiSelectMedications(
    patient: PatientSummary,
    context: CompressedContext,
    doctorNotes: string
): Promise<AISuggestion[]> {
    const openai = getOpenAI();
    if (!openai) {
        console.warn('[MultiDrug] No OpenAI key, falling back to empty suggestions');
        return [];
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a clinical decision support AI. 
Suggest appropriate medications based on doctor notes and patient context.
Rules:
1. Return ONLY a JSON object with a "medications" array of objects.
2. Account for allergies, age, and organ function (eGFR).
3. Avoid interactions with current medications.
4. Provide clinical reasoning for each choice.
5. Use generic names primarily.

Format: { "medications": [{ "drug": "Name", "dose": "...", "frequency": "...", "duration": "...", "route": "...", "indication": "...", "reasoning": "..." }] }`
                },
                {
                    role: 'user',
                    content: `
Patient: ${patient.age}y ${patient.sex}, Weight: ${patient.key_vitals.weight}kg
Conditions: ${patient.chronic_conditions.join(', ')}
eGFR: ${patient.renal_status.egfr}
Allergies: ${patient.allergies.join(', ')}
Current Meds: ${patient.current_meds.map(m => `${m.drug} ${m.dose}`).join(', ')}
Risk Flags: ${patient.risk_flags.join(', ')}

Doctor's Clinical Notes: "${doctorNotes}"

Suggest correct medications:`
                }
            ],
            temperature: 0.1,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content || '{ "medications": [] }';
        const parsed = JSON.parse(content);
        return parsed.medications || [];
    } catch (error) {
        console.error('[MultiDrug] AI Selection failed:', error);
        return [];
    }
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
    usedDrugs: Set<string>,
    inStock: boolean = false
): void {
    usedDrugs.add(generic.toLowerCase());

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
        alternatives: [], // Will be populated in generateMultiDrugPrescription
        editable: true,
        in_stock: inStock
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

async function getAllAlternativesMapped(
    detectedDrugs: string[],
    patient: PatientSummary
): Promise<Record<string, PrescriptionAlternative[]>> {
    const alternativesMap: Record<string, PrescriptionAlternative[]> = {};

    const safetyContext = {
        allergies: patient.allergies || [],
        riskFlags: patient.risk_flags || []
    };

    for (const drug of detectedDrugs) {
        alternativesMap[drug] = [];
        try {
            const smartAlts = await getBestAlternative(drug, safetyContext);

            for (const alt of smartAlts) {
                alternativesMap[drug].push({
                    drug: alt.drug,
                    brand: alt.brand || '',
                    dose: 'As directed',
                    reason: alt.type === 'therapeutic_alternative' ? `Therapeutic: ${alt.note}` : 'Same Salt Alternative',
                    in_stock: alt.available || false
                });
            }
        } catch (e) {
            console.warn(`[MultiDrug] Smart substitution failed for ${drug}`);
        }
    }

    return alternativesMap;
}

function generateExplanation(medications: PrescriptionMedication[]): string {
    const numMeds = medications.length;
    const primaryMeds = medications.filter(m => m.category === 'primary');

    let explanation = `This prescription contains ${numMeds} medication(s). `;

    if (primaryMeds.length > 0) {
        explanation += `Primary treatments: ${primaryMeds.map(m => m.drug).join(', ')}. `;
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
            weight_kg: patient.key_vitals?.weight || 70
        },
        active_conditions: (patient.chronic_conditions || []).map((c, i) => ({
            code: `COND-${i}`,
            display: c,
            onset_date: undefined,
            status: 'active' as const
        })),
        allergies: (patient.allergies || []).map(a => ({
            substance: typeof a === 'string' ? a : (a as any).substance,
            severity: 'moderate' as const,
            reaction: 'unknown',
            verified: true
        })),
        current_medications: (patient.current_meds || []).map(m => ({
            drug: m.drug,
            dose: m.dose,
            frequency: m.frequency,
            prescriber: 'unknown'
        })),
        organ_function: {
            egfr: patient.renal_status?.egfr || 90,
            ckd_stage: patient.renal_status?.ckd_stage || '1'
        },
        prior_failures: (patient.prior_failures || []).map(f => ({
            drug: f.drug,
            reason: f.reason || 'unknown',
            year: f.year
        })),
        risk_flags: patient.risk_flags || [],
        extraction_confidence: 0.95,
        extracted_at: new Date().toISOString()
    };

    return generateMultiDrugPrescription(patient, context, notes);
}

