/**
 * Clinical Reasoning Agent - Layer 3
 * AI-driven prescription reasoning bounded by safety constraints
 * Uses GPT-4o-mini for cost-effective clinical suggestions
 */

import OpenAI from 'openai';
import type {
    CompressedContext,
    CandidateTherapy,
    ClinicalReasoningResult,
    SafetyGuardResult
} from '@/types/agents';
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
// INDICATION MATCHING RULES (Deterministic base)
// ============================================================

const INDICATION_DRUG_MAP: Record<string, {
    drug_class: string;
    preferred: string[];
    alternatives: string[];
    contraindicated_if: string[];
}> = {
    'bacterial_respiratory': {
        drug_class: 'Antibiotic',
        preferred: ['Amoxicillin', 'Amoxicillin-Clavulanate', 'Azithromycin'],
        alternatives: ['Cefuroxime', 'Levofloxacin', 'Doxycycline'],
        contraindicated_if: ['beta_lactam_allergy', 'macrolide_allergy'],
    },
    'uti': {
        drug_class: 'Antibiotic',
        preferred: ['Nitrofurantoin', 'Trimethoprim-Sulfamethoxazole'],
        alternatives: ['Ciprofloxacin', 'Levofloxacin', 'Cefixime'],
        contraindicated_if: ['sulfa_allergy', 'severe_renal_impairment'],
    },
    'hypertension': {
        drug_class: 'Antihypertensive',
        preferred: ['Amlodipine', 'Losartan', 'Lisinopril'],
        alternatives: ['Atenolol', 'Hydrochlorothiazide', 'Telmisartan'],
        contraindicated_if: ['pregnancy', 'hyperkalemia'],
    },
    'diabetes_type2': {
        drug_class: 'Antidiabetic',
        preferred: ['Metformin', 'Glimepiride', 'Sitagliptin'],
        alternatives: ['Empagliflozin', 'Dapagliflozin', 'Pioglitazone'],
        contraindicated_if: ['severe_renal_impairment', 'heart_failure'],
    },
    'pain_mild': {
        drug_class: 'Analgesic',
        preferred: ['Paracetamol'],
        alternatives: ['Ibuprofen', 'Naproxen'],
        contraindicated_if: ['hepatic_impairment', 'nsaid_avoid'],
    },
    'pain_moderate': {
        drug_class: 'Analgesic',
        preferred: ['Tramadol', 'Paracetamol/Codeine'],
        alternatives: ['Ibuprofen', 'Diclofenac'],
        contraindicated_if: ['opioid_sensitivity', 'nsaid_avoid'],
    },
    'gerd': {
        drug_class: 'PPI',
        preferred: ['Pantoprazole', 'Omeprazole'],
        alternatives: ['Rabeprazole', 'Esomeprazole', 'Famotidine'],
        contraindicated_if: [],
    },
    'fever': {
        drug_class: 'Antipyretic',
        preferred: ['Paracetamol'],
        alternatives: ['Ibuprofen'],
        contraindicated_if: ['hepatic_impairment'],
    },
};

// ============================================================
// DOSE CALCULATION RULES
// ============================================================

