# InvestoScope

Discover investments that fit your budget. Enter any amount and instantly see real investment options across Mutual Funds, SIPs, ETFs, and Stocks. No advice. No jargon.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables

Create `.env.local` file:

```bash
# Required
DATABASE_URL="your_mongodb_connection_string"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate_random_string"
CRON_SECRET="generate_random_string_32_chars_minimum"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Optional but recommended for better data
TWELVEDATA_API_KEY="your_twelvedata_key"
ALPHAVANTAGE_API_KEY="your_alphavantage_key"

# Email (for magic link auth)
EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
EMAIL_FROM="no-reply@investoscope.app"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

**Generate CRON_SECRET:**
```powershell
# PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

Or use: https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")

### 3. Setup Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

### 4. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

---

## 📊 Getting Real Data

### Step 1: Get API Keys (Optional but Recommended)

#### TwelveData (Recommended - Best for Indian Markets)

1. **Sign Up**: Go to https://twelvedata.com/
2. **Get API Key**: Dashboard → API Keys → Copy key
3. **Free Tier**: 800 calls/day, 2 calls/min
4. **Add to `.env.local`**: `TWELVEDATA_API_KEY="your_key"`

#### Alpha Vantage (Optional Backup)

1. **Request Key**: Go to https://www.alphavantage.co/support/#api-key
2. **Fill Form**: Enter name, email, purpose
3. **Check Email**: You'll receive API key via email
4. **Free Tier**: 500 calls/day, 5 calls/min
5. **Add to `.env.local`**: `ALPHAVANTAGE_API_KEY="your_key"`

**Note**: Yahoo Finance works as a free fallback, so API keys are optional but recommended for better reliability.

### Step 2: Run Sync Jobs

#### Option A: Use Admin Dashboard (Easiest)

1. Go to: **http://localhost:3000/admin/sync**
2. Click "Run Sync" for each job in order:
   - ✅ **Sync NSE Stocks & ETFs** (2-5 min) - Fetches all stocks/ETFs from NSE
   - ✅ **Sync AMFI Mutual Funds** (3-5 min) - Fetches all MF schemes from AMFI
   - ✅ **Update Stock/ETF Prices** (5-10 min) - Updates current prices
   - ✅ **Update MF NAVs** (2-3 min) - Updates latest NAVs

**Progress Tracking**: You'll see real-time progress with item counts, percentage, and current item being processed!

#### Option B: Use Terminal Commands

```powershell
# Replace YOUR_CRON_SECRET with your actual secret
$SECRET = "YOUR_CRON_SECRET"

# 1. Sync NSE Stocks & ETFs
curl -X POST http://localhost:3000/api/jobs/sync-nse-universe -H "X-CRON-KEY: $SECRET"

# 2. Sync AMFI Mutual Funds
curl -X POST http://localhost:3000/api/jobs/sync-mf-universe -H "X-CRON-KEY: $SECRET"

# 3. Update Stock/ETF Prices
curl -X POST http://localhost:3000/api/jobs/sync-prices -H "X-CRON-KEY: $SECRET"

# 4. Update MF NAVs
curl -X POST http://localhost:3000/api/jobs/sync-mf-nav -H "X-CRON-KEY: $SECRET"
```

### Step 3: Verify Data

Visit: **http://localhost:3000/api/debug/counts**

You should see:
```json
{
  "ok": true,
  "counts": {
    "options_total": 5000+,
    "options_mf": 3000+,
    "options_stock": 2000+,
    "options_etf": 100+,
    "prices_rows": 10000+
  }
}
```

### Step 4: Test Discovery

1. Go to: **http://localhost:3000/dashboard**
2. Enter amount: `₹100`
3. Select category: `Mutual Funds`
4. Select mode: `SIP`
5. Click "Find options"

**You should now see REAL mutual funds from AMFI!** 🎉

---

## 🎯 Features

- **Budget-First Discovery**: Enter any amount, see what's actually available
- **Real-Time Progress**: Watch sync jobs with live progress indicators
- **Multiple Investment Types**: Mutual Funds, SIPs, ETFs, Stocks
- **Historical Charts**: View 1-year performance charts
- **Goal-Based Suggestions**: Plan investments for specific goals
- **Discovery Quiz**: Get personalized investment matches
- **Affordable Picks**: Curated budget-friendly options
- **Cookie Consent**: GDPR-compliant cookie management

