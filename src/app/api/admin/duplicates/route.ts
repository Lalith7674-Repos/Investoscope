import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Check for duplicates
export async function GET() {
  try {
    // Find duplicates by (category, symbol) combination
    const allOptions = await prisma.investmentOption.findMany({
      where: { active: true },
      select: { id: true, category: true, symbol: true, name: true },
    });

    // Group by (category, symbol)
    const groups = new Map<string, any[]>();
    for (const opt of allOptions) {
      const key = `${opt.category}:${opt.symbol || 'NO_SYMBOL'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(opt);
    }

    // Find duplicates (groups with more than 1 item)
    const duplicates: Array<{ key: string; count: number; items: any[] }> = [];
    for (const [key, items] of groups.entries()) {
      if (items.length > 1) {
        duplicates.push({ key, count: items.length, items });
      }
    }

    const totalDuplicates = duplicates.reduce((sum, d) => sum + (d.count - 1), 0);

    return NextResponse.json({
      ok: true,
      duplicates: duplicates.length,
      totalDuplicateItems: totalDuplicates,
      details: duplicates.map(d => ({
        key: d.key,
        count: d.count,
        ids: d.items.map(i => i.id),
        names: d.items.map(i => i.name),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// Clean duplicates
export async function POST() {
  try {
    const allOptions = await prisma.investmentOption.findMany({
      where: { active: true },
      select: { id: true, category: true, symbol: true, name: true, lastUpdated: true },
    });

    // Group by (category, symbol)
    const groups = new Map<string, any[]>();
    for (const opt of allOptions) {
      const key = `${opt.category}:${opt.symbol || 'NO_SYMBOL'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(opt);
    }

    let cleaned = 0;
    const idsToDeactivate: string[] = [];

    // For each duplicate group, keep the most recent one, mark others inactive
    for (const [key, items] of groups.entries()) {
      if (items.length > 1) {
        // Sort by lastUpdated (most recent first)
        const sorted = [...items].sort((a, b) => 
          new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        );
        const [keep, ...remove] = sorted;
        idsToDeactivate.push(...remove.map(r => r.id));
        cleaned += remove.length;
      }
    }

    if (idsToDeactivate.length > 0) {
      await prisma.investmentOption.updateMany({
        where: { id: { in: idsToDeactivate } },
        data: { active: false },
      });
    }

    return NextResponse.json({
      ok: true,
      cleaned,
      message: `Deactivated ${cleaned} duplicate items`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

