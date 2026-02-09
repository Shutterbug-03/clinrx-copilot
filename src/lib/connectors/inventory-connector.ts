/**
 * Inventory Connector - Data Ingestion Layer
 * Adapter pattern for multiple inventory sources
 */

import type { InventoryItem } from '@/types/agents';

// ============================================================
// ADAPTER INTERFACE
// ============================================================

interface InventoryAdapter {
    name: string;
    searchDrug(query: string): Promise<InventoryItem[]>;
    checkAvailability(drugId: string): Promise<InventoryItem | null>;
}

// ============================================================
// LOCAL PHARMACY ADAPTER (Mock for MVP)
// ============================================================

class LocalPharmacyAdapter implements InventoryAdapter {
    name = 'local_pharmacy';

    private mockInventory: InventoryItem[] = [
        {
            drug_id: 'amox-500',
            brand: 'Mox-500',
            generic: 'Amoxicillin',
            strength: '500mg',
            formulation: 'capsule',
            quantity_available: 100,
            price: 85,
            location: 'Hospital Pharmacy',
            source: 'local_pharmacy',
            last_updated: new Date().toISOString(),
        },
        {
            drug_id: 'cefuroxime-500',
            brand: 'Ceftum',
            generic: 'Cefuroxime',
            strength: '500mg',
            formulation: 'tablet',
            quantity_available: 50,
            price: 180,
            location: 'Hospital Pharmacy',
            source: 'local_pharmacy',
            last_updated: new Date().toISOString(),
        },
        {
            drug_id: 'cefuroxime-250',
            brand: 'Zinnat',
            generic: 'Cefuroxime',
            strength: '250mg',
            formulation: 'tablet',
            quantity_available: 75,
            price: 120,
            location: 'Hospital Pharmacy',
            source: 'local_pharmacy',
            last_updated: new Date().toISOString(),
        },
        {
            drug_id: 'azithro-500',
            brand: 'Azithral',
            generic: 'Azithromycin',
            strength: '500mg',
            formulation: 'tablet',
            quantity_available: 0, // Out of stock
            price: 95,
            location: 'Hospital Pharmacy',
            source: 'local_pharmacy',
            last_updated: new Date().toISOString(),
        },
        {
            drug_id: 'metformin-500',
            brand: 'Glycomet',
            generic: 'Metformin',
            strength: '500mg',
            formulation: 'tablet',
            quantity_available: 200,
            price: 45,
            location: 'Hospital Pharmacy',
            source: 'local_pharmacy',
            last_updated: new Date().toISOString(),
        },
        {
            drug_id: 'paracetamol-650',
            brand: 'Dolo-650',
            generic: 'Paracetamol',
            strength: '650mg',
            formulation: 'tablet',
            quantity_available: 500,
            price: 32,
            location: 'Hospital Pharmacy',
            source: 'local_pharmacy',
            last_updated: new Date().toISOString(),
        },
        {
            drug_id: 'levoflox-500',
            brand: 'Levomac',
            generic: 'Levofloxacin',
            strength: '500mg',
            formulation: 'tablet',
            quantity_available: 60,
            price: 120,
            location: 'Hospital Pharmacy',
            source: 'local_pharmacy',
            last_updated: new Date().toISOString(),
        },
        {
            drug_id: 'ciproflox-500',
            brand: 'Ciplox',
            generic: 'Ciprofloxacin',
            strength: '500mg',
            formulation: 'tablet',
            quantity_available: 80,
            price: 90,
            location: 'Hospital Pharmacy',
            source: 'local_pharmacy',
            last_updated: new Date().toISOString(),
        },
    ];

    async searchDrug(query: string): Promise<InventoryItem[]> {
        const q = query.toLowerCase();
        return this.mockInventory.filter(
            item =>
                item.generic.toLowerCase().includes(q) ||
                item.brand.toLowerCase().includes(q)
        );
    }

    async checkAvailability(drugId: string): Promise<InventoryItem | null> {
        return this.mockInventory.find(item => item.drug_id === drugId) || null;
    }
}

