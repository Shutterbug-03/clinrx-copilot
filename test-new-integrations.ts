import { generatePrescriptionDraft } from './src/agents/prescription-generator';
import { getMockCompressedContext } from './src/agents/context-agent';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

async function runTest() {
    console.log('--- STARTING CLINRX INTEGRATION TEST ---');
    console.log('Testing with Live APIs (OpenAI, OpenFDA, RxNorm) and FHIR Enforced');

    // PT001: Rajesh Kumar, 62y, DM, HTN, CKD (eGFR 48), Penicillin Allergy
    const patientSummary = {
        patient_id: 'PT001',
        name: 'Rajesh Kumar',
        age: 62,
        sex: 'M' as const,
        chronic_conditions: ['Type 2 Diabetes', 'Hypertension', 'CKD Stage 3a'],
        renal_status: { egfr: 48, ckd_stage: '3a' },
        allergies: ['Penicillin'],
        current_meds: [
            { drug: 'Metformin', dose: '500mg', frequency: 'BD' },
            { drug: 'Amlodipine', dose: '5mg', frequency: 'OD' }
        ],
        prior_failures: [],
        key_vitals: { weight: 78 },
        risk_flags: ['renal_dose_adjust', 'beta_lactam_allergy']
    };

    // Doctor Notes describing symptoms not in the static DB
    // 1. "Bacterial Sinusitis" (Common but lets see if AI picks a non-penicillin)
    // 2. "Gouty Arthritis" (Needs NSAID? Safety agent should warn due to CKD)
    const doctorNotes = "Patient presents with severe facial pain, yellow nasal discharge suggesting acute bacterial sinusitis. Also reports swelling in big toe consistent with acute gout flare.";

    console.log('\nInput Symptoms:', doctorNotes);
    console.log('Patient Profile: Rajesh Kumar, Allergy: Penicillin, Renal: CKD Stage 3a');

    try {
        const draft = await generatePrescriptionDraft(patientSummary as any, doctorNotes);

        console.log('\n--- GENERATED PRESCRIPTION ---');
        console.log('Medications:');
        draft.medications.forEach((m, i) => {
            console.log(`${i + 1}. ${m.drug} (${m.brand}) - ${m.dose} ${m.frequency}`);
            console.log(`   Indication: ${m.indication}`);
            console.log(`   Reasoning: ${m.reasoning}`);
            console.log('');
        });

        console.log('\n--- SAFETY WARNINGS ---');
        if (draft.warnings.length === 0) console.log('None detected');
        draft.warnings.forEach(w => {
            console.log(`[${w.type.toUpperCase()}] ${w.message} (${w.drug || 'general'})`);
        });

        console.log('\n--- LIVE ALTERNATIVES (from FDA/RxNorm) ---');
        draft.alternatives.forEach((alt, i) => {
            console.log(`${i + 1}. ${alt.drug} (Brand: ${alt.brand}) - Stock: ${alt.in_stock ? '✅' : '❌'}`);
            console.log(`   Note: ${alt.note}`);
        });

        console.log('\n--- EXPLANATION ---');
        console.log(draft.explanation);

    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();
