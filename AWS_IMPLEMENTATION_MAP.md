# AWS Implementation Map - Where to Add AWS Services
## Visual Guide for ClinRx Copilot

---

## 🗺️ Current vs. Target Architecture

### CURRENT ARCHITECTURE (Before Migration)
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                       │
│                  localhost:3000                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              NEXT.JS API ROUTES (Local)                     │
│  • /api/prescription-draft                                  │
│  • /api/patients                                            │
│  • /api/ocr                                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────┬──────────────────┬──────────────────────┐
│  ✅ BEDROCK      │  ❌ SUPABASE     │   ❌ OPENAI          │
│  (Primary AI)    │  (Only DB)       │   (Fallback AI)      │
└──────────────────┴──────────────────┴──────────────────────┘
```

### TARGET ARCHITECTURE (After Migration)
```
┌─────────────────────────────────────────────────────────────┐
│              🟢 AWS AMPLIFY HOSTING                         │
│         (Next.js SSR + CloudFront CDN)                      │
│         https://your-app.amplifyapp.com                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              🟢 AWS LAMBDA (Automatic)                      │
│         Next.js API Routes → Lambda Functions               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────┬──────────────────┬──────────────────────┐
│  ✅ BEDROCK      │  🟢 DYNAMODB     │   🟢 S3              │
│  (Primary AI)    │  (Primary DB)    │   (OCR Images)       │
│  KEEP AS-IS      │  ADD THIS        │   OPTIONAL           │
└──────────────────┴──────────────────┴──────────────────────┘
         ↓                  ↓                    ↓
┌──────────────────┬──────────────────┬──────────────────────┐
│  ✅ OPENAI       │  ✅ SUPABASE     │   ✅ IN-MEMORY       │
│  (Fallback)      │  (Fallback)      │   (Mock Data)        │
│  KEEP AS-IS      │  KEEP AS-IS      │   KEEP AS-IS         │
└──────────────────┴──────────────────┴──────────────────────┘
```

**Legend**:
- ✅ Already implemented - no changes needed
- 🟢 Needs to be added - AWS requirement
- ❌ Non-AWS service - needs AWS alternative

---

## 📁 File-by-File Implementation Guide

### 1. AI Layer - Amazon Bedrock ✅ ALREADY DONE

**File**: `src/agents/adapters/bedrock-adapter.ts`

**Current Code** (Keep as-is):
```typescript
async invokeModel(prompt: string): Promise<string> {
  try {
    // ✅ PRIMARY: AWS Bedrock
    const response = await this.client.send(command);
    return responseBody.content[0].text;
  } catch (error) {
    // ✅ FALLBACK: OpenAI
    const fallbackResponse = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    });
    return fallbackResponse.choices[0]?.message?.content || '{}';
  }
}
```

**Action**: ✅ NO CHANGES NEEDED - Perfect as-is!

---

### 2. Database Layer - Amazon DynamoDB 🟢 NEEDS IMPLEMENTATION

#### Step 2.1: Create DynamoDB Client

**New File**: `src/lib/dynamodb.ts`

```typescript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const dynamoDb = DynamoDBDocumentClient.from(client);

// Check if DynamoDB is configured
export const isDynamoConfigured =
  !!process.env.AWS_ACCESS_KEY_ID &&
  !!process.env.AWS_SECRET_ACCESS_KEY;
```

**Action**: 🟢 CREATE THIS FILE

---

#### Step 2.2: Create Database Adapter

**New File**: `src/lib/database-adapter.ts`

```typescript
import { dynamoDb, isDynamoConfigured } from './dynamodb';
import { supabase, isDbConnected } from './supabase';
import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { PatientSummary } from '@/types';

// Mock data fallback
const MOCK_PATIENTS: PatientSummary[] = [
  // ... existing mock patients
];

export class DatabaseAdapter {
  /**
   * Get all patients
   * Priority: DynamoDB → Supabase → Mock Data
   */
  async getPatients(): Promise<PatientSummary[]> {
    // 🟢 TRY: DynamoDB (AWS requirement)
    if (isDynamoConfigured) {
      try {
        const result = await dynamoDb.send(
          new ScanCommand({ TableName: 'ClinRx_Patients' })
        );
        if (result.Items && result.Items.length > 0) {
          console.log('[DB] Using DynamoDB');
          return result.Items as PatientSummary[];
        }
      } catch (error) {
        console.warn('[DB] DynamoDB failed, falling back to Supabase:', error);
      }
    }

    // ✅ FALLBACK: Supabase
    if (isDbConnected && supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('summary');
        if (!error && data && data.length > 0) {
          console.log('[DB] Using Supabase fallback');
          return data.map(row => row.summary);
        }
      } catch (error) {
        console.warn('[DB] Supabase failed, using mock data:', error);
      }
    }

