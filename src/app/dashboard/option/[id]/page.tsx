import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import LineChart from "@/components/charts/LineChart";
import SipCalculator from "@/components/SipCalculator";
import Logo from "@/components/Logo";
import PriceAlertsCard from "@/components/PriceAlertsCard";

async function getChartFor(option: any) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    if (option.category === "MUTUAL_FUND" || option.category === "SIP") {
      if (!option.symbol) return [];
      const res = await fetch(`${base}/api/nav/${encodeURIComponent(option.symbol)}`, { 
        cache: "no-store",
        next: { revalidate: 0 }
      });
      if (!res.ok) return [];
      const j = await res.json();
      return j.ok && j.data ? j.data : [];
    }
    if (option.symbol) {
      const res = await fetch(`${base}/api/charts/${encodeURIComponent(option.symbol)}`, { 
        cache: "no-store",
        next: { revalidate: 0 }
      });
      if (!res.ok) return [];
      const j = await res.json();
      return j.ok && j.data ? j.data : [];
    }
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return [];
  }
  return [];
}

export default async function OptionDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const option = await prisma.investmentOption.findUnique({ where: { id } });
  if (!option) return notFound();

  const chartData: any[] = await getChartFor(option);

  const hpSymbol = option.category === "MUTUAL_FUND" || option.category === "SIP" ? (option.symbol ? `MF:${option.symbol}` : null) : option.symbol;
  const last = hpSymbol
    ? await prisma.historicalPrice.findFirst({ where: { symbol: hpSymbol }, orderBy: { date: "desc" } })
    : null;

  return (
    <main className="space-y-8 animate-fade-in">
      <div className="card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {(option.category === "STOCK" || option.category === "ETF") && option.symbol ? (
              <Logo symbol={option.symbol} name={option.name} size="md" />
            ) : null}
            <div>
              <h1 className="text-3xl font-bold text-white">{option.name}</h1>
              <p className="text-sm text-white/60 mt-2">
                {option.category}
                {option.symbol ? ` · ${option.symbol}` : ""}
                {option.subtypeMF ? ` · ${option.subtypeMF}` : ""}
                {option.subtypeETF ? ` · ${option.subtypeETF}` : ""}
              </p>
              <p className="text-xs text-white/40 mt-2">
                Last updated: {last ? new Date(last.date).toLocaleDateString("en-IN") : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Historical performance (1Y)</h2>
          {chartData.length > 0 ? (
            <div className="card p-4">
              <LineChart data={chartData} />
            </div>
          ) : (
            <div className="card p-6 text-center">
              <p className="text-white/60 mb-2">
                {option.symbol
                  ? "Fetching chart data... This may take a moment on first load."
                  : "This option doesn't have a tradable symbol. NAV charts coming later."}
              </p>
              {option.symbol && (
                <p className="text-xs text-white/40">
                  If data doesn't appear, the symbol may not be available or the API is temporarily unavailable.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {(option.category === "MUTUAL_FUND" || option.category === "SIP") && chartData.length ? (
        <SipCalculator monthlyAmount={100} months={12} series={chartData} />
      ) : null}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-white mb-3">Entry requirements</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li>Unit price: {option.unitPrice ? `₹${option.unitPrice.toLocaleString("en-IN")}` : "—"}</li>
            <li>Min SIP: {option.minSIP ? `₹${option.minSIP.toLocaleString("en-IN")}` : "—"}</li>
            <li>Min Lumpsum: {option.minLumpSum ? `₹${option.minLumpSum.toLocaleString("en-IN")}` : "—"}</li>
          </ul>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-white mb-3">Risk</h3>
          <p className="text-sm text-white/70 mb-2">Level: <span className="font-semibold text-white">{option.riskLevel}</span></p>
          {option.riskReason ? <p className="text-sm text-white/50">{option.riskReason}</p> : null}
        </div>
      </div>

      <MetricsCard option={option} />
      <PriceAlertsCard option={option} />
    </main>
  );
}

function MetricsCard({ option }: { option: any }) {
  const isFund = option.category === "MUTUAL_FUND" || option.category === "SIP";
  const showStockMetrics = option.category === "STOCK" || option.category === "ETF";

  const expenseRatio = option.expenseRatioBps != null
    ? `${(option.expenseRatioBps / 100).toFixed(2)}%`
    : "—";

  const marketCapStr = option.marketCapValue
    ? formatMarketCap(option.marketCapValue)
    : option.marketCap
    ? option.marketCap.toLowerCase()
    : "—";

  if (!showStockMetrics && !isFund) {
    return null;
  }

  return (
    <div className="card p-6 space-y-3">
      <h3 className="text-sm font-medium text-white">Quick metrics</h3>
      <div className="grid sm:grid-cols-3 gap-4 text-sm text-white/70">
        {showStockMetrics ? (
          <>
            <Metric label="P/E Ratio" value={option.peRatio != null ? option.peRatio.toFixed(2) : "—"} />
            <Metric label="Beta" value={option.beta != null ? option.beta.toFixed(2) : "—"} />
            <Metric label="Market Cap" value={marketCapStr} />
          </>
        ) : null}
        {isFund ? (
          <>
            <Metric label="Expense ratio" value={expenseRatio} />
            <Metric label="Risk profile" value={option.riskLevel || "—"} />
            <Metric label="Fund type" value={option.subtypeMF || option.category || "—"} />
          </>
        ) : null}
      </div>
      {showStockMetrics && option.peRatio == null && (
        <p className="text-xs text-white/40">P/E and beta will appear after the next data refresh.</p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs text-white/40 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function formatMarketCap(value: number) {
  if (value >= 1e12) return `₹${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₹${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `₹${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `₹${(value / 1e3).toFixed(2)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
}



