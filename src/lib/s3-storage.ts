/**
 * Amazon S3 Storage
 * Optional OCR prescription image storage for audit trail.
 * Gracefully fails — if S3 is unavailable, the system continues without storage.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "ap-south-1";
const BUCKET = process.env.S3_PRESCRIPTIONS_BUCKET || "clinrx-prescriptions";

const s3Client = new S3Client({
    region: REGION,
    ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        }
        : {}),
});

export const isS3Configured =
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.S3_PRESCRIPTIONS_BUCKET;

/**
 * Store an OCR prescription image in S3 for audit trail.
 * Non-blocking — returns null if S3 is unavailable.
 */
export async function storeOCRImage(
    patientId: string,
    imageBuffer: Buffer,
    format: string = "jpeg"
): Promise<string | null> {
    if (!isS3Configured) {
        console.log("[S3] Not configured, skipping image storage");
        return null;
    }

    try {
        const key = `ocr/${patientId}/${Date.now()}.${format}`;
        await s3Client.send(
            new PutObjectCommand({
                Bucket: BUCKET,
                Key: key,
                Body: imageBuffer,
                ContentType: `image/${format}`,
                Metadata: {
                    patientId,
                    uploadedAt: new Date().toISOString(),
                },
            })
        );
        console.log("[S3] ✅ Image stored:", key);
        return key;
    } catch (error) {
        console.warn("[S3] ⚠️ Storage failed, continuing without storage:", error);
        return null;
    }
}
