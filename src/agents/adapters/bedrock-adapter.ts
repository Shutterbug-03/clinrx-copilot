import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import OpenAI from "openai";

/**
 * BedrockAdapter - Orchestrates clinical reasoning using Amazon Bedrock foundation models.
 * Incorporates an emergency fallback to OpenAI (GPT-4o-mini) if AWS Bedrock fails.
 */
export class BedrockAdapter {
    private client: BedrockRuntimeClient;
    private modelId: string;
    private openai: OpenAI | null = null;

    constructor(region: string = process.env.AWS_REGION || "ap-south-1") {
        this.client = new BedrockRuntimeClient({ region });
        // Using APAC Inference Profile for Claude 3.5 Sonnet in Mumbai (ap-south-1)
        this.modelId = "apac.anthropic.claude-3-5-sonnet-20240620-v1:0";
    }

    private getOpenAIClient(): OpenAI | null {
        if (!this.openai && process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        return this.openai;
    }

    /**
     * Generates a clinical completion based on a structured prompt using AWS Bedrock, 
     * falling back to OpenAI if Bedrock faces an outage or throttling.
     */
    async invokeModel(prompt: string): Promise<string> {
        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: [{ type: "text", text: prompt }],
                },
            ],
            temperature: 0.2, // Low temperature for deterministic clinical logic
        };

        const command = new InvokeModelCommand({
            modelId: this.modelId,
            body: JSON.stringify(payload),
            contentType: "application/json",
            accept: "application/json",
        });

        // Create an AbortController to timeout the Bedrock request if it takes too long
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
            const response = await this.client.send(command, { abortSignal: controller.signal as any });
            clearTimeout(timeoutId);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            return responseBody.content[0].text;
        } catch (error: any) {
            clearTimeout(timeoutId);
            const isTimeout = error.name === 'AbortError' || error.message?.includes('abort');
            console.warn(`[BedrockAdapter] AWS Bedrock ${isTimeout ? 'TIMED OUT' : 'FAILED'}:`, error.message);

            const openaiClient = this.getOpenAIClient();
            if (openaiClient) {
                console.log("[BedrockAdapter] 🔄 Falling back to OpenAI (gpt-4o-mini)...");
                try {
                    const fallbackResponse = await openaiClient.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.2,
                    });
                    return fallbackResponse.choices[0]?.message?.content || '{}';
                } catch (fallbackError) {
                    console.error("[BedrockAdapter] OpenAI fallback also failed:", fallbackError);
                    throw new Error("Critical Failure: Both Bedrock and OpenAI fallback engines failed.");
                }
            }

            throw new Error("Bedrock reasoning failed and no OpenAI fallback available. Check AWS credentials and OPENAI_API_KEY.");
        }
    }

    /**
     * Helper to format clinical reasoning prompts
     */
    formatPrompt(patientSummary: string, notes: string): string {
        return `
        You are an expert AI clinical assistant (ClinRx). 
        Based on the following patient data and doctor notes, generate a structured prescription draft.
        
        PATIENT SUMMARY:
        ${patientSummary}
        
        DOCTOR NOTES:
        ${notes}
        
        Respond ONLY with a valid JSON encompassing medications, reasoning, and safety warnings.
        `;
    }
}
