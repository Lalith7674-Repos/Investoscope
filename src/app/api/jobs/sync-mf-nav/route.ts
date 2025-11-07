import { NextResponse } from "next/server";
import { fetchAmfiLatestNavMap } from "@/lib/vendor";
import { prisma } from "@/lib/prisma";
import { setProgress, getProgress, clearProgress } from "@/lib/sync-progress";

export async function POST(req: Request) {
  const jobId = "sync-mf-nav";
  
  try {
    if (req.headers.get("X-CRON-KEY") !== process.env.CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    clearProgress(jobId); // Clear any old progress
    setProgress(jobId, { total: 0, processed: 0, current: "Loading mutual funds...", status: "running" });

    const mfs = await prisma.investmentOption.findMany({
      where: { category: "MUTUAL_FUND", active: true },
      select: { symbol: true },
    });

    setProgress(jobId, { total: mfs.length, processed: 0, current: "Fetching latest NAVs from AMFI...", status: "running" });

    const navMap = await fetchAmfiLatestNavMap();
    const total = mfs.length;
    let writes = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < mfs.length; i++) {
      const mf = mfs[i];
      if (!mf.symbol) continue;
      const entry = navMap.get(String(mf.symbol));
      if (!entry) continue;
      const symbol = `MF:${mf.symbol}`;
      const date = new Date(entry.date);
      const close = entry.nav;

      await prisma.historicalPrice.deleteMany({ where: { symbol, date } });
      await prisma.historicalPrice.create({ data: { symbol, date, close, source: "amfi" } });
      writes++;
      
      // Update progress every batch
      if (i % BATCH_SIZE === 0 || i === mfs.length - 1) {
        setProgress(jobId, {
          total,
          processed: i + 1,
          current: `Updated NAV for ${writes} funds...`,
          status: "running",
        });
      }
    }

    setProgress(jobId, { total, processed: total, current: "Completed", status: "completed" });
    return NextResponse.json({ ok: true, writes });
  } catch (e: any) {
    const errorMsg = e.message || "Unknown error";
    const isRateLimit = 
      errorMsg.toLowerCase().includes("rate limit") ||
      errorMsg.toLowerCase().includes("429") ||
      errorMsg.toLowerCase().includes("too many requests") ||
      e.status === 429;
    
    const currentProgress = getProgress(jobId);
    setProgress(jobId, { 
      total: currentProgress?.total || 0, 
      processed: currentProgress?.processed || 0, 
      current: `Error: ${errorMsg}`, 
      status: "error",
      error: errorMsg,
    });
    
    return NextResponse.json({ 
      ok: false, 
      error: isRateLimit ? `Rate limit error: ${errorMsg}` : errorMsg 
    }, { status: isRateLimit ? 429 : 500 });
  }
}
