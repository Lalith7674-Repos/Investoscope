import { prisma } from "./prisma";

export async function upsertMutualFundFromAmfi(row: any) {
  const code = String(row["Scheme Code"] || "").trim();
  const name = String(row["Scheme Name"] || row["Scheme"] || "").trim();
  if (!code || !name) return { status: "skipped" as const };

  const n = name.toLowerCase();
  let subtypeMF: "INDEX" | "EQUITY" | "DEBT" | "HYBRID" = "EQUITY";
  if (n.includes("index")) subtypeMF = "INDEX";
  else if (n.includes("liquid") || n.includes("debt") || n.includes("bond")) subtypeMF = "DEBT";
  else if (n.includes("hybrid") || n.includes("balanced")) subtypeMF = "HYBRID";

  // Use atomic upsert: find existing, update if found, create if not
  // Check for duplicates first and handle them
  const existing = await prisma.investmentOption.findMany({
    where: { category: "MUTUAL_FUND", symbol: code },
  });

  if (existing.length > 1) {
    // Duplicates found - keep the first one, mark others inactive
    const [keep, ...duplicates] = existing;
    await prisma.investmentOption.updateMany({
      where: { 
        id: { in: duplicates.map(d => d.id) }
      },
      data: { active: false },
    });
    // Update the one we're keeping
    await prisma.investmentOption.update({
      where: { id: keep.id },
      data: { active: true, name, subtypeMF },
    });
    return { status: "updated" as const, symbol: code };
  }

  if (existing.length === 1) {
    // Update existing
    await prisma.investmentOption.update({
      where: { id: existing[0].id },
      data: { active: true, name, subtypeMF },
    });
    return { status: "updated" as const, symbol: code };
  }

  // Create new
  await prisma.investmentOption.create({
    data: {
      category: "MUTUAL_FUND",
      name,
      amc: undefined,
      subtypeMF,
      expenseRatioBps: undefined,
      minLumpSum: 100,
      minSIP: 100,
      unitPrice: null,
      riskLevel: subtypeMF === "DEBT" ? "low" : subtypeMF === "INDEX" ? "medium" : "high",
      riskReason:
        subtypeMF === "DEBT"
          ? "Debt/liquid; lower volatility"
          : subtypeMF === "INDEX"
          ? "Index-tracking; diversified"
          : "Equity heavy; volatile",
      symbol: code,
      active: true,
    } as any,
  });

  return { status: "created" as const, symbol: code };
}

export async function upsertSecurityFromNse(row: any) {
  const sym = String(row.SYMBOL || row.Symbol || row.symbol || "").trim();
  const name = String(row["NAME OF COMPANY"] || row.NAME || row.Name || "").trim();
  if (!sym || !name) return { status: "skipped" as const };

  const lower = name.toLowerCase();
  // Enhanced ETF detection: check for common ETF patterns
  const looksEtf = 
    lower.includes("etf") || 
    sym.endsWith("BEES") || 
    lower.includes("exchange traded fund") ||
    lower.includes("exchange-traded fund") ||
    (lower.includes("index fund") && !lower.includes("mutual fund")) ||
    sym.includes("ETF") ||
    sym.includes("BEES");
  
  const category = looksEtf ? "ETF" : "STOCK";
  const vendorSymbol = sym.includes(".") ? sym : `${sym}.NS`;
  
  // Determine ETF subtype if it's an ETF
  let subtypeETF: "BROAD_MARKET" | "SECTOR" | "GOLD" | "INTERNATIONAL" | null = null;
  if (looksEtf) {
    const lowerSym = sym.toLowerCase();
    if (lower.includes("gold") || lowerSym.includes("gold")) {
      subtypeETF = "GOLD";
    } else if (lower.includes("nifty") || lower.includes("sensex") || lower.includes("broad")) {
      subtypeETF = "BROAD_MARKET";
    } else if (lower.includes("bank") || lower.includes("it") || lower.includes("pharma") || 
               lower.includes("auto") || lower.includes("infra") || lower.includes("sector")) {
      subtypeETF = "SECTOR";
    } else if (lower.includes("international") || lower.includes("us") || lower.includes("nasdaq")) {
      subtypeETF = "INTERNATIONAL";
    } else {
      // Default to broad market if unclear
      subtypeETF = "BROAD_MARKET";
    }
  }

  // Try to get current price (optional - don't fail if API unavailable)
  let currentPrice: number | null = null;
  try {
    const { fetchDailyPrices } = await import("./vendor");
    const prices = await fetchDailyPrices(vendorSymbol);
    if (prices.length > 0) {
      currentPrice = prices[prices.length - 1]?.close || null;
    }
  } catch (e) {
    // Silently fail - price will be updated later by sync-prices job
  }

  // Determine market cap for stocks (rough heuristic)
  let marketCap: "LARGE" | "MID" | "SMALL" | null = null;
  if (category === "STOCK") {
    // This is a placeholder - in production, you'd fetch market cap from NSE data
    // For now, we'll leave it null and let it be set manually or via another sync
    marketCap = null;
  }

  // Check for existing entries by symbol (regardless of category, in case category changed)
  const existing = await prisma.investmentOption.findMany({
    where: { symbol: vendorSymbol },
  });

  if (existing.length > 1) {
    // Duplicates found - keep the first one (most recent), mark others inactive
    const [keep, ...duplicates] = existing.sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
    await prisma.investmentOption.updateMany({
      where: { 
        id: { in: duplicates.map(d => d.id) }
      },
      data: { active: false },
    });
    // Update the one we're keeping (also update category in case it changed)
    await prisma.investmentOption.update({
      where: { id: keep.id },
      data: { 
        active: true, 
        category: category as any,
        name, 
        unitPrice: currentPrice || undefined,
        ...(marketCap && { marketCap }),
        ...(subtypeETF && { subtypeETF }),
      },
    });
    return { status: "updated" as const, symbol: vendorSymbol, category: category as any };
  }

  if (existing.length === 1) {
    // Update existing (also update category in case it changed)
    await prisma.investmentOption.update({
      where: { id: existing[0].id },
      data: { 
        active: true, 
        category: category as any,
        name, 
        unitPrice: currentPrice || undefined,
        ...(marketCap && { marketCap }),
        ...(subtypeETF && { subtypeETF }),
      },
    });
    return { status: "updated" as const, symbol: vendorSymbol, category: category as any };
  }

  // Create new
  await prisma.investmentOption.create({
    data: {
      category: category as any,
      name,
      symbol: vendorSymbol,
      unitPrice: currentPrice,
      marketCap: marketCap as any,
      subtypeETF: subtypeETF as any,
      riskLevel: looksEtf ? "medium" : "high",
      riskReason: looksEtf ? "Tracks a basket/index; lower fees" : "Single company; market swings",
      active: true,
    } as any,
  });

  return { status: "created" as const, symbol: vendorSymbol, category: category as any };
}
