/**
 * Inventory Agent - Layer 4
 * Grounds clinical recommendations in real-world availability
 */

import { inventoryConnector } from '@/lib/connectors/inventory-connector';
import type {
    CandidateTherapy,
    InventoryResult,
    InventoryItem
} from '@/types/agents';

// ============================================================
// MAIN INVENTORY CHECK
// ============================================================

export async function checkInventory(
    candidates: CandidateTherapy[]
): Promise<InventoryResult> {
    console.log(`[Layer 4] Checking inventory for ${candidates.length} candidates`);

    const available: InventoryItem[] = [];
    const unavailable: string[] = [];
    const nearestSources: { drug: string; location: string; distance_km?: number }[] = [];

    for (const candidate of candidates) {
        const drugName = candidate.generic_name || candidate.preferred_drug;
        const strength = candidate.dose.match(/\d+mg|\d+mcg|\d+g/)?.[0];

        const result = await inventoryConnector.isAvailable(drugName, strength);

        if (result.available) {
            available.push(...result.items);
        } else {
            unavailable.push(drugName);

            // Find nearest source
            const nearest = await inventoryConnector.findNearestWithStock(drugName);
            if (nearest.item) {
                nearestSources.push({
                    drug: drugName,
                    location: nearest.location,
                });
            }

            // Also add alternatives to available
            available.push(...result.alternatives);
        }
    }

    return {
        available,
        unavailable,
        nearest_sources: nearestSources,
        checked_at: new Date().toISOString(),
    };
}

// ============================================================
// AVAILABILITY-AWARE RANKING
// ============================================================

export async function rankByAvailability(
    candidates: CandidateTherapy[]
): Promise<CandidateTherapy[]> {
    const inventoryResult = await checkInventory(candidates);
    const availableNames = new Set(
        inventoryResult.available.map(i => i.generic.toLowerCase())
    );

    // Sort by: available first, then by original confidence
    return [...candidates].sort((a, b) => {
        const aAvailable = availableNames.has(a.generic_name.toLowerCase());
        const bAvailable = availableNames.has(b.generic_name.toLowerCase());

        if (aAvailable && !bAvailable) return -1;
        if (!aAvailable && bAvailable) return 1;
        return b.confidence - a.confidence;
    });
}

// ============================================================
// SEARCH FOR SPECIFIC DRUG
// ============================================================

export async function searchDrugInventory(
    drugName: string,
    strength?: string
): Promise<{
    found: boolean;
    items: InventoryItem[];
    alternatives: InventoryItem[];
}> {
    const result = await inventoryConnector.isAvailable(drugName, strength);
    return {
        found: result.available,
        items: result.items,
        alternatives: result.alternatives,
    };
}
