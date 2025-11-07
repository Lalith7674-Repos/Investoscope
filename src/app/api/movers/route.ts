import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const latest = await prisma.historicalPrice.findFirst({
      orderBy: { date: "desc" },
    });
    if (!latest) {
      return NextResponse.json({ ok: true, groups: [] });
    }

    const previous = await prisma.historicalPrice.findFirst({
      where: { date: { lt: latest.date } },
      orderBy: { date: "desc" },
    });
    if (!previous) {
      return NextResponse.json({ ok: true, groups: [] });
    }

    const options = await prisma.investmentOption.findMany({
      where: {
        active: true,
        category: { in: ["STOCK", "ETF"] },
        symbol: { not: null },
      },
      select: {
        id: true,
        name: true,
        category: true,
        symbol: true,
        unitPrice: true,
        peRatio: true,
        beta: true,
        marketCapValue: true,
      },
    });

    if (!options.length) {
      return NextResponse.json({ ok: true, groups: [] });
    }

    const symbols = options
      .map((o) => o.symbol?.toUpperCase())
      .filter(Boolean) as string[];

    // Get prices for the latest and previous dates
    // MongoDB date comparison - we need to match dates exactly (same day, ignoring time)
    const latestDateStart = new Date(latest.date);
    latestDateStart.setHours(0, 0, 0, 0);
    const latestDateEnd = new Date(latest.date);
    latestDateEnd.setHours(23, 59, 59, 999);
    
    const previousDateStart = new Date(previous.date);
    previousDateStart.setHours(0, 0, 0, 0);
    const previousDateEnd = new Date(previous.date);
    previousDateEnd.setHours(23, 59, 59, 999);
    
    // MongoDB query - get all prices for these symbols, then filter in memory
    // This avoids potential issues with complex OR queries in MongoDB
    const allPriceRows = await prisma.historicalPrice.findMany({
      where: {
        symbol: { in: symbols },
      },
    });

    // Filter to only latest and previous dates (same day, ignoring time)
    const latestDateStr = new Date(latest.date).toISOString().split('T')[0];
    const previousDateStr = new Date(previous.date).toISOString().split('T')[0];
    
    const priceRows = allPriceRows.filter((row) => {
      const rowDateStr = new Date(row.date).toISOString().split('T')[0];
      return rowDateStr === latestDateStr || rowDateStr === previousDateStr;
    });

    const priceMap = new Map<
      string,
      { latest?: number; previous?: number }
    >();

    for (const row of priceRows) {
      const symbol = row.symbol?.toUpperCase();
      if (!symbol) continue;
      if (!priceMap.has(symbol)) priceMap.set(symbol, {});
      const entry = priceMap.get(symbol)!;
      if (Math.abs(new Date(row.date).getTime() - new Date(latest.date).getTime()) < 1000) {
        entry.latest = row.close;
      } else if (Math.abs(new Date(row.date).getTime() - new Date(previous.date).getTime()) < 1000) {
        entry.previous = row.close;
      }
    }

    const movers: Array<{
      optionId: string;
      name: string;
      category: string;
      symbol: string | null;
      latestPrice: number | null;
      changePct: number;
      changeValue: number;
    }> = [];

    for (const option of options) {
      const symbol = option.symbol?.toUpperCase();
      if (!symbol) continue;
      const prices = priceMap.get(symbol);
      if (!prices?.latest || !prices?.previous || prices.previous <= 0) continue;
      const changeValue = prices.latest - prices.previous;
      const changePct = changeValue / prices.previous;

      movers.push({
        optionId: option.id,
        name: option.name,
        category: option.category,
        symbol: option.symbol,
        latestPrice: prices.latest,
        changePct,
        changeValue,
      });
    }

    const gainers = movers
      .filter((m) => m.changePct > 0)
      .sort((a, b) => b.changePct - a.changePct)
      .slice(0, 12);

    const losers = movers
      .filter((m) => m.changePct < 0)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, 12);

    const etfs = movers
      .filter((m) => m.category === "ETF")
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 12);

    const groups = [] as Array<{ title: string; items: typeof movers }>;
    if (gainers.length) groups.push({ title: "Top Gainers", items: gainers });
    if (losers.length) groups.push({ title: "Top Losers", items: losers });
    if (etfs.length) groups.push({ title: "ETFs in Focus", items: etfs });

    return NextResponse.json({ ok: true, groups, asOf: latest.date });
  } catch (e: any) {
    console.error("Error fetching movers:", e);
    // Return empty groups on error instead of failing
    return NextResponse.json({ ok: true, groups: [], error: e.message });
  }
}


