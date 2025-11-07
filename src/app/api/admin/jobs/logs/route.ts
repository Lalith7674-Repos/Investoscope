import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET =
  process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || "admin-secret-change-in-production";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return unauthorized();
    }

    try {
      const decoded = verify(token, ADMIN_SECRET) as any;
      if (!decoded?.admin) return unauthorized();
    } catch (error) {
      return unauthorized();
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);

    const where: any = {};
    if (jobId && jobId !== "all") where.jobId = jobId;
    if (status && status !== "all") where.status = status;

    const logs = await prisma.syncLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    const summary = logs.reduce(
      (acc, log) => {
        acc.total += 1;
        acc.byStatus[log.status] = (acc.byStatus[log.status] || 0) + 1;
        acc.byJob[log.jobId] = (acc.byJob[log.jobId] || 0) + 1;
        return acc;
      },
      { total: 0, byStatus: {} as Record<string, number>, byJob: {} as Record<string, number> }
    );

    return NextResponse.json({ ok: true, logs, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}


