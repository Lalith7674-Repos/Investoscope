"use client";

import { useMemo } from "react";

type Props = {
  monthlyAmount: number;        // e.g., 100
  months: number;               // e.g., 12
  series: { date: string | Date; close: number }[]; // NAV or price over time (ascending)
};

export default function SipCalculator({ monthlyAmount, months, series }: Props) {
  // naive monthly backtest: buy at end-of-month price
  const result = useMemo(() => {
    if (!series?.length) return null;

    const byMonth = new Map<string, number>();
    for (const p of series) {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${d.getMonth()+1}`;
      byMonth.set(key, p.close); // last close of that month overwrites earlier
    }
    const monthKeys = Array.from(byMonth.keys()).sort((a,b)=>a.localeCompare(b));
    const lastN = monthKeys.slice(-months);

    let units = 0;
    let invested = 0;
    for (const key of lastN) {
      const price = byMonth.get(key)!;
      const u = monthlyAmount / price;
      units += u;
      invested += monthlyAmount;
    }
    const latestPrice = series[series.length-1].close;
    const currentValue = units * latestPrice;
    const gain = currentValue - invested;
    const gainPct = invested ? (gain / invested) * 100 : 0;

    return { invested, currentValue, gain, gainPct };
  }, [monthlyAmount, months, series]);

  if (!result) return null;

  const nf = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
  return (
    <div className="rounded-2xl border p-4">
      <h3 className="text-sm font-medium">SIP Backtest</h3>
      <p className="text-xs text-muted-foreground">Simulated monthly investing using historical prices.</p>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>Invested: <span className="font-medium">{nf.format(result.invested)}</span></div>
        <div>Value now: <span className="font-medium">{nf.format(result.currentValue)}</span></div>
        <div>Gain: <span className={result.gain>=0 ? "text-emerald-600" : "text-rose-600"}>{nf.format(result.gain)}</span></div>
        <div>Return: <span className={result.gainPct>=0 ? "text-emerald-600" : "text-rose-600"}>{result.gainPct.toFixed(2)}%</span></div>
      </div>
    </div>
  );
}
