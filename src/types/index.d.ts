// Type definitions for InvestoScope

export type Category = "STOCK" | "MUTUAL_FUND" | "SIP" | "ETF";
export type SubtypeMF = "INDEX" | "EQUITY" | "DEBT" | "HYBRID";
export type SubtypeETF = "BROAD_MARKET" | "SECTOR" | "GOLD" | "INTERNATIONAL";
export type MarketCap = "LARGE" | "MID" | "SMALL";
export type RiskLevel = "low" | "medium" | "high";

export interface InvestmentOption {
  id: string;
  name: string;
  category: Category;
  symbol?: string | null;
  unitPrice?: number | null;
  minLumpSum?: number | null;
  minSIP?: number | null;
  riskLevel: RiskLevel;
  riskReason?: string | null;
  subtypeMF?: SubtypeMF | null;
  subtypeETF?: SubtypeETF | null;
  marketCap?: MarketCap | null;
  amc?: string | null;
  expenseRatioBps?: number | null;
  active: boolean;
  lastUpdated: Date;
  // Additional fields from Prisma schema
  priceHash?: string | null;
  navHash?: string | null;
  peRatio?: number | null;
  beta?: number | null;
  marketCapValue?: number | null;
}

export interface DiscoverInput {
  amount: number;
  category: Category;
  mode?: "lumpsum" | "sip";
  subtype?: string;
  frequency?: "daily" | "weekly" | "monthly";
}

export interface DiscoverResult {
  exactMatches: InvestmentOption[];
  fallbackUsed: boolean;
  fallbackRange?: { min: number; max: number };
  fallbackMatches?: InvestmentOption[];
}

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
