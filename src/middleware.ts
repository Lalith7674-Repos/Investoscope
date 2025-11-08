import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("x-pathname", req.nextUrl.pathname);
  
  // Handle redirect after login
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
  if (callbackUrl && req.nextUrl.pathname === "/login") {
    const url = req.nextUrl.clone();
    url.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(url);
  }

  // Protect admin routes - simple cookie check (detailed verification in API routes)
  if (req.nextUrl.pathname.startsWith("/admin") && !req.nextUrl.pathname.startsWith("/admin/login")) {
    const adminToken = req.cookies.get("admin-token")?.value;
    
    if (!adminToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
    // Token exists - let API routes handle detailed verification
  }
  
  return res;
}

export const config = {
  // Only protect routes that need authentication (like saved items)
  // Dashboard discovery features are now public!
  matcher: [
    "/admin/:path*",
    // No other routes require login by default
    // Login is optional - only needed for saving/bookmarking
  ],
};
