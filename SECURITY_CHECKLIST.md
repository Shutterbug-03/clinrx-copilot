# Security Checklist - Before Making Repository Public

## ✅ Current Status

### Protected (Good!)
- ✅ `.env.local` is in `.gitignore` and NOT committed to git
- ✅ No hardcoded API keys found in source code
- ✅ `.env.example` only contains placeholder values
- ✅ API routes use environment variables correctly

---

## 🔴 URGENT: Revoke Exposed API Keys

Even though your keys are not in the git history, they were visible in your local `.env.local` file. For maximum security, you should revoke and regenerate these keys:

### 1. OpenAI API Key
**Current Key (REVOKE THIS):** `sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

**Action Required:**
1. Go to https://platform.openai.com/api-keys
2. Find this key and click "Revoke"
3. Create a new API key
4. Update your `.env.local` with the new key

### 2. Supabase Keys
**Current Keys (REVOKE THESE):**
- URL: `https://qxarudsesyovxwjkdmvz.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4YXJ1ZHNlc3lvdnh3amtkbXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjE2NjcsImV4cCI6MjA4NjE5NzY2N30.WRF6irafIiDgMamJeziHVock3KvNQrYur4y-lnQ-Zig`
- Service Key: `sb_publishable_AIzD72Tnm7Q7bGpmhSeLXQ_KGx2Bt1e`

**Action Required:**
1. Go to https://supabase.com/dashboard/project/qxarudsesyovxwjkdmvz/settings/api
2. Click "Reset" on both Anon Key and Service Key
3. Update your `.env.local` with new keys

**Note:** Supabase anon keys are designed to be public-facing, but service keys should NEVER be exposed. Consider using Row Level Security (RLS) policies instead of service keys in production.

### 3. OpenFDA API Key
**Current Key (REVOKE THIS):** `dpJ3TnOYh9Acj3fsnwhjYLhskeiGys1zrqGEZ1Gi`

**Action Required:**
1. Go to https://open.fda.gov/apis/authentication/
2. Revoke the current key
3. Generate a new API key
4. Update your `.env.local`

**Note:** OpenFDA works without a key (40 req/min), so you can also just remove this if not needed.

---

## ✅ Pre-Public Repository Checklist

Before making your repository public, verify:

- [ ] All API keys have been revoked and regenerated
- [ ] `.env.local` is in `.gitignore` (already done ✅)
- [ ] No sensitive data in git history
- [ ] `.env.example` contains only placeholders (already done ✅)
- [ ] README.md doesn't contain real credentials
- [ ] No database passwords or connection strings in code
- [ ] No personal information (emails, phone numbers) in code
- [ ] Test data doesn't contain real patient information

---

## 🔒 Additional Security Recommendations

### 1. Add GitHub Secret Scanning
Once public, enable GitHub's secret scanning:
- Go to: Settings → Security → Code security and analysis
- Enable "Secret scanning"
- Enable "Push protection"

### 2. Add Security Policy
Create a `SECURITY.md` file with:
- How to report security vulnerabilities
- Supported versions
- Security update policy

### 3. Environment Variable Management
For production deployment:
- Use Vercel Environment Variables (encrypted)
- Never commit production credentials
- Use different keys for dev/staging/production
- Rotate keys regularly (every 90 days)

### 4. Supabase Row Level Security
Instead of using service keys, implement RLS policies:
```sql
-- Example: Only doctors can read patient data
CREATE POLICY "Doctors can view patients"
ON patients FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'role' = 'doctor');
```

### 5. API Rate Limiting
Add rate limiting to your API routes to prevent abuse:
```typescript
// Example middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

---

## 📋 Making Repository Public - Steps

Once you've completed the security checklist:

1. **Revoke all exposed API keys** (see above)
2. **Verify no secrets in git history:**
   ```bash
   git log --all --full-history --source -- .env.local
   ```
3. **Make repository public:**
   - Go to: https://github.com/Shutterbug-03/clinrx-copilot/settings
   - Scroll to "Danger Zone"
   - Click "Change visibility"
   - Select "Make public"
   - Confirm by typing repository name

4. **Submit to hackathon:**
   - Provide GitHub repo URL: `https://github.com/Shutterbug-03/clinrx-copilot`
   - Ensure `requirements.md` and `design.md` are visible

---

## 🚨 If Keys Were Already Exposed

If you accidentally pushed keys to GitHub:

1. **Immediately revoke all keys** (don't wait!)
2. **Remove from git history:**
   ```bash
   # Use BFG Repo-Cleaner or git-filter-repo
   git filter-repo --path .env.local --invert-paths
   ```
3. **Force push** (only if repo is private and you're the only contributor)
4. **Monitor for unauthorized usage** in API dashboards

---

## ✅ Safe to Make Public

Your repository is safe to make public AFTER:
1. ✅ Revoking and regenerating all API keys listed above
2. ✅ Updating your local `.env.local` with new keys
3. ✅ Verifying no secrets in git history (already clean ✅)

---

**Last Updated:** February 14, 2026  
**Status:** Ready for public release after key rotation
