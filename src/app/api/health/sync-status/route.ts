import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Health check endpoint to verify sync jobs are running and data is fresh
 * This helps ensure Top Movers section always has daily data
 */
export async function GET() {
  try {
    // Check latest price update
    const latestPrice = await prisma.historicalPrice.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });

    // Check latest sync job
    const latestSync = await prisma.syncLog.findFirst({
      where: { jobId: { in: ["sync-prices", "run-maintenance"] } },
      orderBy: { startedAt: "desc" },
      select: { jobId: true, status: true, startedAt: true, finishedAt: true },
    });

    // Check if data is fresh (updated within last 26 hours)
    const now = new Date();
    const twentySixHoursAgo = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    const isDataFresh = latestPrice 
      ? new Date(latestPrice.date) >= twentySixHoursAgo 
      : false;

    // Check if sync ran recently (within last 26 hours)
    const isSyncRecent = latestSync?.startedAt
      ? new Date(latestSync.startedAt) >= twentySixHoursAgo
      : false;

    // Determine health status
    let status: "healthy" | "warning" | "critical" = "healthy";
    let message = "All systems operational";
    
    if (!latestPrice) {
      status = "critical";
      message = "No price data found - sync jobs may not have run";
    } else if (!isDataFresh) {
      status = "warning";
      message = `Data is stale - last update: ${new Date(latestPrice.date).toLocaleString()}`;
    } else if (!isSyncRecent && latestSync?.status !== "completed") {
      status = "warning";
      message = `Last sync (${latestSync?.jobId}) status: ${latestSync?.status}`;
    }

    return NextResponse.json({
      ok: true,
      status,
      message,
      data: {
        latestPriceDate: latestPrice?.date || null,
        isDataFresh,
        latestSync: latestSync ? {
          jobId: latestSync.jobId,
          status: latestSync.status,
          startedAt: latestSync.startedAt,
          finishedAt: latestSync.finishedAt,
        } : null,
        isSyncRecent,
        timestamp: now.toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      status: "error",
      message: e.message,
    }, { status: 500 });
  }
}

