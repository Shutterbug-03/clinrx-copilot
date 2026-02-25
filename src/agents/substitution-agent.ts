/**
 * Substitution Agent - Layer 5
 * Drug equivalence and therapeutic alternatives
 */

import type {
    CandidateTherapy,
    SubstitutionResult,
    DrugEquivalent,
    EquivalenceType
} from '@/types/agents';
import { inventoryConnector } from '@/lib/connectors/inventory-connector';

// ============================================================
// DRUG EQUIVALENCE DATABASE
// ============================================================

const DRUG_EQUIVALENTS: Record<string, {
    salts: string[];
    brands: string[];
    same_class: { drug: string; note?: string }[];
}> = {
    'amoxicillin': {
        salts: ['Amoxicillin trihydrate'],
        brands: ['Mox', 'Novamox', 'Amoxil'],
        same_class: [
            { drug: 'Ampicillin', note: 'Similar spectrum' },
            { drug: 'Amoxicillin-Clavulanate', note: 'Extended spectrum' },
        ],
    },
    'azithromycin': {
        salts: ['Azithromycin dihydrate'],
        brands: ['Azithral', 'Zithromax', 'Azee'],
        same_class: [
            { drug: 'Clarithromycin', note: 'More GI side effects' },
            { drug: 'Erythromycin', note: 'QID dosing required' },
        ],
    },
    'cefuroxime': {
        salts: ['Cefuroxime axetil'],
        brands: ['Zinnat', 'Ceftum', 'Zocef'],
        same_class: [
            { drug: 'Cefixime', note: 'Once daily, oral only' },
            { drug: 'Cefpodoxime', note: 'Similar coverage' },
        ],
    },
    'levofloxacin': {
        salts: ['Levofloxacin hemihydrate'],
        brands: ['Levomac', 'Tavanic', 'Levoflox'],
        same_class: [
            { drug: 'Ciprofloxacin', note: 'BID dosing, more GI effects' },
            { drug: 'Moxifloxacin', note: 'Broader anaerobic coverage' },
        ],
    },
    'metformin': {
        salts: ['Metformin hydrochloride'],
        brands: ['Glycomet', 'Glucophage', 'Glyciphage'],
        same_class: [
            { drug: 'Glimepiride', note: 'Risk of hypoglycemia' },
            { drug: 'Sitagliptin', note: 'No hypoglycemia risk' },
        ],
    },
    'paracetamol': {
        salts: ['Acetaminophen'],
        brands: ['Dolo', 'Calpol', 'Tylenol', 'Crocin'],
        same_class: [
            { drug: 'Ibuprofen', note: 'Anti-inflammatory, GI risk' },
        ],
    },
    'pantoprazole': {
        salts: ['Pantoprazole sodium'],
        brands: ['Pantocid', 'Protonix', 'Pan'],
        same_class: [
            { drug: 'Omeprazole', note: 'More drug interactions' },
            { drug: 'Rabeprazole', note: 'Faster onset' },
            { drug: 'Esomeprazole', note: 'S-isomer of omeprazole' },
        ],
    },
};

// ============================================================
// STRENGTH EQUIVALENCE
// ============================================================

const STRENGTH_EQUIVALENTS: Record<string, string[]> = {
    '250mg': ['250mg'],
    '500mg': ['500mg', '250mg x 2'],
    '1000mg': ['1g', '1000mg', '500mg x 2'],
    '650mg': ['650mg', '500mg + 150mg'],
};

// ============================================================
// FIND EQUIVALENTS
// ============================================================

export async function findEquivalents(
    drugName: string,
    requiredStrength?: string
): Promise<SubstitutionResult> {
    console.log(`[Layer 5] Finding equivalents for: ${drugName}`);

    const drugLower = drugName.toLowerCase();
    const equivalents: DrugEquivalent[] = [];

    // Find in equivalence database
    let matchedDrug: string | null = null;
    for (const [key, _value] of Object.entries(DRUG_EQUIVALENTS)) {
        if (drugLower.includes(key) || key.includes(drugLower)) {
            matchedDrug = key;
            break;
        }
    }

    if (matchedDrug && DRUG_EQUIVALENTS[matchedDrug]) {
        const config = DRUG_EQUIVALENTS[matchedDrug];

        // Same salt equivalents (highest confidence)
        for (const salt of config.salts) {
            const availability = await inventoryConnector.isAvailable(salt, requiredStrength);
            equivalents.push({
                drug: salt,
                type: 'same_salt',
                confidence: 0.98,
                available: availability.available,
            });
        }

        // Brand equivalents
        for (const brand of config.brands) {
            const availability = await inventoryConnector.isAvailable(brand, requiredStrength);
            equivalents.push({
                drug: brand,
                brand: brand,
                type: 'same_strength',
                confidence: 0.95,
                available: availability.available,
            });
        }

        // Same class alternatives
        for (const alt of config.same_class) {
            const availability = await inventoryConnector.isAvailable(alt.drug);
            equivalents.push({
                drug: alt.drug,
                type: 'same_class',
                confidence: 0.75,
                note: alt.note,
                pk_differences: alt.note,
                available: availability.available,
            });
        }
    }

    // Check primary availability
    const primaryAvailability = await inventoryConnector.isAvailable(drugName, requiredStrength);

    return {
        primary: {
            drug: drugName,
            available: primaryAvailability.available,
        },
        equivalents: equivalents.sort((a, b) => {
            // Sort by: available first, then by confidence
            if (a.available && !b.available) return -1;
            if (!a.available && b.available) return 1;
            return b.confidence - a.confidence;
        }),
        generated_at: new Date().toISOString(),
    };
}

