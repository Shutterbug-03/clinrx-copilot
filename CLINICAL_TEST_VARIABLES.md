# Clinical Note Variations for MVP Testing

This document contains a set of carefully crafted "Doctor's Notes" designed to aggressively test your Multi-Agent AI System. **These scenarios are specifically engineered to request rare, expensive, or niche medications that will trigger an "Out of Stock" event**, forcing the Layer 5 Substitution Agent to engage and find smart equivalents.

---

## Test Scenario 1: The "Rare Antibiotic" Substitution
**Objective:** Force the AI to prescribe a highly specific, restricted-use antibiotic that the standard clinic inventory does not carry, testing if L5 can downgrade to a safe, available alternative.

**Patient Profile:** 35-year-old Male, Raj Patel.
**Reported Allergy:** Penicillin.
**Doctor's Note (Input):**
> "Patient arrived with a severe, purulent skin and soft tissue infection on the right thigh. Has a history of MRSA colonization. Standard antibiotics won't work. I want to start him immediately on oral Linezolid 600mg BID (Zyvox brand preferred) for 10 days to hit the MRSA hard. Add a strong painkiller as well."

**Expected Agent Behavior:**
- **Inferred Diagnosis:** MRSA Skin/Soft Tissue Infection.
- **Out of Stock Trigger:** `Linezolid` or `Zyvox` is highly unlikely to be in the local Supabase/DynamoDB clinic inventory.
- **Substitution (L5):** The Substitution Agent must catch the out-of-stock status and use AI reasoning to suggest a widely available oral anti-MRSA alternative (e.g., Clindamycin, Doxycycline, or Sulfamethoxazole/Trimethoprim) that *is* in stock.
- **Allergy Check:** Ensures the alternative does not contain Penicillin.

---

## Test Scenario 2: The "Expensive Diabetes Brand" Fallback
**Objective:** Test the substitution agent's ability to map a highly expensive, new-generation branded drug to a standard, therapeutically equivalent class that the pharmacy actually holds.

**Patient Profile:** 55-year-old Female, Sunita Sharma.
**Current Medications:** Metformin 500mg.
**Doctor's Note (Input):**
> "Type 2 diabetic here for follow up, poorly controlled on just Metformin. HbA1c is 8.8%. She wants to try that new weight-loss diabetic pill she saw on TV. Let's start her on Rybelsus (oral Semaglutide) 3mg once daily for 30 days. Need to get her sugars down while helping her drop weight."

**Expected Agent Behavior:**
- **Out of Stock Trigger:** `Rybelsus` (Semaglutide) is a premium specialty drug, likely missing from standard inventory.
- **Substitution (L5):** The system should recognize `Rybelsus` as a GLP-1 receptor agonist and either:
  a) Suggest a different anti-diabetic that promotes weight loss and is in stock (like an SGLT2 inhibitor e.g., Dapagliflozin/Forxiga).
  b) Suggest a standard DPP-4 inhibitor (Sitagliptin/Januvia) if SGLT2s are also out.
- **Continuation:** Must automatically keep her current `Metformin 500mg` on the prescription as a continuation drug.

---

## Test Scenario 3: The "Discontinued / Banned Combo" Test
**Objective:** Test the safety agent combined with the substitution agent when a doctor prescribes a combination drug that is either banned, outdated, or fundamentally unavailable.

**Patient Profile:** 28-year-old Female, Priya Singh.
**Doctor's Note (Input):**
> "Patient suffering from severe dry cough and cold for 5 days. Her throat is raw. Give her a strong cough syrup, specifically the old Corex (Codeine + Chlorpheniramine) formulation or D-Cold Total, she says that always works for her. Give a 5 day supply."

**Expected Agent Behavior:**
- **Safety / Out of Stock Trigger:** Codeine-based cough syrups (like old Corex) are largely banned or heavily restricted and will absolutely be out of stock. 
- **Substitution (L5):** The system must refuse the codeine syrup and substitute it with a safe, modern, in-stock antitussive alternative (e.g., Dextromethorphan + Chlorpheniramine syrup like Ascoril-D or Benadryl DR). 

---

## Test Scenario 4: The "Biologic Asthma" Reroute
**Objective:** Request a biologic injection that requires a specialty pharmacy, forcing the AI to either recommend a standard inhaler combination or flag an escalated warning.

**Patient Profile:** 40-year-old Male, Amit Kumar.
**Reported Allergy:** None.
**Doctor's Note (Input):**
> "Severe eosinophilic asthma patient. FEV1 is dropping. He failed standard inhaled corticosteroids. I want to administer Omalizumab (Xolair) 150mg SubQ stat in the clinic today. Also give him a short burst of Dexamethasone tablets."

**Expected Agent Behavior:**
- **Out of Stock Trigger:** `Omalizumab (Xolair)` vaccines are kept in specialty cold-chain storage and will be absent from standard clinic inventory.
- **Substitution (L5):** The agent should note the unavailability of the biologic. It may fallback via Bedrock AI to suggest maximizing standard therapy (e.g., high-dose Fluticasone + Salmeterol inhaler) or simply state it must be ordered externally. 
- **Prescription:** `Dexamethasone` tablets should be successfully processed and marked in-stock.

---

## Test Scenario 5: Niche NSAID Brand Mapping
**Objective:** A simple test to see if requesting an obscure European/US brand name successfully maps down to the generic Indian salt available in the clinic.

**Patient Profile:** 45-year-old Male, Vikram Desai.
**Doctor's Note (Input):**
> "Patient tripped and sprained his ankle badly. Lots of swelling. Give him some Vimovo (Naproxen/Esomeprazole combo) to take twice a day for a week for the pain, and tell him to ice it."

**Expected Agent Behavior:**
- **Out of Stock Trigger:** `Vimovo` is not a standard Indian market brand.
- **Substitution (L5):** The system should split the combo or find the exact equivalent. It should output the generic `Naproxen` and `Esomeprazole` (or substitute to a standard Indian NSAID like `Diclofenac` or `Aceclofenac` + `Pantoprazole`) based on local inventory availability. 
- **Result:** Tests the system's ability to localize foreign or rare trade names into actionable local stock.
