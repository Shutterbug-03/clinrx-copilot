/**
 * Safety Guard Agent - Layer 2
 * 100% DETERMINISTIC - NO AI
 * Hard gates that MUST pass before reasoning
 */

import { openFDAClient } from '@/lib/connectors/openfda-client';
import type {
    CompressedContext,
    SafetyCheck,
    SafetyGuardResult,
    CandidateTherapy
} from '@/types/agents';

// ============================================================
// KNOWN DRUG INTERACTIONS (Deterministic Rules)
// ============================================================

const CRITICAL_INTERACTIONS: Record<string, { drugs: string[]; severity: 'hard_block' | 'warning'; reason: string }> = {
    'warfarin': {
        drugs: ['aspirin', 'ibuprofen', 'naproxen', 'clopidogrel'],
        severity: 'warning',
        reason: 'Increased bleeding risk',
    },
    'methotrexate': {
        drugs: ['trimethoprim', 'nsaids', 'penicillins'],
        severity: 'hard_block',
        reason: 'Increased methotrexate toxicity - potentially fatal',
    },
    'lithium': {
        drugs: ['nsaids', 'ace inhibitors', 'arbs', 'diuretics'],
        severity: 'warning',
        reason: 'Increased lithium levels',
    },
    'digoxin': {
        drugs: ['amiodarone', 'verapamil', 'quinidine'],
        severity: 'warning',
        reason: 'Increased digoxin toxicity',
    },
    'simvastatin': {
        drugs: ['clarithromycin', 'erythromycin', 'itraconazole', 'ketoconazole'],
        severity: 'hard_block',
        reason: 'Risk of rhabdomyolysis',
    },
    'metformin': {
        drugs: ['contrast dye'],
        severity: 'warning',
        reason: 'Risk of lactic acidosis - hold metformin',
    },
};

// ============================================================
// ALLERGY CROSS-REACTIVITY RULES
// ============================================================

const ALLERGY_CROSS_REACTIVITY: Record<string, string[]> = {
    'penicillin': ['amoxicillin', 'ampicillin', 'piperacillin', 'ticarcillin', 'mezlocillin'],
    'cephalosporin': ['cefazolin', 'cefuroxime', 'ceftriaxone', 'cefixime', 'cephalexin'],
    'sulfa': ['sulfamethoxazole', 'trimethoprim-sulfamethoxazole', 'sulfasalazine', 'dapsone'],
    'nsaid': ['aspirin', 'ibuprofen', 'naproxen', 'celecoxib', 'diclofenac', 'indomethacin'],
    'ace inhibitor': ['lisinopril', 'enalapril', 'ramipril', 'captopril'],
};

// Note: Penicillin → Cephalosporin cross-reactivity is ~1-2% (historically overestimated)
const PENICILLIN_CEPH_WARNING = 'Historical penicillin allergy noted. Cephalosporin cross-reactivity is ~1-2%. Use with caution.';

// ============================================================
// RENAL DOSE ADJUSTMENT RULES
// ============================================================

const RENAL_ADJUSTMENTS: Record<string, {
    egfr_threshold: number;
    action: 'reduce' | 'avoid' | 'monitor';
    recommendation: string;
}[]> = {
    'metformin': [
        { egfr_threshold: 30, action: 'avoid', recommendation: 'Contraindicated in eGFR < 30' },
        { egfr_threshold: 45, action: 'reduce', recommendation: 'Reduce to max 1000mg/day' },
    ],
    'gabapentin': [
        { egfr_threshold: 30, action: 'reduce', recommendation: 'Reduce dose by 50%' },
        { egfr_threshold: 15, action: 'reduce', recommendation: 'Reduce dose by 75%' },
    ],
    'levofloxacin': [
        { egfr_threshold: 50, action: 'reduce', recommendation: '250-500mg q24h' },
        { egfr_threshold: 20, action: 'reduce', recommendation: '250mg q48h' },
    ],
    'ciprofloxacin': [
        { egfr_threshold: 30, action: 'reduce', recommendation: '250-500mg q12h' },
    ],
    'gentamicin': [
        { egfr_threshold: 60, action: 'monitor', recommendation: 'Monitor levels closely' },
        { egfr_threshold: 30, action: 'reduce', recommendation: 'Extended interval dosing required' },
    ],
    'vancomycin': [
        { egfr_threshold: 50, action: 'monitor', recommendation: 'Monitor trough levels' },
        { egfr_threshold: 30, action: 'reduce', recommendation: 'Reduce dose, monitor levels' },
    ],
    'acyclovir': [
        { egfr_threshold: 50, action: 'reduce', recommendation: 'Reduce dose by 50%' },
        { egfr_threshold: 25, action: 'reduce', recommendation: 'Reduce dose by 75%' },
    ],
    'amoxicillin': [
        { egfr_threshold: 30, action: 'reduce', recommendation: 'Max 500mg q12h' },
        { egfr_threshold: 10, action: 'reduce', recommendation: 'Max 500mg q24h' },
    ],
    'cefuroxime': [
        { egfr_threshold: 30, action: 'reduce', recommendation: 'Reduce to 250mg BD' },
        { egfr_threshold: 10, action: 'reduce', recommendation: '250mg OD' },
    ],
};