// ============================================================
// EXTERNAL API ADAPTER (1mg-style mock for India)
// ============================================================

class ExternalPharmacyAdapter implements InventoryAdapter {
    name = 'external_api';

    async searchDrug(query: string): Promise<InventoryItem[]> {
        // In production, this would call 1mg or PharmEasy API
        // For now, return mock data for nearby pharmacies

        const q = query.toLowerCase();

        if (q.includes('azithro')) {
            // Return availability from external sources when local is out
            return [
                {
                    drug_id: 'ext-azithro-500',
                    brand: 'Azee',
                    generic: 'Azithromycin',
                    strength: '500mg',
                    formulation: 'tablet',
                    quantity_available: 30,
                    price: 110,
                    location: 'MedPlus - 0.5km',
                    source: 'external_api',
                    last_updated: new Date().toISOString(),
                },
                {
                    drug_id: 'ext-azithro-500-2',
                    brand: 'Zithromax',
                    generic: 'Azithromycin',
                    strength: '500mg',
                    formulation: 'tablet',
                    quantity_available: 20,
                    price: 150,
                    location: 'Apollo Pharmacy - 1.2km',
                    source: 'external_api',
                    last_updated: new Date().toISOString(),
                },
            ];
        }

        return [];
    }

    async checkAvailability(drugId: string): Promise<InventoryItem | null> {
        // Would check external API
        return null;
    }
}

// ============================================================
// INVENTORY CONNECTOR (COMPOSITE)
// ============================================================

class InventoryConnector {
    private adapters: InventoryAdapter[] = [];

    constructor() {
        // Register adapters in priority order
        this.adapters.push(new LocalPharmacyAdapter());
        this.adapters.push(new ExternalPharmacyAdapter());
    }

    /**
     * Search all inventory sources for a drug
     */
    async searchAllSources(query: string): Promise<{
        local: InventoryItem[];
        external: InventoryItem[];
        all: InventoryItem[];
    }> {
        const results = await Promise.all(
            this.adapters.map(adapter => adapter.searchDrug(query))
        );

        const local = results[0] || [];
        const external = results.slice(1).flat();

        return {
            local,
            external,
            all: [...local, ...external],
        };
    }

    /**
     * Check if a specific drug is available
     */
    async isAvailable(genericName: string, strength?: string): Promise<{
        available: boolean;
        items: InventoryItem[];
        alternatives: InventoryItem[];
    }> {
        const { all } = await this.searchAllSources(genericName);

        let items = all.filter(i => i.quantity_available > 0);

        if (strength) {
            const strengthFiltered = items.filter(i =>
                i.strength.toLowerCase() === strength.toLowerCase()
            );
            if (strengthFiltered.length > 0) {
                items = strengthFiltered;
            }
        }

        const available = items.length > 0;

        // Find alternatives if not available
        let alternatives: InventoryItem[] = [];
        if (!available) {
            // Look for same drug class or different strength
            const allAvailable = all.filter(i => i.quantity_available > 0);
            alternatives = allAvailable;
        }

        return { available, items, alternatives };
    }

    /**
     * Get nearest pharmacy with stock
     */
    async findNearestWithStock(genericName: string): Promise<{
        item: InventoryItem | null;
        location: string;
    }> {
        const { all } = await this.searchAllSources(genericName);
        const available = all.filter(i => i.quantity_available > 0);

        if (available.length === 0) {
            return { item: null, location: 'Not available' };
        }

        // Sort by source priority (local first) then by location
        available.sort((a, b) => {
            if (a.source === 'local_pharmacy' && b.source !== 'local_pharmacy') return -1;
            if (a.source !== 'local_pharmacy' && b.source === 'local_pharmacy') return 1;
            return 0;
        });

        return {
            item: available[0],
            location: available[0].location,
        };
    }
}

// Singleton
export const inventoryConnector = new InventoryConnector();

export { InventoryConnector, LocalPharmacyAdapter, ExternalPharmacyAdapter };