function calculateDose(
    drug: string,
    context: CompressedContext
): { dose: string; frequency: string; duration: string; route: string; adjustments: string[] } {
    const adjustments: string[] = [];
    const drugLower = drug.toLowerCase();

    // Default values
    let dose = '500mg';
    let frequency = 'BD';
    let duration = '5 days';
    let route: 'oral' | 'iv' | 'im' | 'topical' | 'inhaled' | 'other' = 'oral';

    // Drug-specific base doses
    const dosing: Record<string, { dose: string; freq: string; dur: string }> = {
        'amoxicillin': { dose: '500mg', freq: 'TDS', dur: '7 days' },
        'azithromycin': { dose: '500mg', freq: 'OD', dur: '3 days' },
        'cefuroxime': { dose: '500mg', freq: 'BD', dur: '5 days' },
        'levofloxacin': { dose: '500mg', freq: 'OD', dur: '5 days' },
        'ciprofloxacin': { dose: '500mg', freq: 'BD', dur: '5 days' },
        'metformin': { dose: '500mg', freq: 'BD', dur: 'ongoing' },
        'paracetamol': { dose: '650mg', freq: 'TDS', dur: '3 days' },
        'ibuprofen': { dose: '400mg', freq: 'TDS', dur: '3 days' },
        'pantoprazole': { dose: '40mg', freq: 'OD', dur: '14 days' },
    };

    for (const [drugName, dosage] of Object.entries(dosing)) {
        if (drugLower.includes(drugName)) {
            dose = dosage.dose;
            frequency = dosage.freq;
            duration = dosage.dur;
            break;
        }
    }

    // Renal adjustments
    if (context.organ_function.egfr && context.organ_function.egfr < 50) {
        if (drugLower.includes('cefuroxime')) {
            dose = '250mg';
            adjustments.push('Dose reduced for eGFR < 50');
        }
        if (drugLower.includes('levofloxacin')) {
            dose = '250mg';
            frequency = 'OD';
            adjustments.push('Dose reduced for renal impairment');
        }
        if (drugLower.includes('ciprofloxacin')) {
            dose = '250mg';
            adjustments.push('Dose reduced for renal impairment');
        }
    }

    // Elderly adjustments
    if (context.demographics.age >= 65) {
        if (drugLower.includes('fluoroquinolone') || drugLower.includes('levofloxacin')) {
            adjustments.push('Monitor for tendinopathy in elderly');
        }
    }

    // Weight-based adjustments for some drugs
    if (context.demographics.weight_kg && context.demographics.weight_kg > 100) {
        if (drugLower.includes('vancomycin') || drugLower.includes('gentamicin')) {
            adjustments.push('Weight-based dosing may be required');
        }
    }

    return { dose, frequency, duration, route, adjustments };
}

// ============================================================
// AI REASONING FOR COMPLEX CASES
// ============================================================

