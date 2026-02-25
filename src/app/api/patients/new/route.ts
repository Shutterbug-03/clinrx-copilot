import { NextRequest, NextResponse } from 'next/server';
import { supabase, isDbConnected } from '@/lib/supabase';
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

        // Generate a new fhir_id simply for the mock integration
        const fhirId = `PT-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;

        // Build the patient summary JSON blob matching our frontend types
        const patientSummary: PatientSummary = {
            patient_id: fhirId,
            name: body.name,
            age: parseInt(body.age, 10),
            sex: body.sex as 'M' | 'F' | 'Other',
            phone: body.phone,
            chronic_conditions: body.conditions
                ? body.conditions.split(',').map((c: string) => c.trim()).filter(Boolean)
                : [],
            // Set some default safe assumptions if not provided
            renal_status: { egfr: 90 },
            allergies: body.allergies
                ? body.allergies.split(',').map((a: string) => a.trim()).filter(Boolean)
                : [],
            current_meds: body.currentMeds
                ? body.currentMeds.split('\n').map((m: string) => {
                    const parts = m.trim().split(' ');
                    // Simple parser just to get something into the system
                    return {
                        drug: parts[0] || m.trim(),
                        dose: parts[1] || 'Unknown',
                        frequency: parts[2] || 'OD'
                    };
                }).filter((m: any) => m.drug)
                : [],
            prior_failures: [],
            key_vitals: { bp: '120/80', weight: 70 },
            risk_flags: []
        };

        if (!isDbConnected || !supabase) {
            console.log('[API] DB not connected. Simulating new patient insert.');
            return NextResponse.json({ success: true, patient: patientSummary });
        }

        // Insert into Supabase
        // Use service role key to bypass RLS if available
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        // Dynamic import to avoid frontend issues just in case, though this is a server route
        const { createClient } = await import('@supabase/supabase-js');
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await adminSupabase
            .from('patients')
            .insert({
                fhir_id: fhirId,
                name: body.name,
                age: patientSummary.age,
                sex: patientSummary.sex,
                phone: body.phone,
                summary: patientSummary
            });

        if (error) {
            console.error('[API] Supabase Insert Error:', error);
            // If it's an RLS error, we give a more helpful hint
            if (error.code === '42501') {
                return NextResponse.json({
                    error: 'Database Permission Denied',
                    details: 'RLS policy missing or Service Role Key incorrect. Please check Supabase logs.',
                    code: error.code
                }, { status: 403 });
            }
            throw error;
        }

        return NextResponse.json({ success: true, patient: patientSummary });
    } catch (error) {
        console.error('Failed to create new patient:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage },
            { status: 500 }
        );
    }
}
