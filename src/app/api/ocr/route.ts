import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy initialize OpenAI
let openai: OpenAI | null = null;
function getOpenAI() {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
}

export async function POST(request: NextRequest) {
    try {
        const { image } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        const client = getOpenAI();

        if (!client) {
            // Return mock data if no API key
            return NextResponse.json({
                medications: ['Paracetamol 500mg BD', 'Omeprazole 20mg OD'],
                patientName: 'Demo Patient',
                message: 'Mock OCR - OpenAI API key not configured',
            });
        }

        // Use GPT-4o Vision for OCR
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `You are a medical prescription OCR assistant. Analyze this prescription image and extract:
1. Patient name (if visible)
2. List of medications with doses and frequencies

Return as JSON:
{
  "patientName": "name or null",
  "medications": ["Drug1 dose frequency", "Drug2 dose frequency"]
}

Only return the JSON, no other text.`,
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: image,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 500,
        });

        const content = response.choices[0]?.message?.content || '{}';

        // Parse the JSON response
        try {
            const parsed = JSON.parse(content);
            return NextResponse.json(parsed);
        } catch {
            return NextResponse.json({
                medications: [],
                patientName: null,
                raw: content,
            });
        }

    } catch (error) {
        console.error('OCR error:', error);
        return NextResponse.json(
            { error: 'Failed to process image' },
            { status: 500 }
        );
    }
}
