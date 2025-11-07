import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sign } from "jsonwebtoken";
import { getVerificationCode, deleteVerificationCode } from "@/lib/admin-verification";

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || "admin-secret-change-in-production";

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { ok: false, error: "Email and code are required" },
        { status: 400 }
      );
    }

    const stored = getVerificationCode(email);

    if (!stored) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    if (stored.code !== code) {
      return NextResponse.json(
        { ok: false, error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Code is valid - create a temporary reset token
    const resetToken = sign(
      { reset: true, email: email.toLowerCase().trim(), code, timestamp: Date.now() },
      ADMIN_SECRET,
      { expiresIn: "15m" }
    );

    // Set reset token in cookie
    const cookieStore = await cookies();
    cookieStore.set("admin-reset-token", resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60, // 15 minutes
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "Verification failed" },
      { status: 500 }
    );
  }
}

