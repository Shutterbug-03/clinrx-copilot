
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const INITIAL_PATIENTS = [
    {
        fhir_id: 'PT001',
        name: 'Rajesh Kumar',
        age: 62,
        sex: 'M',
        summary: {
            patient_id: 'PT001',
            name: 'Rajesh Kumar',
            age: 62,
            sex: 'M',
            chronic_conditions: ['Type 2 Diabetes', 'Hypertension', 'CKD Stage 3a'],
            renal_status: { egfr: 48, ckd_stage: '3a' },
            allergies: ['Penicillin', 'Sulfa drugs'],
            current_meds: [
                { drug: 'Metformin', dose: '500mg', frequency: 'BD' },
                { drug: 'Losartan', dose: '50mg', frequency: 'OD' },
                { drug: 'Amlodipine', dose: '5mg', frequency: 'OD' },
            ],
            prior_failures: [{ drug: 'Metformin', year: 2019, reason: 'GI intolerance at 1000mg' }],
            key_vitals: { bp: '142/88', weight: 78 },
            risk_flags: ['renal_dose_adjust', 'beta_lactam_allergy', 'elderly_patient', 'polypharmacy'],
        },
    },
    {
        fhir_id: 'PT002',
        name: 'Priya Sharma',
        age: 45,
        sex: 'F',
        summary: {
            patient_id: 'PT002',
            name: 'Priya Sharma',
            age: 45,
            sex: 'F',
            chronic_conditions: ['Asthma', 'Hypothyroidism'],
            renal_status: { egfr: 92 },
            allergies: [],
            current_meds: [
                { drug: 'Levothyroxine', dose: '75mcg', frequency: 'OD' },
                { drug: 'Salbutamol MDI', dose: '2 puffs', frequency: 'PRN' },
            ],
            prior_failures: [],
            key_vitals: { bp: '118/76', weight: 62 },
            risk_flags: [],
        },
    },
];

const INITIAL_DRUGS = [
    {
        inn: 'Metformin',
        brand: 'Glycomet',
        strength: '500mg',
        formulation: 'Tablet',
        in_stock: true,
        price: 45.00,
    },
    {
        inn: 'Metformin',
        brand: 'Glyciphage',
        strength: '1000mg',
        formulation: 'Tablet (SR)',
        in_stock: true,
        price: 60.00,
    },
    {
        inn: 'Amlodipine',
        brand: 'Amlong',
        strength: '5mg',
        formulation: 'Tablet',
        in_stock: true,
        price: 35.00,
    },
    {
        inn: 'Losartan',
        brand: 'Losar',
        strength: '50mg',
        formulation: 'Tablet',
        in_stock: true,
        price: 55.00,
    },
    {
        inn: 'Atorvastatin',
        brand: 'Atorva',
        strength: '10mg',
        formulation: 'Tablet',
        in_stock: true,
        price: 120.00,
    },
    {
        inn: 'Pantoprazole',
        brand: 'Pantocid',
        strength: '40mg',
        formulation: 'Tablet',
        in_stock: true,
        price: 85.00,
    },
    {
        inn: 'Levothyroxine',
        brand: 'Thyronorm',
        strength: '75mcg',
        formulation: 'Tablet',
        in_stock: true,
        price: 110.00,
    },
    {
        inn: 'Salbutamol',
        brand: 'Asthalin',
        strength: '100mcg',
        formulation: 'Inhaler',
        in_stock: true,
        price: 150.00,
    },
];

async function seed() {
    console.log('🌱 Starting seed...');

    // 1. Seed Patients
    console.log('Seeding patients...');
    for (const p of INITIAL_PATIENTS) {
        const { error } = await supabase
            .from('patients')
            .upsert(p, { onConflict: 'fhir_id' });

        if (error) console.error(`Error seeding patient ${p.name}:`, error.message);
        else console.log(`Seeded patient: ${p.name}`);
    }

    // 2. Seed Drugs
    console.log('Seeding drugs...');
    for (const d of INITIAL_DRUGS) {
        const { data: existing } = await supabase
            .from('drugs')
            .select('id')
            .eq('brand', d.brand)
            .eq('strength', d.strength)
            .maybeSingle();

        if (!existing) {
            const { error } = await supabase.from('drugs').insert(d);
            if (error) console.error(`Error seeding drug ${d.brand}:`, error.message);
            else console.log(`Seeded drug: ${d.brand} ${d.strength}`);
        } else {
            console.log(`Drug already exists: ${d.brand} ${d.strength}`);
        }
    }

    console.log('✅ Seed completed!');
}

seed().catch(console.error);
