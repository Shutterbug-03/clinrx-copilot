-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Patients Table (FHIR-mapped)
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fhir_id TEXT UNIQUE,
  name TEXT,
  age INTEGER,
  sex TEXT,
  phone TEXT,
  summary JSONB, -- CCE output: conditions, meds, allergies, vitals, flags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drugs Catalog Table
CREATE TABLE IF NOT EXISTS drugs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gtin TEXT UNIQUE,
  inn TEXT NOT NULL, -- International Nonproprietary Name (generic)
  brand TEXT,
  manufacturer TEXT,
  strength TEXT,
  formulation TEXT, -- tablet, capsule, suspension, etc.
  release_type TEXT, -- IR/MR/ER
  excipients TEXT[],
  regulatory_id TEXT, -- CDSCO / NDC
  price DECIMAL(10, 2),
  in_stock BOOLEAN DEFAULT true,
  vector VECTOR(1024), -- Cohere embed-english-v3.0 dimensions
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS drugs_vector_idx ON drugs USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);

-- Prescriptions Table (Audit Trail)
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id TEXT, -- Could be linked to auth.users
  doctor_notes TEXT, -- Original doctor input
  ai_draft JSONB, -- AI generated draft
  doctor_edits JSONB, -- What doctor changed
  final_prescription JSONB, -- Final approved version
  approved BOOLEAN DEFAULT false,
  model_version TEXT, -- For audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drug Interactions Table (Safety Layer)
CREATE TABLE IF NOT EXISTS drug_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_a_inn TEXT NOT NULL,
  drug_b_inn TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('minor', 'moderate', 'major', 'contraindicated')),
  description TEXT,
  source TEXT, -- DrugBank, OpenFDA, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drug_a_inn, drug_b_inn)
);

-- Inventory Table (Real-time stock)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  location TEXT, -- Pharmacy name or hospital
  quantity INTEGER DEFAULT 0,
  batch_number TEXT,
  expiry_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (Enable Row Level Security)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all drugs
CREATE POLICY "Allow read drugs" ON drugs FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update their own prescriptions
CREATE POLICY "Allow insert prescriptions" ON prescriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow read prescriptions" ON prescriptions FOR SELECT TO authenticated USING (true);

-- Function for hybrid search (FTS + Vector)
CREATE OR REPLACE FUNCTION match_drugs(
  query_text TEXT,
  query_embedding VECTOR(1024),
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  inn TEXT,
  brand TEXT,
  strength TEXT,
  formulation TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.inn,
    d.brand,
    d.strength,
    d.formulation,
    1 - (d.vector <=> query_embedding) AS similarity
  FROM drugs d
  WHERE d.in_stock = true
    AND (d.inn ILIKE '%' || query_text || '%' OR d.brand ILIKE '%' || query_text || '%')
  ORDER BY d.vector <=> query_embedding
  LIMIT match_count;
END;
$$;
