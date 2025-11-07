import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const pref = await prisma.preference.findUnique({ where: { userId } });
  return NextResponse.json({ ok: true, state: pref?.chartsState || null });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const { state } = await req.json();

  await prisma.preference.update({
    where: { userId },
    data: { chartsState: state },
  });

  return NextResponse.json({ ok: true });
}


