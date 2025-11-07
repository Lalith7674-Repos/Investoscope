import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCode, setVerificationCode } from "@/lib/admin-verification";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin) {
      // Don't reveal if email exists for security
      return NextResponse.json(
        { ok: false, error: "If this email exists, a verification code has been sent" },
        { status: 400 }
      );
    }

    // Generate verification code
    const code = generateCode();
    setVerificationCode(admin.email, code, 10);

    // In production, send email here using nodemailer or similar
    // For now, we'll log it (you should implement email sending)
    console.log(`[ADMIN FORGOT PASSWORD] Verification code for ${admin.email}: ${code}`);
    console.log(`[IMPORTANT] In production, send this code via email to ${admin.email}`);

    // TODO: Implement email sending
    // await sendEmail({
    //   to: admin.email,
    //   subject: "Admin Password Reset Verification Code",
    //   text: `Your verification code is: ${code}. This code expires in 10 minutes.`,
    // });

    return NextResponse.json({
      ok: true,
      message: "Verification code sent to your email",
      // Remove this in production - only for development
      devCode: process.env.NODE_ENV === "development" ? code : undefined,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "Failed to send verification code" },
      { status: 500 }
    );
  }
}

