import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSafeServerSession } from "@/lib/auth";
import { ensurePreference } from "@/lib/preferences";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Safely get session, handling invalid cookies gracefully
  const session = await getSafeServerSession();
  
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const preference = await ensurePreference((session.user as any).id as string);

  if (!preference?.onboarded) {
    redirect(`/onboarding?redirect=${encodeURIComponent("/dashboard")}`);
  }

  return <>{children}</>;
}


