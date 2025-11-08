import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { ensurePreference } from "@/lib/preferences";
import OnboardingClient from "@/components/onboarding/OnboardingClient";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await getSafeServerSession();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/onboarding")}`);
  }

  const params = await searchParams;
  const redirectTo = typeof params?.redirect === "string" ? params.redirect : "/dashboard";

  const preference = await ensurePreference((session.user as any).id as string);
  if (preference.onboarded) {
    redirect(redirectTo || "/dashboard");
  }

  return <OnboardingClient redirectTo={redirectTo} initialAmount={preference.defaultAmount} riskTolerance={preference.riskTolerance as "low" | "medium" | "high"} />;
}


