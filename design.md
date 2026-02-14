# ClinRx Copilot - Design Document

## Executive Summary

ClinRx Copilot implements an 8-layer agentic architecture for AI-assisted prescription drafting. The system prioritizes safety through deterministic validation gates while leveraging AI for clinical reasoning and explainability. The design ensures doctors maintain complete control over final prescriptions while benefiting from intelligent recommendations.

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
│              Next.js 16 + React 19 + TypeScript             │
│                    Tailwind CSS + shadcn/ui                 │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                    │
│         /api/context | /api/prescription-draft              │
│         /api/inventory | /api/ocr                           │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   8-Layer Agent System                      │
│  Context → Safety → Reasoning → Inventory → Substitution   │
│              → Explanation → Doctor → Audit                 │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
│    Supabase (PostgreSQL) | Redis Cache | File Storage      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                  External Services                          │
│      FHIR Servers | OpenFDA | Inventory APIs               │
└─────────────────────────────────────────────────────────────┘
```

---

## 8-Layer Agent Architecture

### Layer 0: Data Ingestion
**Purpose:** Collect and normalize data from external sources

**Components:**
- FHIR Connector (`fhir-connector.ts`)
- OpenFDA Client (`openfda-client.ts`)
- Inventory Connector (`inventory-connector.ts`)

**Data Flow:**
```
External APIs → Connectors → Normalized Data → Context Agent
```

**Key Features:**
- FHIR R4 compliance for patient data
- OpenFDA API integration for drug information
- Inventory system polling for availability
- Error handling and retry logic
- Data validation and sanitization

---

### Layer 1: Context Compression Agent
**File:** `src/agents/context-agent.ts`

**Purpose:** Transform verbose FHIR data into compressed, relevant clinical context

**Input:**
```typescript
{
  patient_id: string;
  include_history?: boolean;
}
```

**Output:**
```typescript
{
  patient: {
    id: string;
    age: number;
    gender: string;
    weight_kg: number;
  };
  allergies: string[];
  current_medications: Medication[];
  conditions: Condition[];
  vitals: {
    bp_systolic: number;
    bp_diastolic: number;
    heart_rate: number;
    temperature: number;
  };
  lab_results: {
    egfr: number;
    creatinine: number;
  };
}
```

**Algorithm:**
1. Fetch patient FHIR bundle
2. Extract relevant resources (Patient, AllergyIntolerance, MedicationStatement, Condition, Observation)
3. Compress to essential fields only
4. Calculate derived values (age from birthdate, eGFR if missing)
5. Return compressed context

**Performance Target:** <500ms

---

### Layer 2: Safety Guard Agent (Deterministic)
**File:** `src/agents/safety-agent.ts`

**Purpose:** Apply hard safety rules with zero AI involvement

**Safety Checks:**

1. **Allergy Detection**
   - Check proposed drug against patient allergies
   - Block exact matches
   - Check drug class cross-reactivity
   - Return severity level (BLOCK, WARN, CAUTION)

2. **Drug Interaction Screening**
   - Compare against current medications
   - Query OpenFDA interaction database
   - Classify interactions (major, moderate, minor)
   - Block major interactions

3. **Renal Dose Adjustment**
   ```typescript
   if (eGFR < 60) {
     adjustedDose = calculateRenalDose(drug, eGFR);
     warnings.push(`Dose adjusted for renal function`);
   }
   ```

4. **Beers Criteria Check**
   - If patient age > 65, check against Beers list
   - Flag potentially inappropriate medications
   - Suggest safer alternatives

5. **Pregnancy Category**
   - Check drug pregnancy category
   - Warn if category C, D, or X for female patients of childbearing age

**Decision Logic:**
```typescript
enum SafetyDecision {
  APPROVED = "approved",
  APPROVED_WITH_WARNINGS = "approved_with_warnings",
  BLOCKED = "blocked"
}
```

**Critical Rule:** This layer NEVER uses AI models - only deterministic rules

---

### Layer 3: Clinical Reasoning Agent
**File:** `src/agents/reasoning-agent.ts`

**Purpose:** Generate evidence-based medication recommendations

**Modes:**
1. **AI-Powered Mode** (with OpenAI API key)
   - Uses GPT-4o-mini for clinical reasoning
   - Analyzes doctor notes + patient context
   - Generates recommendations with rationale

2. **Rule-Based Mode** (fallback, no API key required)
   - Uses disease-drug mapping database
   - Pattern matching on clinical notes
   - Deterministic recommendation logic

**Input:**
```typescript
{
  compressed_context: CompressedContext;
  doctor_notes: string;
  mode: "ai" | "rule-based";
}
```

**Output:**
```typescript
{
  recommendations: [
    {
      drug: string;
      dose: string;
      frequency: string;
      duration: string;
      route: string;
      reasoning: string[];
      confidence: number;
    }
  ];
  differential_considerations: string[];
}
```

**AI Prompt Structure:**
```
You are a clinical decision support system.

