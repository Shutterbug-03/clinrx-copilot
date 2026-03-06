# AWS Migration Plan - ClinRx Copilot
## Aligning with AWS Hackathon Technical Standards

---

## 🎯 Hackathon Requirements Alignment

### Required AWS Services
- ✅ **Amazon Bedrock** - Foundation model access (Claude 3.5 Sonnet)
- ⚠️ **AWS Lambda** - Serverless compute (via Next.js API routes)
- ⚠️ **Amazon DynamoDB** - NoSQL database (needs implementation)
- ⚠️ **AWS Amplify** - Hosting & deployment (needs configuration)
- ⚠️ **Amazon API Gateway** - API management (optional enhancement)
- ⚠️ **Amazon S3** - Object storage (optional for OCR images)

### Current Status
- **Bedrock**: ✅ Implemented with OpenAI fallback
- **DynamoDB**: ❌ Using Supabase only
- **Amplify**: ❌ Not configured
- **Lambda**: ✅ Next.js API routes (can deploy to Lambda)
- **API Gateway**: ❌ Not configured
- **S3**: ❌ Not implemented

---

## 📋 Migration Strategy: AWS-First with Fallbacks

### Philosophy
**Primary**: AWS services for hackathon compliance
**Fallback**: Non-AWS services for reliability
**Mock**: Local data for offline development

This ensures:
1. ✅ Meets hackathon AWS requirements
2. ✅ Maintains system reliability
3. ✅ Works in development without AWS credentials

---

## 🔧 Component-by-Component Migration

### 1. AI/ML Layer - Amazon Bedrock ✅ DONE

**Current Implementation**: `src/agents/adapters/bedrock-adapter.ts`

```typescript
// Already implemented with fallback
Try: Amazon Bedrock (Claude 3.5 Sonnet)
  ↓ (on error)
Fallback: OpenAI (GPT-4o-mini)
  ↓ (on error)
Error: "Both AI engines failed"
```

**Why AI is Required**:
- Clinical reasoning requires understanding complex medical context
- Drug selection needs multi-factor decision making
- Natural language processing for doctor notes

**Value Added by AI**:
- Contextual drug recommendations based on patient history
- Natural language understanding of clinical notes
- Confidence scoring for recommendations
- Explainable reasoning chains

**AWS Services Used**:
- Amazon Bedrock Runtime API
- Claude 3.5 Sonnet model (APAC inference profile)
- Converse API for OCR image processing

**Status**: ✅ No changes needed - keep OpenAI fallback

---

### 2. Database Layer - Amazon DynamoDB ⚠️ NEEDS IMPLEMENTATION

**Current Implementation**: `src/lib/supabase.ts` (Supabase only)

**Proposed Architecture**:
```typescript
// NEW: src/lib/database-adapter.ts
export class DatabaseAdapter {
  async getPatients() {
    // Try DynamoDB first (AWS requirement)
    if (AWS_CREDENTIALS_CONFIGURED) {
      try {
        return await this.dynamoClient.scan({
          TableName: 'ClinRx_Patients'
        });
      } catch (error) {
        console.warn('DynamoDB failed, falling back to Supabase');
      }
    }
    
    // Fallback to Supabase
    if (SUPABASE_CONFIGURED) {
      return await supabase.from('patients').select('*');
    }
    
    // Final fallback: Mock data
    return MOCK_PATIENTS;
  }
}
```

**DynamoDB Table Schema**:
```typescript
Table: ClinRx_Patients
Partition Key: patient_id (String)
Attributes:
  - name (String)
  - age (Number)
  - sex (String)
  - chronic_conditions (List)
  - allergies (List)
  - current_meds (List)
  - renal_status (Map)
  - risk_flags (List)
  - created_at (String - ISO timestamp)
  - updated_at (String - ISO timestamp)
```

