import "../styles/globals.css";
import CookieConsent from "@/components/CookieConsent";
import { getConsent } from "@/lib/cookies";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "sonner";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "InvestoScope - Discover investments that fit your budget",
  description: "Enter any amount and instantly see real investment options across Mutual Funds, SIPs, ETFs, and Stocks. No advice. No jargon.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hasConsent = await getConsent();

  return (
    <html lang="en" className="dark" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          html, body { background-color: #0f172a !important; color: #f8fafc !important; }
          * { color: inherit; }
          main, section, article { background-color: transparent !important; }
        ` }} />
      </head>
      <body className="antialiased" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>
        <div className="header-glass">
          <div className="container-xl">
            <Header />
          </div>
        </div>
        <div className="container-xl py-6 min-h-[calc(100vh-200px)]">
          {children}
        </div>
        <Footer />
        <Toaster richColors position="top-right" />
        <CookieConsent hasConsentSSR={hasConsent} />
        {hasConsent ? null : null}
      </body>
    </html>
  );
}



