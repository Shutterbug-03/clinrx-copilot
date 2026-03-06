import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const envStatus = {
        AWS_REGION: process.env.AWS_REGION ? '✅ DEFINED' : '❌ MISSING',
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '✅ DEFINED' : '❌ MISSING',
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '✅ DEFINED' : '❌ MISSING',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✅ DEFINED' : '❌ MISSING',
        SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ DEFINED' : '❌ MISSING',
        SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ DEFINED' : '❌ MISSING',
        DYNAMODB_PATIENTS_TABLE: process.env.DYNAMODB_PATIENTS_TABLE ? '✅ DEFINED' : '❌ MISSING',
        NODE_ENV: process.env.NODE_ENV,
        TIME: new Date().toISOString()
    };

    return NextResponse.json({
        status: 'Diagnostic Page',
        env: envStatus,
        message: 'This endpoint checks if the server-side environment has the necessary keys.'
    });
}
