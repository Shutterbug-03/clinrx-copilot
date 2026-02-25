#!/usr/bin/env tsx
/**
 * Test Supabase Integration
 * Run with: npx tsx test-supabase-integration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseIntegration() {
    console.log('🧪 TESTING SUPABASE INTEGRATION');
    console.log('='.repeat(70));
    console.log('');

    try {
        // Test 1: Check Patients Table
        console.log('1️⃣  Testing Patients Table');
        console.log('-'.repeat(70));
        
        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('*')
            .limit(10);

        if (patientsError) {
            console.log(`   ⚠️  Error: ${patientsError.message}`);
        } else {
            console.log(`   ✅ Found ${patients?.length || 0} patients`);
            if (patients && patients.length > 0) {
                patients.forEach(p => {
                    console.log(`      - ${p.name} (${p.age}${p.sex}) - ID: ${p.id}`);
                });
            } else {
                console.log(`   ℹ️  No patients in database yet`);
            }
        }
        console.log('');

        // Test 2: Check Drugs Table
        console.log('2️⃣  Testing Drugs Table');
        console.log('-'.repeat(70));
        
        const { data: drugs, error: drugsError } = await supabase
            .from('drugs')
            .select('*')
            .limit(10);

        if (drugsError) {
            console.log(`   ⚠️  Error: ${drugsError.message}`);
        } else {
            console.log(`   ✅ Found ${drugs?.length || 0} drugs`);
            if (drugs && drugs.length > 0) {
                drugs.forEach(d => {
                    console.log(`      - ${d.brand || d.inn} (${d.strength}) - ${d.in_stock ? '✅ In Stock' : '❌ Out of Stock'}`);
                });
            } else {
                console.log(`   ℹ️  No drugs in database yet`);
            }
        }
        console.log('');

        // Test 3: Check Prescriptions Table
        console.log('3️⃣  Testing Prescriptions Table');
        console.log('-'.repeat(70));
        
        const { data: prescriptions, error: prescriptionsError } = await supabase
            .from('prescriptions')
            .select('*')
            .limit(10);

        if (prescriptionsError) {
            console.log(`   ⚠️  Error: ${prescriptionsError.message}`);
        } else {
            console.log(`   ✅ Found ${prescriptions?.length || 0} prescriptions`);
            if (prescriptions && prescriptions.length > 0) {
                prescriptions.forEach(p => {
                    console.log(`      - Patient: ${p.patient_id} - Approved: ${p.approved ? 'Yes' : 'No'} - ${p.created_at}`);
                });
            } else {
                console.log(`   ℹ️  No prescriptions in database yet`);
            }
        }
        console.log('');

        // Test 4: Check Drug Interactions Table
        console.log('4️⃣  Testing Drug Interactions Table');
        console.log('-'.repeat(70));
        
        const { data: interactions, error: interactionsError } = await supabase
            .from('drug_interactions')
            .select('*')
            .limit(10);

        if (interactionsError) {
            console.log(`   ⚠️  Error: ${interactionsError.message}`);
        } else {
            console.log(`   ✅ Found ${interactions?.length || 0} drug interactions`);
            if (interactions && interactions.length > 0) {
                interactions.forEach(i => {
                    console.log(`      - ${i.drug_a_inn} + ${i.drug_b_inn}: ${i.severity} - ${i.description}`);
                });
            } else {
                console.log(`   ℹ️  No drug interactions in database yet`);
            }
        }
        console.log('');

        // Test 5: Check Inventory Table
        console.log('5️⃣  Testing Inventory Table');
        console.log('-'.repeat(70));
        
        const { data: inventory, error: inventoryError } = await supabase
            .from('inventory')
            .select('*')
            .limit(10);

        if (inventoryError) {
            console.log(`   ⚠️  Error: ${inventoryError.message}`);
        } else {
            console.log(`   ✅ Found ${inventory?.length || 0} inventory items`);
            if (inventory && inventory.length > 0) {
                inventory.forEach(i => {
                    console.log(`      - Drug ID: ${i.drug_id} - Location: ${i.location} - Qty: ${i.quantity}`);
                });
            } else {
                console.log(`   ℹ️  No inventory items in database yet`);
            }
        }
        console.log('');

        // Test 6: Insert Test Patient
        console.log('6️⃣  Testing Insert Operation (Test Patient)');
        console.log('-'.repeat(70));
        
        const testPatient = {
            id: 'PT001',
            fhir_id: 'patient-001',
            name: 'Rajesh Kumar',
            age: 62,
            sex: 'M',
            summary: {
                conditions: ['Type 2 Diabetes', 'Hypertension', 'CKD Stage 3a'],
                allergies: ['Penicillin', 'Sulfa drugs'],
                medications: ['Metformin 500mg BD', 'Losartan 50mg OD', 'Amlodipine 5mg OD'],
                egfr: 48
            }
        };

        const { data: insertedPatient, error: insertError } = await supabase
            .from('patients')
            .upsert(testPatient, { onConflict: 'id' })
            .select();

        if (insertError) {
            console.log(`   ⚠️  Error: ${insertError.message}`);
        } else {
            console.log(`   ✅ Successfully inserted/updated test patient`);
            console.log(`      - ${insertedPatient?.[0]?.name} (${insertedPatient?.[0]?.age}${insertedPatient?.[0]?.sex})`);
        }
        console.log('');

        // Test 7: Query Test Patient
        console.log('7️⃣  Testing Query Operation');
        console.log('-'.repeat(70));
        
        const { data: queriedPatient, error: queryError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', 'PT001')
            .single();

        if (queryError) {
            console.log(`   ⚠️  Error: ${queryError.message}`);
        } else {
            console.log(`   ✅ Successfully queried patient PT001`);
            console.log(`      - Name: ${queriedPatient?.name}`);
            console.log(`      - Age: ${queriedPatient?.age}`);
            console.log(`      - Conditions: ${queriedPatient?.summary?.conditions?.join(', ')}`);
            console.log(`      - Allergies: ${queriedPatient?.summary?.allergies?.join(', ')}`);
        }
        console.log('');

        // Summary
        console.log('='.repeat(70));
        console.log('✅ SUPABASE INTEGRATION TEST COMPLETE');
        console.log('='.repeat(70));
        console.log('');
        console.log('Summary:');
        console.log(`  - Patients: ${patients?.length || 0} records`);
        console.log(`  - Drugs: ${drugs?.length || 0} records`);
        console.log(`  - Prescriptions: ${prescriptions?.length || 0} records`);
        console.log(`  - Drug Interactions: ${interactions?.length || 0} records`);
        console.log(`  - Inventory: ${inventory?.length || 0} records`);
        console.log('');
        console.log('Next steps:');
        console.log('  1. Add more patients: npx tsx seed-patients.ts');
        console.log('  2. Add drugs: npx tsx seed-drugs.ts');
        console.log('  3. Test full prescription flow: npm run dev');
        console.log('');

    } catch (error) {
        console.error('');
        console.error('❌ TEST FAILED');
        console.error('='.repeat(70));
        console.error(error);
        process.exit(1);
    }
}

// Run tests
testSupabaseIntegration().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
