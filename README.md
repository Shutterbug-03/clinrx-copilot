# ClinRx Copilot 🩺

**AI-Assisted Prescription Drafting with 8-Layer Agentic Architecture**

Doctor-first, human-in-the-loop clinical decision support for prescription drafting. Context compression + inventory-aware reasoning with deterministic safety gates.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Doctor Control (Layer 7)                 │
│                   Edit / Override / Sign                    │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                   Explanation Agent (Layer 6)               │
│                   Human-readable XAI                        │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                  Substitution Agent (Layer 5)               │
│                  Drug equivalence & alternatives            │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                   Inventory Agent (Layer 4)                 │
│                   Real-world availability                   │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                  Clinical Reasoning (Layer 3)               │
│                  GPT-4o-mini / Rule-based                   │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│           ⛔ SAFETY GUARD - Hard Gates (Layer 2)            │
│   Drug interactions | Allergies | Renal dosing | Pregnancy │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                Context Compression (Layer 1)                │
│                FHIR → Compressed JSON                       │
└─────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────┐
│                    Data Ingestion Layer                     │
│               FHIR | OpenFDA | Inventory APIs               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server (works without API keys!)
npm run dev

# Open http://localhost:3000
```

---

## 🔑 Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

**Minimum config (free):** No API keys required - uses mock data + rule-based reasoning

**Enhanced features:**
- `OPENAI_API_KEY` - GPT-4o-mini for clinical reasoning
- `OPENFDA_API_KEY` - Drug interaction data (120K req/day free)

---

## 📁 Project Structure

```
src/
├── agents/                    # 8-Layer Agent System
│   ├── context-agent.ts       # Layer 1: Context Compression
│   ├── safety-agent.ts        # Layer 2: Deterministic Safety
│   ├── reasoning-agent.ts     # Layer 3: Clinical Reasoning
│   ├── inventory-agent.ts     # Layer 4: Availability Check
│   ├── substitution-agent.ts  # Layer 5: Drug Equivalence
│   ├── explanation-agent.ts   # Layer 6: XAI Output
│   ├── audit-agent.ts         # Layer 8: Compliance Logging
│   └── orchestrator.ts        # Pipeline Coordinator
├── lib/
│   └── connectors/            # External API Connectors
│       ├── fhir-connector.ts  # HAPI FHIR R4
│       ├── openfda-client.ts  # Drug Labels & Interactions
│       └── inventory-connector.ts
├── types/
│   └── agents.ts              # TypeScript Definitions
└── app/
    ├── api/                   # API Routes
    │   ├── context/           # Patient context
    │   └── prescription-draft/# Full pipeline
    └── page.tsx               # Main UI
```

---

## 🛡️ Safety Features

- **Allergy Detection**: Blocks penicillin class for documented allergies
- **Cross-Reactivity Warnings**: 1-2% cephalosporin warning with penicillin allergy
- **Renal Dose Adjustment**: Auto-adjusts doses based on eGFR
- **Drug Interactions**: Checks against current medications
- **Beers Criteria**: Flags potentially inappropriate drugs for elderly

---

## 🔌 API Endpoints

### POST /api/context
Get compressed patient context
```json
{
  "patient_id": "patient-001"
}
```

### POST /api/prescription-draft
Generate AI-assisted prescription draft
```json
{
  "patient_id": "patient-001",
  "doctor_notes": "Fever and productive cough. Suspect bacterial infection."
}
```

---

## 🧪 Example Response

```json
{
  "primary_recommendation": {
    "drug": "Azithromycin",
    "dose": "500mg",
    "frequency": "OD",
    "duration": "3 days",
    "reasoning": [
      "Non-beta-lactam selected due to documented allergy",
      "Dose adjusted for renal function (eGFR: 48)"
    ]
  },
  "warnings": [
    "Cephalosporin cross-reactivity ~1-2% with penicillin allergy"
  ],
  "pipeline_execution_ms": 4
}
```

---

## 📜 License

MIT

---

## 🤝 Contributing

PRs welcome! Please ensure safety-critical code maintains 100% deterministic behavior.
