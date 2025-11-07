"use server";

import { prisma } from "./prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function toggleSavedAction(optionId: string) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const userId = (session.user as any).id;
  const existing = await prisma.savedItem.findFirst({
    where: { userId, optionId },
  });

  if (existing) {
    await prisma.savedItem.delete({ where: { id: existing.id } });
    return { ok: true, saved: false };
  } else {
    await prisma.savedItem.create({
      data: { userId, optionId },
    });
    return { ok: true, saved: true };
  }
}

export async function getSavedStatus(optionId: string): Promise<boolean> {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) return false;

  const userId = (session.user as any).id;
  const existing = await prisma.savedItem.findFirst({
    where: { userId, optionId },
  });
  return !!existing;
}

