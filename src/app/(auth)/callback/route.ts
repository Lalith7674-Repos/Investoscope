import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    
    // If session exists, redirect to dashboard
    if (session?.user) {
      const url = new URL(req.url);
      const callbackUrl = url.searchParams.get("callbackUrl") || "/dashboard";
      return NextResponse.redirect(new URL(callbackUrl, req.url));
    }
    
    // If no session, redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  } catch (error) {
    // On error, redirect to login
    return NextResponse.redirect(new URL("/login?error=1", req.url));
  }
}
