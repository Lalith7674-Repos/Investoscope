import { NextResponse } from "next/server";
import { discoverOptions } from "@/lib/discovery";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const amount = Number(body?.amount);
    const category = body?.category as "STOCK" | "MUTUAL_FUND" | "SIP" | "ETF";
    const mode = body?.mode as "lumpsum" | "sip" | undefined;
    const subtype = body?.subtype as string | undefined;
    const frequency = body?.frequency as "daily" | "weekly" | "monthly" | undefined;

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    const result = await discoverOptions({ amount, category, mode, subtype, frequency });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}



