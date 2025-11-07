import { NextResponse } from "next/server";
import { headers } from "next/headers";

// Simple admin endpoint - in production, add proper auth!
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { job } = body;

    // For local dev, allow without auth. In production, add proper authentication!
    const hdrs = await headers();
    const auth = hdrs.get("authorization");
    
    // In production, check auth token here
    // For now, allow localhost only
    if (process.env.NODE_ENV === "production" && !auth) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const jobs: Record<string, string> = {
      // New unified jobs
      "sync-catalogue": "/api/jobs/sync-catalogue",
      "sync-prices": "/api/jobs/sync-prices",
      "sync-mf-nav": "/api/jobs/sync-mf-nav",
      "run-maintenance": "/api/jobs/run-maintenance",
      // Legacy jobs (for backward compatibility)
      "sync-nse-universe": "/api/jobs/sync-nse-universe",
      "sync-mf-universe": "/api/jobs/sync-mf-universe",
    };

    const jobPath = jobs[job];
    if (!jobPath) {
      return NextResponse.json({ ok: false, error: "Invalid job" }, { status: 400 });
    }

    // Forward request to actual sync job
    // For local development, always use localhost. For production, use NEXT_PUBLIC_BASE_URL or request origin
    let baseUrl: string;
    
    // In development, always use localhost
    if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
      baseUrl = "http://localhost:3000";
    } else {
      // In production, use NEXT_PUBLIC_BASE_URL if set, otherwise construct from request
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
      
      if (!baseUrl) {
        const origin = req.headers.get("origin") || req.headers.get("host");
        if (origin) {
          if (origin.startsWith("http://") || origin.startsWith("https://")) {
            baseUrl = origin;
          } else {
            baseUrl = `https://${origin}`;
          }
        } else {
          // Last resort fallback
          baseUrl = "http://localhost:3000";
        }
      }
    }
    
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
    }

    const fullUrl = `${baseUrl}${jobPath}`;
    
    let res: Response;
    let data: any;
    
    try {
      res = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "X-CRON-KEY": cronSecret,
          "Content-Type": "application/json",
        },
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Try to read as text to see what we got
        const text = await res.text();
        return NextResponse.json({ 
          ok: false, 
          error: `Server returned non-JSON response (Status: ${res.status}). First 200 chars: ${text.substring(0, 200)}` 
        }, { status: 500 });
      }

      // Parse JSON response
      try {
        data = await res.json();
      } catch (jsonError: any) {
        return NextResponse.json({ 
          ok: false, 
          error: `Failed to parse JSON response: ${jsonError.message}` 
        }, { status: 500 });
      }
    } catch (fetchError: any) {
      // Handle fetch errors (network issues, invalid URLs, etc.)
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to fetch ${fullUrl}: ${fetchError.message}` 
      }, { status: 500 });
    }
    
    // If HTTP status is 429, mark as rate limit error
    if (res.status === 429 || (data.error && data.error.toLowerCase().includes("rate limit"))) {
      return NextResponse.json({ 
        ...data, 
        error: data.error || "Rate limit error: Too many requests" 
      }, { status: 429 });
    }
    
    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

