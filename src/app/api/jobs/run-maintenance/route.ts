import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (req.headers.get("X-CRON-KEY") !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const cronKey = process.env.CRON_SECRET;

  if (!cronKey) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const headers = {
    "X-CRON-KEY": cronKey,
    "Content-Type": "application/json",
  } as Record<string, string>;

  const priceRes = await fetch(`${base}/api/jobs/sync-prices`, {
    method: "POST",
    headers,
    cache: "no-store",
  });

  if (!priceRes.ok) {
    const errorBody = await priceRes.json().catch(() => ({}));
    return NextResponse.json({ ok: false, error: "Price sync failed", details: errorBody }, { status: priceRes.status });
  }

  const priceJson = await priceRes.json();

  const catalogueRes = await fetch(`${base}/api/jobs/sync-catalogue`, {
    method: "POST",
    headers,
    cache: "no-store",
  });

  if (!catalogueRes.ok) {
    const errorBody = await catalogueRes.json().catch(() => ({}));
    return NextResponse.json({ ok: false, error: "Catalogue sync failed", details: errorBody }, { status: catalogueRes.status });
  }

  const catalogueJson = await catalogueRes.json();

  return NextResponse.json({
    ok: true,
    price: priceJson,
    catalogue: catalogueJson,
  });
}


