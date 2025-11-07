import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchDailyPrices, fetchFundamentals } from "@/lib/vendor";
import { setProgress, getProgress, clearProgress } from "@/lib/sync-progress";
import { sendJobAlert } from "@/lib/alerts";
import { sendPriceAlertEmail } from "@/lib/mailer";
import crypto from "crypto";

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

function hashPriceSeries(series: { date: Date; close: number }[]) {
  const hash = crypto.createHash("sha256");
  for (const point of series.slice(-5)) {
    hash.update(`${point.date.toISOString()}-${point.close}`);
  }
  return hash.digest("hex");
}

type StockRecord = {
  id: string;
  name: string;
  symbol: string | null;
  unitPrice: number | null;
  priceHash: string | null;
  category: string;
  peRatio?: number | null;
  beta?: number | null;
  marketCapValue?: number | null;
};

type FundRecord = {
  id: string;
  symbol: string | null;
  unitPrice: number | null;
  navHash: string | null;
};

export async function POST(req: Request) {
  const jobId = "sync-prices";
  let jobLogId: string | null = null;
  const prismaClient = prisma as any;
  let failedCount = 0;
  const failedThreshold = Number(process.env.SYNC_FAILED_ALERT_THRESHOLD ?? "10");
  let total = 0;
  
  try {
    // Vercel Cron sends 'x-vercel-cron' header, manual calls use 'X-CRON-KEY'
    const vercelCronHeader = req.headers.get("x-vercel-cron");
    const cronKeyHeader = req.headers.get("X-CRON-KEY");
    const cronSecret = process.env.CRON_SECRET;
    
    // Allow if it's from Vercel Cron OR if X-CRON-KEY matches
    const isVercelCron = vercelCronHeader === "1";
    const isValidManualCall = cronKeyHeader === cronSecret;
    
    if (!isVercelCron && !isValidManualCall) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const jobLog = await prismaClient.syncLog.create({
      data: { jobId, status: "running" },
    });
    jobLogId = jobLog.id;

    clearProgress(jobId); // Clear any old progress
    setProgress(jobId, { total: 0, processed: 0, current: "Loading stocks/ETFs...", status: "running" });

    const stockList = (await prismaClient.investmentOption.findMany({
      where: { active: true, category: { in: ["STOCK", "ETF"] }, symbol: { not: null } },
      select: {
        id: true,
        name: true,
        symbol: true,
        unitPrice: true,
        priceHash: true,
        category: true,
        peRatio: true,
        beta: true,
        marketCapValue: true,
      },
      take: 500,
    })) as StockRecord[];

    const mutualFunds = (await prismaClient.investmentOption.findMany({
      where: { active: true, category: "MUTUAL_FUND", symbol: { not: null } },
      select: { id: true, symbol: true, unitPrice: true, navHash: true },
      take: 500,
    })) as FundRecord[];

    total = stockList.length + mutualFunds.length;
    setProgress(jobId, { total, processed: 0, current: `Checking ${total} symbols...`, status: "running" });

    const DAY_MS = 1000 * 60 * 60 * 24;
    const PRICE_EPSILON = 0.0005; // 0.05% tolerance to ignore rounding noise
    let updated = 0;
    let skippedFresh = 0;
    let skippedNoChange = 0;
    const BATCH = 8;
    
    let processedCount = 0;

    for (let i = 0; i < stockList.length; i += BATCH) {
      const chunk = stockList.slice(i, i + BATCH);
      await Promise.all(
        chunk.map(async ({ id, name, symbol, unitPrice, priceHash, category, peRatio, beta: existingBeta, marketCapValue }) => {
          if (!symbol) return;
          
          // Check if we already have fresh data (updated within last 24 hours)
          const existing = await prisma.historicalPrice.findFirst({
            where: { symbol },
            orderBy: { date: "desc" },
          });
          
          const isFresh = existing && 
            (Date.now() - new Date(existing.date).getTime() < DAY_MS);
          
          if (isFresh) {
            skippedFresh++;
            return; // Skip this symbol, already has fresh data
          }
          
          try {
            const lastStoredDate = existing ? new Date(existing.date) : null;
            const lastStoredClose = existing?.close ?? null;
            const series = await withRetry(() => fetchDailyPrices(symbol, lastStoredDate ?? undefined), 1);
            if (!series.length) return;

            // Get latest price (most recent date)
            const latestPoint = series[series.length - 1];
            const latestPrice = latestPoint?.close;
            const latestDate = latestPoint?.date ? new Date(latestPoint.date) : null;
            const priceSource = process.env.TWELVEDATA_API_KEY ? "twelvedata" : process.env.ALPHAVANTAGE_API_KEY ? "alphavantage" : "yahoo";

            const currentHash = hashPriceSeries(series);
            if (priceHash && currentHash === priceHash) {
              skippedNoChange++;
              return;
            }

            let inserted = 0;
            // Filter only new dates to insert
            const newPoints = series.filter((p) => {
              if (!lastStoredDate) return true;
              return p.date.getTime() > lastStoredDate.getTime();
            });

            if (newPoints.length > 0) {
            await prisma.historicalPrice.createMany({
                data: newPoints.map((p) => ({
                  symbol,
                  date: p.date,
                  close: p.close,
                  source: priceSource,
                })),
              });
              inserted += newPoints.length;
            } else if (
              latestDate &&
              lastStoredDate &&
              latestDate.getTime() === lastStoredDate.getTime() &&
              lastStoredClose != null &&
              latestPrice != null &&
              isFinite(latestPrice) &&
              Math.abs(latestPrice - lastStoredClose) / Math.max(Math.abs(lastStoredClose), 1) > PRICE_EPSILON
            ) {
              // Same date but value changed (vendor correction) -> update existing row
              await prisma.historicalPrice.updateMany({
                where: { symbol, date: lastStoredDate },
                data: { close: latestPrice, source: priceSource },
              });
              inserted += 1;
            }

            const shouldUpdatePrice =
              latestPrice != null &&
              isFinite(latestPrice) &&
              (unitPrice == null ||
                Math.abs(latestPrice - Number(unitPrice)) /
                  Math.max(Math.abs(Number(unitPrice)), 1) > PRICE_EPSILON);

            let fundamentalsUpdated = false;
            if (category === "STOCK" || category === "ETF") {
              const needsFundamentals = !peRatio || !marketCapValue || !existingBeta || shouldUpdatePrice;
              if (needsFundamentals) {
                const fundamentals = await fetchFundamentals(symbol);
                if (fundamentals) {
                  const updates: any = {};
                  if (fundamentals.peRatio != null) updates.peRatio = fundamentals.peRatio;
                  if (fundamentals.beta != null) updates.beta = fundamentals.beta;
                  if (fundamentals.marketCap != null) updates.marketCapValue = fundamentals.marketCap;
                  if (Object.keys(updates).length) {
                    await prismaClient.investmentOption.update({
                      where: { id },
                      data: updates,
                    });
                    fundamentalsUpdated = true;
                  }
                }
              }
            }

            if (shouldUpdatePrice) {
              await prismaClient.investmentOption.update({
                where: { id },
                data: { unitPrice: latestPrice, lastUpdated: new Date(), priceHash: currentHash },
              });
            } else if (!fundamentalsUpdated) {
              await prismaClient.investmentOption.update({
                where: { id },
                data: { priceHash: currentHash, lastUpdated: new Date() },
              });
            }

            if (latestPrice != null && isFinite(latestPrice)) {
              const alerts = await prismaClient.priceAlert.findMany({
                where: {
                  optionId: id,
                  active: true,
                },
                include: {
                  user: { select: { email: true, name: true } },
                },
              });

              const triggered: string[] = [];
              for (const alert of alerts) {
                if (alert.direction === "above" && latestPrice >= alert.targetPrice) {
                  triggered.push(alert.id);
                  if (alert.user?.email) {
                    await sendPriceAlertEmail({
                      to: alert.user.email,
                      name: alert.user.name,
                      optionName: name,
                      symbol,
                      target: alert.targetPrice,
                      direction: "above",
                      latestPrice,
                      optionId: id,
                    });
                  }
                } else if (alert.direction === "below" && latestPrice <= alert.targetPrice) {
                  triggered.push(alert.id);
                  if (alert.user?.email) {
                    await sendPriceAlertEmail({
                      to: alert.user.email,
                      name: alert.user.name,
                      optionName: name,
                      symbol,
                      target: alert.targetPrice,
                      direction: "below",
                      latestPrice,
                      optionId: id,
                    });
                  }
                }
              }

              if (triggered.length) {
                await prismaClient.priceAlert.updateMany({
                  where: { id: { in: triggered } },
                  data: { active: false, triggeredAt: new Date() },
                });
              }
            }

            if (inserted > 0 || shouldUpdatePrice) {
              updated++;
            } else {
              skippedNoChange++;
            }
          } catch (e) {
            // Continue on individual symbol errors
            console.error(`Failed to update ${symbol}:`, e);
            failedCount++;
          }
        })
      );
      
      // Update progress after each batch
      processedCount = Math.min(processedCount + chunk.length, total);
      setProgress(jobId, {
        total,
        processed: processedCount,
        current: `Updated ${updated}, Fresh ${skippedFresh}, No change ${skippedNoChange}, Failed ${failedCount}`,
        status: "running",
      });
    }

    // --- Mutual Funds NAV sync ---
    const MF_BATCH = 6;
    for (let i = 0; i < mutualFunds.length; i += MF_BATCH) {
      const chunk = mutualFunds.slice(i, i + MF_BATCH);
      await Promise.all(
        chunk.map(async ({ id, symbol, unitPrice, navHash }) => {
          if (!symbol) return;
          const trimmed = symbol.trim();
          if (!trimmed) return;
          const hpSymbol = `MF:${trimmed}`;
          const existing = await prisma.historicalPrice.findFirst({
            where: { symbol: hpSymbol },
            orderBy: { date: "desc" },
          });

          const lastStoredDate = existing ? new Date(existing.date) : null;
          const lastStoredClose = existing?.close ?? null;

          try {
            const entries = await withRetry(async () => {
              const res = await fetch(`https://api.mfapi.in/mf/${encodeURIComponent(trimmed)}`, {
                cache: "no-store",
              });
              if (!res.ok) {
                throw new Error(`MFAPI returned ${res.status}`);
              }
              const json = await res.json();
              const raw = Array.isArray(json?.data) ? json.data : [];
              const mapped = raw
                .map((item: any) => {
                  const dateStr = String(item?.date || "").trim();
                  const navStr = String(item?.nav || "").trim();
                  if (!dateStr || !navStr) return null;
                  const [dd, mm, yyyy] = dateStr.split("-");
                  if (!dd || !mm || !yyyy) return null;
                  const parsedDate = new Date(`${yyyy}-${mm}-${dd}`);
                  const nav = Number(navStr.replace(/,/g, ""));
                  if (!isFinite(nav)) return null;
                  return { date: parsedDate, close: nav };
                })
                .filter(Boolean) as { date: Date; close: number }[];

              if (lastStoredDate) {
                return mapped.filter((p) => p.date.getTime() > lastStoredDate.getTime());
              }

              return mapped;
            }, 1);

            if (!entries.length) {
              skippedNoChange++;
              return;
            }

            entries.sort((a, b) => a.date.getTime() - b.date.getTime());

            const currentHash = hashPriceSeries(entries);
            if (navHash && currentHash === navHash) {
              skippedNoChange++;
              return;
            }

            let inserted = 0;
            if (entries.length > 0) {
              await prisma.historicalPrice.createMany({
                data: entries.map((p) => ({
                  symbol: hpSymbol,
                  date: p.date,
                  close: p.close,
                  source: "mfapi",
                })),
              });
              inserted += entries.length;
            }

            const latest = entries[entries.length - 1];
            const shouldUpdate =
              latest &&
              (unitPrice == null ||
                Math.abs(latest.close - Number(unitPrice)) /
                  Math.max(Math.abs(Number(unitPrice)), 1) > PRICE_EPSILON);

            if (
              lastStoredDate &&
              lastStoredClose != null &&
              latest &&
              latest.date.getTime() === lastStoredDate.getTime() &&
              Math.abs(latest.close - lastStoredClose) /
                Math.max(Math.abs(lastStoredClose), 1) > PRICE_EPSILON
            ) {
              await prisma.historicalPrice.updateMany({
                where: { symbol: hpSymbol, date: lastStoredDate },
                data: { close: latest.close, source: "mfapi" },
              });
              inserted += 1;
            }

            if (shouldUpdate && latest) {
              await prismaClient.investmentOption.update({
                where: { id },
                data: { unitPrice: latest.close, lastUpdated: new Date(), navHash: currentHash },
              });
            } else {
              await prismaClient.investmentOption.update({
                where: { id },
                data: { navHash: currentHash, lastUpdated: new Date() },
              });
            }

            if (inserted > 0 || shouldUpdate) {
              updated++;
            } else {
              skippedNoChange++;
            }
          } catch (err) {
            console.error(`Failed to update MF ${trimmed}:`, err);
            failedCount++;
          }
        })
      );

      processedCount = Math.min(processedCount + chunk.length, total);
      setProgress(jobId, {
        total,
        processed: processedCount,
        current: `Updated ${updated}, Fresh ${skippedFresh}, No change ${skippedNoChange}, Failed ${failedCount}`,
        status: "running",
      });
    }

    setProgress(jobId, { total, processed: total, current: "Completed", status: "completed" });
    await prismaClient.syncLog.update({
      where: { id: jobLog.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        processed: total,
        updated,
        skipped: skippedFresh + skippedNoChange,
        failed: failedCount,
        details: {
          skippedFresh,
          skippedNoChange,
          stockCount: stockList.length,
          mutualFundCount: mutualFunds.length,
        },
      },
    });
    if (failedCount >= failedThreshold) {
      await sendJobAlert({
        jobId,
        status: "warning",
        message: `${failedCount} symbols failed during price sync`,
        meta: { failedCount, updated, skippedFresh, skippedNoChange, total },
      });
    }

    return NextResponse.json({ ok: true, updated, skippedFresh, skippedNoChange, failed: failedCount, total });
  } catch (e: any) {
    const errorMsg = e.message || "Unknown error";
    const isRateLimit = 
      errorMsg.toLowerCase().includes("rate limit") ||
      errorMsg.toLowerCase().includes("429") ||
      errorMsg.toLowerCase().includes("too many requests") ||
      errorMsg.toLowerCase().includes("quota exceeded") ||
      e.status === 429;
    
    const currentProgress = getProgress(jobId);
    setProgress(jobId, { 
      total: currentProgress?.total || 0, 
      processed: currentProgress?.processed || 0, 
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
            failed: failedCount > 0 ? failedCount : 1,
            details: { error: errorMsg },
          },
        });
      } catch {
        // ignore log errors
      }
    }
    await sendJobAlert({
      jobId,
      status: "error",
      message: errorMsg,
      meta: { failed: failedCount, total },
    });
    
    return NextResponse.json({ 
      ok: false, 
      error: isRateLimit ? `Rate limit error: ${errorMsg}` : errorMsg 
    }, { status: isRateLimit ? 429 : 500 });
  }
}