**Files to Modify**:
- ✅ CREATE: `src/lib/dynamodb.ts` - DynamoDB client
- ✅ CREATE: `src/lib/database-adapter.ts` - Unified database interface
- ✅ MODIFY: `src/app/api/patients/route.ts` - Use adapter
- ✅ MODIFY: `src/app/api/prescription-draft/route.ts` - Use adapter
- ⚠️ KEEP: `src/lib/supabase.ts` - Maintain as fallback

**Status**: ⚠️ Implementation required

---

### 3. Hosting - AWS Amplify ⚠️ NEEDS CONFIGURATION

**Current**: Local development only

**Proposed**: AWS Amplify Hosting with Next.js SSR

**Configuration File**: `amplify.yml`
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

**Environment Variables** (Amplify Console):
```bash
AWS_ACCESS_KEY_ID=<from-iam>
AWS_SECRET_ACCESS_KEY=<from-iam>
AWS_REGION=ap-south-1
OPENAI_API_KEY=<fallback>
NEXT_PUBLIC_SUPABASE_URL=<fallback>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<fallback>
```

**Deployment Architecture**:
```
AWS Amplify Hosting
  ├─ Next.js SSR (Server-side rendering)
  ├─ API Routes → AWS Lambda (automatic)
  ├─ Static Assets → CloudFront CDN
  └─ Environment Variables → Amplify Console
```

**Status**: ⚠️ Configuration file needed

---

### 4. API Layer - AWS Lambda (via Next.js) ✅ READY

**Current**: Next.js API routes in `src/app/api/`

**AWS Integration**: Next.js API routes automatically deploy to Lambda when using Amplify

**API Endpoints**:
- `POST /api/prescription-draft` → Lambda function
- `GET /api/patients` → Lambda function
- `POST /api/ocr` → Lambda function
- `GET /api/inventory` → Lambda function
- `GET /api/context` → Lambda function

**Lambda Configuration** (automatic via Amplify):
```
Runtime: Node.js 20.x
Memory: 1024 MB
Timeout: 30 seconds
Environment: Variables from Amplify
```

**Status**: ✅ No changes needed - works automatically

---

### 5. API Gateway - Amazon API Gateway 🟢 OPTIONAL

**Current**: Direct Next.js API routes

**Enhancement**: Add API Gateway for:
- Rate limiting (prevent abuse)
- API key management
- Request throttling
- CloudWatch logging
- CORS management

**Architecture**:
```
Client Request
  ↓
Amazon API Gateway
  ├─ Rate Limiting: 100 req/min per IP
  ├─ API Key Validation
  ├─ CloudWatch Logging
  ↓
AWS Lambda (Next.js API routes)
  ↓
Bedrock / DynamoDB
```

**Status**: 🟢 Optional enhancement (not required for hackathon)

---

### 6. Storage - Amazon S3 🟢 OPTIONAL

**Current**: OCR images processed in-memory only

**Enhancement**: Store prescription images for audit trail

**Use Cases**:
- Store uploaded prescription images
- Audit trail for OCR processing
- Compliance documentation
- Historical reference

**Implementation**:
```typescript
// src/lib/s3-storage.ts
export async function storeOCRImage(
  patientId: string,
  imageBuffer: Buffer
): Promise<string> {
  try {
    const key = `ocr/${patientId}/${Date.now()}.jpg`;
    await s3Client.putObject({
      Bucket: 'clinrx-prescriptions',
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/jpeg'
    });
    return key;
  } catch (error) {
    console.warn('S3 storage failed, continuing without storage');
    return '';
  }
}
```

**Status**: 🟢 Optional enhancement

---

## 🚀 Implementation Roadmap

### Phase 1: Core AWS Services (Required for Hackathon)

