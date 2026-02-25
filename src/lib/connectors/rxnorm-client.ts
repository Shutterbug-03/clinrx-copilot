/**
 * RxNorm Client - Drug Normalization & Equivalents
 * FREE API from NLM/NIH
 * Documentation: https://rxnav.nlm.nih.gov/RxNormAPIs.html
 */

export interface RxNormConcept {
    rxcui: string;
    name: string;
    tty: string;
}

class RxNormClient {
    private baseUrl = process.env.RXNORM_API_URL || 'https://rxnav.nlm.nih.gov/REST';

    /**
     * Get RxCUI (ID) for a drug name
     */
    async getRxCUI(drugName: string): Promise<string | null> {
        try {
            const url = `${this.baseUrl}/rxcui.json?name=${encodeURIComponent(drugName)}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.idGroup?.rxnormId?.[0] || null;
        } catch (error) {
            console.error('[RxNorm] Search error:', error);
            return null;
        }
    }

    /**
     * Get generic equivalents (INNs) for a brand name
     */
    async getGenerics(brandName: string): Promise<RxNormConcept[]> {
        const rxcui = await this.getRxCUI(brandName);
        if (!rxcui) return [];

        try {
            const url = `${this.baseUrl}/rxclass/class/byRxcui.json?rxcui=${rxcui}&relaSource=NDFRT`;
            const response = await fetch(url);
            const data = await response.json();
            // This is complex, simplified for now
            return [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Get all related drug concepts (Ingredients, Brands, etc)
     */
    async getAllRelatedInfo(drugName: string): Promise<any> {
        const rxcui = await this.getRxCUI(drugName);
        if (!rxcui) return null;

        try {
            const url = `${this.baseUrl}/rxcui/${rxcui}/allrelated.json`;
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            return null;
        }
    }
}

export const rxNormClient = new RxNormClient();
