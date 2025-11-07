import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.NEXTAUTH_SECRET || "admin-secret-change-in-production";

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { ok: false, error: "Email, code, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Verify reset token
    const cookieStore = await cookies();
    const resetToken = cookieStore.get("admin-reset-token")?.value;

    if (!resetToken) {
      return NextResponse.json(
        { ok: false, error: "Reset session expired. Please start over." },
        { status: 400 }
      );
    }

    try {
      const decoded = verify(resetToken, ADMIN_SECRET) as any;
      if (!decoded.reset || decoded.email !== email.toLowerCase().trim() || decoded.code !== code) {
        return NextResponse.json(
          { ok: false, error: "Invalid reset session" },
          { status: 400 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: "Reset session expired. Please start over." },
        { status: 400 }
      );
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      return NextResponse.json(
        { ok: false, error: "Admin not found" },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.admin.update({
      where: { id: admin.id },
      data: { passwordHash },
    });

    // Clear reset token
    cookieStore.delete("admin-reset-token");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "Password reset failed" },
      { status: 500 }
    );
  }
}