#### Step 1.1: DynamoDB Setup
```bash
# Create DynamoDB table
aws dynamodb create-table \
  --table-name ClinRx_Patients \
  --attribute-definitions \
    AttributeName=patient_id,AttributeType=S \
  --key-schema \
    AttributeName=patient_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

#### Step 1.2: Implement Database Adapter
- Create `src/lib/dynamodb.ts`
- Create `src/lib/database-adapter.ts`
- Update API routes to use adapter
- Test with mock data fallback

#### Step 1.3: AWS Amplify Configuration
- Create `amplify.yml`
- Configure environment variables
- Deploy to Amplify
- Test production deployment

**Timeline**: 2-3 hours
**Priority**: 🔴 HIGH (required for hackathon)

---

### Phase 2: Enhanced AWS Integration (Optional)

#### Step 2.1: API Gateway Integration
- Configure API Gateway
- Set up rate limiting
- Enable CloudWatch logging

#### Step 2.2: S3 Storage for OCR
- Create S3 bucket
- Implement image storage
- Add audit trail

#### Step 2.3: ElastiCache for Redis
- Set up ElastiCache cluster
- Implement caching layer
- Cache API responses

**Timeline**: 3-4 hours
**Priority**: 🟡 MEDIUM (nice to have)

---

## 📊 AWS Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    AWS AMPLIFY HOSTING                      │
│              (Next.js SSR + CloudFront CDN)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  AWS LAMBDA FUNCTIONS                       │
│              (Next.js API Routes - Automatic)               │
│  • POST /api/prescription-draft                             │
│  • GET /api/patients                                        │
│  • POST /api/ocr                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────┬──────────────────┬──────────────────────┐
│  AMAZON BEDROCK  │  AMAZON DYNAMODB │   AMAZON S3          │
│  (Claude 3.5)    │  (Patient Data)  │   (OCR Images)       │
│  Primary AI      │  Primary DB      │   Optional Storage   │
└──────────────────┴──────────────────┴──────────────────────┘
         ↓                  ↓                    ↓
┌──────────────────┬──────────────────┬──────────────────────┐
│  OPENAI          │  SUPABASE        │   IN-MEMORY          │
│  (Fallback AI)   │  (Fallback DB)   │   (Fallback)         │
└──────────────────┴──────────────────┴──────────────────────┘
```

---

## 🎯 Hackathon Submission Narrative

### Why AI is Required

**Problem**: Clinical prescription generation involves:
- Understanding complex patient medical history
- Analyzing drug interactions and contraindications
- Interpreting natural language doctor notes
- Making multi-factor decisions with confidence scoring

**Solution**: Amazon Bedrock with Claude 3.5 Sonnet provides:
- Medical knowledge from training data
- Contextual reasoning capabilities
- Natural language understanding
- Structured JSON output for integration

**Human-in-the-Loop**: AI assists, doctor decides
- AI generates recommendations
- Doctor reviews and approves
- Full override capability maintained
- Explainable reasoning provided

---

### How AWS Services Are Used

#### 1. Amazon Bedrock (Foundation Model)
- **Model**: Claude 3.5 Sonnet (APAC inference profile)
- **Use Case**: Clinical reasoning and OCR
- **API**: InvokeModel and Converse commands
- **Location**: `src/agents/adapters/bedrock-adapter.ts`

#### 2. AWS Lambda (Serverless Compute)
- **Deployment**: Automatic via Amplify + Next.js
- **Functions**: 5 API endpoints
- **Trigger**: HTTP requests via API Gateway
- **Location**: `src/app/api/**/route.ts`

#### 3. Amazon DynamoDB (NoSQL Database)
- **Table**: ClinRx_Patients
- **Access Pattern**: Query by patient_id
- **Billing**: Pay-per-request (serverless)
- **Location**: `src/lib/dynamodb.ts`

#### 4. AWS Amplify (Hosting)
- **Framework**: Next.js 16 with SSR
- **CDN**: CloudFront for static assets
- **CI/CD**: Automatic deployment from Git
- **Config**: `amplify.yml`

#### 5. Amazon S3 (Optional - Object Storage)
- **Use Case**: OCR prescription image storage
- **Bucket**: clinrx-prescriptions
- **Access**: Private with IAM roles

---

### Value Added by AI Layer

