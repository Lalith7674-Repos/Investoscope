import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const option = await prisma.investmentOption.findUnique({
      where: { id },
      include: {
        priceAlerts: {
          where: { active: true },
          select: {
            id: true,
            direction: true,
            targetPrice: true,
            triggeredAt: true,
          },
        },
      },
    });

    if (!option) {
      return NextResponse.json({ ok: false, error: "Option not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, option });
  } catch (e: any) {
    console.error("Error fetching option:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
