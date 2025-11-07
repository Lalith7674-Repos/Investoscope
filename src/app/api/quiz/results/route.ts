import { NextResponse } from "next/server";
import { quizToPreset } from "@/lib/quiz";
import { discoverOptions } from "@/lib/discovery";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const budget = Number(body?.budget);
    const horizon = body?.horizon;
    const risk = body?.risk;
    const style = body?.style;

    if (!budget || budget <= 0) return NextResponse.json({ ok: false, error: "Invalid budget" }, { status: 400 });
    if (!horizon || !risk || !style) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });

    const preset = quizToPreset({ budget, horizon, risk, style });
    const result = await discoverOptions(preset as any);
    return NextResponse.json({ ok: true, preset, result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
