"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

export type OnboardingInput = {
  defaultAmount: number;
  riskTolerance: "low" | "medium" | "high";
  investmentGoal: string;
  timeHorizon: string;
  investmentStyle: "sip" | "lumpsum" | "both";
};

export async function completeOnboardingAction(input: OnboardingInput) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const userId = (session.user as any).id as string;

  await prisma.preference.upsert({
    where: { userId },
    create: {
      userId,
      defaultAmount: input.defaultAmount,
      riskTolerance: input.riskTolerance,
      investmentGoal: input.investmentGoal,
      timeHorizon: input.timeHorizon,
      investmentStyle: input.investmentStyle,
      onboarded: true,
    },
    update: {
      defaultAmount: input.defaultAmount,
      riskTolerance: input.riskTolerance,
      investmentGoal: input.investmentGoal,
      timeHorizon: input.timeHorizon,
      investmentStyle: input.investmentStyle,
      onboarded: true,
    },
  });

  return { ok: true };
}