Patient Context:
{compressed_context}

Doctor's Notes:
{doctor_notes}

Task: Recommend appropriate medications considering:
- Patient allergies and contraindications
- Current medications
- Renal function
- Age-appropriate dosing

Format: JSON with drug, dose, frequency, duration, reasoning
```

---

### Layer 4: Inventory Agent
**File:** `src/agents/inventory-agent.ts`

**Purpose:** Check real-world medication availability

**Process:**
1. Query inventory connector for each recommended drug
2. Check stock levels
3. Flag out-of-stock items
4. Trigger substitution agent if needed

**Output:**
```typescript
{
  drug: string;
  available: boolean;
  stock_level: number;
  estimated_restock_date?: string;
}
```

**Caching Strategy:**
- Cache inventory data for 5 minutes
- Invalidate on stock updates
- Use Redis for distributed caching

---

### Layer 5: Substitution Agent
**File:** `src/agents/substitution-agent.ts`

**Purpose:** Find therapeutic equivalents for unavailable drugs

**Substitution Logic:**
1. **Generic Substitution**
   - Map brand name to generic equivalent
   - Check bioequivalence

2. **Therapeutic Substitution**
   - Find drugs in same therapeutic class
   - Maintain similar efficacy profile
   - Consider patient-specific factors

3. **Cost-Effective Alternatives**
   - Rank by cost when multiple options available
   - Prefer generics over brands

**Database Schema:**
```typescript
interface DrugEquivalence {
  primary_drug: string;
  equivalent_drugs: {
    drug: string;
    equivalence_type: "generic" | "therapeutic" | "alternative";
    dose_conversion_factor: number;
    notes: string;
  }[];
}
```

---

### Layer 6: Explanation Agent (XAI)
**File:** `src/agents/explanation-agent.ts`

**Purpose:** Generate human-readable explanations for AI decisions

**Explanation Components:**
1. **Recommendation Rationale**
   - Why this drug was chosen
   - Clinical evidence supporting choice
   - Patient-specific considerations

2. **Safety Considerations**
   - Warnings that were triggered
   - How safety checks influenced decision
   - Monitoring recommendations

3. **Alternative Options**
   - Why alternatives were not chosen
   - Trade-offs between options

**Output Format:**
```typescript
{
  summary: string;
  detailed_reasoning: {
    drug_selection: string[];
    dose_rationale: string[];
    safety_considerations: string[];
    monitoring_plan: string[];
  };
  confidence_explanation: string;
}
```

---

### Layer 7: Doctor Control Interface
**File:** `src/app/dashboard/page.tsx`, `src/components/PrescriptionTemplate.tsx`

**Purpose:** Enable doctor review, edit, and approval

**UI Components:**
1. **Prescription Draft Display**
   - Show AI recommendations
   - Highlight warnings prominently
   - Display explanation alongside

2. **Edit Controls**
   - Inline editing for all fields
   - Drug search and selection
   - Dose calculator

3. **Override Mechanism**
   - Allow doctor to override any recommendation
   - Require justification for safety overrides
   - Log all modifications

4. **Signature Workflow**
   - Digital signature capture
   - Timestamp and audit trail
   - Generate final prescription document

---

### Layer 8: Audit Agent
**File:** `src/agents/audit-agent.ts`

**Purpose:** Maintain compliance and audit trail

**Logged Events:**
- Prescription generation requests
- AI recommendations
- Safety warnings triggered
- Doctor modifications
- Overrides and justifications
- Final prescription signatures

**Audit Schema:**
```typescript
interface AuditLog {
  id: string;
  timestamp: Date;
  event_type: string;
  user_id: string;
  patient_id: string;
  data: {
    ai_recommendation?: any;
    doctor_modification?: any;
    safety_warnings?: string[];
    override_justification?: string;
  };
  ip_address: string;
  session_id: string;
}
```

**Retention Policy:**
- Keep audit logs for 7 years (regulatory requirement)
- Encrypt sensitive data at rest
- Implement log rotation and archival

---

## Agent Orchestrator

**File:** `src/agents/orchestrator.ts`

**Purpose:** Coordinate execution of all agents in correct sequence

**Pipeline Flow:**
```typescript
async function generatePrescriptionDraft(
  patientId: string,
  doctorNotes: string
): Promise<PrescriptionDraft> {
  
  // Layer 1: Context Compression
  const context = await contextAgent.compress(patientId);
  
  // Layer 3: Clinical Reasoning
  const recommendations = await reasoningAgent.recommend(
    context,
    doctorNotes
  );
  
  // Layer 2: Safety Validation (for each recommendation)
  const safeRecommendations = [];
  for (const rec of recommendations) {
    const safetyResult = await safetyAgent.validate(rec, context);
    if (safetyResult.decision !== "BLOCKED") {
      safeRecommendations.push({
        ...rec,
        warnings: safetyResult.warnings
      });
    }
  }
  
  // Layer 4: Inventory Check
  const inventoryStatus = await inventoryAgent.checkAvailability(
    safeRecommendations
  );
  
  // Layer 5: Substitution (if needed)
  const finalRecommendations = [];
  for (const rec of safeRecommendations) {
    if (!inventoryStatus[rec.drug].available) {
      const substitute = await substitutionAgent.findAlternative(
        rec,
        context
      );
      finalRecommendations.push(substitute);
    } else {
      finalRecommendations.push(rec);
    }
  }
  
  // Layer 6: Generate Explanations
  const explanations = await explanationAgent.explain(
    finalRecommendations,
    context,
    doctorNotes
  );
  
  // Layer 8: Audit Logging
  await auditAgent.log({
    event_type: "prescription_draft_generated",
    patient_id: patientId,
    data: { recommendations: finalRecommendations }
  });
  
  return {
    recommendations: finalRecommendations,
    explanations,
    context
  };
}
```

**Error Handling:**
- Each agent has timeout (5s default)
- Fallback to rule-based mode if AI fails
- Graceful degradation for non-critical services
- Always log errors to audit trail

---

## Data Models

### Patient Context
```typescript
interface CompressedContext {
  patient: {
    id: string;
    age: number;
    gender: "M" | "F" | "O";
    weight_kg: number;
    height_cm: number;
  };
  allergies: {
    substance: string;
    reaction: string;
    severity: "mild" | "moderate" | "severe";
  }[];
  current_medications: {
    drug: string;
    dose: string;
    frequency: string;
    start_date: string;
  }[];
  conditions: {
    code: string;
    display: string;
    onset_date: string;
  }[];
  vitals: {
    bp_systolic: number;
    bp_diastolic: number;
    heart_rate: number;
    temperature: number;
    measured_at: string;
  };
  lab_results: {
    egfr: number;
    creatinine: number;
    measured_at: string;
  };
}
```

### Prescription Draft
```typescript
interface PrescriptionDraft {
  id: string;
  patient_id: string;
  doctor_id: string;
  created_at: string;
  status: "draft" | "signed" | "cancelled";
  medications: {
    drug: string;
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    instructions: string;
    reasoning: string[];
    warnings: string[];
    confidence: number;
  }[];
  explanations: {
    summary: string;
    detailed_reasoning: any;
  };
  audit_trail: {
    generated_by: "ai" | "doctor";
    modifications: any[];
    signed_at?: string;
  };
}
```

---

## API Design

### POST /api/context
**Purpose:** Retrieve compressed patient context

**Request:**
```json
{
  "patient_id": "patient-001"
}
```

**Response:**
```json
{
  "context": { /* CompressedContext */ },
  "cached": false,
  "processing_time_ms": 450
}
```

---

### POST /api/prescription-draft
**Purpose:** Generate AI-assisted prescription draft

**Request:**
```json
{
  "patient_id": "patient-001",
  "doctor_notes": "Fever and productive cough. Suspect bacterial infection.",
  "mode": "ai"
}
```

**Response:**
```json
{
  "draft_id": "draft-12345",
  "recommendations": [
    {
      "drug": "Azithromycin",
      "dose": "500mg",
      "frequency": "OD",
      "duration": "3 days",
      "route": "oral",
      "reasoning": [
        "Non-beta-lactam selected due to documented penicillin allergy",
        "Effective against common respiratory pathogens",
        "Dose adjusted for renal function (eGFR: 48)"
      ],
      "warnings": [
        "Monitor QT interval - patient on other QT-prolonging drugs"
      ],
      "confidence": 0.92
    }
  ],
  "explanations": {
    "summary": "Azithromycin recommended as first-line therapy...",
    "detailed_reasoning": { /* ... */ }
  },
  "pipeline_execution_ms": 4200
}
```

---

### POST /api/inventory
**Purpose:** Check medication availability

**Request:**
```json
{
  "drugs": ["Azithromycin", "Amoxicillin"]
}
```

**Response:**
```json
{
  "availability": {
    "Azithromycin": {
      "available": true,
      "stock_level": 150,
      "unit": "tablets"
    },
    "Amoxicillin": {
      "available": false,
      "estimated_restock": "2026-02-20"
    }
  }
}
```

---

## Database Schema

### Supabase Tables

**patients**
```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fhir_id VARCHAR(255) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**prescriptions**
```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  status VARCHAR(20),
  draft_data JSONB,
  signed_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  signed_at TIMESTAMP
);
```

