/**
 * OpenFDA Client - Data Ingestion Layer
 * Free API for drug labels, interactions, and adverse events
 * Rate limit: 120,000 requests/day with API key, 1,000 without
 */

import type { OpenFDADrugLabel, OpenFDASearchResult } from '@/types/agents';

const OPENFDA_BASE_URL = 'https://api.fda.gov/drug';
const API_KEY = process.env.OPENFDA_API_KEY;

// Simple in-memory cache (replace with Redis in production)
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

class OpenFDAClient {
    private async fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<T | null> {
        // Check cache
        const cached = cache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) {
            return cached.data as T;
        }

        try {
            let url = `${OPENFDA_BASE_URL}${endpoint}`;
            if (API_KEY) {
                url += `${url.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
            }

            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' },
            });

            if (!response.ok) {
                if (response.status === 404) return null;
                console.error(`OpenFDA error: ${response.status}`);
                return null;
            }

            const data = await response.json() as T;

            // Cache the result
            cache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL_MS });

            return data;
        } catch (error) {
            console.error('OpenFDA fetch error:', error);
            return null;
        }
    }

    /**
     * Search drug labels by generic name
     */
    async searchByGenericName(genericName: string, limit = 5): Promise<OpenFDADrugLabel[]> {
        const encoded = encodeURIComponent(genericName.toLowerCase());
        const result = await this.fetchWithCache<OpenFDASearchResult>(
            `/label.json?search=openfda.generic_name:"${encoded}"&limit=${limit}`,
            `generic:${genericName}`
        );
        return result?.results || [];
    }

    /**
     * Search drug labels by brand name
     */
    async searchByBrandName(brandName: string, limit = 5): Promise<OpenFDADrugLabel[]> {
        const encoded = encodeURIComponent(brandName.toLowerCase());
        const result = await this.fetchWithCache<OpenFDASearchResult>(
            `/label.json?search=openfda.brand_name:"${encoded}"&limit=${limit}`,
            `brand:${brandName}`
        );
        return result?.results || [];
    }

    /**
     * Get drug interactions from label
     */
    async getDrugInteractions(drugName: string): Promise<string[]> {
        const labels = await this.searchByGenericName(drugName, 1);
        if (labels.length === 0) {
            const brandLabels = await this.searchByBrandName(drugName, 1);
            if (brandLabels.length === 0) return [];
            return brandLabels[0]?.drug_interactions || [];
        }
        return labels[0]?.drug_interactions || [];
    }

    /**
     * Get contraindications from label
     */
    async getContraindications(drugName: string): Promise<string[]> {
        const labels = await this.searchByGenericName(drugName, 1);
        if (labels.length === 0) return [];
        return labels[0]?.contraindications || [];
    }

    /**
     * Get warnings from label
     */
    async getWarnings(drugName: string): Promise<string[]> {
        const labels = await this.searchByGenericName(drugName, 1);
        if (labels.length === 0) return [];
        return labels[0]?.warnings || [];
    }

    /**
     * Get pregnancy information
     */
    async getPregnancyInfo(drugName: string): Promise<string[]> {
        const labels = await this.searchByGenericName(drugName, 1);
        if (labels.length === 0) return [];
        return labels[0]?.pregnancy || [];
    }

    /**
     * Check if two drugs have known interactions
     * Returns interaction text if found, null otherwise
     */
    async checkInteraction(drug1: string, drug2: string): Promise<string | null> {
        const interactions = await this.getDrugInteractions(drug1);

        for (const interaction of interactions) {
            const interactionLower = interaction.toLowerCase();
            if (interactionLower.includes(drug2.toLowerCase())) {
                return interaction;
            }
        }

        // Check reverse
        const interactions2 = await this.getDrugInteractions(drug2);
        for (const interaction of interactions2) {
            const interactionLower = interaction.toLowerCase();
            if (interactionLower.includes(drug1.toLowerCase())) {
                return interaction;
            }
        }

        return null;
    }

    /**
     * Get complete drug information
     */
    async getDrugInfo(drugName: string): Promise<{
        label: OpenFDADrugLabel | null;
        interactions: string[];
        contraindications: string[];
        warnings: string[];
    }> {
        const labels = await this.searchByGenericName(drugName, 1);
        const label = labels[0] || null;

        return {
            label,
            interactions: label?.drug_interactions || [],
            contraindications: label?.contraindications || [],
            warnings: label?.warnings || [],
        };
    }
}

// Singleton
export const openFDAClient = new OpenFDAClient();

export { OpenFDAClient };
