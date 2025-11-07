import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ ok: true, results: [] });
    }

    // Search for companies by name or symbol
    // MongoDB doesn't support case-insensitive mode in Prisma, so we search both cases
    const queryUpper = query.toUpperCase();
    const queryLower = query.toLowerCase();
    const results = await prisma.investmentOption.findMany({
      where: {
        active: true,
        category: { in: ["STOCK", "ETF"] },
        OR: [
          { name: { contains: query } },
          { name: { contains: queryLower } },
          { name: { contains: queryUpper } },
          { symbol: { contains: queryUpper } },
        ],
      },
      select: {
        id: true,
        name: true,
        symbol: true,
        category: true,
        unitPrice: true,
      },
      take: 20,
      orderBy: [
        // Prioritize exact symbol matches
        { symbol: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