    // ✅ FINAL FALLBACK: Mock data
    console.log('[DB] Using mock data');
    return MOCK_PATIENTS;
  }

  /**
   * Get single patient by ID
   * Priority: DynamoDB → Supabase → Mock Data
   */
  async getPatient(patientId: string): Promise<PatientSummary | null> {
    // 🟢 TRY: DynamoDB
    if (isDynamoConfigured) {
      try {
        const result = await dynamoDb.send(
          new GetCommand({
            TableName: 'ClinRx_Patients',
            Key: { patient_id: patientId }
          })
        );
        if (result.Item) {
          console.log('[DB] Patient found in DynamoDB');
          return result.Item as PatientSummary;
        }
      } catch (error) {
        console.warn('[DB] DynamoDB failed, trying Supabase:', error);
      }
    }

    // ✅ FALLBACK: Supabase
    if (isDbConnected && supabase) {
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('summary')
          .eq('fhir_id', patientId)
          .single();
        if (!error && data) {
          console.log('[DB] Patient found in Supabase');
          return data.summary as PatientSummary;
        }
      } catch (error) {
        console.warn('[DB] Supabase failed, checking mock data:', error);
      }
    }

    // ✅ FINAL FALLBACK: Mock data
    const mockPatient = MOCK_PATIENTS.find(p => p.patient_id === patientId);
    if (mockPatient) {
      console.log('[DB] Patient found in mock data');
      return mockPatient;
    }

    return null;
  }
}

// Export singleton instance
export const db = new DatabaseAdapter();
```

**Action**: 🟢 CREATE THIS FILE

---

#### Step 2.3: Update API Routes

**File**: `src/app/api/patients/route.ts`

**Current Code**:
```typescript
import { supabase, isDbConnected } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isDbConnected || !supabase) {
    return NextResponse.json({ success: true, patients: MOCK_PATIENTS });
  }
  
  const { data, error } = await supabase
    .from('patients')
    .select('summary');
  // ...
}
```

**New Code**:
```typescript
import { db } from '@/lib/database-adapter';

