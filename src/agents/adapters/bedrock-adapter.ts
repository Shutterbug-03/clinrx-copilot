import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import OpenAI from "openai";

/**
 * BedrockAdapter - Orchestrates clinical reasoning.
 * Now prioritized to use OpenAI (GPT-4o-mini) natively,
 * with an emergency fallback to Amazon Bedrock (Llama 3 70B) if OpenAI fails.
 */
export class BedrockAdapter {
    private client: BedrockRuntimeClient;
    private modelId: string;
    private openai: OpenAI | null = null;

    constructor(region: string = "us-east-1") {
        this.client = new BedrockRuntimeClient({ region });
        // Switching to Llama 3 70B in us-east-1 as it is accessible via credits
        this.modelId = "meta.llama3-70b-instruct-v1:0";
    }

    private getOpenAIClient(): OpenAI | null {
        if (!this.openai && process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        return this.openai;
    }

    /**
     * Generates a clinical completion based on a structured prompt using OpenAI, 
     * falling back to AWS Bedrock if OpenAI faces an outage or throttling.
     */
    async invokeModel(prompt: string): Promise<string> {
        const openaiClient = this.getOpenAIClient();

        if (openaiClient) {
            console.log("[BedrockAdapter] 🚀 Using OpenAI (gpt-4o-mini) as Primary Engine...");
            try {
                // OpenAI request with a manual abort controller timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);

                const response = await Promise.race([
                    openaiClient.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.2,
                    }),
                    new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000))
                ]);

                clearTimeout(timeoutId);

                if (!response) {
                    throw new Error("OpenAI API timed out after 15s");
                }

                return response.choices[0]?.message?.content || '{}';
            } catch (error: any) {
                console.warn(`[BedrockAdapter] OpenAI API FAILED or TIMED OUT:`, error.message);
                // Continue to Bedrock fallback
            }
        } else {
            console.warn("[BedrockAdapter] OPENAI_API_KEY missing. Proceeding directly to Bedrock fallback.");
        }

        // --- FALLBACK: AWS BEDROCK ---
        console.log("[BedrockAdapter] 🔄 Falling back to AWS Bedrock (Llama 3 70B)...");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const command = new ConverseCommand({
            modelId: this.modelId,
            messages: [
                {
                    role: "user",
                    content: [{ text: prompt }],
                },
            ],
            inferenceConfig: {
                maxTokens: 2048,
                temperature: 0.2,
            }
        });

        try {
            const response = await this.client.send(command, { abortSignal: controller.signal as any });
            clearTimeout(timeoutId);

            const message = response.output?.message;
            if (!message || !message.content || message.content.length === 0) {
                throw new Error("Empty response from Bedrock");
            }

            return message.content[0].text || "";
        } catch (error: any) {
            clearTimeout(timeoutId);
            const isTimeout = error.name === 'AbortError' || error.message?.includes('abort');
            console.error(`[BedrockAdapter] Bedrock fallback ${isTimeout ? 'TIMED OUT' : 'FAILED'}:`, error.message);
            throw new Error("Critical Failure: Both OpenAI and Bedrock fallback engines failed.");
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