**audit_logs**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100),
  user_id UUID,
  patient_id UUID,
  data JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**drug_inventory**
```sql
CREATE TABLE drug_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_name VARCHAR(255),
  stock_level INTEGER,
  unit VARCHAR(50),
  last_updated TIMESTAMP DEFAULT NOW()
);
```

---

## Security Design

### Authentication & Authorization
- Supabase Auth for user management
- Role-based access control (Doctor, Admin, Pharmacist)
- JWT tokens for API authentication
- Session management with secure cookies

### Data Protection
- TLS 1.3 for all API communications
- Encryption at rest for PHI (AES-256)
- Database row-level security (RLS)
- API rate limiting (100 req/min per user)

### Compliance
- HIPAA-compliant data handling
- Audit logging for all PHI access
- Data retention policies
- Secure data disposal procedures

---

## Performance Optimization

### Caching Strategy
- Redis for inventory data (5-minute TTL)
- Patient context caching (1-hour TTL)
- Drug interaction database in-memory cache
- CDN for static assets

### Database Optimization
- Indexed queries on patient_id, doctor_id
- Partitioning for audit_logs table
- Connection pooling (max 20 connections)
- Query optimization with EXPLAIN ANALYZE

### API Optimization
- Response compression (gzip)
- Pagination for list endpoints
- Lazy loading for large datasets
- Parallel agent execution where possible

