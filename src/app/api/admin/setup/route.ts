import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    // Check if admin already exists
    const existing = await prisma.admin.findFirst();
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Admin account already exists" },
        { status: 400 }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin
    await prisma.admin.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "Setup failed" },
      { status: 500 }
    );
  }
}

