import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const picks = await prisma.affordablePick.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    if (!picks.length) {
      // fallback: build diverse synthetic groups from InvestmentOption (like Groww)
      const mfUnder100 = await prisma.investmentOption.findMany({
        where: { category: "MUTUAL_FUND", active: true, minSIP: { lte: 100 } },
        take: 12,
        orderBy: { minSIP: "asc" },
      });
      const etfUnder100 = await prisma.investmentOption.findMany({
        where: { category: "ETF", active: true, unitPrice: { lte: 100 } },
        take: 12,
        orderBy: { unitPrice: "asc" },
      });
      const stocksUnder500 = await prisma.investmentOption.findMany({
        where: { category: "STOCK", active: true, unitPrice: { lte: 500 } },
        take: 12,
        orderBy: { unitPrice: "asc" },
      });
      const mfIndex = await prisma.investmentOption.findMany({
        where: { category: "MUTUAL_FUND", active: true, subtypeMF: "INDEX" },
        take: 12,
        orderBy: { name: "asc" },
      });
      const etfBroad = await prisma.investmentOption.findMany({
        where: { category: "ETF", active: true, subtypeETF: "BROAD_MARKET" },
        take: 12,
        orderBy: { name: "asc" },
      });
      
      const groups: Array<{ title: string; items: any[] }> = [];
      if (mfUnder100.length > 0) groups.push({ title: "Mutual Funds with SIP ≤ ₹100", items: mfUnder100 });
      if (etfUnder100.length > 0) groups.push({ title: "ETFs priced ≤ ₹100", items: etfUnder100 });
      if (stocksUnder500.length > 0) groups.push({ title: "Stocks priced ≤ ₹500", items: stocksUnder500 });
      if (mfIndex.length > 0) groups.push({ title: "Index Mutual Funds", items: mfIndex });
      if (etfBroad.length > 0) groups.push({ title: "Broad Market ETFs", items: etfBroad });
      
      return NextResponse.json({
        ok: true,
        synthetic: true,
        groups,
      });
    }

    // expand pick.optionIds
    const groups: Array<{ title: string; items: any[] }> = [];
    for (const p of picks) {
      const items = await prisma.investmentOption.findMany({
        where: { id: { in: p.optionIds }, active: true },
      });
      groups.push({ title: p.title, items });
    }

    return NextResponse.json({ ok: true, synthetic: false, groups });
  } catch (e: any) {
    console.error("Error fetching affordable picks:", e);
    // Return empty groups on error instead of failing
    return NextResponse.json({ ok: true, synthetic: true, groups: [] });
  }
}



