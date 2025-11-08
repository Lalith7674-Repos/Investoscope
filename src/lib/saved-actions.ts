"use server";

import { prisma } from "./prisma";
import { getServerSessionTyped } from "./auth";

export async function toggleSavedAction(optionId: string) {
  const session = await getServerSessionTyped();
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const userId = session.user.id;
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
  const session = await getServerSessionTyped();
  if (!session?.user?.id) return false;

  const userId = session.user.id;
  const existing = await prisma.savedItem.findFirst({
    where: { userId, optionId },
  });
  return !!existing;
}

