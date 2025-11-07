import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireSession() {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }
  return session.user as any;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ optionId: string }> }
) {
  try {
    const user = await requireSession();
    const { optionId } = await params;

    const alerts = await prisma.priceAlert.findMany({
      where: { userId: user.id as string, optionId, active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, alerts });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: (err as any)?.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ optionId: string }> }
) {
  try {
    const user = await requireSession();
    const { optionId } = await params;
    const body = await req.json();
    const direction = body?.direction === "below" ? "below" : "above";
    const targetPrice = Number(body?.targetPrice);
    if (!targetPrice || !isFinite(targetPrice) || targetPrice <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid target price" }, { status: 400 });
    }

    const alert = await prisma.priceAlert.create({
      data: {
        userId: user.id as string,
        optionId,
        direction,
        targetPrice,
      },
    });

    return NextResponse.json({ ok: true, alert });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: (err as any)?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ optionId: string }> }
) {
  try {
    const user = await requireSession();
    const { optionId } = await params;
    const body = await req.json();
    const alertId = body?.alertId as string;
    if (!alertId) {
      return NextResponse.json({ ok: false, error: "alertId required" }, { status: 400 });
    }

    await prisma.priceAlert.deleteMany({
      where: { id: alertId, userId: user.id as string, optionId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: (err as any)?.message }, { status: 500 });
  }
}


