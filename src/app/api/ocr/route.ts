import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
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

        // STEP 1: AWS Textract
        let rawText = "";
        try {
            console.log(`[OCR_API] Triggering AWS Textract (Size: ${imageBuffer.length} bytes)`);
            const textractClient = new TextractClient({ region: process.env.AWS_REGION || "ap-south-1" });
            const extractCmd = new DetectDocumentTextCommand({
                Document: { Bytes: imageBuffer }
            });
            const textractResponse = await textractClient.send(extractCmd);

            const lines = textractResponse.Blocks?.filter(b => b.BlockType === 'LINE').map(b => b.Text) || [];
            rawText = lines.join("\n");
            console.log(`[OCR_API] Textract Extracted ${lines.length} lines of text.`);
        } catch (error: any) {
            console.warn(`[OCR_API] Textract FAILED, proceeding with empty text (Vision will be used):`, error.message);
        }

        // STEP 2: OpenAI GPT-4o-mini Parsing
        let content = '{}';

        console.log("[OCR_API] Triggering OpenAI GPT-4o-mini combined with Textract data...");
        const fallbackStart = Date.now();
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const fallbackResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: `You are a medical prescription data extractor. 
Analyze the image AND the raw OCR text to extract patient details.

RAW OCR TEXT FROM TEXTRACT:
"""
${rawText}
"""

Extract the following into a valid JSON object:
1. "name": Patient full name
2. "age": Patient age (number only, as string) OR "sex": 'M' | 'F' | 'Other'
3. "phone": Phone number
4. "allergies": Comma-separated allergies
5. "conditions": Comma-separated chronic conditions or diagnoses
6. "currentMeds": List of medications with doses and frequencies, one per line. Use "\n" for line breaks.

Return ONLY the JSON matching this interface:
{
  "name": "",
  "age": "",
  "sex": "M",
  "phone": "",
  "allergies": "",
  "conditions": "",
  "currentMeds": ""
}`,
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
            response_format: { type: "json_object" },
            max_tokens: 1000,
        });
        content = fallbackResponse.choices[0]?.message?.content || '{}';
        console.log(`[OCR_API] OpenAI finished in ${Date.now() - fallbackStart}ms`);

        // Parse the JSON response
        try {
            const parsed = JSON.parse(content);

            // 🟢 Store image in S3 for audit trail (non-blocking)
            storeOCRImage(parsed.name || 'unknown', imageBuffer, format).catch(() => { });

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
