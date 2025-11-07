import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, differenceInDays } from "date-fns";

type HoldingInput = {
  optionId: string;
  amount: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const holdings = Array.isArray(body?.holdings) ? (body.holdings as HoldingInput[]) : [];

    const filtered = holdings.filter((h) => h?.optionId && Number(h.amount) > 0);
    if (filtered.length === 0) {
      return NextResponse.json({
        ok: true,
        summary: {
          holdings: [],
          totalInvested: 0,
          projectedValue: 0,
          expectedReturnPct: null,
        },
      });
    }

    const optionIds = filtered.map((h) => h.optionId);
    const options = await prisma.investmentOption.findMany({
      where: { id: { in: optionIds } },
    });

    const since = subDays(new Date(), 450);

    const summaryHoldings: Array<any> = [];
    let totalInvested = 0;
    let weightedReturn = 0;
    let returnWeight = 0;

    for (const holding of filtered) {
      const option = options.find((o) => o.id === holding.optionId);
      if (!option) continue;

      const amountInvested = Number(holding.amount);
      if (!Number.isFinite(amountInvested) || amountInvested <= 0) continue;

      const hpSymbol =
        option.category === "MUTUAL_FUND" || option.category === "SIP"
          ? option.symbol
            ? `MF:${option.symbol}`
            : null
          : option.symbol;

      let latestPrice = option.unitPrice ?? null;
      let returnPct: number | null = null;

      if (hpSymbol) {
        const prices = await prisma.historicalPrice.findMany({
          where: { symbol: hpSymbol, date: { gte: since } },
          orderBy: { date: "asc" },
        });

        if (prices.length) {
          const latest = prices[prices.length - 1];
          latestPrice = latest?.close ?? latestPrice;
          let base = prices[0];

          if (latest) {
            for (const price of prices) {
              if (differenceInDays(latest.date, price.date) >= 330) {
                base = price;
                break;
              }
            }
          }

          if (base && latest && base.close > 0) {
            returnPct = (latest.close - base.close) / base.close;
          }
        }
      }

      totalInvested += amountInvested;
      if (returnPct != null) {
        weightedReturn += amountInvested * returnPct;
        returnWeight += amountInvested;
      }

      summaryHoldings.push({
        optionId: option.id,
        name: option.name,
        category: option.category,
        symbol: option.symbol,
        allocation: amountInvested,
        latestPrice: latestPrice ?? null,
        returnPct,
        projectedValue:
          returnPct != null ? amountInvested * (1 + Math.max(returnPct, -0.99)) : amountInvested,
        expenseRatioBps: option.expenseRatioBps,
        peRatio: option.peRatio,
        beta: option.beta,
        marketCapValue: option.marketCapValue,
      });
    }

    const expectedReturnPct = returnWeight > 0 ? weightedReturn / returnWeight : null;
    const projectedValue = summaryHoldings.reduce((sum, row) => sum + row.projectedValue, 0);

    return NextResponse.json({
      ok: true,
      summary: {
        holdings: summaryHoldings,
        totalInvested,
        projectedValue,
        expectedReturnPct,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}


