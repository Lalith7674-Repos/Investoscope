import { prisma } from "@/lib/prisma";

type Category = "STOCK" | "MUTUAL_FUND" | "SIP" | "ETF";

export type DiscoverInput = {
  amount: number;                     // user-entered amount
  category: Category;                 // required
  mode?: "lumpsum" | "sip";           // for MF/SIP only
  subtype?: string;                   // optional (INDEX, EQUITY, etc.)
  frequency?: "daily" | "weekly" | "monthly"; // for SIP, optional
};

export type DiscoverResult = {
  exactMatches: any[];
  fallbackUsed: boolean;
  fallbackRange?: { min: number; max: number };
  fallbackMatches?: any[];
};

const FALLBACK_BANDS = [
  { min: 10,  max: 50 },
  { min: 50,  max: 100 },
  { min: 100, max: 250 },
  { min: 250, max: 500 },
  { min: 500, max: 1000 },
  { min: 1000, max: 2000 },
  { min: 2000, max: 5000 },
];

// Decide which numeric field determines “can I buy with X?” by category
function fieldForCategory(category: Category, mode?: "lumpsum" | "sip") {
  if (category === "STOCK" || category === "ETF") return "unitPrice";
  if (category === "SIP") return "minSIP";
  // MUTUAL_FUND:
  return mode === "sip" ? "minSIP" : "minLumpSum";
}

// Pick a reasonable fallback band given user amount
function nearestBand(amount: number) {
  // If below smallest band, use the first band
  if (amount <= FALLBACK_BANDS[0].min) return FALLBACK_BANDS[0];
  // Find band that contains or is just above the amount
  for (const b of FALLBACK_BANDS) {
    if (amount >= b.min && amount <= b.max) return b;
  }
  // Otherwise choose next higher band up to a cap
  for (const b of FALLBACK_BANDS) {
    if (amount < b.min) return b;
  }
  return FALLBACK_BANDS[FALLBACK_BANDS.length - 1];
}

export async function discoverOptions(input: DiscoverInput): Promise<DiscoverResult> {
  const { amount, category, mode, subtype } = input;

  if (!amount || amount <= 0) {
    throw new Error("Amount must be a positive number.");
  }
  if (!category) {
    throw new Error("Category is required.");
  }

  // SIP category should be treated as MUTUAL_FUND with mode="sip"
  const effectiveCategory = category === "SIP" ? "MUTUAL_FUND" : category;
  const effectiveMode = category === "SIP" ? "sip" : mode;

  const field = fieldForCategory(category, effectiveMode);

  // Build base where clause
  const where: any = { category: effectiveCategory, active: true };

  // Apply subtype if provided (with validation)
  if (effectiveCategory === "MUTUAL_FUND" && subtype) {
    // Validate that subtype is a valid SubtypeMF value
    const validMFSubtypes = ["EQUITY", "INDEX", "DEBT", "HYBRID"];
    if (validMFSubtypes.includes(subtype.toUpperCase())) {
      where.subtypeMF = subtype.toUpperCase();
    }
    // If invalid, silently ignore (don't filter by subtype)
  }
  if (effectiveCategory === "ETF" && subtype) {
    // Validate that subtype is a valid SubtypeETF value
    const validETFSubtypes = ["BROAD_MARKET", "SECTOR", "GOLD", "INTERNATIONAL"];
    if (validETFSubtypes.includes(subtype.toUpperCase())) {
      where.subtypeETF = subtype.toUpperCase();
    }
    // If invalid, silently ignore (don't filter by subtype)
  }
  // Note: SIP subtypes (MONTHLY, WEEKLY, DAILY) are not stored in DB, so we don't filter by them

  // Exact “available within amount” logic:
  // - For unitPrice: unitPrice <= amount
  // - For minSIP/minLumpSum: field <= amount
  if (field === "unitPrice") {
    where.unitPrice = { lte: amount };
  } else if (field === "minSIP") {
    where.minSIP = { lte: amount };
  } else if (field === "minLumpSum") {
    where.minLumpSum = { lte: amount };
  }

  // Apply marketCap filter for STOCK category if subtype provided
  if (effectiveCategory === "STOCK" && subtype) {
    // Validate that subtype is a valid MarketCap value
    const validMarketCaps = ["LARGE", "MID", "SMALL"];
    if (validMarketCaps.includes(subtype.toUpperCase())) {
      where.marketCap = subtype.toUpperCase();
    }
    // If invalid, silently ignore (don't filter by subtype)
  }

  const exactMatches = await prisma.investmentOption.findMany({
    where,
    orderBy: [
      // Prefer closest-to-amount options first
      field === "unitPrice"
        ? { unitPrice: "desc" as const }
        : field === "minSIP"
        ? { minSIP: "desc" as const }
        : { minLumpSum: "desc" as const },
      { name: "asc" },
    ],
    take: 100, // Show more options like Groww
  });

  if (exactMatches.length > 0) {
    return { exactMatches, fallbackUsed: false };
  }

  // Fallback: broaden search to a nearby band
  const band = nearestBand(amount);

  // Build fallback where
  const fallbackWhere: any = { category: effectiveCategory, active: true };
  if (effectiveCategory === "MUTUAL_FUND" && subtype) {
    // Validate that subtype is a valid SubtypeMF value
    const validMFSubtypes = ["EQUITY", "INDEX", "DEBT", "HYBRID"];
    if (validMFSubtypes.includes(subtype.toUpperCase())) {
      fallbackWhere.subtypeMF = subtype.toUpperCase();
    }
  }
  if (effectiveCategory === "ETF" && subtype) {
    // Validate that subtype is a valid SubtypeETF value
    const validETFSubtypes = ["BROAD_MARKET", "SECTOR", "GOLD", "INTERNATIONAL"];
    if (validETFSubtypes.includes(subtype.toUpperCase())) {
      fallbackWhere.subtypeETF = subtype.toUpperCase();
    }
  }
  if (effectiveCategory === "STOCK" && subtype) {
    // Validate that subtype is a valid MarketCap value
    const validMarketCaps = ["LARGE", "MID", "SMALL"];
    if (validMarketCaps.includes(subtype.toUpperCase())) {
      fallbackWhere.marketCap = subtype.toUpperCase();
    }
  }
  // Note: SIP subtypes (MONTHLY, WEEKLY, DAILY) are not stored in DB, so we don't filter by them

  if (field === "unitPrice") {
    fallbackWhere.unitPrice = { gte: band.min, lte: band.max };
  } else if (field === "minSIP") {
    fallbackWhere.minSIP = { gte: band.min, lte: band.max };
  } else if (field === "minLumpSum") {
    fallbackWhere.minLumpSum = { gte: band.min, lte: band.max };
  }

  const fallbackMatches = await prisma.investmentOption.findMany({
    where: fallbackWhere,
    orderBy: [
      // Sort by price/amount ascending to show closest matches first
      field === "unitPrice"
        ? { unitPrice: "asc" as const }
        : field === "minSIP"
        ? { minSIP: "asc" as const }
        : { minLumpSum: "asc" as const },
      { name: "asc" },
    ],
    take: 100, // Show more options like Groww
  });

  return {
    exactMatches: [],
    fallbackUsed: true,
    fallbackRange: band,
    fallbackMatches,
  };
}



