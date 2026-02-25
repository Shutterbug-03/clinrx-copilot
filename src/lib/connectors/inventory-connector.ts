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

import { supabase, isDbConnected } from '@/lib/supabase';

// ============================================================
// SUPABASE PHARMACY ADAPTER (Real DB)
// ============================================================

class SupabaseInventoryAdapter implements InventoryAdapter {
    name = 'hospital_pharmacy';

    async searchDrug(query: string): Promise<InventoryItem[]> {
        if (!isDbConnected || !supabase) {
            console.warn('[SupabaseInventoryAdapter] DB not connected, returning empty list');
            return [];
        }

        const q = `%${query.toLowerCase()}%`;

        // We use inner join on inventory to get quantity
        // The foreign key from inventory is drug_id -> drugs.id
        const { data, error } = await supabase
            .from('drugs')
            .select(`
                id,
                inn,
                brand,
                strength,
                formulation,
                price,
                inventory!inner (
                    location,
                    quantity
                )
            `)
            .or(`inn.ilike.${q},brand.ilike.${q}`);

        if (error) {
            console.error('[SupabaseInventoryAdapter] Error searching drugs:', error);
            return [];
        }

        return data.map((item: any) => ({
            drug_id: item.id,
            brand: item.brand,
            generic: item.inn,
            strength: item.strength,
            formulation: item.formulation,
            // Assuming first inventory location matches
            quantity_available: item.inventory?.[0]?.quantity || 0,
            price: item.price,
            location: item.inventory?.[0]?.location || 'Main Pharmacy',
            source: 'hospital' as const,
            last_updated: new Date().toISOString()
        }));
    }

    async checkAvailability(drugId: string): Promise<InventoryItem | null> {
        if (!isDbConnected || !supabase) return null;

        const { data, error } = await supabase
            .from('drugs')
            .select(`
                id,
                inn,
                brand,
                strength,
                formulation,
                price,
                inventory!inner (
                    location,
                    quantity
                )
            `)
            .eq('id', drugId)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            drug_id: data.id,
            brand: data.brand,
            generic: data.inn,
            strength: data.strength,
            formulation: data.formulation,
            quantity_available: data.inventory?.[0]?.quantity || 0,
            price: data.price,
            location: data.inventory?.[0]?.location || 'Main Pharmacy',
            source: 'hospital' as const,
            last_updated: new Date().toISOString()
        };
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
        this.adapters.push(new SupabaseInventoryAdapter());
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
            if (a.source === 'hospital' && b.source !== 'hospital') return -1;
            if (a.source !== 'hospital' && b.source === 'hospital') return 1;
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

export { InventoryConnector, SupabaseInventoryAdapter, ExternalPharmacyAdapter };
