import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchDailyPrices } from "@/lib/vendor";

const DAY_MS = 1000 * 60 * 60 * 24;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: symbolParam } = await params;
    const symbol = symbolParam.toUpperCase();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "1y"; // 1d, 1w, 1m, 3m, 6m, 1y, 5y, max

    if (!symbol) {
      return NextResponse.json({ ok: false, error: "Symbol required" }, { status: 400 });
    }

    // Calculate period in milliseconds
    const now = Date.now();
    let periodMs = 365 * DAY_MS; // Default 1 year
    let interval = "1d";
    
    switch (period) {
      case "1d":
        periodMs = 1 * DAY_MS;
        interval = "5m"; // 5 minute intervals for intraday
        break;
      case "1w":
        periodMs = 7 * DAY_MS;
        interval = "1h"; // 1 hour intervals for week
        break;
      case "1m":
        periodMs = 30 * DAY_MS;
        interval = "1d";
        break;
      case "3m":
        periodMs = 90 * DAY_MS;
        interval = "1d";
        break;
      case "6m":
        periodMs = 180 * DAY_MS;
        interval = "1d";
        break;
      case "1y":
        periodMs = 365 * DAY_MS;
        interval = "1d";
        break;
      case "5y":
        periodMs = 5 * 365 * DAY_MS;
        interval = "1wk"; // Weekly for 5 years
        break;
      case "max":
        periodMs = 10 * 365 * DAY_MS; // 10 years max
        interval = "1mo"; // Monthly for max
        break;
    }

    // Check cache (historical prices) - filter by period
    const cutoffDate = new Date(now - periodMs);
    const existing = await prisma.historicalPrice.findMany({
      where: { 
        symbol,
        date: { gte: cutoffDate }
      },
      orderBy: { date: "asc" },
    });

    const freshEnough =
      existing.length > 0 &&
      Date.now() - new Date(existing[existing.length - 1].date).getTime() < DAY_MS;

    // For intraday (1d), always fetch fresh data
    if (freshEnough && period !== "1d") {
      // Filter existing data to match period
      const filtered = existing.filter(p => new Date(p.date) >= cutoffDate);
      return NextResponse.json({
        ok: true,
        data: filtered.map((p) => ({
          date: p.date,
          close: p.close,
        })),
        cached: true,
      });
    }

    // For intraday and short periods, skip vendor APIs and go directly to Yahoo
    // Vendor APIs typically only provide daily data
    if (period === "1d" || period === "1w") {
      // Skip vendor APIs for intraday/weekly, go to Yahoo directly
    } else {
      // Try to fetch from vendor APIs first (TwelveData, AlphaVantage, then Yahoo)
      const vendorData = await fetchDailyPrices(symbol);
      
      if (vendorData.length > 0) {
        // Filter vendor data by period
        const filteredVendorData = vendorData.filter(p => new Date(p.date) >= cutoffDate);
        
        if (filteredVendorData.length > 0) {
          // Save to cache (don't clear all, just update recent ones)
          const recentCutoff = new Date(now - 30 * DAY_MS); // Keep last 30 days in cache
          await prisma.historicalPrice.deleteMany({ 
            where: { 
              symbol,
              date: { gte: recentCutoff }
            } 
          });
          await prisma.historicalPrice.createMany({
            data: filteredVendorData.map(p => ({
              symbol,
              date: p.date,
              close: p.close,
              source: process.env.TWELVEDATA_API_KEY ? "twelvedata" : process.env.ALPHAVANTAGE_API_KEY ? "alphavantage" : "yahoo"
            }))
          });

          return NextResponse.json({
            ok: true,
            data: filteredVendorData.map((p) => ({
              date: p.date,
              close: p.close,
            })),
            cached: false,
          });
        }
      }
    }

    // Fallback: Try Yahoo Finance directly
    const period1 = Math.floor((now - periodMs) / 1000);
    const period2 = Math.floor(now / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&period1=${period1}&period2=${period2}`;

    try {
      const res = await fetch(url, { 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 3600 } 
      });
      if (!res.ok) throw new Error("Yahoo fetch failed");

      const json = await res.json();
      const result = json?.chart?.result?.[0];

      if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
        // Return existing data if available, otherwise empty
        if (existing.length > 0) {
          return NextResponse.json({
            ok: true,
            data: existing.map((p) => ({ date: p.date, close: p.close })),
            cached: true,
            note: "Using cached data - API fetch failed",
          });
        }
        return NextResponse.json({ ok: false, error: "No data available" }, { status: 404 });
      }

      const timestamps = result.timestamp as number[];
      const closes = result.indicators.quote[0].close as (number | null)[];

      const entries = timestamps
        .map((ts: number, i: number) => {
          const close = closes[i];
          if (close == null) return null;
          const entryDate = new Date(ts * 1000);
          // Filter by period
          if (entryDate < cutoffDate) return null;
          return {
            symbol,
            date: entryDate,
            close: Number(close),
            source: "yahoo",
          };
        })
        .filter(Boolean) as { symbol: string; date: Date; close: number; source: string }[];

      // Save to cache (only recent data for daily/weekly, more for longer periods)
      if (entries.length > 0) {
        const cacheCutoff = period === "1d" || period === "1w" 
          ? new Date(now - 7 * DAY_MS) // Keep 7 days for short periods
          : new Date(now - 90 * DAY_MS); // Keep 90 days for longer periods
        
        await prisma.historicalPrice.deleteMany({ 
          where: { 
            symbol,
            date: { gte: cacheCutoff }
          } 
        });
        await prisma.historicalPrice.createMany({ data: entries });
      }

      return NextResponse.json({
        ok: true,
        data: entries.map((p) => ({
          date: p.date,
          close: p.close,
        })),
        cached: false,
      });
    } catch (error) {
      // If fetch fails, return existing cached data if available
      if (existing.length > 0) {
        return NextResponse.json({
          ok: true,
          data: existing.map((p) => ({ date: p.date, close: p.close })),
          cached: true,
          note: "Using cached data - API unavailable",
        });
      }
      throw error;
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}



