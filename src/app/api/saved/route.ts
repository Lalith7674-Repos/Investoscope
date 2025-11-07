import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const savedItems = await prisma.savedItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!savedItems.length) {
    return NextResponse.json({ ok: true, items: [] });
  }

  const optionIds = savedItems.map((item) => item.optionId);
  const options = await prisma.investmentOption.findMany({
    where: { id: { in: optionIds } },
  });

  const optionMap = new Map(options.map((option) => [option.id, option]));

  const items = savedItems
    .map((item) => {
      const option = optionMap.get(item.optionId);
      if (!option) return null;
      return {
        id: item.id,
        createdAt: item.createdAt,
        option: {
          ...option,
          lastUpdated: option.lastUpdated ? option.lastUpdated.toISOString() : null,
        },
      };
    })
    .filter(Boolean);

  return NextResponse.json({ ok: true, items });
}


