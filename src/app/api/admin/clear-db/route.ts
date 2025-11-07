import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Clear all dummy data - use with caution!
export async function POST(req: Request) {
  try {
    // Clear all investment options and related data
    await prisma.historicalPrice.deleteMany({});
    await prisma.affordablePick.deleteMany({});
    await prisma.savedItem.deleteMany({});
    await prisma.investmentOption.deleteMany({});

    return NextResponse.json({ 
      ok: true, 
      message: "All dummy data cleared. Now run sync jobs to get real data!" 
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