// ============================================================
// PREGNANCY CATEGORY RULES
// ============================================================

const PREGNANCY_CONTRAINDICATED = [
    'warfarin', 'methotrexate', 'isotretinoin', 'thalidomide',
    'valproic acid', 'phenytoin', 'carbamazepine', 'topiramate',
    'angiotensin converting enzyme inhibitors', 'arbs', 'statins',
    'tetracyclines', 'fluoroquinolones', 'aminoglycosides',
];

// ============================================================
// SAFETY CHECK FUNCTIONS
// ============================================================

function checkDrugAllergy(
    proposedDrug: string,
    allergies: CompressedContext['allergies'],
    riskFlags: string[]
): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    const drugLower = proposedDrug.toLowerCase();

    for (const allergy of allergies) {
        const allergen = allergy.substance.toLowerCase();

        // Direct match
        if (drugLower.includes(allergen) || allergen.includes(drugLower)) {
            checks.push({
                type: 'allergy',
                severity: 'hard_block',
                message: `ALLERGY BLOCK: ${proposedDrug} contains ${allergy.substance}`,
                drug_involved: proposedDrug,
                recommendation: 'Do not prescribe. Choose alternative drug class.',
            });
            continue;
        }

        // Cross-reactivity check
        for (const [allergenClass, drugs] of Object.entries(ALLERGY_CROSS_REACTIVITY)) {
            if (allergen.includes(allergenClass)) {
                for (const crossDrug of drugs) {
                    if (drugLower.includes(crossDrug)) {
                        checks.push({
                            type: 'allergy',
                            severity: 'hard_block',
                            message: `CROSS-REACTIVITY: ${proposedDrug} may cross-react with ${allergy.substance}`,
                            drug_involved: proposedDrug,
                            recommendation: `Avoid ${allergenClass} class drugs`,
                        });
                    }
                }
            }
        }
    }

    // Beta-lactam allergy special handling
    if (riskFlags.includes('beta_lactam_allergy')) {
        const isPenicillin = ['penicillin', 'amoxicillin', 'ampicillin'].some(p => drugLower.includes(p));
        const isCephalosporin = ['cef', 'cephalosporin'].some(c => drugLower.includes(c));

        if (isPenicillin) {
            checks.push({
                type: 'allergy',
                severity: 'hard_block',
                message: 'BLOCKED: Penicillin class contraindicated due to documented allergy',
                drug_involved: proposedDrug,
                recommendation: 'Use macrolide, fluoroquinolone, or other non-beta-lactam',
            });
        } else if (isCephalosporin) {
            // Cephalosporins are generally safe but warn
            checks.push({
                type: 'allergy',
                severity: 'warning',
                message: PENICILLIN_CEPH_WARNING,
                drug_involved: proposedDrug,
                recommendation: 'Consider skin testing or use with caution',
            });
        }
    }

    return checks;
}

function checkDrugInteractions(
    proposedDrug: string,
    currentMeds: CompressedContext['current_medications']
): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    const drugLower = proposedDrug.toLowerCase();

    for (const med of currentMeds) {
        const medLower = med.drug.toLowerCase();

        // Check against known critical interactions
        for (const [interactor, config] of Object.entries(CRITICAL_INTERACTIONS)) {
            const isInteractorCurrent = medLower.includes(interactor);
            const isInteractorProposed = drugLower.includes(interactor);
            const drugsMatch = config.drugs.some(d =>
                (isInteractorCurrent && drugLower.includes(d)) ||
                (isInteractorProposed && medLower.includes(d))
            );

            if (drugsMatch) {
                checks.push({
                    type: 'drug_interaction',
                    severity: config.severity,
                    message: `INTERACTION: ${proposedDrug} + ${med.drug} - ${config.reason}`,
                    drug_involved: proposedDrug,
                    recommendation: config.severity === 'hard_block'
                        ? 'Do not co-prescribe'
                        : 'Use with caution, monitor closely',
                });
            }
        }
    }

    return checks;
}

function checkRenalDosing(
    proposedDrug: string,
    dose: string,
    organFunction: CompressedContext['organ_function']
): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    const drugLower = proposedDrug.toLowerCase();
    const egfr = organFunction.egfr;

    if (!egfr) return checks;

    for (const [drug, rules] of Object.entries(RENAL_ADJUSTMENTS)) {
        if (drugLower.includes(drug)) {
            for (const rule of rules) {
                if (egfr < rule.egfr_threshold) {
                    checks.push({
                        type: 'renal',
                        severity: rule.action === 'avoid' ? 'hard_block' : 'warning',
                        message: `RENAL: eGFR ${egfr} < ${rule.egfr_threshold} - ${rule.recommendation}`,
                        drug_involved: proposedDrug,
                        recommendation: rule.recommendation,
                    });
                    break; // Only apply most restrictive rule
                }
            }
        }
    }

    return checks;
}

