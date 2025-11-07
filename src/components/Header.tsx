import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { headers } from "next/headers";
import UserProfile from "./UserProfile";
import type { Session } from "next-auth";

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

export default async function Header() {
  const session = (await getServerSession(authOptions as any)) as Session | null;
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") || "";

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        isActive(pathname, href) 
          ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" 
          : "text-slate-300 hover:text-slate-100 hover:bg-slate-800/60"
      }`}
    >
      {children}
    </Link>
  );

  return (
    <div className="flex items-center justify-between py-4">
      <Link href="/" className="text-xl font-bold text-slate-50 hover:text-white transition-colors">
        InvestoScope
      </Link>
      <nav className="flex items-center gap-2">
        <NavLink href="/dashboard">Discover</NavLink>
        <NavLink href="/dashboard/charts">Charts</NavLink>
        <NavLink href="/dashboard/goal">Goal</NavLink>
        <NavLink href="/dashboard/quiz">Quiz</NavLink>
        {session?.user ? <NavLink href="/dashboard/saved">Saved</NavLink> : null}
        {session?.user ? (
          <UserProfile
            name={session.user.name}
            email={session.user.email}
            image={session.user.image}
          />
        ) : (
          <Link href="/login" className="btn-primary text-sm">Sign in</Link>
        )}
      </nav>
    </div>
  );
}
