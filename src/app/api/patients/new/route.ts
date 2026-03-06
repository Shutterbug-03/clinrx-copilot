import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database-adapter';
import type { PatientSummary } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate basic fields
        if (!body.name || !body.age || !body.sex) {
            return NextResponse.json(
                { error: 'Missing required fields: name, age, sex' },
                { status: 400 }
            );
        }

        // Generate a new patient ID
        const patientId = `PT-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

        // Build the patient summary
        const patientSummary: PatientSummary = {
            patient_id: patientId,
            name: body.name,
            age: parseInt(body.age, 10),
            sex: body.sex as 'M' | 'F' | 'Other',
            phone: body.phone,
            chronic_conditions: body.conditions
                ? body.conditions.split(',').map((c: string) => c.trim()).filter(Boolean)
                : [],
            renal_status: { egfr: 90 },
            allergies: body.allergies
                ? body.allergies.split(',').map((a: string) => a.trim()).filter(Boolean)
                : [],
            current_meds: body.currentMeds
                ? body.currentMeds.split('\n').map((m: string) => {
                    const parts = m.trim().split(' ');
                    return {
                        drug: parts[0] || m.trim(),
                        dose: parts[1] || 'Unknown',
                        frequency: parts[2] || 'OD'
                    };
                }).filter((m: { drug: string }) => m.drug)
                : [],
            prior_failures: [],
            key_vitals: { bp: '120/80', weight: 70 },
            risk_flags: []
        };

        // Use database adapter (DynamoDB → Supabase → In-Memory)
        const result = await db.createPatient(patientSummary);

        return NextResponse.json({
            success: result.success,
            patient: patientSummary,
            storage: result.source, // Tells frontend which DB was used
        });
    } catch (error) {
        console.error('Failed to create new patient:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage },
            { status: 500 }
        );
    }
}
