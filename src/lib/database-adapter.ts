/**
 * Database Adapter — Unified Data Access Layer
 *
 * Implements cascading fallback:
 *   1. 🟢 DynamoDB (AWS requirement)
 *   2. ✅ Supabase (existing fallback)
 *   3. ✅ Mock Data (offline / dev fallback)
 *
 * If DynamoDB is not configured or fails, the system automatically falls back
 * to the current Supabase-based architecture, then to hardcoded mock data.
 */
import { dynamoDb, isDynamoConfigured, TABLES, ScanCommand, GetCommand, PutCommand } from "./dynamodb";
import { supabase, isDbConnected } from "./supabase";
import type { PatientSummary } from "@/types";

// ── Centralized Mock Patients ───────────────────────────────────────────────
// Moved from individual route files to avoid duplication.
const MOCK_PATIENTS: PatientSummary[] = [
    {
        patient_id: "PT001",
        name: "Rajesh Kumar",
        age: 62,
        sex: "M",
        chronic_conditions: ["Type 2 Diabetes", "Hypertension", "CKD Stage 3a"],
        renal_status: { egfr: 48, ckd_stage: "3a" },
        allergies: ["Penicillin", "Sulfa drugs"],
        current_meds: [
            { drug: "Metformin", dose: "500mg", frequency: "BD" },
            { drug: "Losartan", dose: "50mg", frequency: "OD" },
            { drug: "Amlodipine", dose: "5mg", frequency: "OD" },
        ],
        prior_failures: [{ drug: "Metformin", year: 2019, reason: "GI intolerance at 1000mg" }],
        key_vitals: { bp: "142/88", weight: 78 },
        risk_flags: ["renal_dose_adjust", "beta_lactam_allergy", "elderly_patient", "polypharmacy"],
    },
    {
        patient_id: "PT002",
        name: "Priya Sharma",
        age: 45,
        sex: "F",
        chronic_conditions: ["Asthma", "Hypothyroidism"],
        renal_status: { egfr: 92 },
        allergies: [],
        current_meds: [
            { drug: "Levothyroxine", dose: "75mcg", frequency: "OD" },
            { drug: "Salbutamol MDI", dose: "2 puffs", frequency: "PRN" },
        ],
        prior_failures: [],
        key_vitals: { bp: "118/76", weight: 62 },
        risk_flags: [],
    },
];

// ── Database Adapter Class ──────────────────────────────────────────────────

export class DatabaseAdapter {
    /**
     * Get all patients.
     * Priority: DynamoDB → Supabase → Mock Data
     */
    async getPatients(): Promise<PatientSummary[]> {
        // ── 1. Try DynamoDB (AWS layer) ──
        if (isDynamoConfigured) {
            try {
                const result = await dynamoDb.send(
                    new ScanCommand({ TableName: TABLES.PATIENTS })
                );
                if (result.Items && result.Items.length > 0) {
                    console.log(`[DB] ✅ Using DynamoDB (${result.Items.length} patients)`);
                    return result.Items as PatientSummary[];
                }
                console.log("[DB] DynamoDB table empty, falling back...");
            } catch (error) {
                console.warn("[DB] ⚠️ DynamoDB failed, falling back to Supabase:", (error as Error).message);
            }
        }

        // ── 2. Fallback: Supabase ──
        if (isDbConnected && supabase) {
            try {
                const { data, error } = await supabase
                    .from("patients")
                    .select("summary")
                    .order("created_at", { ascending: false });

                if (!error && data && data.length > 0) {
                    console.log(`[DB] ✅ Using Supabase fallback (${data.length} patients)`);
                    return data.map((row) => row.summary) as PatientSummary[];
                }
                console.log("[DB] Supabase table empty, falling back to mock data...");
            } catch (error) {
                console.warn("[DB] ⚠️ Supabase failed, falling back to mock data:", (error as Error).message);
            }
        }

        // ── 3. Final fallback: Mock Data ──
        console.log(`[DB] 📦 Using mock data (${MOCK_PATIENTS.length} patients)`);
        return MOCK_PATIENTS;
    }

    /**
     * Get a single patient by ID.
     * Priority: DynamoDB → Supabase → Mock Data
     */
    async getPatient(patientId: string): Promise<PatientSummary | null> {
        // ── 1. Try DynamoDB ──
        if (isDynamoConfigured) {
            try {
                const result = await dynamoDb.send(
                    new GetCommand({
                        TableName: TABLES.PATIENTS,
                        Key: { patient_id: patientId },
                    })
                );
                if (result.Item) {
                    console.log(`[DB] ✅ Patient ${patientId} found in DynamoDB`);
                    return result.Item as PatientSummary;
                }
            } catch (error) {
                console.warn("[DB] ⚠️ DynamoDB lookup failed, trying Supabase:", (error as Error).message);
            }
        }

        // ── 2. Fallback: Supabase ──
        if (isDbConnected && supabase) {
            try {
                const { data, error } = await supabase
                    .from("patients")
                    .select("summary")
                    .eq("fhir_id", patientId)
                    .single();

                if (!error && data) {
                    console.log(`[DB] ✅ Patient ${patientId} found in Supabase`);
                    return data.summary as PatientSummary;
                }
            } catch (error) {
                console.warn("[DB] ⚠️ Supabase lookup failed, checking mock data:", (error as Error).message);
            }
        }

        // ── 3. Final fallback: Mock Data ──
        const mockPatient = MOCK_PATIENTS.find((p) => p.patient_id === patientId);
        if (mockPatient) {
            console.log(`[DB] 📦 Patient ${patientId} found in mock data`);
            return mockPatient;
        }

        console.log(`[DB] ❌ Patient ${patientId} not found in any data source`);
        return null;
    }

    /**
     * Create a new patient.
     * Priority: DynamoDB → Supabase → In-Memory (return patient object)
     */
    async createPatient(patient: PatientSummary): Promise<{ success: boolean; source: string }> {
        // ── 1. Try DynamoDB ──
        if (isDynamoConfigured) {
            try {
                await dynamoDb.send(
                    new PutCommand({
                        TableName: TABLES.PATIENTS,
                        Item: {
                            ...patient,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                    })
                );
                console.log(`[DB] ✅ Patient ${patient.patient_id} created in DynamoDB`);
                return { success: true, source: "dynamodb" };
            } catch (error) {
                console.warn("[DB] ⚠️ DynamoDB write failed, trying Supabase:", (error as Error).message);
            }
        }

        // ── 2. Fallback: Supabase ──
        if (isDbConnected && supabase) {
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
                const supabaseServiceKey =
                    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

                const { createClient } = await import("@supabase/supabase-js");
                const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

                const { error } = await adminSupabase.from("patients").insert({
                    fhir_id: patient.patient_id,
                    name: patient.name,
                    age: patient.age,
                    sex: patient.sex,
                    phone: patient.phone,
                    summary: patient,
                });

                if (!error) {
                    console.log(`[DB] ✅ Patient ${patient.patient_id} created in Supabase`);
                    return { success: true, source: "supabase" };
                }
                console.warn("[DB] ⚠️ Supabase write failed:", error.message);
            } catch (error) {
                console.warn("[DB] ⚠️ Supabase write failed:", (error as Error).message);
            }
        }

        // ── 3. Final fallback: In-memory only ──
        console.log(`[DB] 📦 Patient ${patient.patient_id} created in-memory only (no persistent storage)`);
        return { success: true, source: "memory" };
    }
}

// ── Singleton Export ─────────────────────────────────────────────────────────
export const db = new DatabaseAdapter();

// Re-export mock patients for any code still needing them directly
export { MOCK_PATIENTS };