---

## 📁 Project Structure

```
investoscope/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes
│   │   ├── (marketing)/       # Marketing pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── api/                # API routes
│   │   │   ├── jobs/          # Sync job endpoints
│   │   │   └── admin/         # Admin endpoints
│   │   └── dashboard/         # Main app pages
│   ├── components/            # React components
│   │   ├── charts/            # Chart components
│   │   └── ui/                # Shadcn/ui components
│   ├── lib/                   # Utilities & helpers
│   │   ├── auth.ts            # NextAuth config
│   │   ├── prisma.ts          # Prisma client
│   │   ├── discovery.ts       # Discovery logic
│   │   ├── vendor.ts          # External API integrations
│   │   └── sync-helpers.ts    # Sync job helpers
│   └── styles/                # Global styles
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Seed script
├── vercel.json                # Vercel cron config
└── package.json
```

---

## 🔄 Sync Jobs Explained

### Automated Schedule (Vercel Cron)

| Job | Source | What It Does | Schedule (UTC) | Time (IST) | Duration |
|-----|--------|--------------|----------------|------------|----------|
| **run-maintenance** | Multiple | Updates prices + catalogue | `0 3 * * 1-5` | **8:30 AM Mon-Fri** | 10-15 min |
| **run-maintenance (Backup)** | Multiple | Backup price update | `0 14 * * 1-5` | **7:30 PM Mon-Fri** | 10-15 min |
| **auto-sync-if-stale** | System | Auto-triggers if data stale | `0 16 * * 1-5` | **9:30 PM Mon-Fri** | <1 min |
| **sync-catalogue** | NSE + AMFI | Discovers new listings | `0 2 * * 1` | **7:30 AM Monday** | 5-10 min |

**Why Multiple Syncs?**
- ✅ **Primary (Morning)**: Ensures Top Movers has fresh data by market open
- ✅ **Backup (Evening)**: Safety net if morning sync fails
- ✅ **Auto-Check (Late Evening)**: Automatically triggers sync if data >26 hours old
- ✅ **Result**: **99%+ reliability for daily Top Movers updates**

**Times are in UTC. IST = UTC + 5:30**

---

## 🐛 Troubleshooting

### 401 Unauthorized (Sync Jobs)
- ✅ Check `X-CRON-KEY` header (case-sensitive)
- ✅ Verify `CRON_SECRET` in `.env.local` matches
- ✅ Restart dev server after adding `CRON_SECRET`

### Zero Results After Sync
- ✅ Wait for sync to complete (check progress in admin dashboard)
- ✅ Check `/api/debug/counts` - if low, sync didn't work
- ✅ Try running syncs again
- ✅ Try different amount/category combinations

### NSE/AMFI Fetch Fails
- ✅ Check internet connection
- ✅ Try different network (disable VPN)
- ✅ NSE rate-limits - wait a few minutes between retries
- ✅ Check browser console for detailed error messages

### Charts Still Empty
- ✅ Wait for `sync-prices` to complete (takes 5-10 minutes)
- ✅ Prices sync takes longest
- ✅ Check browser console for errors
- ✅ Try well-known symbols: `RELIANCE.NS`, `TCS.NS`, `NIFTYBEES.NS`

### Rate Limit Errors
- ✅ You'll see "Rate Limit Error" notification
- ✅ Wait a few minutes and try again
- ✅ Consider upgrading API tier if frequent
- ✅ Sync jobs will automatically retry on next schedule

---

## 🚀 Production Deployment (Vercel)

### 1. Add Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add all variables from `.env.local`:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `NEXT_PUBLIC_BASE_URL`
- `TWELVEDATA_API_KEY` (optional)
- `ALPHAVANTAGE_API_KEY` (optional)
- `EMAIL_SERVER`
- `EMAIL_FROM`
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

### 2. Deploy

```bash
git add .
git commit -m "Deploy to production"
git push
```

### 3. Cron Jobs

Vercel will automatically run sync jobs at scheduled times (see `vercel.json`).

