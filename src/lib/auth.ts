import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./prisma";
import { sendThankYouEmail } from "./mailer";
import { ensurePreference } from "./preferences";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
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


