// prisma/seed.ts
// MINIMAL SEED - All real data comes from API sync jobs!
// Run sync jobs to populate database with real stocks, ETFs, and mutual funds.

import { prisma } from "../src/lib/prisma";

async function main() {
  // Clear existing data (optional - comment out if you want to keep existing data)
  // await prisma.investmentOption.deleteMany({});
  // await prisma.affordablePick.deleteMany({});

  console.log("✅ Seed complete (no dummy data)");
  console.log("📊 To get REAL data, run the sync jobs:");
  console.log("   1. POST /api/jobs/sync-nse-universe (Stocks & ETFs from NSE)");
  console.log("   2. POST /api/jobs/sync-mf-universe (Mutual Funds from AMFI)");
  console.log("   3. POST /api/jobs/sync-prices (Update prices from APIs)");
  console.log("   4. POST /api/jobs/sync-mf-nav (Update MF NAVs)");
  console.log("");
  console.log("See SYNC_JOBS_SETUP.md for instructions");
}

main().finally(async () => {
  await prisma.$disconnect();
});


