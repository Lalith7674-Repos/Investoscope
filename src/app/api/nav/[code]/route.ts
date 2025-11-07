import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!code) return NextResponse.json({ ok: false, error: "Code required" }, { status: 400 });

    const symbol = `MF:${code}`;

    const existing = await prisma.historicalPrice.findMany({
      where: { symbol },
      orderBy: { date: "asc" },
    });

    const freshEnough =
      existing.length > 0 &&
      Date.now() - new Date(existing[existing.length - 1].date).getTime() < DAY_MS;

    if (freshEnough) {
      return NextResponse.json({ ok: true, data: existing.map(p => ({ date: p.date, close: p.close })), cached: true });
    }

    // Fetch from MFAPI (unofficial) to get NAV history
    const url = `https://api.mfapi.in/mf/${encodeURIComponent(code)}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const raw = Array.isArray(json?.data) ? json.data : [];

        const entries = raw
          .map((item: any) => {
            const dateStr = String(item?.date || "").trim();
            const navStr = String(item?.nav || "").trim();
            if (!dateStr || !navStr) return null;
            // date format: DD-MM-YYYY
            const [dd, mm, yyyy] = dateStr.split("-");
            if (!dd || !mm || !yyyy) return null;
            const parsedDate = new Date(`${yyyy}-${mm}-${dd}`);
            const nav = Number(navStr.replace(/,/g, ""));
            if (!isFinite(nav)) return null;
            return {
              symbol,
              date: parsedDate,
              close: nav,
              source: "mfapi",
            };
          })
          .filter(Boolean) as { symbol: string; date: Date; close: number; source: string }[];

        entries.sort((a, b) => a.date.getTime() - b.date.getTime());

        if (entries.length > 0) {
          // Keep last 3 years of history
          const cutoff = new Date(Date.now() - 3 * 365 * DAY_MS);
          const filtered = entries.filter((e) => e.date >= cutoff);

          await prisma.historicalPrice.deleteMany({ where: { symbol } });
          await prisma.historicalPrice.createMany({ data: filtered });

          return NextResponse.json({
            ok: true,
            data: filtered.map((p) => ({ date: p.date, close: p.close })),
            cached: false,
            source: "mfapi",
          });
        }
      }
    } catch (err) {
      // Ignore and fallback to existing cache
    }

    if (existing.length > 0) {
      return NextResponse.json({
        ok: true,
        data: existing.map((p) => ({ date: p.date, close: p.close })),
        cached: true,
        note: "Using cached NAV data",
      });
    }

    return NextResponse.json({ ok: true, data: [], cached: false });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