function checkPregnancy(
    proposedDrug: string,
    riskFlags: string[]
): SafetyCheck[] {
    const checks: SafetyCheck[] = [];

    if (!riskFlags.includes('pregnancy')) return checks;

    const drugLower = proposedDrug.toLowerCase();

    for (const contraindicated of PREGNANCY_CONTRAINDICATED) {
        if (drugLower.includes(contraindicated)) {
            checks.push({
                type: 'pregnancy',
                severity: 'hard_block',
                message: `PREGNANCY CONTRAINDICATION: ${proposedDrug} is teratogenic`,
                drug_involved: proposedDrug,
                recommendation: 'Choose pregnancy-safe alternative',
            });
        }
    }

    return checks;
}

function checkAge(
    proposedDrug: string,
    age: number
): SafetyCheck[] {
    const checks: SafetyCheck[] = [];
    const drugLower = proposedDrug.toLowerCase();

    // Fluoroquinolones in children
    if (age < 18 && ['levofloxacin', 'ciprofloxacin', 'moxifloxacin', 'ofloxacin'].some(f => drugLower.includes(f))) {
        checks.push({
            type: 'age',
            severity: 'warning',
            message: 'PEDIATRIC WARNING: Fluoroquinolones may affect cartilage development',
            drug_involved: proposedDrug,
            recommendation: 'Use only if no safer alternative exists',
        });
    }

    // Beers criteria for elderly
    if (age >= 65) {
        const highRiskElderly = ['benzodiazepine', 'diazepam', 'lorazepam', 'alprazolam',
            'diphenhydramine', 'hydroxyzine', 'meclizine', 'promethazine'];

        if (highRiskElderly.some(d => drugLower.includes(d))) {
            checks.push({
                type: 'age',
                severity: 'warning',
                message: 'BEERS CRITERIA: Potentially inappropriate for elderly patients',
                drug_involved: proposedDrug,
                recommendation: 'Consider safer alternative per Beers criteria',
            });
        }
    }

    return checks;
}

// ============================================================
// MAIN SAFETY GUARD FUNCTION
// ============================================================

export async function runSafetyChecks(
    context: CompressedContext,
    proposedTherapy: CandidateTherapy
): Promise<SafetyGuardResult> {
    console.log(`[Layer 2] Running safety checks for: ${proposedTherapy.preferred_drug}`);

    const allChecks: SafetyCheck[] = [];

    // Run all deterministic checks
    allChecks.push(
        ...checkDrugAllergy(proposedTherapy.preferred_drug, context.allergies, context.risk_flags),
        ...checkDrugInteractions(proposedTherapy.preferred_drug, context.current_medications),
        ...checkRenalDosing(proposedTherapy.preferred_drug, proposedTherapy.dose, context.organ_function),
        ...checkPregnancy(proposedTherapy.preferred_drug, context.risk_flags),
        ...checkAge(proposedTherapy.preferred_drug, context.demographics.age),
    );

    // Optionally check OpenFDA for additional interactions
    if (process.env.OPENFDA_API_KEY) {
        try {
            const fdaInteractions = await openFDAClient.getDrugInteractions(proposedTherapy.preferred_drug);
            for (const med of context.current_medications) {
                for (const interaction of fdaInteractions) {
                    if (interaction.toLowerCase().includes(med.drug.toLowerCase())) {
                        allChecks.push({
                            type: 'drug_interaction',
                            severity: 'warning',
                            message: `FDA LABEL: Potential interaction noted between ${proposedTherapy.preferred_drug} and ${med.drug}`,
                            drug_involved: proposedTherapy.preferred_drug,
                            source: 'OpenFDA',
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('[Layer 2] OpenFDA check failed:', e);
        }
    }

    // Separate by severity
    const hard_blocks = allChecks.filter(c => c.severity === 'hard_block');
    const warnings = allChecks.filter(c => c.severity === 'warning');
    const info = allChecks.filter(c => c.severity === 'info');

    const result: SafetyGuardResult = {
        passed: hard_blocks.length === 0,
        hard_blocks,
        warnings,
        info,
        checked_at: new Date().toISOString(),
    };

    console.log(`[Layer 2] Safety check complete. Passed: ${result.passed}, Blocks: ${hard_blocks.length}, Warnings: ${warnings.length}`);

    return result;
}

// ============================================================
// BATCH SAFETY CHECK (for multiple candidates)
// ============================================================

export async function runBatchSafetyChecks(
    context: CompressedContext,
    candidates: CandidateTherapy[]
): Promise<Map<string, SafetyGuardResult>> {
    const results = new Map<string, SafetyGuardResult>();

    for (const candidate of candidates) {
        const result = await runSafetyChecks(context, candidate);
        results.set(candidate.preferred_drug, result);
    }

    return results;
}

// ============================================================
// PRE-SCREEN (quick allergy/interaction check)
// ============================================================

export function preScreenDrug(
    drugName: string,
    allergies: CompressedContext['allergies'],
    riskFlags: string[]
): { safe: boolean; reason?: string } {
    const allergyChecks = checkDrugAllergy(drugName, allergies, riskFlags);
    const blocks = allergyChecks.filter(c => c.severity === 'hard_block');

    if (blocks.length > 0) {
        return { safe: false, reason: blocks[0].message };
    }

    return { safe: true };
}
