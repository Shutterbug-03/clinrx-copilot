#!/bin/bash

# Test API Keys and Connections
# Run with: ./test-api-keys.sh

echo "🔍 TESTING API CONNECTIONS"
echo "======================================================================"
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Test 1: OpenAI
echo "1️⃣  Testing OpenAI API..."
echo "----------------------------------------------------------------------"
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY not set"
else
    echo "   API Key: ${OPENAI_API_KEY:0:20}..."
    OPENAI_RESPONSE=$(curl -s https://api.openai.com/v1/models \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json")
    
    if echo "$OPENAI_RESPONSE" | grep -q "gpt-4"; then
        echo "   ✅ OpenAI API is working"
        echo "   Available models: $(echo $OPENAI_RESPONSE | jq -r '.data[0:3][].id' | tr '\n' ', ')"
    else
        echo "   ❌ OpenAI API failed"
        echo "   Response: $OPENAI_RESPONSE"
    fi
fi
echo ""

# Test 2: OpenFDA
echo "2️⃣  Testing OpenFDA API..."
echo "----------------------------------------------------------------------"
if [ -z "$OPENFDA_API_KEY" ]; then
    echo "⚠️  OPENFDA_API_KEY not set (will use rate-limited public access)"
    FDA_URL="https://api.fda.gov/drug/label.json?search=openfda.brand_name:Lipitor&limit=1"
else
    echo "   API Key: ${OPENFDA_API_KEY:0:20}..."
    FDA_URL="https://api.fda.gov/drug/label.json?api_key=$OPENFDA_API_KEY&search=openfda.brand_name:Lipitor&limit=1"
fi

FDA_RESPONSE=$(curl -s "$FDA_URL")

if echo "$FDA_RESPONSE" | grep -q "Lipitor"; then
    echo "   ✅ OpenFDA API is working"
    echo "   Test drug: $(echo $FDA_RESPONSE | jq -r '.results[0].openfda.brand_name[0]')"
else
    echo "   ❌ OpenFDA API failed"
    echo "   Response: $FDA_RESPONSE"
fi
echo ""

# Test 3: FHIR Server
echo "3️⃣  Testing FHIR Server..."
echo "----------------------------------------------------------------------"
FHIR_URL="${FHIR_BASE_URL:-https://hapi.fhir.org/baseR4}"
echo "   FHIR URL: $FHIR_URL"

FHIR_RESPONSE=$(curl -s "$FHIR_URL/Patient?_count=1")

if echo "$FHIR_RESPONSE" | grep -q "resourceType"; then
    echo "   ✅ FHIR Server is accessible"
    echo "   Total patients: $(echo $FHIR_RESPONSE | jq -r '.total')"
else
    echo "   ❌ FHIR Server failed"
    echo "   Response: $FHIR_RESPONSE"
fi
echo ""

# Test 4: Supabase
echo "4️⃣  Testing Supabase..."
echo "----------------------------------------------------------------------"
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not set"
elif [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
else
    echo "   Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
    echo "   API Key: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:20}..."
    
    SUPABASE_RESPONSE=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
        -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if echo "$SUPABASE_RESPONSE" | grep -q "message"; then
        echo "   ✅ Supabase is accessible"
    else
        echo "   ⚠️  Supabase connection unclear"
        echo "   Response: $SUPABASE_RESPONSE"
    fi
fi
echo ""

# Test 5: Local Development Server
echo "5️⃣  Testing Local Development Server..."
echo "----------------------------------------------------------------------"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Development server is running on http://localhost:3000"
else
    echo "   ⚠️  Development server is not running"
    echo "   Run: npm run dev"
fi
echo ""

# Summary
echo "======================================================================"
echo "✅ API CONNECTION TESTS COMPLETE"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "1. If OpenAI is working: AI reasoning is enabled ✅"
echo "2. If OpenFDA is working: Real drug data is available ✅"
echo "3. If FHIR is working: Can fetch patient data ✅"
echo "4. If Supabase is working: Can store prescriptions ✅"
echo ""
echo "To test the full system:"
echo "  npm run dev"
echo "  npx tsx test-agents.ts"
echo ""
