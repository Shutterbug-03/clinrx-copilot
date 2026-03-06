import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import OpenAI from "openai";
import { storeOCRImage } from '@/lib/s3-storage';

// Allow this API route to run for up to 60 seconds on AWS Lambda/Amplify
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { image } = await request.json();

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            // Return mock data if no AWS credentials are found and no OPENAI_API_KEY is found
            if (!process.env.OPENAI_API_KEY) {
                return NextResponse.json({
                    medications: ['Paracetamol 500mg BD', 'Omeprazole 20mg OD'],
                    patientName: 'Demo Patient',
                    message: 'Mock OCR - Neither AWS Bedrock credentials nor OpenAI API key configured',
                });
            }
        }

        const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "ap-south-1" });

        // Add timeout to prevent 504 Gateway Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        // Convert base64 data URI to raw bytes
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        // Extract format (jpeg, png, etc). Default to jpeg if not found.
        const formatMatch = image.match(/^data:image\/(\w+);base64,/);
        const format = formatMatch ? formatMatch[1] : "jpeg";

        const modelId = "apac.anthropic.claude-3-5-sonnet-20240620-v1:0";

        const command = new ConverseCommand({
            modelId,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            text: `You are a medical prescription OCR assistant. Analyze this prescription image and extract:
1. Patient name (if visible)
2. List of medications with doses and frequencies

Return as JSON:
{
  "patientName": "name or null",
  "medications": ["Drug1 dose frequency", "Drug2 dose frequency"]
}

Only return the JSON, no other text.`
                        },
                        {
                            image: {
                                format: format as 'jpeg' | 'png' | 'gif' | 'webp',
                                source: {
                                    bytes: imageBuffer
                                }
                            }
                        }
                    ]
                }
            ],
            inferenceConfig: { maxTokens: 500 }
        });

        let content = '{}';

        try {
            if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
                const response = await client.send(command, { abortSignal: controller.signal as any });
                clearTimeout(timeoutId);
                content = response.output?.message?.content?.[0]?.text || '{}';
            } else {
                throw new Error("AWS credentials missing, jumping to fallback");
            }
        } catch (bedrockError: any) {
            clearTimeout(timeoutId);
            const isTimeout = bedrockError.name === 'AbortError';
            console.warn(`[OCR API] Bedrock ${isTimeout ? 'TIMED OUT' : 'FAILED'}, attempting OpenAI fallback...`, bedrockError.message);
            if (process.env.OPENAI_API_KEY) {
                const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
                const fallbackResponse = await openai.chat.completions.create({
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
                content = fallbackResponse.choices[0]?.message?.content || '{}';
            } else {
                throw new Error("Both Bedrock and OpenAI OCR failed.");
            }
        }

        // Parse the JSON response
        try {
            const parsed = JSON.parse(content);

            // 🟢 Store image in S3 for audit trail (non-blocking)
            storeOCRImage(parsed.patientName || 'unknown', imageBuffer, format).catch(() => { });

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
