import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const counts = {
      options_total: await prisma.investmentOption.count({ where: { active: true } }),
      options_mf: await prisma.investmentOption.count({ where: { category: "MUTUAL_FUND", active: true } }),
      options_stock: await prisma.investmentOption.count({ where: { category: "STOCK", active: true } }),
      options_etf: await prisma.investmentOption.count({ where: { category: "ETF", active: true } }),
      prices_rows: await prisma.historicalPrice.count(),
      inactive_options: await prisma.investmentOption.count({ where: { active: false } }),
    };
    return NextResponse.json({ ok: true, counts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

