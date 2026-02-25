-- Seed data for ClinRx Copilot
-- Insert Mock Patients
INSERT INTO patients (fhir_id, name, age, sex, summary) 
VALUES 
(
  'PT001', 
  'Rajesh Kumar', 
  62, 
  'M', 
  '{
    "patient_id": "PT001",
    "name": "Rajesh Kumar",
    "age": 62,
    "sex": "M",
    "chronic_conditions": ["Type 2 Diabetes", "Hypertension", "CKD Stage 3a"],
    "renal_status": { "egfr": 48, "ckd_stage": "3a" },
    "allergies": ["Penicillin", "Sulfa drugs"],
    "current_meds": [
      { "drug": "Metformin", "dose": "500mg", "frequency": "BD" },
      { "drug": "Losartan", "dose": "50mg", "frequency": "OD" },
      { "drug": "Amlodipine", "dose": "5mg", "frequency": "OD" }
    ],
    "prior_failures": [{ "drug": "Metformin", "year": 2019, "reason": "GI intolerance at 1000mg" }],
    "key_vitals": { "bp": "142/88", "weight": 78 },
    "risk_flags": ["renal_dose_adjust", "beta_lactam_allergy", "elderly_patient", "polypharmacy"]
  }'::jsonb
),
(
  'PT002', 
  'Priya Sharma', 
  45, 
  'F', 
  '{
    "patient_id": "PT002",
    "name": "Priya Sharma",
    "age": 45,
    "sex": "F",
    "chronic_conditions": ["Asthma", "Hypothyroidism"],
    "renal_status": { "egfr": 92 },
    "allergies": [],
    "current_meds": [
      { "drug": "Levothyroxine", "dose": "75mcg", "frequency": "OD" },
      { "drug": "Salbutamol MDI", "dose": "2 puffs", "frequency": "PRN" }
    ],
    "prior_failures": [],
    "key_vitals": { "bp": "118/76", "weight": 62 },
    "risk_flags": []
  }'::jsonb
)
ON CONFLICT (fhir_id) DO NOTHING;

-- Insert Mock Drugs (Using uuids so we can reference them in inventory)
DO $$
DECLARE
    amox_id UUID := uuid_generate_v4();
    cef_500_id UUID := uuid_generate_v4();
    cef_250_id UUID := uuid_generate_v4();
    azi_id UUID := uuid_generate_v4();
    met_id UUID := uuid_generate_v4();
    pcm_id UUID := uuid_generate_v4();
    levo_id UUID := uuid_generate_v4();
    cipro_id UUID := uuid_generate_v4();
BEGIN
    INSERT INTO drugs (id, inn, brand, strength, formulation, price, in_stock) VALUES
    (amox_id, 'Amoxicillin', 'Mox-500', '500mg', 'capsule', 85, true),
    (cef_500_id, 'Cefuroxime', 'Ceftum', '500mg', 'tablet', 180, true),
    (cef_250_id, 'Cefuroxime', 'Zinnat', '250mg', 'tablet', 120, true),
    (azi_id, 'Azithromycin', 'Azithral', '500mg', 'tablet', 95, false),
    (met_id, 'Metformin', 'Glycomet', '500mg', 'tablet', 45, true),
    (pcm_id, 'Paracetamol', 'Dolo-650', '650mg', 'tablet', 32, true),
    (levo_id, 'Levofloxacin', 'Levomac', '500mg', 'tablet', 120, true),
    (cipro_id, 'Ciprofloxacin', 'Ciplox', '500mg', 'tablet', 90, true);

    -- Insert Inventory for those drugs
    INSERT INTO inventory (drug_id, location, quantity) VALUES
    (amox_id, 'Hospital Pharmacy', 100),
    (cef_500_id, 'Hospital Pharmacy', 50),
    (cef_250_id, 'Hospital Pharmacy', 75),
    (azi_id, 'Hospital Pharmacy', 0),
    (met_id, 'Hospital Pharmacy', 200),
    (pcm_id, 'Hospital Pharmacy', 500),
    (levo_id, 'Hospital Pharmacy', 60),
    (cipro_id, 'Hospital Pharmacy', 80);
END $$;
