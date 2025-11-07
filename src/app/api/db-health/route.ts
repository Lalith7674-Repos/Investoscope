import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.investmentOption.count();
    return Response.json({ ok: true, investmentOptions: count });
  } catch (e: any) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
