/**
 * Script to manually run the sync-catalogue job locally
 * This will fetch NSE securities and AMFI mutual funds and create/update them in the database
 * 
 * Usage: npm run sync:catalogue
 */

import { PrismaClient } from '@prisma/client';
import { fetchNseSecuritiesCsv, fetchAmfiSchemeMaster } from '../src/lib/vendor';
import { upsertSecurityFromNse, upsertMutualFundFromAmfi } from '../src/lib/sync-helpers';

const prisma = new PrismaClient();

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 10000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await sleep(delayMs);
    return withRetry(fn, retries - 1, delayMs);
  }
}

async function runSyncCatalogue() {
  console.log('🚀 Starting catalogue sync...\n');

  try {
    // Fetch NSE securities
    console.log('📥 Fetching NSE securities...');
    const nseRows = await withRetry(() => fetchNseSecuritiesCsv(), 1);
    console.log(`   Found ${nseRows.length} NSE securities\n`);

    let stockCreated = 0;
    let stockUpdated = 0;
    let etfCreated = 0;
    let etfUpdated = 0;
    const seenStockSymbols = new Set<string>();

    console.log('🔄 Processing NSE securities...');
    for (let i = 0; i < nseRows.length; i++) {
      const row = nseRows[i];
      const result = await upsertSecurityFromNse(row);
      if (!result) continue;
      
      if (result.symbol) seenStockSymbols.add(result.symbol);
      
      if (result.status === "created") {
        if (result.category === "ETF") {
          etfCreated++;
        } else {
          stockCreated++;
        }
      } else if (result.status === "updated") {
        if (result.category === "ETF") {
          etfUpdated++;
        } else {
          stockUpdated++;
        }
      }

      if ((i + 1) % 100 === 0) {
        console.log(`   Processed ${i + 1}/${nseRows.length}...`);
      }
    }

    console.log(`\n✅ NSE sync complete:`);
    console.log(`   Stocks: ${stockCreated} created, ${stockUpdated} updated`);
    console.log(`   ETFs: ${etfCreated} created, ${etfUpdated} updated\n`);

    // Fetch AMFI mutual funds
    console.log('📥 Fetching AMFI mutual funds...');
    const amfiRows = await withRetry(() => fetchAmfiSchemeMaster(), 1);
    console.log(`   Found ${amfiRows.length} mutual funds\n`);

    let mfCreated = 0;
    let mfUpdated = 0;

    console.log('🔄 Processing mutual funds...');
    for (let i = 0; i < amfiRows.length; i++) {
      const row = amfiRows[i];
      const result = await upsertMutualFundFromAmfi(row);
      if (!result) continue;
      
      if (result.status === "created") mfCreated++;
      if (result.status === "updated") mfUpdated++;

      if ((i + 1) % 500 === 0) {
        console.log(`   Processed ${i + 1}/${amfiRows.length}...`);
      }
    }

    console.log(`\n✅ AMFI sync complete:`);
    console.log(`   Mutual Funds: ${mfCreated} created, ${mfUpdated} updated\n`);

    // Count final results
    const finalEtfCount = await prisma.investmentOption.count({
      where: { category: 'ETF', active: true }
    });
    const finalStockCount = await prisma.investmentOption.count({
      where: { category: 'STOCK', active: true }
    });
    const finalMfCount = await prisma.investmentOption.count({
      where: { category: 'MUTUAL_FUND', active: true }
    });

    console.log('📊 Final counts:');
    console.log(`   ETFs: ${finalEtfCount}`);
    console.log(`   Stocks: ${finalStockCount}`);
    console.log(`   Mutual Funds: ${finalMfCount}\n`);

    console.log('✅ Catalogue sync completed successfully!');

  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
runSyncCatalogue()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Sync failed:', error);
    process.exit(1);
  });

