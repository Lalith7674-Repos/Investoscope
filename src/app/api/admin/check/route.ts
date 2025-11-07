import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || "admin-secret-change-in-production";

export async function GET() {
  try {
    // Check if admin is set up
    const admin = await prisma.admin.findFirst();
    
    if (!admin) {
      return NextResponse.json({ ok: true, isAdmin: false, adminEmail: null });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("admin-token")?.value;

    if (!token) {
      return NextResponse.json({ ok: true, isAdmin: false, adminEmail: admin.email });
    }

    try {
      const decoded = verify(token, ADMIN_SECRET) as any;
      if (decoded.admin) {
        return NextResponse.json({ ok: true, isAdmin: true, adminEmail: admin.email });
      }
    } catch (e) {
      // Invalid token
    }

    return NextResponse.json({ ok: true, isAdmin: false, adminEmail: admin.email });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}

