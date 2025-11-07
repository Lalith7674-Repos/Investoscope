import { NextResponse } from "next/server";

// NextAuth handles OAuth callbacks automatically via /api/auth/callback/[provider]
// This route is a fallback that redirects to dashboard
export async function GET(req: Request) {
  const url = new URL(req.url);
  const callbackUrl = url.searchParams.get("callbackUrl") || "/dashboard";
  return NextResponse.redirect(new URL(callbackUrl, req.url));
}
