import NextAuth, { NextAuthOptions } from "next-auth";
import type { Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import { sendThankYouEmail } from "./mailer";
import { ensurePreference } from "./preferences";

// Validate NEXTAUTH_SECRET is set
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("⚠️  NEXTAUTH_SECRET is not set. Authentication may not work correctly.");
}

// Custom logger to suppress JWT_SESSION_ERROR (happens when old cookies exist)
const customLogger = {
  error(code: string, metadata: any) {
    // Suppress JWT_SESSION_ERROR - it's expected when old cookies exist with different secret
    if (code === "JWT_SESSION_ERROR" || code?.includes("JWT_SESSION_ERROR")) {
      // Silently ignore - old cookies will be cleared on next request or user can clear manually
      return;
    }
    // Log other errors normally
    const errorUrl = `https://next-auth.js.org/errors#${code.toLowerCase()}`;
    console.error(`[next-auth][error][${code}]`, errorUrl, metadata?.message || metadata, metadata);
  },
  warn(code: string, metadata?: any) {
    const warnUrl = `https://next-auth.js.org/warnings#${code.toLowerCase()}`;
    console.warn(`[next-auth][warn][${code}]`, warnUrl, metadata);
  },
  debug(message: string, metadata?: any) {
    // Suppress debug logs in production
    if (process.env.NODE_ENV === "development") {
      console.debug(`[next-auth][debug]`, message, metadata);
    }
  },
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-change-in-production",
  logger: customLogger,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER ?? "",
      from: process.env.EMAIL_FROM ?? "no-reply@investoscope.app",
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login?error=1",
    verifyRequest: "/login?verify=1",
  },
  callbacks: {
    async signIn({ account, profile }) {
      return true;
    },
    async session({ token, session }) {
      if (token?.sub && session.user) {
        (session.user as any).id = token.sub;
      }
      if (token?.name && session.user) {
        session.user.name = token.name as string;
      }
      if (token?.email && session.user) {
        session.user.email = token.email as string;
      }
      if (token?.picture && session.user) {
        session.user.image = token.picture as string;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        const anyProfile = profile as Record<string, any>;
        token.name = anyProfile.name;
        token.email = anyProfile.email;
        token.picture = anyProfile.picture ?? anyProfile.image;
      }
      return token;
    },
    async redirect({ url, baseUrl }) {
      // Handle callbackUrl from query params
      const urlObj = new URL(url, baseUrl);
      const callbackUrl = urlObj.searchParams.get("callbackUrl");
      
      if (callbackUrl) {
        // Decode the callback URL
        const decoded = decodeURIComponent(callbackUrl);
        if (decoded.startsWith("/")) {
          return `${baseUrl}${decoded}`;
        }
        return decoded;
      }
      
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      
      // Allow callback URLs on the same origin
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin === baseUrl) return url;
      } catch {
        // Invalid URL, use baseUrl
      }
      
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      if (!user?.email) return;
      try {
        if (user?.id) {
          await ensurePreference(user.id as string);
        }
        await sendThankYouEmail({
          to: user.email,
          name: user.name,
          provider: account?.provider,
          isNewUser,
        });
      } catch (error) {
        console.error("Failed to send welcome email", error);
      }
    },
  },
  cookies: {},
};

/**
 * Extended Session type with user.id
 */
export type ExtendedSession = Session & {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

/**
 * Get server session with proper typing
 * Uses the extended Session type from types/index.d.ts
 * The session callback in authOptions sets user.id, so we assert the extended type
 */
export async function getServerSessionTyped(): Promise<ExtendedSession | null> {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);
  // Type assertion: session callback ensures user.id exists
  return session as ExtendedSession | null;
}

/**
 * Safely get server session, handling JWT decryption errors gracefully
 * Returns null if session is invalid (e.g., encrypted with different secret)
 */
export async function getSafeServerSession() {
  try {
    return await getServerSessionTyped();
  } catch (error: any) {
    // If JWT decryption fails (e.g., old cookies with different secret), return null
    if (error?.message?.includes("decryption") || error?.message?.includes("JWT_SESSION_ERROR")) {
      return null;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

