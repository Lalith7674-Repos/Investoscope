import { NextResponse } from "next/server";
import { fetchNseSecuritiesCsv } from "@/lib/vendor";
import { upsertSecurityFromNse } from "@/lib/sync-helpers";
import { setProgress, getProgress, clearProgress } from "@/lib/sync-progress";

export async function POST(req: Request) {
  const jobId = "sync-nse-universe";
  
  try {
    if (req.headers.get("X-CRON-KEY") !== process.env.CRON_SECRET) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    clearProgress(jobId); // Clear any old progress
    setProgress(jobId, { total: 0, processed: 0, current: "Fetching NSE data...", status: "running" });
    
    const rows = await fetchNseSecuritiesCsv();
    const total = rows.length;
    
    setProgress(jobId, { total, processed: 0, current: `Processing ${total} securities...`, status: "running" });
    
    let upserts = 0;
    const BATCH_SIZE = 50; // Update progress every 50 items

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await upsertSecurityFromNse(r);
      upserts++;
      
      // Update progress every batch
      if (i % BATCH_SIZE === 0 || i === rows.length - 1) {
        setProgress(jobId, {
          total,
          processed: i + 1,
          current: `Processing ${r.SYMBOL || r.Symbol || "security"}...`,
          status: "running",
        });
      }
    }

    setProgress(jobId, { total, processed: total, current: "Completed", status: "completed" });
    return NextResponse.json({ ok: true, upserts });
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
