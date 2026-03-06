/**
 * Amazon DynamoDB Client
 * AWS-first database layer for ClinRx Copilot.
 * Uses the same AWS credentials already configured for Bedrock.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    GetCommand,
    ScanCommand,
    PutCommand,
    QueryCommand,
} from "@aws-sdk/lib-dynamodb";

// ── DynamoDB Configuration ──────────────────────────────────────────────────
const REGION = process.env.AWS_REGION || "ap-south-1";

const client = new DynamoDBClient({
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

export const dynamoDb = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
    },
});

// ── Table Names ─────────────────────────────────────────────────────────────
export const TABLES = {
    PATIENTS: process.env.DYNAMODB_PATIENTS_TABLE || "ClinRx_Patients",
} as const;

// ── Runtime Detection ───────────────────────────────────────────────────────
export const isDynamoConfigured =
    !!process.env.AWS_ACCESS_KEY_ID &&
    !!process.env.AWS_SECRET_ACCESS_KEY &&
    !!process.env.AWS_REGION;

// Re-export commands for convenience
export { GetCommand, ScanCommand, PutCommand, QueryCommand };
