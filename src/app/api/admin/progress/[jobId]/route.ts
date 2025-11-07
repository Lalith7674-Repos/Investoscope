import { NextResponse } from "next/server";
import { getProgress } from "@/lib/sync-progress";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const progress = getProgress(jobId);
    
    // Return 200 even if progress not found (job hasn't started yet)
    if (!progress) {
      return NextResponse.json({ 
        ok: true, 
        progress: {
          jobId,
          total: 0,
          processed: 0,
          current: "Not started",
          status: "running" as const,
        }
      });
    }
    
    return NextResponse.json({ ok: true, progress });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

