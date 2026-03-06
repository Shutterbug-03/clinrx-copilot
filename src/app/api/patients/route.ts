import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database-adapter';

export async function GET(request: NextRequest) {
    try {
        const patients = await db.getPatients();
        return NextResponse.json({ success: true, patients });
    } catch (error) {
        console.error('Failed to fetch patients:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: String(error) },
            { status: 500 }
        );
    }
}
