#!/bin/bash

# ==============================================================================
# RxAI - AWS SSM Secrets Setup Script
# ==============================================================================
# This script pushes critical environment variables from .env.local 
# to AWS System Manager (SSM) Parameter Store for production use.
# ==============================================================================

# 1. Load critical secrets (manually parsed to avoid dotenv requirement)
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
else
    echo "❌ .env.local not found at project root."
    exit 1
fi

PREFIX="/rxai/prod"
REGION="ap-south-1"

echo "🚀 Starting SSM Parameter upload to region $REGION..."

# Helper function for SSM upload
push_secret() {
    local name=$1
    local value=$2
    local type=${3:-SecureString}

    if [ -z "$value" ]; then
        echo "⚠️  Skipping $name: Value is empty."
        return
    fi

    echo "📡 Pushing $PREFIX/$name..."
    aws ssm put-parameter \
        --name "$PREFIX/$name" \
        --value "$value" \
        --type "$type" \
        --overwrite \
        --region "$REGION"
}

# AI / LLM
push_secret "OPENAI_API_KEY" "$OPENAI_API_KEY"

# Supabase (Fallback)
push_secret "SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL"
push_secret "SUPABASE_KEY" "$SUPABASE_SERVICE_KEY"
push_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "String"

# Cognito
push_secret "USER_POOL_ID" "$NEXT_PUBLIC_USER_POOL_ID" "String"
push_secret "USER_POOL_CLIENT_ID" "$NEXT_PUBLIC_USER_POOL_CLIENT_ID" "String"

# AWS Configuration
push_secret "AWS_ACCESS_KEY_ID" "$AWS_ACCESS_KEY_ID"
push_secret "AWS_SECRET_ACCESS_KEY" "$AWS_SECRET_ACCESS_KEY"
push_secret "AWS_REGION" "$AWS_REGION" "String"

echo "✅ All production secrets have been pushed to AWS SSM ($PREFIX/)."
echo "👉 Make sure your Amplify environment variables include SSM_PREFIX=$PREFIX"