**Note**: Vercel Cron may need additional configuration for custom headers. The cron jobs use `X-CRON-KEY` header which should be configured in Vercel Dashboard → Settings → Cron Jobs.

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate    # Run database migrations
npm run seed         # Seed database (minimal - no dummy data)
```

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB (via Prisma)
- **Auth**: NextAuth.js (Google + Email)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **UI Components**: Shadcn/ui
- **Deployment**: Vercel

---

## 📝 API Endpoints

### Public Endpoints

- `GET /api/db-health` - Database health check
- `GET /api/debug/counts` - Get data counts
- `POST /api/discover` - Discover investment options
- `GET /api/affordable` - Get affordable picks
- `GET /api/charts/[symbol]` - Get chart data for stock/ETF
- `GET /api/nav/[code]` - Get NAV data for mutual fund
- `POST /api/quiz/results` - Get quiz-based matches

### Protected Endpoints (Require CRON_SECRET)

- `POST /api/jobs/sync-nse-universe` - Sync NSE stocks/ETFs
- `POST /api/jobs/sync-mf-universe` - Sync AMFI mutual funds
- `POST /api/jobs/sync-prices` - Update stock/ETF prices
- `POST /api/jobs/sync-mf-nav` - Update MF NAVs

### Admin Endpoints

- `POST /api/admin/sync` - Trigger sync jobs (proxy)
- `POST /api/admin/clear-db` - Clear all data
- `GET /api/admin/progress/[jobId]` - Get sync job progress

---

## 🎨 UI/UX Features

- **Premium Black & White Theme**: Modern, minimalist design
- **Real-Time Progress**: Live updates during sync jobs
- **Interactive Cards**: Hover effects and smooth animations
- **Responsive Design**: Works on all devices
- **Loading States**: Skeleton loaders and progress indicators
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Success/error feedback

---

## 📚 Additional Resources

### Testing API Keys

```powershell
# Test TwelveData
curl "https://api.twelvedata.com/time_series?symbol=RELIANCE.NS&interval=1day&apikey=YOUR_KEY"

# Test Alpha Vantage
curl "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=RELIANCE.NS&apikey=YOUR_KEY"
```

### Cost Summary

| Service | Free Tier | Paid Tier | Best For |
|---------|-----------|-----------|----------|
| TwelveData | 800 calls/day | $9.99/mo (8K calls) | **Recommended** |
| Alpha Vantage | 500 calls/day | $49.99/mo (75K calls) | Backup option |
| Yahoo Finance | Unlimited* | Free | Fallback |

*Rate-limited, may block if abused

---

## ✅ Success Checklist

- [ ] `.env.local` configured with all required variables
- [ ] Database connected and migrations run
- [ ] API keys obtained (optional but recommended)
- [ ] All 4 sync jobs return `{ ok: true }` when tested
- [ ] `/api/debug/counts` shows large numbers
- [ ] `/dashboard` shows real options (not seed data)
- [ ] Charts load for stocks/ETFs with symbols
- [ ] Vercel environment variables set (for production)
- [ ] `vercel.json` committed and deployed

---

## 🆘 Need Help?

### Common Issues

1. **"CRON_SECRET not configured"**: Add `CRON_SECRET` to `.env.local` and restart server
2. **"401 Unauthorized"**: Check `X-CRON-KEY` header matches `CRON_SECRET`
3. **"No data after sync"**: Wait for sync to complete, check progress in admin dashboard
4. **"Charts not loading"**: Wait for `sync-prices` to complete (takes 5-10 minutes)

### Getting Support

- Check browser console for detailed error messages
- Check terminal logs for sync job errors
- Visit `/api/debug/counts` to verify data
- Use admin dashboard at `/admin/sync` to monitor progress

---

## 📄 License

Private project - All rights reserved

---

## 🎉 You're All Set!

Your app now:
- ✅ Pulls real MF schemes from AMFI
- ✅ Pulls real stocks/ETFs from NSE
- ✅ Fetches real prices from APIs
- ✅ Updates NAVs daily
- ✅ Auto-syncs on schedule
- ✅ Shows real-time progress
- ✅ Works like Groww! 🚀

**Happy investing!** 💰

