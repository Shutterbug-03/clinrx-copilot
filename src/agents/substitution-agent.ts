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
// GET BEST AVAILABLE ALTERNATIVE
// ============================================================

export async function getBestAlternative(
    drugName: string,
    context: { allergies: string[]; riskFlags: string[] }
): Promise<DrugEquivalent | null> {
    const result = await findEquivalents(drugName);

    // Filter out allergens
    const safeEquivalents = result.equivalents.filter(eq => {
        const eqLower = eq.drug.toLowerCase();

        // Check allergies
        for (const allergy of context.allergies) {
            if (eqLower.includes(allergy.toLowerCase())) {
                return false;
            }
        }

        // Check beta-lactam allergy for cephalosporins
        if (context.riskFlags.includes('beta_lactam_allergy')) {
            if (eqLower.includes('cef') || eqLower.includes('penicillin') || eqLower.includes('amox')) {
                return false;
            }
        }

        return true;
    });

    // Return best available
    const available = safeEquivalents.find(eq => eq.available);
    if (available) return available;

    // Return highest confidence if none available
    return safeEquivalents[0] || null;
}

// ============================================================
// THERAPEUTIC ALTERNATIVE SUGGESTIONS
// ============================================================

export function getTherapeuticAlternatives(
    indication: string,
    excludeDrugs: string[]
): CandidateTherapy[] {
    const alternatives: CandidateTherapy[] = [];
    const excludeSet = new Set(excludeDrugs.map(d => d.toLowerCase()));

    // Indication-based alternatives
    const indicationAlternatives: Record<string, CandidateTherapy[]> = {
        'bacterial_respiratory': [
            {
                drug_class: 'Macrolide',
                preferred_drug: 'Azithromycin',
                generic_name: 'Azithromycin',
                dose: '500mg',
                frequency: 'OD',
                duration: '3 days',
                route: 'oral',
                confidence: 0.80,
                reasoning: ['Therapeutic alternative for beta-lactam allergy'],
            },
            {
                drug_class: 'Fluoroquinolone',
                preferred_drug: 'Levofloxacin',
                generic_name: 'Levofloxacin',
                dose: '500mg',
                frequency: 'OD',
                duration: '5 days',
                route: 'oral',
                confidence: 0.75,
                reasoning: ['Reserve fluoroquinolone for penicillin/macrolide failure'],
            },
        ],
        'uti': [
            {
                drug_class: 'Fluoroquinolone',
                preferred_drug: 'Ciprofloxacin',
                generic_name: 'Ciprofloxacin',
                dose: '500mg',
                frequency: 'BD',
                duration: '3 days',
                route: 'oral',
                confidence: 0.85,
                reasoning: ['Standard UTI coverage'],
            },
        ],
    };

    const indAlts = indicationAlternatives[indication] || indicationAlternatives['bacterial_respiratory'];

    for (const alt of indAlts) {
        if (!excludeSet.has(alt.generic_name.toLowerCase())) {
            alternatives.push(alt);
        }
    }

    return alternatives;
}