#### For Doctors
- **Time Savings**: 5-10 minutes per prescription
- **Error Reduction**: Automated allergy and interaction checking
- **Confidence**: AI-powered recommendations with reasoning
- **Learning**: Explanations help junior doctors learn

#### For Patients
- **Safety**: Multi-layer safety validation
- **Availability**: Inventory-aware prescriptions
- **Cost**: Generic alternatives suggested
- **Compliance**: Clear dosing instructions

#### For Healthcare System
- **Audit Trail**: Complete decision logging
- **Compliance**: Regulatory requirement tracking
- **Analytics**: Prescription pattern analysis
- **Scalability**: Cloud-native architecture

---

## 🔐 Security & Compliance

### AWS IAM Roles
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:ap-south-1::foundation-model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:ap-south-1:*:table/ClinRx_Patients"
    }
  ]
}
```

### Environment Variables (Amplify)
- AWS credentials stored in Amplify Console (encrypted)
- No credentials in code or Git
- Separate dev/staging/prod environments

---

## 📈 Cost Estimation (AWS Services)

### Development/Hackathon Phase
- **Bedrock**: ~$3-5 per 1M tokens (Claude 3.5 Sonnet)
- **DynamoDB**: Free tier (25 GB storage, 25 WCU/RCU)
- **Lambda**: Free tier (1M requests/month)
- **Amplify**: Free tier (1000 build minutes/month)
- **S3**: $0.023 per GB (minimal for images)

**Estimated Monthly Cost**: $0-10 (within free tier)

### Production Phase (1000 prescriptions/day)
- **Bedrock**: ~$50/month
- **DynamoDB**: ~$10/month
- **Lambda**: ~$5/month
- **Amplify**: ~$15/month
- **S3**: ~$5/month

**Estimated Monthly Cost**: ~$85/month

---

## ✅ Implementation Checklist

### Required for Hackathon Submission
- [ ] Create DynamoDB table `ClinRx_Patients`
- [ ] Implement `src/lib/dynamodb.ts`
- [ ] Implement `src/lib/database-adapter.ts`
- [ ] Update `src/app/api/patients/route.ts`
- [ ] Update `src/app/api/prescription-draft/route.ts`
- [ ] Create `amplify.yml`
- [ ] Deploy to AWS Amplify
- [ ] Update README.md with AWS architecture
- [ ] Test end-to-end with AWS services
- [ ] Document fallback behavior

### Optional Enhancements
- [ ] Add API Gateway integration
- [ ] Implement S3 image storage
- [ ] Add ElastiCache for caching
- [ ] Set up CloudWatch monitoring
- [ ] Configure AWS WAF for security

---

## 🎬 Demo Script for Judges

### Demonstrating AWS Integration

1. **Show AWS Console**
   - DynamoDB table with patient data
   - Amplify deployment status
   - Lambda function logs
   - Bedrock API usage

2. **Show Application**
   - Generate prescription (uses Bedrock)
   - View patient data (from DynamoDB)
   - Upload prescription image (OCR via Bedrock)

3. **Show Fallback Behavior**
   - Disable AWS credentials
   - System falls back to Supabase
   - Disable Supabase
   - System uses mock data
   - Demonstrate resilience

4. **Show Code**
   - `bedrock-adapter.ts` - AI integration
   - `database-adapter.ts` - Multi-database support
   - `amplify.yml` - Deployment config

---

## 📞 Next Steps

### Immediate (Before Hackathon Submission)
1. Implement DynamoDB adapter (2 hours)
2. Create amplify.yml (30 minutes)
3. Deploy to AWS Amplify (1 hour)
4. Test end-to-end (1 hour)
5. Update documentation (30 minutes)

**Total Time**: ~5 hours

### Post-Hackathon
1. Add API Gateway for rate limiting
2. Implement S3 storage for audit trail
3. Set up CloudWatch monitoring
4. Add ElastiCache for performance
5. Implement authentication with Cognito

---

**Last Updated**: March 4, 2026  
**Status**: Ready for Implementation  
**Priority**: 🔴 HIGH - Required for Hackathon Compliance