// ============================================================
// AI THERAPEUTIC SELECTION
// ============================================================

import OpenAI from 'openai';
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
    if (!_openai && process.env.OPENAI_API_KEY) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

/**
 * AI-driven fallback to find therapeutic alternatives based on clinical rules
 */
async function aiSuggestAlternatives(
    drugName: string,
    context: { allergies: string[]; riskFlags: string[] }
): Promise<DrugEquivalent[]> {
    const openai = getOpenAI();
    if (!openai) return [];

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a clinical pharmacist. Suggest 2-3 therapeutic alternatives for a drug.
Requirements:
1. If patient has a beta-lactam/penicillin allergy, avoid ALL beta-lactams (penicillins, cephalosporins).
2. Suggest alternatives from different drug classes that treat the same indication.
3. Return ONLY a JSON array: [{ "drug": "Name", "type": "therapeutic_alternative", "note": "Reasoning..." }]`
                },
                {
                    role: 'user',
                    content: `Find safe alternatives for: ${drugName}
Patient Allergies: ${context.allergies.join(', ')}
Risk Flags: ${context.riskFlags.join(', ')}`
                }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0]?.message?.content || '{ "alternatives": [] }';
        const parsed = JSON.parse(content);
        return parsed.alternatives || [];
    } catch (e) {
        console.error('[Layer 5] AI Substitution failed:', e);
        return [];
    }
}

// ============================================================
// GET BEST AVAILABLE ALTERNATIVE (Enhanced)
// ============================================================

export async function getBestAlternative(
    drugName: string,
    context: { allergies: string[]; riskFlags: string[] },
    inventoryOnly = false
): Promise<DrugEquivalent[]> {
    console.log(`[Layer 5] Getting smart alternatives for: ${drugName}`);

    // 1. Get database/salt equivalents
    const result = await findEquivalents(drugName);
    const results: DrugEquivalent[] = [];

    // 2. Filter primary equivalents for safety
    const safeEquivalents = result.equivalents.filter(eq => {
        const eqLower = eq.drug.toLowerCase();
        for (const allergy of context.allergies) {
            if (eqLower.includes(allergy.toLowerCase())) return false;
        }
        if (context.riskFlags.includes('beta_lactam_allergy')) {
            if (eqLower.includes('cef') || eqLower.includes('penicillin') || eqLower.includes('amox')) return false;
        }
        return true;
    });

    results.push(...safeEquivalents);

    // 3. If primary and salt-equivalents are dangerous or unavailable, trigger AI therapeutic alternative
    const primaryIsUnsafe = context.allergies.some(a => drugName.toLowerCase().includes(a.toLowerCase())) ||
        (context.riskFlags.includes('beta_lactam_allergy') && (drugName.toLowerCase().includes('amox') || drugName.toLowerCase().includes('cef')));

    if (primaryIsUnsafe || results.length < 2) {
        const aiAlts = await aiSuggestAlternatives(drugName, context);
        results.push(...aiAlts);
    }

    // 4. Cross-reference with inventory
    for (const res of results) {
        const inv = await inventoryConnector.isAvailable(res.drug);
        res.available = inv.available;
    }

    // Sort: Available first, then therapeutic vs salt priority
    return results.sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return (b.confidence || 0.5) - (a.confidence || 0.5);
    }).slice(0, 5);
}

// ============================================================
// THERAPEUTIC ALTERNATIVE SUGGESTIONS (Legacy Wrapper)
// ============================================================

export function getTherapeuticAlternatives(
    indication: string,
    excludeDrugs: string[]
): CandidateTherapy[] {
    // Keeping for backward compatibility
    return [];
}
