import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Automatic fallback: Checks if data is stale and triggers sync if needed
 * This ensures Top Movers always has fresh data even if scheduled sync fails
 * Can be called by a monitoring service or as a backup cron
 */
export async function POST(req: Request) {
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

  try {
    // Check latest price update
    const latestPrice = await prisma.historicalPrice.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });

    if (!latestPrice) {
      // No data at all - trigger full sync
      const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : "http://localhost:3000";
      const cronKey = process.env.CRON_SECRET;
      
      if (!cronKey) {
        return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
      }

      // Trigger price sync
      await fetch(`${base}/api/jobs/sync-prices`, {
        method: "POST",
        headers: {
          "X-CRON-KEY": cronKey,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      return NextResponse.json({ 
        ok: true, 
        action: "triggered_sync", 
        reason: "No price data found" 
      });
    }

    // Check if data is stale (more than 26 hours old)
    const now = new Date();
    const dataAge = now.getTime() - new Date(latestPrice.date).getTime();
    const hoursOld = dataAge / (1000 * 60 * 60);

    if (hoursOld > 26) {
      // Data is stale - trigger price sync
      const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : "http://localhost:3000";
      const cronKey = process.env.CRON_SECRET;
      
      if (!cronKey) {
        return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
      }

      // Trigger price sync
      await fetch(`${base}/api/jobs/sync-prices`, {
        method: "POST",
        headers: {
          "X-CRON-KEY": cronKey,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      return NextResponse.json({ 
        ok: true, 
        action: "triggered_sync", 
        reason: `Data is ${Math.round(hoursOld)} hours old (stale)` 
      });
    }

    // Data is fresh - no action needed
    return NextResponse.json({ 
      ok: true, 
      action: "no_action", 
      reason: `Data is fresh (${Math.round(hoursOld)} hours old)` 
    });
  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e.message 
    }, { status: 500 });
  }
}

