import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ensurePreference } from "@/lib/preferences";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const preference = await ensurePreference((session.user as any).id as string);

  if (!preference?.onboarded) {
    redirect(`/onboarding?redirect=${encodeURIComponent("/dashboard")}`);
  }

  return <>{children}</>;
}


