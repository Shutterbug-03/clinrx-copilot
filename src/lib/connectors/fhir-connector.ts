/**
 * FHIR Connector - Data Ingestion Layer
 * Connects to HAPI FHIR public server or any FHIR R4 endpoint
 */

import type { Patient, Condition, MedicationStatement, AllergyIntolerance, Observation } from 'fhir/r4';
import type { RawPatientData, FHIRBundle } from '@/types/agents';

// Default to HAPI FHIR public test server
const FHIR_BASE_URL = process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4';

interface FHIRConnectorConfig {
    baseUrl: string;
    authToken?: string;
    timeout?: number;
}

class FHIRConnector {
    private baseUrl: string;
    private authToken?: string;
    private timeout: number;

    constructor(config?: Partial<FHIRConnectorConfig>) {
        this.baseUrl = config?.baseUrl || FHIR_BASE_URL;
        this.authToken = config?.authToken;
        this.timeout = config?.timeout || 10000;
    }

    private async fetchResource<T>(endpoint: string): Promise<T | null> {
        try {
            const headers: Record<string, string> = {
                'Accept': 'application/fhir+json',
                'Content-Type': 'application/fhir+json',
            };

            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`FHIR fetch failed: ${response.status} ${response.statusText}`);
                return null;
            }

            return await response.json() as T;
        } catch (error) {
            console.error('FHIR connector error:', error);
            return null;
        }
    }

    /**
     * Fetch a single patient by ID
     */
    async getPatient(patientId: string): Promise<Patient | null> {
        return this.fetchResource<Patient>(`/Patient/${patientId}`);
    }

    /**
     * Fetch all conditions for a patient
     */
    async getConditions(patientId: string): Promise<Condition[]> {
        const bundle = await this.fetchResource<FHIRBundle<Condition>>(
            `/Condition?patient=${patientId}&_count=100`
        );
        return bundle?.entry?.map(e => e.resource) || [];
    }

    /**
     * Fetch medication statements for a patient
     */
    async getMedications(patientId: string): Promise<MedicationStatement[]> {
        const bundle = await this.fetchResource<FHIRBundle<MedicationStatement>>(
            `/MedicationStatement?patient=${patientId}&_count=100`
        );
        return bundle?.entry?.map(e => e.resource) || [];
    }

    /**
     * Fetch allergies for a patient
     */
    async getAllergies(patientId: string): Promise<AllergyIntolerance[]> {
        const bundle = await this.fetchResource<FHIRBundle<AllergyIntolerance>>(
            `/AllergyIntolerance?patient=${patientId}&_count=100`
        );
        return bundle?.entry?.map(e => e.resource) || [];
    }

    /**
     * Fetch observations (labs, vitals) for a patient
     */
    async getObservations(patientId: string, category?: string): Promise<Observation[]> {
        let endpoint = `/Observation?patient=${patientId}&_count=100&_sort=-date`;
        if (category) {
            endpoint += `&category=${category}`;
        }
        const bundle = await this.fetchResource<FHIRBundle<Observation>>(endpoint);
        return bundle?.entry?.map(e => e.resource) || [];
    }

    /**
     * Fetch complete patient data bundle (all resources)
     * This is the primary method for the context compression agent
     */
    async getPatientBundle(patientId: string): Promise<RawPatientData> {
        console.log(`[FHIR] Fetching complete data for patient: ${patientId}`);

        const [patient, conditions, medications, allergies, observations] = await Promise.all([
            this.getPatient(patientId),
            this.getConditions(patientId),
            this.getMedications(patientId),
            this.getAllergies(patientId),
            this.getObservations(patientId),
        ]);

        return {
            patient,
            conditions,
            medications,
            allergies,
            observations,
            fetchedAt: new Date().toISOString(),
        };
    }

    /**
     * Search patients by name (for UI)
     */
    async searchPatients(query: string, limit = 10): Promise<Patient[]> {
        const bundle = await this.fetchResource<FHIRBundle<Patient>>(
            `/Patient?name=${encodeURIComponent(query)}&_count=${limit}`
        );
        return bundle?.entry?.map(e => e.resource) || [];
    }
}

// Singleton instance
export const fhirConnector = new FHIRConnector();

// Factory for custom configurations
export function createFHIRConnector(config: Partial<FHIRConnectorConfig>): FHIRConnector {
    return new FHIRConnector(config);
}

export { FHIRConnector };