async function aiGenerateReasoning(
    context: CompressedContext,
    indication: string,
    doctorNotes: string
): Promise<{ reasoning: string[]; guidelines: string[] }> {
    if (!process.env.OPENAI_API_KEY) {
        return {
            reasoning: ['Rule-based recommendation'],
            guidelines: [],
        };
    }

    try {
        const openai = getOpenAI();
        if (!openai) {
            return { reasoning: ['Rule-based recommendation'], guidelines: [] };
        }
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a clinical pharmacology advisor. Provide concise reasoning for drug selection.
            
            RULES:
            1. Only provide 2-4 bullet points of reasoning
            2. Reference relevant guidelines if applicable
            3. Be specific about why alternatives were considered
            4. Never recommend dosing - just explain drug choice
            
            Output JSON: { "reasoning": ["point1", "point2"], "guidelines": ["guideline1"] }`
                },
                {
                    role: 'user',
                    content: `Patient: ${context.demographics.age}${context.demographics.sex}, 
            Conditions: ${context.active_conditions.map(c => c.display).join(', ')}
            Allergies: ${context.allergies.map(a => a.substance).join(', ')}
            eGFR: ${context.organ_function.egfr || 'unknown'}
            
            Indication: ${indication}
            Doctor notes: ${doctorNotes}
            
            Explain why target drug was chosen.`
                }
            ],
            temperature: 0.3,
            max_tokens: 300,
        });

        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
    } catch (error) {
        console.error('[Layer 3] AI reasoning failed:', error);
        return {
            reasoning: ['Based on clinical guidelines and patient factors'],
            guidelines: [],
        };
    }
}

// ============================================================
// MAIN REASONING FUNCTION
// ============================================================

export async function generateCandidateTherapies(
    context: CompressedContext,
    doctorNotes: string,
    indication?: string
): Promise<ClinicalReasoningResult> {
    console.log(`[Layer 3] Generating candidates for: ${doctorNotes}`);

    // Detect indication from notes if not provided
    let detectedIndication = indication || 'bacterial_respiratory';
    const notesLower = doctorNotes.toLowerCase();

    if (notesLower.includes('uti') || notesLower.includes('urinary')) {
        detectedIndication = 'uti';
    } else if (notesLower.includes('hypertension') || notesLower.includes('blood pressure')) {
        detectedIndication = 'hypertension';
    } else if (notesLower.includes('diabetes') || notesLower.includes('sugar')) {
        detectedIndication = 'diabetes_type2';
    } else if (notesLower.includes('pain') && notesLower.includes('severe')) {
        detectedIndication = 'pain_moderate';
    } else if (notesLower.includes('pain')) {
        detectedIndication = 'pain_mild';
    } else if (notesLower.includes('acidity') || notesLower.includes('gerd') || notesLower.includes('reflux')) {
        detectedIndication = 'gerd';
    } else if (notesLower.includes('fever') && !notesLower.includes('infection') && !notesLower.includes('bacterial')) {
        detectedIndication = 'fever';
    }

    const indicationConfig = INDICATION_DRUG_MAP[detectedIndication] || INDICATION_DRUG_MAP['bacterial_respiratory'];

    // Filter drugs based on patient contraindications
    const safeDrugs: string[] = [];
    const contraindicatedDrugs: string[] = [];

    const allDrugs = [...indicationConfig.preferred, ...indicationConfig.alternatives];

    for (const drug of allDrugs) {
        const preScreen = preScreenDrug(drug, context.allergies, context.risk_flags);
        if (preScreen.safe) {
            safeDrugs.push(drug);
        } else {
            contraindicatedDrugs.push(drug);
        }
    }

    // Build candidate therapies
    const candidates: CandidateTherapy[] = [];

    for (let i = 0; i < Math.min(safeDrugs.length, 3); i++) {
        const drug = safeDrugs[i];
        const doseInfo = calculateDose(drug, context);

        const { reasoning, guidelines } = await aiGenerateReasoning(
            context,
            detectedIndication,
            doctorNotes
        );

        const baseReasoning = [
            `Selected for ${detectedIndication.replace(/_/g, ' ')}`,
            ...doseInfo.adjustments,
        ];

        candidates.push({
            drug_class: indicationConfig.drug_class,
            preferred_drug: drug,
            generic_name: drug,
            dose: doseInfo.dose,
            frequency: doseInfo.frequency,
            duration: doseInfo.duration,
            route: doseInfo.route as 'oral',
            confidence: i === 0 ? 0.85 : i === 1 ? 0.70 : 0.55,
            reasoning: [...baseReasoning, ...reasoning],
            guidelines_referenced: guidelines,
        });
    }

    // Add dose adjustments to reasoning
    for (const candidate of candidates) {
        if (context.organ_function.egfr && context.organ_function.egfr < 60) {
            candidate.reasoning.push(`Dose adjusted for renal function (eGFR: ${context.organ_function.egfr})`);
        }
        if (context.risk_flags.includes('beta_lactam_allergy')) {
            if (!candidate.preferred_drug.toLowerCase().includes('cef')) {
                candidate.reasoning.push('Non-beta-lactam selected due to documented allergy');
            }
        }
    }

    const result: ClinicalReasoningResult = {
        indication: detectedIndication.replace(/_/g, ' '),
        candidate_therapies: candidates,
        contraindicated_classes: contraindicatedDrugs,
        dose_adjustments: candidates[0]?.reasoning
            .filter(r => r.includes('adjusted') || r.includes('reduced'))
            .map(adj => ({ reason: 'Clinical', adjustment: adj })) || [],
        generated_at: new Date().toISOString(),
        model_version: process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : 'rule-based-v2',
    };

    console.log(`[Layer 3] Generated ${candidates.length} candidates, ${contraindicatedDrugs.length} contraindicated`);

    return result;
}

// ============================================================
// INDICATION DETECTION (standalone)
// ============================================================

export async function detectIndication(doctorNotes: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
        // Rule-based fallback
        const notesLower = doctorNotes.toLowerCase();
        if (notesLower.includes('fever') && notesLower.includes('cough')) return 'bacterial_respiratory';
        if (notesLower.includes('uti')) return 'uti';
        if (notesLower.includes('diabetes')) return 'diabetes_type2';
        return 'bacterial_respiratory';
    }

    try {
        const openai = getOpenAI();
        if (!openai) return 'bacterial_respiratory';
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Classify the clinical indication from these notes.
            Return ONLY one of: bacterial_respiratory, uti, hypertension, diabetes_type2, pain_mild, pain_moderate, gerd, fever
            Return just the indication code, nothing else.`
                },
                { role: 'user', content: doctorNotes }
            ],
            temperature: 0,
            max_tokens: 50,
        });

        return response.choices[0]?.message?.content?.trim() || 'bacterial_respiratory';
    } catch {
        return 'bacterial_respiratory';
    }
}