export async function GET(request: NextRequest) {
  try {
    const patients = await db.getPatients();
    return NextResponse.json({ success: true, patients });
  } catch (error) {
    console.error('Failed to fetch patients:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
```

**Action**: 🟢 MODIFY THIS FILE

---

**File**: `src/app/api/prescription-draft/route.ts`

**Current Code**:
```typescript
let patient: PatientSummary | null = null;

if (isDbConnected && supabase) {
  const { data, error } = await supabase
    .from('patients')
    .select('summary')
    .eq('fhir_id', patient_id)
    .single();
  // ...
}

if (!patient) {
  // Manual mock data fallback
}
```

**New Code**:
```typescript
import { db } from '@/lib/database-adapter';

const patient = await db.getPatient(patient_id);

if (!patient) {
  return NextResponse.json(
    { error: 'Patient not found', patient_id },
    { status: 404 }
  );
}
```

**Action**: 🟢 MODIFY THIS FILE

---

### 3. Hosting - AWS Amplify 🟢 NEEDS CONFIGURATION

**New File**: `amplify.yml`

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

**Action**: 🟢 CREATE THIS FILE

**Environment Variables** (Set in Amplify Console):
```bash
# AWS Services
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=ap-south-1

# Fallback Services
OPENAI_API_KEY=<your-openai-key>
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-key>

# Optional APIs
OPENFDA_API_KEY=<optional>
```

**Action**: 🟢 CONFIGURE IN AMPLIFY CONSOLE

---

### 4. Storage - Amazon S3 🟡 OPTIONAL

**New File**: `src/lib/s3-storage.ts`

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
});

export async function storeOCRImage(
  patientId: string,
  imageBuffer: Buffer
): Promise<string | null> {
  try {
    const key = `ocr/${patientId}/${Date.now()}.jpg`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: 'clinrx-prescriptions',
        Key: key,
        Body: imageBuffer,
        ContentType: 'image/jpeg',
      })
    );
    console.log('[S3] Image stored:', key);
    return key;
  } catch (error) {
    console.warn('[S3] Storage failed, continuing without storage:', error);
    return null;
  }
}
```

**File**: `src/app/api/ocr/route.ts`

**Add to existing code**:
```typescript
import { storeOCRImage } from '@/lib/s3-storage';

export async function POST(request: NextRequest) {
  const { image } = await request.json();
  const imageBuffer = Buffer.from(base64Data, "base64");
  
  // 🟡 OPTIONAL: Store in S3 for audit trail
  await storeOCRImage('patient-id', imageBuffer);
  
  // Continue with existing Bedrock OCR processing...
}
```

**Action**: 🟡 OPTIONAL - Add if time permits

---

## 🎯 Implementation Priority

### Priority 1: MUST HAVE (Hackathon Requirement)
1. ✅ Amazon Bedrock - Already done
2. 🟢 Amazon DynamoDB - Implement database adapter
3. 🟢 AWS Amplify - Create amplify.yml and deploy
4. ✅ AWS Lambda - Automatic via Amplify

**Time Required**: 3-4 hours

---

### Priority 2: NICE TO HAVE (Optional)
5. 🟡 Amazon S3 - OCR image storage
6. 🟡 Amazon API Gateway - Rate limiting
7. 🟡 Amazon ElastiCache - Redis caching

**Time Required**: 2-3 hours

---

## 📋 Step-by-Step Implementation Checklist

### Step 1: DynamoDB Setup (30 minutes)
```bash
# Create DynamoDB table
aws dynamodb create-table \
  --table-name ClinRx_Patients \
  --attribute-definitions AttributeName=patient_id,AttributeType=S \
  --key-schema AttributeName=patient_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1

# Seed with mock data
aws dynamodb put-item \
  --table-name ClinRx_Patients \
  --item file://seed-patient-pt001.json \
  --region ap-south-1
```

### Step 2: Code Implementation (2 hours)
- [ ] Create `src/lib/dynamodb.ts`
- [ ] Create `src/lib/database-adapter.ts`
- [ ] Update `src/app/api/patients/route.ts`
- [ ] Update `src/app/api/prescription-draft/route.ts`
- [ ] Add `@aws-sdk/client-dynamodb` to package.json
- [ ] Add `@aws-sdk/lib-dynamodb` to package.json

### Step 3: AWS Amplify Deployment (1 hour)
- [ ] Create `amplify.yml`
- [ ] Push to GitHub
- [ ] Connect repo to AWS Amplify
- [ ] Configure environment variables
- [ ] Deploy and test

### Step 4: Testing (1 hour)
- [ ] Test with DynamoDB (primary)
- [ ] Test with Supabase (fallback)
- [ ] Test with mock data (final fallback)
- [ ] Test Bedrock AI (primary)
- [ ] Test OpenAI (fallback)
- [ ] Verify all API endpoints work

### Step 5: Documentation (30 minutes)
- [ ] Update README.md with AWS architecture
- [ ] Document environment variables
- [ ] Add deployment instructions
- [ ] Create architecture diagram

---

## 🎬 Testing the Migration

### Test Scenario 1: Full AWS Stack
```bash
# Set environment variables
export AWS_ACCESS_KEY_ID=<your-key>
export AWS_SECRET_ACCESS_KEY=<your-secret>
export AWS_REGION=ap-south-1

# Run application
npm run dev

# Expected: Uses DynamoDB + Bedrock
# Check logs: "[DB] Using DynamoDB"
```

### Test Scenario 2: AWS Bedrock + Supabase Fallback
```bash
# Remove DynamoDB credentials
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY

# Set Supabase credentials
export NEXT_PUBLIC_SUPABASE_URL=<your-url>
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>

# Run application
npm run dev

# Expected: Uses Supabase + Bedrock
# Check logs: "[DB] Using Supabase fallback"
```

### Test Scenario 3: Full Fallback Mode
```bash
# Remove all credentials
unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset NEXT_PUBLIC_SUPABASE_URL
unset OPENAI_API_KEY

# Run application
npm run dev

# Expected: Uses mock data only
# Check logs: "[DB] Using mock data"
```

---

## 📊 Summary: What Changes Where

| Component | File | Action | Priority |
|-----------|------|--------|----------|
| Bedrock AI | `src/agents/adapters/bedrock-adapter.ts` | ✅ Keep as-is | Done |
| DynamoDB Client | `src/lib/dynamodb.ts` | 🟢 Create new | HIGH |
| DB Adapter | `src/lib/database-adapter.ts` | 🟢 Create new | HIGH |
| Patients API | `src/app/api/patients/route.ts` | 🟢 Modify | HIGH |
| Prescription API | `src/app/api/prescription-draft/route.ts` | 🟢 Modify | HIGH |
| Amplify Config | `amplify.yml` | 🟢 Create new | HIGH |
| S3 Storage | `src/lib/s3-storage.ts` | 🟡 Create new | LOW |
| OCR API | `src/app/api/ocr/route.ts` | 🟡 Modify | LOW |
| Package.json | `package.json` | 🟢 Add AWS SDKs | HIGH |

---

**Last Updated**: March 4, 2026  
**Status**: Ready for Implementation  
**Estimated Time**: 4-5 hours for core AWS integration
