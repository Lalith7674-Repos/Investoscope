import { NextResponse } from "next/server";
import { getServerSessionTyped } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSessionTyped();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: true, state: null }); // Return empty state instead of error for unauthenticated users
    }

    const userId = session.user.id;
    const pref = await prisma.preference.findUnique({ where: { userId } });
    return NextResponse.json({ ok: true, state: pref?.discoverState || null });
  } catch (e: any) {
    console.error("Error fetching discover preferences:", e);
    return NextResponse.json({ ok: true, state: null }, { status: 200 }); // Return empty state on error
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSessionTyped();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: true }); // Silently succeed for unauthenticated users
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const { state } = body;

    // Use upsert to handle case where preference doesn't exist
    await prisma.preference.upsert({
      where: { userId },
      update: { discoverState: state },
      create: {
        userId,
        discoverState: state,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Error saving discover preferences:", e);
    return NextResponse.json({ ok: true }); // Silently succeed on error to avoid breaking UI
  }
}


