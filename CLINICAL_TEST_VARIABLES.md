# Clinical Note Variations for MVP Testing

This document contains a set of carefully crafted "Doctor's Notes" designed to aggressively test your AI agents (Reasoning, Context, Substitution, and Prescription Generator) for edge cases, allergies, contraindications, and optimal combinations.

---

## Test Scenario 1: Severe Allergy Substitution
**Objective:** Test if the system correctly identifies a widely-used drug class allergy and successfully substitutes it with a safe alternative salt of a different class.

**Patient Profile:** 25-year-old Male.
**Reported Allergy:** Penicillin.
**Doctor's Note (Input):**
> "Patient presents with severe sore throat, fever of 101F, and swollen lymph nodes for 3 days. Rapid strep test is positive. Pt mentions severe allergy to Penicillin (gets full body hives). Need a 5-day course of antibiotics to clear the infection. Pt also complaining of mild body ache and headache."

**Expected Agent Behavior:**
- **Inferred Diagnosis:** Streptococcal Pharyngitis (Strep Throat).
- **Allergy Check:** Blocks all Penicillins (Amoxicillin, Augmentin) and likely warns about Cephalosporins (cross-reactivity).
- **Salt Substitution:** Recommends a Macrolide (e.g., Azithromycin or Clarithromycin) or Lincosamide (Clindamycin).
- **Combination:** Antibiotic + Antipyretic/Analgesic (Paracetamol/Ibuprofen) for body aches.
 
---

## Test Scenario 2: Chronic Conditions requiring "Best Combinations" & Guidelines
**Objective:** Test the system's ability to combine drugs for co-morbidities using standard clinical guidelines without causing adverse interactions.

**Patient Profile:** 55-year-old Female.
**Reported Allergy:** None.
**Doctor's Note (Input):**
> "55 yo female here for follow up. BP is persistently elevated at 150/95. Fasting sugar is high at 160 mg/dL, HbA1c is 8.2%. Needs to start on anti-diabetic meds, probably metformin but let's add something for the BP as well, ACE inhibitor preferred for kidney protection. Also needs something for neuropathic burning pain in her feet at night."

**Expected Agent Behavior:**
- **Inferred Diagnoses:** Type 2 Diabetes Mellitus, Essential Hypertension, Diabetic Neuropathy.
- **Best Combinations:** 
  - *Diabetes:* Metformin (First-line).
  - *Hypertension:* Enalapril, Ramipril, or Lisinopril (ACE Inhibitors, as requested and guideline-backed for diabetics).
  - *Neuropathy:* Pregabalin or Gabapentin.
- **Safety Check:** Verifies there are no severe interactions across these three distinct central acting and systemic drugs.

---

## Test Scenario 3: Absolute Contraindication leading to Alternative Salts
**Objective:** Test the reasoning agent's ability to deduce a contraindication from past medical history rather than a direct "allergy".

**Patient Profile:** 60-year-old Male.
**Reported Allergy:** None.
**Past Medical History:** Peptic Ulcer Disease (PUD), recent GI bleed.
**Doctor's Note (Input):**
> "Pt c/o severe bilateral knee pain due to osteoarthritis for the last month. Cannot take regular NSAIDs like Ibuprofen, Naproxen, or Diclofenac due to history of severe PUD and bleeding stomach ulcer last year. Needs heavy pain relief to walk properly. Also write up a PPI to protect the stomach just to be safe."

**Expected Agent Behavior:**
- **Inferred Diagnoses:** Osteoarthritis, Peptic Ulcer Disease.
- **Safety Check:** Blocks non-selective NSAIDs due to GI bleed history. 
- **Salt Substitution / Best Choice:** Suggests a COX-2 specific inhibitor (e.g., Celecoxib) which has a lower GI profile, or recommends paracetamol combined with a weak opioid (e.g., Tramadol).
- **Combination:** Painkiller + Proton Pump Inhibitor (e.g., Pantoprazole, Omeprazole).

---

## Test Scenario 4: Pediatric Dosing and Formulation Fallbacks
**Objective:** Test if the agents understand age/weight constraints and suggest liquid formulations/syrups instead of tablets, while avoiding contraindicated pediatric drugs.

**Patient Profile:** 8-year-old Child, Weight: 25kg.
**Reported Allergy:** Sulfa drugs.
**Doctor's Note (Input):**
> "8 year old kid weighing 25kg. Having acute asthma flare up since yesterday, audible expiratory wheezing, RR is 28. Also has continuous runny nose and sneezing from apparent seasonal allergies. Allergic to sulfa drugs. Needs a short 3-day course of steroids, a rescue inhaler, and a non-drowsy antihistamine for the rhinitis."

**Expected Agent Behavior:**
- **Formulation Check:** Defaults to syrups, oral solutions, and inhalers suitable for an 8-year-old.
- **Allergy Check:** Logs the Sulfa allergy (though not highly relevant here, tests agent distraction).
- **Best Combinations:**
  - *Asthma (Rescue):* Salbutamol (Albuterol) Metered Dose Inhaler with a spacer.
  - *Asthma (Steroid):* Prednisolone oral solution (dose calculated implicitly based on weight).
  - *Rhinitis:* Cetirizine or Levocetirizine syrup/tablets.

---

## Test Scenario 5: High-Risk Multi-Drug Interaction (The "Red Flag" Test)
**Objective:** Test if the reasoning agent actively blocks a doctor's suggestion if it introduces a severe, life-threatening drug-drug interaction.

**Patient Profile:** 70-year-old Male.
**Current Medications:** Warfarin (stabilized).
**Doctor's Note (Input):**
> "70 yo male with Atrial Fibrillation. Currently stabilized on Warfarin (INR 2.5). His lipid profile is bad, LDL is 160. Need to start a statin, maybe Atorvastatin. He also has a severe fungal infection under his toenails. Give him a statin, and a strong oral antifungal like Fluconazole or Itraconazole for the toes. Let's hit the infection hard."

**Expected Agent Behavior:**
- **Interaction Detection (CRITICAL):** Identifies a **Major/Contraindicated Interaction** between Warfarin and systemic Azole antifungals (Fluconazole/Itraconazole inhibit CYP450, spiking Warfarin levels and causing severe bleeding risk).
- **Substitution/Refusal:** The reasoning agent should *reject* the oral antifungal, optionally suggesting a topical antifungal (e.g., Ciclopirox or Amorolfine nail lacquer) or recommending close INR monitoring if oral is absolutely forced.
- **Combinations:** Approves the Atorvastatin + Warfarin combination (moderate interaction, acceptable with monitoring).
