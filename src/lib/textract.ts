import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";

const textractClient = new TextractClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    try {
        const command = new DetectDocumentTextCommand({
            Document: {
                Bytes: imageBuffer
            }
        });
        
        const response = await textractClient.send(command);
        
        // Extract the actual text from the blocks
        let extractedText = '';
        if (response.Blocks) {
            for (const block of response.Blocks) {
                if (block.BlockType === 'LINE' && block.Text) {
                    extractedText += block.Text + '\n';
                }
            }
        }
        
        return extractedText.trim();
    } catch (error) {
        console.error("Textract Error:", error);
        throw new Error("Failed to extract text using Amazon Textract");
    }
}