---

## Deployment Architecture

### Production Environment
```
┌─────────────────────────────────────────┐
│         Load Balancer (Vercel)          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Next.js App (Serverless)           │
│         Multiple Instances              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│      Supabase (PostgreSQL)              │
│      Redis Cache (Upstash)              │
└─────────────────────────────────────────┘
```

### CI/CD Pipeline
1. Code push to GitHub
2. Automated tests (unit + integration)
3. Build Next.js application
4. Deploy to Vercel staging
5. Run E2E tests
6. Manual approval
7. Deploy to production

---

## Testing Strategy

### Unit Tests
- Individual agent logic
- Safety rule validation
- Data transformation functions
- API endpoint handlers

### Integration Tests
- Agent orchestration flow
- Database operations
- External API mocking
- Error handling scenarios

### End-to-End Tests
- Complete prescription generation workflow
- Doctor interface interactions
- Safety warning displays
- Audit trail verification

### Safety Testing
- Allergy detection accuracy (100% target)
- Drug interaction detection
- Dose calculation validation
- Edge case handling

---

## Monitoring & Observability

### Metrics
- API response times (p50, p95, p99)
- Agent execution times
- Error rates by endpoint
- Cache hit rates
- Database query performance

### Logging
- Structured JSON logs
- Log levels (DEBUG, INFO, WARN, ERROR)
- Correlation IDs for request tracing
- Sensitive data redaction

### Alerting
- High error rates (>1%)
- Slow API responses (>5s)
- Safety check failures
- External API outages

---

## Technology Justification

### Next.js 16
- Server-side rendering for performance
- API routes for backend logic
- Built-in optimization (image, font)
- Excellent developer experience

### TypeScript
- Type safety for medical data
- Better IDE support
- Reduced runtime errors
- Self-documenting code

### Supabase
- PostgreSQL with real-time capabilities
- Built-in authentication
- Row-level security
- Easy scaling

### OpenAI GPT-4o-mini
- Cost-effective for clinical reasoning
- Fast response times
- Good medical knowledge
- Fallback to rule-based system

---

## Risk Mitigation

### Technical Risks
- **AI Hallucination:** Mitigated by deterministic safety layer
- **API Outages:** Fallback to rule-based mode
- **Data Loss:** Regular backups, point-in-time recovery
- **Performance Degradation:** Caching, horizontal scaling

### Clinical Risks
- **Incorrect Recommendations:** Doctor review required
- **Missed Allergies:** Deterministic checking, no AI
- **Drug Interactions:** Multiple data sources, conservative approach
- **Dosing Errors:** Automated calculation validation

---

## Future Enhancements

### Phase 2 (Q2 2026)
- Mobile application (React Native)
- Voice input for clinical notes
- Advanced analytics dashboard
- Multi-language support

### Phase 3 (Q3 2026)
- Integration with e-prescription systems
- Telemedicine platform integration
- Predictive analytics for adverse events
- Personalized dosing with pharmacogenomics

### Phase 4 (Q4 2026)
- Federated learning for privacy-preserving AI
- Blockchain for prescription verification
- IoT integration (smart pill bottles)
- Global drug database expansion

---

**Document Version:** 1.0  
**Last Updated:** February 14, 2026  
**Author:** ClinRx Development Team  
**Reviewers:** Technical Lead, Clinical Advisor, Security Officer
