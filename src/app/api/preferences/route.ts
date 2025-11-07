import { NextResponse } from "next/server";
import { getSafeServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getSafeServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const pref = await prisma.preference.findUnique({ 
      where: { userId },
      select: {
        defaultAmount: true,
        riskTolerance: true,
        investmentGoal: true,
        timeHorizon: true,
        investmentStyle: true,
        onboarded: true,
      },
    });

    return NextResponse.json({ ok: true, preferences: pref || null });
  } catch (e: any) {
    console.error("Error fetching preferences:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
