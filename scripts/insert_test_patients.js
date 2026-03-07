require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { createClient } = require('@supabase/supabase-js');

// Config
const REGION = process.env.AWS_REGION || "ap-south-1";
const client = new DynamoDBClient({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const dynamoDb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const patients = [
    {
        name: "Raj Patel",
        age: 35,
        sex: "M",
        phone: "+91 98100 12345",
        allergies: ["Penicillin"],
        chronic_conditions: ["MRSA Colonization", "Skin Infection"],
        current_meds: []
    },
    {
        name: "Sunita Sharma",
        age: 55,
        sex: "F",
        phone: "+91 98200 23456",
        allergies: [],
        chronic_conditions: ["Type 2 Diabetes", "Obesity"],
        current_meds: [{ drug: "Metformin", dose: "500mg", frequency: "BD" }]
    },
    {
        name: "Priya Singh",
        age: 28,
        sex: "F",
        phone: "+91 98300 34567",
        allergies: [],
        chronic_conditions: ["Severe Dry Cough"],
        current_meds: []
    },
    {
        name: "Amit Kumar",
        age: 40,
        sex: "M",
        phone: "+91 98400 45678",
        allergies: [],
        chronic_conditions: ["Severe Eosinophilic Asthma"],
        current_meds: [{ drug: "Salmeterol", dose: "50mcg", frequency: "OD" }]
    },
    {
        name: "Vikram Desai",
        age: 45,
        sex: "M",
        phone: "+91 98500 56789",
        allergies: [],
        chronic_conditions: ["Ankle Sprain", "Osteoarthritis"],
        current_meds: []
    }
];

async function insertPatients() {
    for (const p of patients) {
        const patientId = `PT-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
        const summary = {
            patient_id: patientId,
            name: p.name,
            age: p.age,
            sex: p.sex,
            phone: p.phone,
            chronic_conditions: p.chronic_conditions,
            renal_status: { egfr: 90 },
            allergies: p.allergies,
            current_meds: p.current_meds,
            prior_failures: [],
            key_vitals: { bp: '120/80', weight: 70 },
            risk_flags: []
        };

        console.log(`\nInserting ${p.name} (ID: ${patientId})...`);

        // DynamoDB Insert
        try {
            await dynamoDb.send(new PutCommand({
                TableName: process.env.DYNAMODB_PATIENTS_TABLE || "ClinRx_Patients",
                Item: {
                    ...summary,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }
            }));
            console.log(`✅ DynamoDB: Success`);
        } catch (err) {
            console.error(`❌ DynamoDB Failed:`, err.message);
        }

        // Supabase Insert
        try {
            const { error } = await supabase.from("patients").insert({
                fhir_id: patientId,
                name: p.name,
                age: p.age,
                sex: p.sex,
                phone: p.phone,
                summary: summary,
            });
            if (error) throw error;
            console.log(`✅ Supabase: Success`);
        } catch (err) {
            console.error(`❌ Supabase Failed:`, err.message || err);
        }
    }
}

insertPatients();
