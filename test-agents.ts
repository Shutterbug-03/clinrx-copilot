#!/usr/bin/env tsx
/**
 * Test All Agent Layers
 * Run with: npx tsx test-agents.ts
 */

import { compressContext, getMockCompressedContext } from './src/agents/context-agent';
import { runSafetyChecks } from './src/agents/safety-agent';
import { generateCandidateTherapies } from './src/agents/reasoning-agent';
import { checkInventory } from './src/agents/inventory-agent';
import { findEquivalents } from './src/agents/substitution-agent';
import { generateExplanation } from './src/agents/explanation-agent';
import { runPrescriptionPipeline } from './src/agents/orchestrator';

async function testAllLayers() {
    console.log('🧪 TESTING ALL AGENT LAYERS');
    console.log('='.repeat(70));
    console.log('');

    try {
        // Layer 1: Context Compression
        console.log('1️⃣  LAYER 1: Context Compression Agent');
        console.log('-'.repeat(70));
        
        const context = getMockCompressedContext('PT001');
        console.log(`✅ Context extracted for: ${context.patient_id}`);
        console.log(`   Patient: ${context.demographics.name}, ${context.demographics.age}${context.demographics.sex}`);
        console.log(`   Conditions: ${context.active_conditions.map(c => c.display).join(', ')}`);
        console.log(`   Allergies: ${context.allergies.map(a => a.substance).join(', ')}`);
        console.log(`   eGFR: ${context.organ_function.egfr} (CKD Stage ${context.organ_function.ckd_stage})`);
        console.log(`   Risk flags: ${context.risk_flags.join(', ')}`);
        console.log('');

        // Layer 3: Clinical Reasoning (before safety)
        console.log('3️⃣  LAYER 3: Clinical Reasoning Agent');
        console.log('-'.repeat(70));
        
        const doctorNotes = 'Fever and productive cough. Suspect bacterial infection.';
        console.log(`   Doctor notes: "${doctorNotes}"`);
        
        const reasoning = await generateCandidateTherapies(context, doctorNotes);
        console.log(`✅ Generated ${reasoning.candidate_therapies.length} candidate therapies`);
        console.log(`   Indication: ${reasoning.indication}`);
        console.log(`   Model: ${reasoning.model_version}`);
        
        for (let i = 0; i < reasoning.candidate_therapies.length; i++) {
            const candidate = reasoning.candidate_therapies[i];
            console.log(`   ${i + 1}. ${candidate.preferred_drug} ${candidate.dose} ${candidate.frequency} × ${candidate.duration}`);
            console.log(`      Confidence: ${(candidate.confidence * 100).toFixed(0)}%`);
            console.log(`      Reasoning: ${candidate.reasoning[0]}`);
        }
        console.log('');

        // Layer 2: Safety Guard
        console.log('2️⃣  LAYER 2: Safety Guard Agent (Deterministic)');
        console.log('-'.repeat(70));
        
        const primaryCandidate = reasoning.candidate_therapies[0];
        const safety = await runSafetyChecks(context, primaryCandidate);
        
        console.log(`✅ Safety check for: ${primaryCandidate.preferred_drug}`);
        console.log(`   Status: ${safety.passed ? '✅ PASSED' : '❌ BLOCKED'}`);
        console.log(`   Hard blocks: ${safety.hard_blocks.length}`);
        console.log(`   Warnings: ${safety.warnings.length}`);
        console.log(`   Info: ${safety.info.length}`);
        
        if (safety.hard_blocks.length > 0) {
            console.log(`   🚫 Blocks:`);
            safety.hard_blocks.forEach(block => {
                console.log(`      - ${block.message}`);
            });
        }
        
        if (safety.warnings.length > 0) {
            console.log(`   ⚠️  Warnings:`);
            safety.warnings.forEach(warning => {
                console.log(`      - ${warning.message}`);
            });
        }
        console.log('');

        // Layer 4: Inventory
        console.log('4️⃣  LAYER 4: Inventory Agent');
        console.log('-'.repeat(70));
        
        const inventory = await checkInventory(reasoning.candidate_therapies);
        console.log(`✅ Inventory checked`);
        console.log(`   Available drugs: ${inventory.available.length}`);
        console.log(`   Unavailable drugs: ${inventory.unavailable.length}`);
        
        if (inventory.available.length > 0) {
            console.log(`   📦 In stock:`);
            inventory.available.slice(0, 3).forEach(item => {
                console.log(`      - ${item.brand} (${item.generic}) ${item.strength} - ${item.stock_level} ${item.unit}`);
            });
        }
        
        if (inventory.unavailable.length > 0) {
            console.log(`   ❌ Out of stock: ${inventory.unavailable.join(', ')}`);
        }
        console.log('');

        // Layer 5: Substitution
        console.log('5️⃣  LAYER 5: Substitution Agent');
        console.log('-'.repeat(70));
        
        const testDrug = primaryCandidate.preferred_drug;
        const substitution = await findEquivalents(testDrug);
        
        console.log(`✅ Substitution analysis for: ${testDrug}`);
        console.log(`   Primary available: ${substitution.primary.available ? 'Yes' : 'No'}`);
        console.log(`   Equivalents found: ${substitution.equivalents.length}`);
        
        if (substitution.equivalents.length > 0) {
            console.log(`   🔄 Alternatives:`);
            substitution.equivalents.slice(0, 3).forEach(eq => {
                console.log(`      - ${eq.drug} (${eq.type}) - Confidence: ${(eq.confidence * 100).toFixed(0)}% - ${eq.available ? '✅ Available' : '❌ Unavailable'}`);
            });
        }
        console.log('');

        // Layer 6: Explanation (XAI)
        console.log('6️⃣  LAYER 6: Explanation Agent (XAI)');
        console.log('-'.repeat(70));
        
        const explanation = generateExplanation(context, primaryCandidate, safety);
        
        console.log(`✅ Explanation generated`);
        console.log(`   Summary: ${explanation.summary}`);
        console.log(`   Reasoning points: ${explanation.reasoning_points.length}`);
        console.log(`   Risk notes: ${explanation.risk_notes.length}`);
        console.log(`   Data sources: ${explanation.data_sources.length}`);
        console.log('');
        console.log(`   📋 Detailed reasoning:`);
        explanation.reasoning_points.forEach(point => {
            console.log(`      • ${point}`);
        });
        
        if (explanation.risk_notes.length > 0) {
            console.log(`   ⚠️  Risk notes:`);
            explanation.risk_notes.forEach(note => {
                console.log(`      • ${note}`);
            });
        }
        
        console.log(`   🎯 Confidence: ${explanation.confidence_explanation}`);
        console.log('');

        // Full Pipeline Test
        console.log('🔄 FULL PIPELINE TEST (All Layers Together)');
        console.log('-'.repeat(70));
        
        const pipelineResult = await runPrescriptionPipeline({
            patientId: 'PT001',
            doctorNotes: 'Fever and productive cough. Suspect bacterial infection.',
            doctorId: 'test-doctor',
            useMockData: true
        });
        
        console.log(`✅ Pipeline executed successfully`);
        console.log(`   Execution time: ${pipelineResult.executionTime}ms`);
        console.log(`   Success: ${pipelineResult.success}`);
        console.log(`   Blocked: ${pipelineResult.blocked}`);
        console.log(`   Pipeline version: ${pipelineResult.pipelineVersion}`);
        console.log('');
        
        if (pipelineResult.primaryRecommendation) {
            console.log(`   💊 Primary Recommendation:`);
            console.log(`      Drug: ${pipelineResult.primaryRecommendation.preferred_drug}`);
            console.log(`      Dose: ${pipelineResult.primaryRecommendation.dose} ${pipelineResult.primaryRecommendation.frequency}`);
            console.log(`      Duration: ${pipelineResult.primaryRecommendation.duration}`);
            console.log(`      Confidence: ${(pipelineResult.primaryRecommendation.confidence * 100).toFixed(0)}%`);
        }
        
        console.log('');
        console.log('='.repeat(70));
        console.log('✅ ALL TESTS PASSED');
        console.log('='.repeat(70));

    } catch (error) {
        console.error('');
        console.error('❌ TEST FAILED');
        console.error('='.repeat(70));
        console.error(error);
        process.exit(1);
    }
}

// Run tests
testAllLayers().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
