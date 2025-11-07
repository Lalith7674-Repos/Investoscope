import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchNseSecuritiesCsv, fetchAmfiSchemeMaster } from "@/lib/vendor";
import { upsertMutualFundFromAmfi, upsertSecurityFromNse } from "@/lib/sync-helpers";
import { clearProgress, setProgress } from "@/lib/sync-progress";
import { sendJobAlert } from "@/lib/alerts";

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

export async function POST(req: Request) {
  const jobId = "sync-catalogue";
  let jobLogId: string | null = null;
  const prismaClient = prisma as any;
  let warningCount = 0;
  const warningThreshold = Number(process.env.SYNC_FAILED_ALERT_THRESHOLD ?? "10");

  try {
    if (req.headers.get("X-CRON-KEY") !== process.env.CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const jobLog = await prismaClient.syncLog.create({
      data: { jobId, status: "running" },
    });
    jobLogId = jobLog.id;

    clearProgress(jobId);
    setProgress(jobId, { total: 0, processed: 0, current: "Fetching NSE securities...", status: "running" });

    const existingStocks = await prisma.investmentOption.findMany({
      where: { active: true, category: { in: ["STOCK", "ETF"] }, symbol: { not: null } },
      select: { id: true, symbol: true },
    });

    const nseRows = await withRetry(() => fetchNseSecuritiesCsv(), 1);
    const seenStockSymbols = new Set<string>();

    let stockCreated = 0;
    let stockUpdated = 0;

    for (const row of nseRows) {
      const result = await upsertSecurityFromNse(row);
      if (!result) continue;
      if (result.symbol) seenStockSymbols.add(result.symbol);
      if (result.status === "created") stockCreated++;
      if (result.status === "updated") stockUpdated++;
    }

    setProgress(jobId, {
      total: nseRows.length,
      processed: nseRows.length,
      current: `Stocks/ETFs synced: ${stockCreated} new, ${stockUpdated} updated. Fetching mutual funds...`,
      status: "running",
    });

    // Deactivate stale stocks if the NSE feed returned a reasonable dataset
    const staleStockIds: string[] = [];
    if (seenStockSymbols.size > 0 && seenStockSymbols.size >= existingStocks.length * 0.5) {
      for (const item of existingStocks) {
        if (item.symbol && !seenStockSymbols.has(item.symbol)) {
          staleStockIds.push(item.id);
        }
      }
      if (staleStockIds.length) {
        await prisma.investmentOption.updateMany({
          where: { id: { in: staleStockIds } },
          data: { active: false },
        });
        warningCount += staleStockIds.length;
      }
    }

    setProgress(jobId, {
      total: nseRows.length,
      processed: nseRows.length,
      current: "Fetching AMFI mutual fund list...",
      status: "running",
    });

    const existingFunds = await prisma.investmentOption.findMany({
      where: { active: true, category: "MUTUAL_FUND", symbol: { not: null } },
      select: { id: true, symbol: true },
    });

    const amfiRows = await withRetry(() => fetchAmfiSchemeMaster(), 1);
    let mfCreated = 0;
    let mfUpdated = 0;
    const seenFundSymbols = new Set<string>();

    for (const row of amfiRows) {
      const result = await upsertMutualFundFromAmfi(row);
      if (!result) continue;
      if (result.symbol) seenFundSymbols.add(result.symbol);
      if (result.status === "created") mfCreated++;
      if (result.status === "updated") mfUpdated++;
    }

    const staleFundIds: string[] = [];
    if (seenFundSymbols.size > 0 && seenFundSymbols.size >= existingFunds.length * 0.5) {
      for (const item of existingFunds) {
        if (item.symbol && !seenFundSymbols.has(item.symbol)) {
          staleFundIds.push(item.id);
        }
      }
      if (staleFundIds.length) {
        await prisma.investmentOption.updateMany({
          where: { id: { in: staleFundIds } },
          data: { active: false },
        });
        warningCount += staleFundIds.length;
      }
    }

    setProgress(jobId, {
      total: amfiRows.length,
      processed: amfiRows.length,
      current: "Catalogue sync complete",
      status: "completed",
    });

    await prismaClient.syncLog.update({
      where: { id: jobLogId },
      data: {
        status: "completed",
        finishedAt: new Date(),
        processed: nseRows.length + amfiRows.length,
        updated: stockUpdated + mfUpdated,
        skipped: 0,
        failed: 0,
        details: {
          stockCreated,
          stockUpdated,
          stockDeactivated: staleStockIds.length,
          mfCreated,
          mfUpdated,
          mfDeactivated: staleFundIds.length,
        },
      },
    });

    if (warningCount >= warningThreshold) {
      await sendJobAlert({
        jobId,
        status: "warning",
        message: `${warningCount} instruments were deactivated during catalogue sync`,
        meta: {
          warningCount,
          stockCreated,
          stockUpdated,
          stockDeactivated: staleStockIds.length,
          mfCreated,
          mfUpdated,
          mfDeactivated: staleFundIds.length,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      stockCreated,
      stockUpdated,
      stockDeactivated: staleStockIds.length,
      mfCreated,
      mfUpdated,
      mfDeactivated: staleFundIds.length,
    });
  } catch (e: any) {
    const errorMsg = e.message || "Unknown error";

    setProgress(jobId, {
      total: 0,
      processed: 0,
      current: `Error: ${errorMsg}`,
      status: "error",
      error: errorMsg,
    });

    if (jobLogId) {
      try {
        await prismaClient.syncLog.update({
          where: { id: jobLogId },
          data: {
            status: "error",
            finishedAt: new Date(),
            failed: 1,
            details: { error: errorMsg },
          },
        });
      } catch {
        // ignore log errors
      }
    }

    const isRateLimit =
      errorMsg.toLowerCase().includes("rate limit") ||
      errorMsg.toLowerCase().includes("429") ||
      errorMsg.toLowerCase().includes("too many requests");

    await sendJobAlert({
      jobId,
      status: "error",
      message: errorMsg,
      meta: { warningCount },
    });

    return NextResponse.json({ ok: false, error: errorMsg }, { status: isRateLimit ? 429 : 500 });
  }
}


