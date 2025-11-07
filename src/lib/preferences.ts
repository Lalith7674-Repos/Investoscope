import { prisma } from "./prisma";

export async function ensurePreference(userId: string) {
  return prisma.preference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export async function getPreference(userId: string) {
  return prisma.preference.findUnique({ where: { userId } });
}

export async function updateDiscoverState(userId: string, state: any) {
  return prisma.preference.update({
    where: { userId },
    data: { discoverState: state },
  });
}

export async function updateChartsState(userId: string, state: any) {
  return prisma.preference.update({
    where: { userId },
    data: { chartsState: state },
  });
}


