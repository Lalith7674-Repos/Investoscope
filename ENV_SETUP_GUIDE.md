# 🔐 Environment Variables Setup Guide

## 📋 **Quick Answers to Your Questions**

### 1. **NEXTAUTH_URL - Should I Change It?**

**For Local Development (.env.local):**
```bash
NEXTAUTH_URL="http://localhost:3000"  # ✅ Keep this for local
```

**For Production (Vercel Dashboard):**
```bash
NEXTAUTH_URL="https://investoscope.vercel.app"  # ✅ Change to your production URL
```

**Why Different?**
- Local: You're running on `localhost:3000`
- Production: Vercel provides your domain (e.g., `investoscope.vercel.app`)
- NextAuth needs to know the correct URL for OAuth callbacks

---

### 2. **NEXTAUTH_SECRET - How to Generate?**

I just generated one for you! Here are multiple ways:

#### **Option A: Use the One I Generated (Recommended)**
```bash
NEXTAUTH_SECRET="LpG/8lJ0bYpCz1LEuc1pGhgYwlE2j0kyioVyzZErTg4="
```

#### **Option B: Generate Your Own (PowerShell)**
```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

#### **Option C: Generate Your Own (Node.js)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### **Option D: Online Generator**
Visit: https://generate-secret.vercel.app/32
- Click "Generate"
- Copy the secret

**Important**: Use the **SAME secret** in both:
- `.env.local` (for local development)
- Vercel Dashboard (for production)

---

### 3. **NEXT_PUBLIC_BASE_URL - Is My Value Correct?**

**Your Current Value:**
```bash
NEXT_PUBLIC_BASE_URL="https://investoscope.vercel.app"
```

**✅ This is CORRECT!** However, here's the full picture:

#### **For Local Development (.env.local):**
```bash
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

#### **For Production (Vercel Dashboard):**
```bash
NEXT_PUBLIC_BASE_URL="https://investoscope.vercel.app"
```

**Note**: Vercel also automatically provides `VERCEL_URL` environment variable, so the code has a fallback. But setting `NEXT_PUBLIC_BASE_URL` explicitly is better for reliability.

---

## 📝 **Complete .env.local Template**

Create/update your `.env.local` file:

```bash
# ============================================
# DATABASE
# ============================================
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/investoscope?retryWrites=true&w=majority"

# ============================================
# AUTHENTICATION (NextAuth)
# ============================================
# For LOCAL development - keep as localhost
NEXTAUTH_URL="http://localhost:3000"
# Generate a secret (see above) - use the SAME one in Vercel
NEXTAUTH_SECRET="LpG/8lJ0bYpCz1LEuc1pGhgYwlE2j0kyioVyzZErTg4="

# ============================================
# BASE URL
# ============================================
# For LOCAL development - keep as localhost
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# ============================================
# CRON SECRET (for sync jobs)
# ============================================
# Use your existing CRON_SECRET (you already have this)
CRON_SECRET="your_existing_cron_secret_here"

# ============================================
# OPTIONAL - API Keys (Recommended)
# ============================================
TWELVEDATA_API_KEY="your_twelvedata_key"
ALPHAVANTAGE_API_KEY="your_alphavantage_key"

# ============================================
# OPTIONAL - Email (for magic link auth)
# ============================================
EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
EMAIL_FROM="no-reply@investoscope.app"

# ============================================
# OPTIONAL - Google OAuth
# ============================================
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# ============================================
# OPTIONAL - Alerts (for monitoring)
# ============================================
ALERT_EMAIL_TO="your-email@example.com"
ALERT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

---

## 🚀 **Vercel Production Configuration**

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Select your project: **Investoscope**
3. Go to: **Settings** → **Environment Variables**

### Step 2: Add Each Variable

**IMPORTANT**: Set these for **Production**, **Preview**, and **Development** environments:

```bash
# REQUIRED - Use PRODUCTION URLs
DATABASE_URL=your_production_mongodb_url
NEXTAUTH_URL=https://investoscope.vercel.app
NEXTAUTH_SECRET=LpG/8lJ0bYpCz1LEuc1pGhgYwlE2j0kyioVyzZErTg4=  # SAME as local
NEXT_PUBLIC_BASE_URL=https://investoscope.vercel.app
CRON_SECRET=your_existing_cron_secret_here  # SAME as local (use your existing one)

# OPTIONAL (but recommended)
TWELVEDATA_API_KEY=your_key
ALPHAVANTAGE_API_KEY=your_key
EMAIL_SERVER=smtp://user:pass@smtp.example.com:587
EMAIL_FROM=no-reply@investoscope.app
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
ALERT_EMAIL_TO=your-email@example.com
```

### Step 3: Redeploy
After adding variables, **redeploy** your project:
- Go to **Deployments** tab
- Click **"Redeploy"** on the latest deployment
- Or push a new commit to trigger auto-deploy

---

## ✅ **Quick Checklist**

### Local Development (.env.local):
- [ ] `NEXTAUTH_URL="http://localhost:3000"` ✅
- [ ] `NEXTAUTH_SECRET` - Generated and added ✅
- [ ] `NEXT_PUBLIC_BASE_URL="http://localhost:3000"` ✅
- [ ] `CRON_SECRET` - Generated and added ✅
- [ ] `DATABASE_URL` - Your MongoDB connection string ✅

### Production (Vercel Dashboard):
- [ ] `NEXTAUTH_URL="https://investoscope.vercel.app"` ✅
- [ ] `NEXTAUTH_SECRET` - **SAME as local** ✅
- [ ] `NEXT_PUBLIC_BASE_URL="https://investoscope.vercel.app"` ✅
- [ ] `CRON_SECRET` - **SAME as local** ✅
- [ ] `DATABASE_URL` - Your production MongoDB URL ✅
- [ ] All other variables added ✅
- [ ] Project redeployed after adding variables ✅

---

## 🔑 **Key Points**

1. **NEXTAUTH_URL**: 
   - Local = `http://localhost:3000`
   - Production = `https://investoscope.vercel.app`

2. **NEXTAUTH_SECRET**: 
   - Generate once (I provided one above)
   - Use the **SAME** secret in both local and production

3. **NEXT_PUBLIC_BASE_URL**: 
   - Local = `http://localhost:3000`
   - Production = `https://investoscope.vercel.app`
   - Your value is correct! ✅

4. **CRON_SECRET**: 
   - Use your **existing** CRON_SECRET (you already have this)
   - Use the **SAME** secret in both local and production

---

## 🎯 **Summary**

**Your Questions Answered:**

1. ✅ **NEXTAUTH_URL**: Keep `localhost` for local, change to `https://investoscope.vercel.app` in Vercel
2. ✅ **NEXTAUTH_SECRET**: I generated one for you: `LpG/8lJ0bYpCz1LEuc1pGhgYwlE2j0kyioVyzZErTg4=`
3. ✅ **NEXT_PUBLIC_BASE_URL**: Your value `https://investoscope.vercel.app` is **CORRECT**!

**Action Items:**
1. Add `NEXTAUTH_SECRET` to your `.env.local` (use the one I generated)
2. Use your **existing** `CRON_SECRET` (you already have this)
3. In Vercel Dashboard, add all variables with **production URLs**
4. Redeploy after adding variables

You're all set! 🚀

