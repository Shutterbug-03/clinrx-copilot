/**
 * Comprehensive Disease-Drug Mapping Database
 * Contains drug combinations for 50+ common conditions
 * Each condition maps to primary drugs, adjuncts, and alternatives
 */

export interface DrugInfo {
    generic: string;
    brands: string[];
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    category: 'primary' | 'adjunct' | 'symptomatic' | 'prophylaxis';
}

export interface ConditionMapping {
    name: string;
    icd10?: string;
    drugs: DrugInfo[];
    alternatives: { generic: string; brands: string[]; dose: string; reason: string }[];
    avoid_if: string[]; // Risk flags that contraindicate
    notes: string;
}

export const DISEASE_DRUG_DATABASE: Record<string, ConditionMapping> = {
    // =====================================================
    // RESPIRATORY CONDITIONS
    // =====================================================
    'fever': {
        name: 'Fever / Pyrexia',
        icd10: 'R50.9',
        drugs: [
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo', 'Calpol'], dose: '500-650mg', frequency: 'TDS/QID', duration: '3-5 days', route: 'oral', category: 'primary' },
        ],
        alternatives: [
            { generic: 'Ibuprofen', brands: ['Brufen', 'Combiflam'], dose: '400mg', reason: 'If paracetamol contraindicated' },
        ],
        avoid_if: ['hepatic_impairment'],
        notes: 'Max 4g/day paracetamol. Consider underlying cause.',
    },

    'fever_infection': {
        name: 'Fever with Suspected Bacterial Infection',
        icd10: 'R50.9',
        drugs: [
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '650mg', frequency: 'TDS', duration: '5 days', route: 'oral', category: 'symptomatic' },
            { generic: 'Azithromycin', brands: ['Azee', 'Zithromax'], dose: '500mg', frequency: 'OD', duration: '3 days', route: 'oral', category: 'primary' },
        ],
        alternatives: [
            { generic: 'Amoxicillin', brands: ['Mox', 'Novamox'], dose: '500mg TDS', reason: 'If macrolide allergy' },
            { generic: 'Cefixime', brands: ['Taxim-O', 'Cefix'], dose: '200mg BD', reason: 'Broader coverage needed' },
        ],
        avoid_if: ['beta_lactam_allergy', 'macrolide_allergy'],
        notes: 'Complete full antibiotic course.',
    },

    'common_cold': {
        name: 'Common Cold / URTI',
        icd10: 'J00',
        drugs: [
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '500mg', frequency: 'TDS', duration: '3-5 days', route: 'oral', category: 'symptomatic' },
            { generic: 'Cetirizine', brands: ['Cetzine', 'Zyrtec'], dose: '10mg', frequency: 'OD', duration: '5 days', route: 'oral', category: 'symptomatic' },
            { generic: 'Dextromethorphan + Phenylephrine', brands: ['Chericof', 'Benadryl DR'], dose: '10ml', frequency: 'TDS', duration: '5 days', route: 'oral', category: 'symptomatic' },
        ],
        alternatives: [
            { generic: 'Levocetirizine', brands: ['Levocet', 'Xyzal'], dose: '5mg OD', reason: 'Less sedating' },
            { generic: 'Fexofenadine', brands: ['Allegra', 'Fexova'], dose: '120mg OD', reason: 'Non-sedating antihistamine' },
        ],
        avoid_if: ['hypertension', 'glaucoma'],
        notes: 'Symptomatic treatment only. Avoid antibiotics unless bacterial superinfection.',
    },

    'cough_productive': {
        name: 'Productive Cough',
        icd10: 'R05.9',
        drugs: [
            { generic: 'Ambroxol', brands: ['Mucolite', 'Ambrodil'], dose: '30mg', frequency: 'TDS', duration: '5 days', route: 'oral', category: 'primary' },
            { generic: 'Guaifenesin', brands: ['Glycodin', 'Ascoril'], dose: '100mg', frequency: 'TDS', duration: '5 days', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Bromhexine', brands: ['Solvin', 'Bisolvon'], dose: '8mg TDS', reason: 'Alternative mucolytic' },
            { generic: 'Acetylcysteine', brands: ['Mucomix', 'Fluimucil'], dose: '600mg OD', reason: 'Thick secretions' },
        ],
        avoid_if: [],
        notes: 'Avoid cough suppressants in productive cough.',
    },

    'cough_dry': {
        name: 'Dry/Non-productive Cough',
        icd10: 'R05.9',
        drugs: [
            { generic: 'Dextromethorphan', brands: ['Benylin DM', 'Torex DX'], dose: '15-30mg', frequency: 'TDS', duration: '5-7 days', route: 'oral', category: 'primary' },
            { generic: 'Honey + Tulsi', brands: ['Honitus', 'Dabur Honitus'], dose: '10ml', frequency: 'TDS', duration: '7 days', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Codeine', brands: ['Codistar', 'Grilinctus CD'], dose: '10mg TDS', reason: 'Severe cough, use with caution' },
        ],
        avoid_if: ['opioid_sensitivity', 'respiratory_depression'],
        notes: 'Rule out underlying cause (GERD, ACE-I cough, asthma).',
    },

    'bronchitis_acute': {
        name: 'Acute Bronchitis',
        icd10: 'J20.9',
        drugs: [
            { generic: 'Amoxicillin-Clavulanate', brands: ['Augmentin', 'Clavam'], dose: '625mg', frequency: 'TDS', duration: '7 days', route: 'oral', category: 'primary' },
            { generic: 'Ambroxol', brands: ['Mucolite', 'Ambrodil'], dose: '30mg', frequency: 'TDS', duration: '7 days', route: 'oral', category: 'adjunct' },
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '650mg', frequency: 'TDS', duration: 'PRN', route: 'oral', category: 'symptomatic' },
        ],
        alternatives: [
            { generic: 'Azithromycin', brands: ['Azee', 'Zithromax'], dose: '500mg OD x 3 days', reason: 'Penicillin allergy' },
            { generic: 'Doxycycline', brands: ['Doxy', 'Doxt'], dose: '100mg BD x 7 days', reason: 'Atypical coverage' },
        ],
        avoid_if: ['beta_lactam_allergy'],
        notes: 'Most cases viral - use antibiotics only if bacterial suspected.',
    },

    'pneumonia_community': {
        name: 'Community-Acquired Pneumonia',
        icd10: 'J18.9',
        drugs: [
            { generic: 'Amoxicillin-Clavulanate', brands: ['Augmentin', 'Clavam'], dose: '625mg', frequency: 'TDS', duration: '7-10 days', route: 'oral', category: 'primary' },
            { generic: 'Azithromycin', brands: ['Azee', 'Zithromax'], dose: '500mg', frequency: 'OD', duration: '3-5 days', route: 'oral', category: 'adjunct' },
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '650mg', frequency: 'TDS', duration: 'PRN', route: 'oral', category: 'symptomatic' },
        ],
        alternatives: [
            { generic: 'Levofloxacin', brands: ['Levoflox', 'Tavanic'], dose: '750mg OD', reason: 'Monotherapy alternative' },
            { generic: 'Ceftriaxone', brands: ['Monocef', 'Ceftri'], dose: '1g IV OD', reason: 'Severe/hospitalized' },
        ],
        avoid_if: ['beta_lactam_allergy', 'severe_renal_impairment'],
        notes: 'CURB-65 for severity. Consider hospitalization if score ≥2.',
    },

    'asthma_acute': {
        name: 'Acute Asthma Exacerbation',
        icd10: 'J45.901',
        drugs: [
            { generic: 'Salbutamol MDI', brands: ['Asthalin', 'Ventolin'], dose: '2-4 puffs', frequency: 'Q4-6H', duration: '5-7 days', route: 'inhaled', category: 'primary' },
            { generic: 'Budesonide + Formoterol', brands: ['Budecort', 'Symbicort'], dose: '200/6mcg', frequency: 'BD', duration: 'Continue', route: 'inhaled', category: 'adjunct' },
            { generic: 'Prednisolone', brands: ['Wysolone', 'Omnacortil'], dose: '40mg', frequency: 'OD', duration: '5 days', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Ipratropium', brands: ['Ipravent', 'Atrovent'], dose: '2 puffs QID', reason: 'Add-on bronchodilator' },
            { generic: 'Montelukast', brands: ['Montair', 'Singulair'], dose: '10mg OD', reason: 'Maintenance addon' },
        ],
        avoid_if: ['beta_blocker_use'],
        notes: 'Peak flow monitoring. Step-up therapy if poorly controlled.',
    },

    // =====================================================
    // GASTROINTESTINAL CONDITIONS
    // =====================================================
    'gerd': {
        name: 'GERD / Acid Reflux',
        icd10: 'K21.0',
        drugs: [
            { generic: 'Pantoprazole', brands: ['Pan', 'Pantocid'], dose: '40mg', frequency: 'OD AC', duration: '4-8 weeks', route: 'oral', category: 'primary' },
            { generic: 'Domperidone', brands: ['Domstal', 'Vomistop'], dose: '10mg', frequency: 'TDS AC', duration: '2-4 weeks', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Omeprazole', brands: ['Omez', 'Ocid'], dose: '20mg OD AC', reason: 'Alternative PPI' },
            { generic: 'Rabeprazole', brands: ['Rablet', 'Razo'], dose: '20mg OD AC', reason: 'Alternative PPI' },
            { generic: 'Famotidine', brands: ['Famocid', 'Pepcid'], dose: '40mg OD', reason: 'H2RA alternative' },
        ],
        avoid_if: [],
        notes: 'Lifestyle modifications essential. Avoid late meals, acidic foods.',
    },

    'gastric_pain': {
        name: 'Gastric Pain / Dyspepsia',
        icd10: 'K30',
        drugs: [
            { generic: 'Rabeprazole + Domperidone', brands: ['Rabimac DSR', 'Razo-D'], dose: '20mg/10mg', frequency: 'OD AC', duration: '2 weeks', route: 'oral', category: 'primary' },
            { generic: 'Antacid (Mg+Al Hydroxide)', brands: ['Digene', 'Gelusil'], dose: '10-20ml', frequency: 'TDS PC', duration: 'PRN', route: 'oral', category: 'symptomatic' },
        ],
        alternatives: [
            { generic: 'Pantoprazole + Domperidone', brands: ['Pan-D', 'Pantocid DSR'], dose: '40mg/10mg OD', reason: 'Alternative combo' },
            { generic: 'Esomeprazole', brands: ['Nexpro', 'Raciper'], dose: '40mg OD', reason: 'Stronger acid suppression' },
        ],
        avoid_if: [],
        notes: 'Rule out H. pylori. Consider endoscopy if alarm symptoms.',
    },

    'diarrhea_acute': {
        name: 'Acute Diarrhea / Gastroenteritis',
        icd10: 'A09',
        drugs: [
            { generic: 'ORS', brands: ['Electral', 'ORS WHO'], dose: '200ml', frequency: 'After each stool', duration: 'Till recovery', route: 'oral', category: 'primary' },
            { generic: 'Zinc', brands: ['Zinconia', 'Z&D'], dose: '20mg', frequency: 'OD', duration: '14 days', route: 'oral', category: 'adjunct' },
            { generic: 'Racecadotril', brands: ['Redotil', 'Zedott'], dose: '100mg', frequency: 'TDS', duration: '3-5 days', route: 'oral', category: 'symptomatic' },
        ],
        alternatives: [
            { generic: 'Loperamide', brands: ['Imodium', 'Eldoper'], dose: '2mg after each loose stool', reason: 'Symptomatic (not in dysentery)' },
            { generic: 'Ofloxacin + Ornidazole', brands: ['O2', 'Oflox-OZ'], dose: '200/500mg BD', reason: 'If bacterial/amoebic suspected' },
        ],
        avoid_if: ['bloody_diarrhea'],
        notes: 'Fluids are priority. Antibiotics only if bacterial/amoebic suspected.',
    },

    'constipation': {
        name: 'Constipation',
        icd10: 'K59.00',
        drugs: [
            { generic: 'Lactulose', brands: ['Duphalac', 'Looz'], dose: '15-30ml', frequency: 'OD-BD', duration: 'PRN', route: 'oral', category: 'primary' },
            { generic: 'Isabgol', brands: ['Sat Isabgol', 'Fybogel'], dose: '1-2 tsp', frequency: 'HS', duration: 'Daily', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Polyethylene Glycol', brands: ['Peglyec', 'Laxopeg'], dose: '17g OD', reason: 'Osmotic laxative' },
            { generic: 'Bisacodyl', brands: ['Dulcolax', 'Laxin'], dose: '5-10mg HS', reason: 'Stimulant laxative' },
        ],
        avoid_if: ['intestinal_obstruction'],
        notes: 'Increase fiber, fluids. Rule out secondary causes.',
    },

    // =====================================================
    // INFECTION CONDITIONS
    // =====================================================
    'uti': {
        name: 'Urinary Tract Infection',
        icd10: 'N39.0',
        drugs: [
            { generic: 'Nitrofurantoin', brands: ['Furadantin', 'Macrobid'], dose: '100mg', frequency: 'BD', duration: '5-7 days', route: 'oral', category: 'primary' },
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '500mg', frequency: 'TDS', duration: 'PRN', route: 'oral', category: 'symptomatic' },
        ],
        alternatives: [
            { generic: 'Ciprofloxacin', brands: ['Ciplox', 'Cifran'], dose: '500mg BD', reason: 'Complicated UTI' },
            { generic: 'Trimethoprim-Sulfamethoxazole', brands: ['Bactrim', 'Septran'], dose: 'DS BD', reason: 'Alternative first-line' },
            { generic: 'Cefixime', brands: ['Taxim-O', 'Cefix'], dose: '200mg BD', reason: 'Resistant organisms' },
        ],
        avoid_if: ['sulfa_allergy', 'severe_renal_impairment'],
        notes: 'Send urine culture before starting. Increase fluid intake.',
    },

    'skin_infection': {
        name: 'Skin & Soft Tissue Infection',
        icd10: 'L08.9',
        drugs: [
            { generic: 'Cephalexin', brands: ['Sporidex', 'Phexin'], dose: '500mg', frequency: 'QID', duration: '7 days', route: 'oral', category: 'primary' },
            { generic: 'Mupirocin Ointment', brands: ['T-Bact', 'Bactroban'], dose: 'Apply', frequency: 'TDS', duration: '7 days', route: 'topical', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Clindamycin', brands: ['Dalacin C', 'Cleocin'], dose: '300mg TDS', reason: 'Penicillin allergy/MRSA' },
            { generic: 'Amoxicillin-Clavulanate', brands: ['Augmentin', 'Clavam'], dose: '625mg TDS', reason: 'Broader coverage' },
        ],
        avoid_if: ['beta_lactam_allergy'],
        notes: 'Drain abscesses if present. Consider MRSA in recurrent cases.',
    },

    // =====================================================
    // PAIN CONDITIONS
    // =====================================================
    'pain_mild': {
        name: 'Mild Pain',
        icd10: 'R52.9',
        drugs: [
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '500-650mg', frequency: 'TDS-QID', duration: 'PRN', route: 'oral', category: 'primary' },
        ],
        alternatives: [
            { generic: 'Ibuprofen', brands: ['Brufen', 'Advil'], dose: '400mg TDS', reason: 'Inflammatory component' },
        ],
        avoid_if: ['hepatic_impairment'],
        notes: 'Max 4g/day paracetamol.',
    },

    'pain_moderate': {
        name: 'Moderate Pain',
        icd10: 'R52.9',
        drugs: [
            { generic: 'Tramadol', brands: ['Ultram', 'Contramal'], dose: '50-100mg', frequency: 'TDS', duration: 'Short term', route: 'oral', category: 'primary' },
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '650mg', frequency: 'TDS', duration: 'PRN', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Diclofenac', brands: ['Voveran', 'Voltaren'], dose: '50mg BD', reason: 'NSAID alternative' },
            { generic: 'Aceclofenac + Paracetamol', brands: ['Zerodol-P', 'Hifenac-P'], dose: '1 tab BD', reason: 'Combination analgesic' },
        ],
        avoid_if: ['opioid_sensitivity', 'nsaid_avoid'],
        notes: 'Use opioids cautiously. Add PPI with NSAIDs.',
    },

    'headache_tension': {
        name: 'Tension Headache',
        icd10: 'G44.209',
        drugs: [
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '500-650mg', frequency: 'TDS', duration: 'PRN', route: 'oral', category: 'primary' },
        ],
        alternatives: [
            { generic: 'Ibuprofen', brands: ['Brufen', 'Advil'], dose: '400mg TDS', reason: 'Alternative NSAID' },
            { generic: 'Naproxen', brands: ['Naprosyn', 'Naxdom'], dose: '250mg BD', reason: 'Longer acting' },
        ],
        avoid_if: [],
        notes: 'Limit analgesics to prevent medication overuse headache.',
    },

    'migraine': {
        name: 'Migraine',
        icd10: 'G43.909',
        drugs: [
            { generic: 'Sumatriptan', brands: ['Suminat', 'Imitrex'], dose: '50-100mg', frequency: 'At onset', duration: 'PRN', route: 'oral', category: 'primary' },
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '650mg', frequency: 'With triptan', duration: 'PRN', route: 'oral', category: 'adjunct' },
            { generic: 'Domperidone', brands: ['Domstal', 'Vomistop'], dose: '10mg', frequency: 'With triptan', duration: 'PRN', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Rizatriptan', brands: ['Rizact', 'Maxalt'], dose: '10mg', reason: 'Faster onset' },
            { generic: 'Propranolol', brands: ['Ciplar', 'Inderal'], dose: '40mg BD', reason: 'Prophylaxis' },
        ],
        avoid_if: ['cardiovascular_disease', 'uncontrolled_hypertension'],
        notes: 'Take triptan at onset. Consider prophylaxis if >4 attacks/month.',
    },

    // =====================================================
    // CHRONIC CONDITIONS (for continuation)
    // =====================================================
    'hypertension': {
        name: 'Hypertension',
        icd10: 'I10',
        drugs: [
            { generic: 'Amlodipine', brands: ['Amlong', 'Norvasc'], dose: '5mg', frequency: 'OD', duration: 'Long-term', route: 'oral', category: 'primary' },
            { generic: 'Telmisartan', brands: ['Telma', 'Micardis'], dose: '40mg', frequency: 'OD', duration: 'Long-term', route: 'oral', category: 'primary' },
        ],
        alternatives: [
            { generic: 'Losartan', brands: ['Losar', 'Cozaar'], dose: '50mg OD', reason: 'Alternative ARB' },
            { generic: 'Atenolol', brands: ['Aten', 'Tenormin'], dose: '50mg OD', reason: 'Beta-blocker option' },
            { generic: 'Hydrochlorothiazide', brands: ['Aquazide', 'HCT'], dose: '12.5-25mg OD', reason: 'Add-on diuretic' },
        ],
        avoid_if: ['pregnancy', 'hyperkalemia'],
        notes: 'Target BP <130/80. Lifestyle modifications essential.',
    },

    'diabetes_type2': {
        name: 'Type 2 Diabetes Mellitus',
        icd10: 'E11.9',
        drugs: [
            { generic: 'Metformin', brands: ['Glycomet', 'Glucophage'], dose: '500mg', frequency: 'BD', duration: 'Long-term', route: 'oral', category: 'primary' },
            { generic: 'Glimepiride', brands: ['Amaryl', 'Glimestar'], dose: '1-2mg', frequency: 'OD', duration: 'Long-term', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Sitagliptin', brands: ['Januvia', 'Istavel'], dose: '100mg OD', reason: 'DPP-4 inhibitor' },
            { generic: 'Empagliflozin', brands: ['Jardiance', 'Gibtulio'], dose: '10mg OD', reason: 'SGLT2-I, cardioprotective' },
            { generic: 'Insulin Glargine', brands: ['Lantus', 'Basalog'], dose: '10-20 units HS', reason: 'Basal insulin' },
        ],
        avoid_if: ['severe_renal_impairment', 'lactic_acidosis_risk'],
        notes: 'Target HbA1c <7%. Monitor renal function with Metformin.',
    },

    'hyperlipidemia': {
        name: 'Hyperlipidemia / Dyslipidemia',
        icd10: 'E78.5',
        drugs: [
            { generic: 'Atorvastatin', brands: ['Atorva', 'Lipitor'], dose: '10-20mg', frequency: 'OD HS', duration: 'Long-term', route: 'oral', category: 'primary' },
        ],
        alternatives: [
            { generic: 'Rosuvastatin', brands: ['Rozavel', 'Crestor'], dose: '10mg OD', reason: 'More potent statin' },
            { generic: 'Fenofibrate', brands: ['Lipikind', 'Lipicard'], dose: '160mg OD', reason: 'High triglycerides' },
            { generic: 'Ezetimibe', brands: ['Ezedoc', 'Zetia'], dose: '10mg OD', reason: 'Add-on to statin' },
        ],
        avoid_if: ['hepatic_impairment', 'myopathy'],
        notes: 'Monitor LFTs. Check for statin-related myopathy.',
    },

    'hypothyroidism': {
        name: 'Hypothyroidism',
        icd10: 'E03.9',
        drugs: [
            { generic: 'Levothyroxine', brands: ['Thyronorm', 'Eltroxin'], dose: '25-100mcg', frequency: 'OD empty stomach', duration: 'Lifelong', route: 'oral', category: 'primary' },
        ],
        alternatives: [],
        avoid_if: [],
        notes: 'Take 30-60 min before breakfast. Check TSH every 6-8 weeks initially.',
    },

    // =====================================================
    // ALLERGY CONDITIONS
    // =====================================================
    'allergic_rhinitis': {
        name: 'Allergic Rhinitis',
        icd10: 'J30.9',
        drugs: [
            { generic: 'Cetirizine', brands: ['Cetzine', 'Zyrtec'], dose: '10mg', frequency: 'OD', duration: '2-4 weeks', route: 'oral', category: 'primary' },
            { generic: 'Fluticasone Nasal Spray', brands: ['Flonase', 'Flomist'], dose: '2 sprays', frequency: 'BD', duration: '2-4 weeks', route: 'nasal', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Levocetirizine', brands: ['Levocet', 'Xyzal'], dose: '5mg OD', reason: 'Less sedating' },
            { generic: 'Fexofenadine', brands: ['Allegra', 'Fexova'], dose: '120mg OD', reason: 'Non-sedating' },
            { generic: 'Montelukast', brands: ['Montair', 'Singulair'], dose: '10mg HS', reason: 'Add-on therapy' },
        ],
        avoid_if: [],
        notes: 'Identify and avoid allergens. Consider immunotherapy for severe cases.',
    },

    'urticaria': {
        name: 'Urticaria / Hives',
        icd10: 'L50.9',
        drugs: [
            { generic: 'Cetirizine', brands: ['Cetzine', 'Zyrtec'], dose: '10mg', frequency: 'BD', duration: '1-2 weeks', route: 'oral', category: 'primary' },
            { generic: 'Prednisolone', brands: ['Wysolone', 'Omnacortil'], dose: '20-40mg', frequency: 'OD', duration: '5-7 days', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Fexofenadine', brands: ['Allegra', 'Fexova'], dose: '180mg BD', reason: 'Higher dose antihistamine' },
            { generic: 'Hydroxyzine', brands: ['Atarax', 'Hydroxyn'], dose: '25mg TDS', reason: 'Sedating, for severe' },
        ],
        avoid_if: [],
        notes: 'Identify trigger. Consider chronic urticaria workup if >6 weeks.',
    },

    // =====================================================
    // MUSCULOSKELETAL CONDITIONS
    // =====================================================
    'back_pain': {
        name: 'Low Back Pain',
        icd10: 'M54.5',
        drugs: [
            { generic: 'Diclofenac', brands: ['Voveran', 'Voltaren'], dose: '50mg', frequency: 'BD', duration: '5-7 days', route: 'oral', category: 'primary' },
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '650mg', frequency: 'TDS', duration: '5-7 days', route: 'oral', category: 'adjunct' },
            { generic: 'Thiocolchicoside', brands: ['Myoril', 'Myonit'], dose: '4mg', frequency: 'BD', duration: '5 days', route: 'oral', category: 'adjunct' },
            { generic: 'Pantoprazole', brands: ['Pan', 'Pantocid'], dose: '40mg', frequency: 'OD AC', duration: 'With NSAID', route: 'oral', category: 'prophylaxis' },
        ],
        alternatives: [
            { generic: 'Etoricoxib', brands: ['Arcoxia', 'Nucoxia'], dose: '60-90mg OD', reason: 'COX-2 selective, less GI risk' },
            { generic: 'Pregabalin', brands: ['Lyrica', 'Pregab'], dose: '75mg BD', reason: 'If neuropathic component' },
        ],
        avoid_if: ['nsaid_avoid', 'severe_renal_impairment'],
        notes: 'Red flags: bowel/bladder dysfunction, saddle anesthesia. Physio essential.',
    },

    'arthritis_osteo': {
        name: 'Osteoarthritis',
        icd10: 'M19.90',
        drugs: [
            { generic: 'Paracetamol', brands: ['Crocin', 'Dolo'], dose: '650mg', frequency: 'TDS', duration: 'Long-term PRN', route: 'oral', category: 'primary' },
            { generic: 'Glucosamine + Chondroitin', brands: ['Jointace', 'Carticare'], dose: '1500/1200mg', frequency: 'OD', duration: '3-6 months', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Diclofenac Gel', brands: ['Voveran Emulgel', 'Voltaren Gel'], dose: 'Apply', reason: 'Topical NSAID' },
            { generic: 'Etoricoxib', brands: ['Arcoxia', 'Nucoxia'], dose: '60mg OD', reason: 'Oral NSAID if needed' },
        ],
        avoid_if: [],
        notes: 'Weight reduction, physiotherapy are first-line. Consider intra-articular injections.',
    },

    // =====================================================
    // VITAMIN DEFICIENCIES
    // =====================================================
    'vitamin_d_deficiency': {
        name: 'Vitamin D Deficiency',
        icd10: 'E55.9',
        drugs: [
            { generic: 'Cholecalciferol', brands: ['Uprise D3', 'Calcirol'], dose: '60,000 IU', frequency: 'Weekly', duration: '8 weeks', route: 'oral', category: 'primary' },
            { generic: 'Calcium Carbonate', brands: ['Shelcal', 'Calcimax'], dose: '500mg', frequency: 'OD', duration: '3 months', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Alfacalcidol', brands: ['Alfarol', 'One-Alpha'], dose: '0.25-1mcg OD', reason: 'Renal impairment' },
        ],
        avoid_if: ['hypercalcemia'],
        notes: 'Recheck levels after 3 months. Maintenance: 1000-2000 IU daily.',
    },

    'vitamin_b12_deficiency': {
        name: 'Vitamin B12 Deficiency',
        icd10: 'E53.8',
        drugs: [
            { generic: 'Methylcobalamin', brands: ['Methycobal', 'Nurokind'], dose: '1500mcg', frequency: 'OD', duration: '3 months', route: 'oral', category: 'primary' },
        ],
        alternatives: [
            { generic: 'Cyanocobalamin Injection', brands: ['B12 Inj', 'Macrabin'], dose: '1000mcg IM', reason: 'Malabsorption/severe deficiency' },
        ],
        avoid_if: [],
        notes: 'Check for pernicious anemia. Lifelong therapy if intrinsic factor issue.',
    },

    'iron_deficiency': {
        name: 'Iron Deficiency Anemia',
        icd10: 'D50.9',
        drugs: [
            { generic: 'Ferrous Sulfate', brands: ['Fefol', 'Autrin'], dose: '200mg', frequency: 'OD-BD', duration: '3-6 months', route: 'oral', category: 'primary' },
            { generic: 'Vitamin C', brands: ['Limcee', 'Celin'], dose: '500mg', frequency: 'With iron', duration: '3-6 months', route: 'oral', category: 'adjunct' },
        ],
        alternatives: [
            { generic: 'Ferric Carboxymaltose', brands: ['Ferinject', 'Orofer FCM'], dose: '500-1000mg IV', reason: 'Oral intolerance/severe anemia' },
            { generic: 'Iron Sucrose', brands: ['Venofer', 'Orofer S'], dose: '200mg IV', reason: 'IV alternative' },
        ],
        avoid_if: [],
        notes: 'Take on empty stomach. Identify and treat underlying cause.',
    },
};

/**
 * Get medications for detected conditions
 */
export function getMedicationsForCondition(conditionKey: string): ConditionMapping | null {
    return DISEASE_DRUG_DATABASE[conditionKey] || null;
}

/**
 * Detect conditions from doctor notes
 */
export function detectConditionsFromNotes(notes: string): string[] {
    const conditions: string[] = [];
    const notesLower = notes.toLowerCase();

    // Respiratory
    if (notesLower.includes('fever') && (notesLower.includes('infection') || notesLower.includes('bacterial'))) {
        conditions.push('fever_infection');
    } else if (notesLower.includes('fever')) {
        conditions.push('fever');
    }

    if (notesLower.includes('cold') || notesLower.includes('urti') || notesLower.includes('rhinitis')) {
        conditions.push('common_cold');
    }

    if (notesLower.includes('cough') && (notesLower.includes('productive') || notesLower.includes('sputum') || notesLower.includes('phlegm'))) {
        conditions.push('cough_productive');
    } else if (notesLower.includes('cough') && (notesLower.includes('dry') || notesLower.includes('tickling'))) {
        conditions.push('cough_dry');
    } else if (notesLower.includes('cough')) {
        conditions.push('cough_productive'); // Default to productive
    }

    if (notesLower.includes('bronchitis')) {
        conditions.push('bronchitis_acute');
    }

    if (notesLower.includes('pneumonia')) {
        conditions.push('pneumonia_community');
    }

    if (notesLower.includes('asthma') || notesLower.includes('wheeze') || notesLower.includes('wheezing')) {
        conditions.push('asthma_acute');
    }

    // GI
    if (notesLower.includes('gerd') || notesLower.includes('reflux') || notesLower.includes('acidity') || notesLower.includes('heartburn')) {
        conditions.push('gerd');
    }

    if (notesLower.includes('gastric') || notesLower.includes('stomach pain') || notesLower.includes('dyspepsia') || notesLower.includes('epigastric')) {
        conditions.push('gastric_pain');
    }

    if (notesLower.includes('diarrhea') || notesLower.includes('loose motion') || notesLower.includes('gastroenteritis')) {
        conditions.push('diarrhea_acute');
    }

    if (notesLower.includes('constipation')) {
        conditions.push('constipation');
    }

    // Infections
    if (notesLower.includes('uti') || notesLower.includes('urinary') || notesLower.includes('dysuria') || notesLower.includes('burning urine')) {
        conditions.push('uti');
    }

    if (notesLower.includes('skin infection') || notesLower.includes('cellulitis') || notesLower.includes('boil') || notesLower.includes('abscess')) {
        conditions.push('skin_infection');
    }

    // Pain
    if (notesLower.includes('headache') && notesLower.includes('migraine')) {
        conditions.push('migraine');
    } else if (notesLower.includes('headache')) {
        conditions.push('headache_tension');
    }

    if (notesLower.includes('back pain') || notesLower.includes('backache') || notesLower.includes('lumbar')) {
        conditions.push('back_pain');
    }

    if (notesLower.includes('arthritis') || notesLower.includes('joint pain') || notesLower.includes('knee pain')) {
        conditions.push('arthritis_osteo');
    }

    if ((notesLower.includes('pain') || notesLower.includes('ache')) && notesLower.includes('severe')) {
        conditions.push('pain_moderate');
    } else if (notesLower.includes('pain') || notesLower.includes('ache')) {
        conditions.push('pain_mild');
    }

    // Allergy
    if (notesLower.includes('allergic rhinitis') || notesLower.includes('runny nose') || notesLower.includes('sneezing')) {
        conditions.push('allergic_rhinitis');
    }

    if (notesLower.includes('urticaria') || notesLower.includes('hives') || notesLower.includes('itching') || notesLower.includes('rash')) {
        conditions.push('urticaria');
    }

    // Chronic
    if (notesLower.includes('hypertension') || notesLower.includes('high bp') || notesLower.includes('blood pressure')) {
        conditions.push('hypertension');
    }

    if (notesLower.includes('diabetes') || notesLower.includes('sugar') || notesLower.includes('dm')) {
        conditions.push('diabetes_type2');
    }

    if (notesLower.includes('cholesterol') || notesLower.includes('lipid') || notesLower.includes('dyslipidemia')) {
        conditions.push('hyperlipidemia');
    }

    if (notesLower.includes('thyroid') || notesLower.includes('hypothyroid')) {
        conditions.push('hypothyroidism');
    }

    // Deficiencies
    if (notesLower.includes('vitamin d') || notesLower.includes('vit d')) {
        conditions.push('vitamin_d_deficiency');
    }

    if (notesLower.includes('b12') || notesLower.includes('vitamin b12')) {
        conditions.push('vitamin_b12_deficiency');
    }

    if (notesLower.includes('anemia') || notesLower.includes('iron deficiency') || notesLower.includes('low hb')) {
        conditions.push('iron_deficiency');
    }

    return [...new Set(conditions)]; // Remove duplicates
}
