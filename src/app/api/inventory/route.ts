import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Drug } from '@/types';

// Request validation
const InventorySearchSchema = z.object({
    query: z.string().min(1),
    location: z.string().optional(),
});

// Mock inventory data for MVP
const MOCK_DRUGS: Drug[] = [
    {
        id: '1',
        gtin: '8901234567890',
        inn: 'Amoxicillin',
        brand: 'Mox-500',
        manufacturer: 'Cipla',
        strength: '500mg',
        formulation: 'capsule',
        release_type: 'IR',
        price: 85,
        in_stock: true,
    },
    {
        id: '2',
        inn: 'Amoxicillin-Clavulanate',
        brand: 'Augmentin',
        manufacturer: 'GSK',
        strength: '625mg',
        formulation: 'tablet',
        release_type: 'IR',
        price: 245,
        in_stock: true,
    },
    {
        id: '3',
        inn: 'Cefuroxime',
        brand: 'Ceftum',
        manufacturer: 'GSK',
        strength: '500mg',
        formulation: 'tablet',
        release_type: 'IR',
        price: 180,
        in_stock: true,
    },
    {
        id: '4',
        inn: 'Cefuroxime',
        brand: 'Zinnat',
        manufacturer: 'Alkem',
        strength: '250mg',
        formulation: 'tablet',
        release_type: 'IR',
        price: 120,
        in_stock: true,
    },
    {
        id: '5',
        inn: 'Azithromycin',
        brand: 'Azithral',
        manufacturer: 'Alembic',
        strength: '500mg',
        formulation: 'tablet',
        release_type: 'IR',
        price: 95,
        in_stock: false, // Out of stock for demo
    },
    {
        id: '6',
        inn: 'Metformin',
        brand: 'Glycomet',
        manufacturer: 'USV',
        strength: '500mg',
        formulation: 'tablet',
        release_type: 'IR',
        price: 45,
        in_stock: true,
    },
    {
        id: '7',
        inn: 'Metformin',
        brand: 'Glycomet SR',
        manufacturer: 'USV',
        strength: '500mg',
        formulation: 'tablet',
        release_type: 'MR',
        price: 65,
        in_stock: true,
    },
    {
        id: '8',
        inn: 'Paracetamol',
        brand: 'Dolo-650',
        manufacturer: 'Micro Labs',
        strength: '650mg',
        formulation: 'tablet',
        release_type: 'IR',
        price: 32,
        in_stock: true,
    },
    {
        id: '9',
        inn: 'Nitrofurantoin',
        brand: 'Furadantin',
        manufacturer: 'Sun Pharma',
        strength: '100mg',
        formulation: 'capsule',
        release_type: 'IR',
        price: 110,
        in_stock: true,
    },
    {
        id: '10',
        inn: 'Amlodipine',
        brand: 'Amlong',
        manufacturer: 'Micro Labs',
        strength: '5mg',
        formulation: 'tablet',
        release_type: 'IR',
        price: 28,
        in_stock: true,
    },
];

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const inStockOnly = searchParams.get('in_stock') === 'true';

    let results = MOCK_DRUGS.filter(drug =>
        drug.inn.toLowerCase().includes(query.toLowerCase()) ||
        drug.brand?.toLowerCase().includes(query.toLowerCase())
    );

    if (inStockOnly) {
        results = results.filter(d => d.in_stock);
    }

    return NextResponse.json({
        drugs: results,
        total: results.length,
        query,
    });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = InventorySearchSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid request' },
                { status: 400 }
            );
        }

        const { query } = parsed.data;

        // Search by INN (generic name) - primary
        const byInn = MOCK_DRUGS.filter(d =>
            d.inn.toLowerCase().includes(query.toLowerCase())
        );

        // Search by brand - secondary
        const byBrand = MOCK_DRUGS.filter(d =>
            d.brand?.toLowerCase().includes(query.toLowerCase()) &&
            !byInn.includes(d)
        );

        const results = [...byInn, ...byBrand];

        // Find alternatives if primary is out of stock
        const inStock = results.filter(d => d.in_stock);
        const outOfStock = results.filter(d => !d.in_stock);

        return NextResponse.json({
            available: inStock,
            unavailable: outOfStock,
            alternatives: inStock.length === 0
                ? MOCK_DRUGS.filter(d => d.in_stock).slice(0, 3)
                : [],
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Search failed' },
            { status: 500 }
        );
    }
}
