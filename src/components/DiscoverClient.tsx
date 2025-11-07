"use client";

import { useEffect, useState } from "react";
import ResultCard from "./ResultCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import SubtypeTiles from "./SubtypeTiles";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "MUTUAL_FUND", label: "Mutual Funds" },
  { key: "SIP", label: "SIP" },
  { key: "ETF", label: "ETFs" },
  { key: "STOCK", label: "Stocks" },
] as const;

export default function DiscoverClient() {
  const [amount, setAmount] = useState<number>(100);
  const [category, setCategory] = useState<typeof CATEGORIES[number]["key"]>("MUTUAL_FUND");
  const [mode, setMode] = useState<"lumpsum" | "sip">("lumpsum");
  const [subtype, setSubtype] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [exact, setExact] = useState<any[]>([]);
  const [fallback, setFallback] = useState<any[]>([]);
  const [fallbackRange, setFallbackRange] = useState<{min:number; max:number} | null>(null);
  const [showAllExact, setShowAllExact] = useState(false);
  const [showAllFallback, setShowAllFallback] = useState(false);
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const INITIAL_SHOW_COUNT = 10;

  function buildStatePayload() {
    return {
      amount,
      category,
      mode,
      subtype,
    };
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/preferences/discover", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && data.state) {
          const st = data.state;
          if (typeof st.amount === "number" && st.amount > 0) setAmount(st.amount);
          if (st.category) setCategory(st.category);
          if (st.mode) setMode(st.mode);
          if (st.subtype) setSubtype(st.subtype);
        }
      } catch (error) {
        console.error("Failed to load discover preferences", error);
      } finally {
        setHasLoadedPrefs(true);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      setFiltersOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedPrefs) return;
    const controller = new AbortController();
    
    const timeout = setTimeout(async () => {
      try {
        await fetch("/api/preferences/discover", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ state: buildStatePayload() }),
          signal: controller.signal,
        });
      } catch (error: any) {
        // Ignore AbortError - it's expected when component unmounts or dependencies change
        if (error?.name === "AbortError" || error?.message?.includes("aborted")) {
          return;
        }
        console.error("Failed to persist discover preferences", error);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [amount, category, mode, subtype, hasLoadedPrefs]);

  async function runDiscover() {
    setLoading(true);
    setExact([]);
    setFallback([]);
    setFallbackRange(null);
    setShowAllExact(false);
    setShowAllFallback(false);

    const body: any = { amount, category };
    if (category === "MUTUAL_FUND") body.mode = mode;
    if (subtype) {
      // Map STOCK subtype to marketCap enum values
      if (category === "STOCK") {
        const marketCapMap: Record<string, string> = {
          "LARGE": "LARGE",
          "MID": "MID",
          "SMALL": "SMALL",
        };
        if (marketCapMap[subtype.toUpperCase()]) {
          body.subtype = marketCapMap[subtype.toUpperCase()];
        }
      } else {
        body.subtype = subtype.toUpperCase();
      }
    }

    const res = await fetch("/api/discover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.ok) {
      toast.error(data.error || "Failed to discover");
      return;
    }
    setExact(data.exactMatches || []);
    if (data.fallbackUsed) {
      setFallbackRange(data.fallbackRange);
      setFallback(data.fallbackMatches || []);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4 md:sticky md:top-24 md:z-20 md:shadow-lg">
        <div className="flex items-center justify-between md:hidden">
          <p className="text-sm text-slate-300">Adjust your filters</p>
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="text-xs font-medium text-slate-200 px-3 py-1.5 rounded-full border border-slate-600 hover:bg-slate-700/60 transition"
          >
            {filtersOpen ? "Hide" : "Show"} filters
          </button>
        </div>

        <div className={`space-y-4 md:space-y-6 ${filtersOpen ? "block" : "hidden md:block"}`}>
          <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-200 mb-2 block">Amount (₹)</label>
            <input
              type="number"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-200 mb-2 block">Category</label>
            <select
              className="input-field"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            >
              {CATEGORIES.map(c => <option key={c.key} value={c.key} className="bg-slate-800">{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-200 mb-2 block">Mode / Subtype</label>
            <div className="flex gap-2">
              {category === "MUTUAL_FUND" && (
                <select
                  className="input-field w-1/2"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                >
                  <option value="lumpsum" className="bg-slate-800">Lumpsum</option>
                  <option value="sip" className="bg-slate-800">SIP</option>
                </select>
              )}
              <input
                className="input-field flex-1"
                placeholder="Subtype (e.g., INDEX, EQUITY)"
                value={subtype}
                onChange={(e) => setSubtype(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        </div>

        {/* subtype tiles */}
        <div className={`space-y-5 ${filtersOpen ? "block" : "hidden md:block"}`}>
          {category === "MUTUAL_FUND" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-200 mb-2 block">MF Type</label>
              <SubtypeTiles category="MUTUAL_FUND" value={subtype} onChange={setSubtype} />
            </div>
          )}
          {category === "ETF" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-200 mb-2 block">ETF Type</label>
              <SubtypeTiles category="ETF" value={subtype} onChange={setSubtype} />
            </div>
          )}
          {category === "STOCK" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-200 mb-2 block">Market Cap</label>
              <SubtypeTiles category="STOCK" value={subtype} onChange={setSubtype} />
            </div>
          )}
          {category === "SIP" && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-200 mb-2 block">Frequency</label>
              <SubtypeTiles category="SIP" value={subtype} onChange={setSubtype} />
            </div>
          )}
        </div>

        <Button onClick={runDiscover} disabled={loading} className="btn-primary w-full sm:w-auto">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finding options…</> : "Find options"}
        </Button>
        </div>
      </div>

      {/* results */}
      {exact.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-100">
              {exact.length} {exact.length === 1 ? 'option' : 'options'} available within ₹{amount.toLocaleString('en-IN')}
            </h3>
            <span className="text-sm text-slate-400">
              {showAllExact 
                ? `Showing all ${exact.length} matches` 
                : `Showing ${Math.min(INITIAL_SHOW_COUNT, exact.length)} of ${exact.length} matches`}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(showAllExact ? exact : exact.slice(0, INITIAL_SHOW_COUNT)).map((opt, idx) => (
              <div key={opt.id} className="animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                <ResultCard option={opt} />
              </div>
            ))}
          </div>
          {exact.length > INITIAL_SHOW_COUNT && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowAllExact(!showAllExact)}
                className="btn-outline"
              >
                {showAllExact ? `Show Less (${INITIAL_SHOW_COUNT})` : `Show More (${exact.length - INITIAL_SHOW_COUNT} more)`}
              </button>
            </div>
          )}
        </div>
      )}

      {fallbackRange && (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-6 border-amber-500/30 bg-amber-500/10">
            <div className="flex items-start gap-3">
              <div className="text-amber-400 text-xl">ℹ️</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-100 mb-2">
                  No exact matches found for ₹{amount.toLocaleString('en-IN')}
                </h3>
                <p className="text-slate-300 text-sm mb-3">
                  We couldn't find any {category === "STOCK" ? "stocks" : category === "ETF" ? "ETFs" : category === "MUTUAL_FUND" ? "mutual funds" : "SIPs"} available at exactly ₹{amount.toLocaleString('en-IN')}.
                </p>
                <p className="text-slate-200 font-medium">
                  Showing nearby options in the range ₹{fallbackRange.min.toLocaleString('en-IN')}–₹{fallbackRange.max.toLocaleString('en-IN')}:
                </p>
              </div>
            </div>
          </div>
          {fallback.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {showAllFallback 
                    ? `Showing all ${fallback.length} matches` 
                    : `Showing ${Math.min(INITIAL_SHOW_COUNT, fallback.length)} of ${fallback.length} matches`}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(showAllFallback ? fallback : fallback.slice(0, INITIAL_SHOW_COUNT)).map((opt, idx) => (
                  <div key={opt.id} className="animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                    <ResultCard option={opt} />
                  </div>
                ))}
              </div>
              {fallback.length > INITIAL_SHOW_COUNT && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setShowAllFallback(!showAllFallback)}
                    className="btn-outline"
                  >
                    {showAllFallback ? `Show Less (${INITIAL_SHOW_COUNT})` : `Show More (${fallback.length - INITIAL_SHOW_COUNT} more)`}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-slate-400">No options found in the nearby range either. Try adjusting your amount or filters.</p>
            </div>
          )}
        </div>
      )}

      {!loading && exact.length === 0 && !fallbackRange && (
        <div className="card p-8 text-center">
          <p className="text-slate-400 mb-2">No options found. Try:</p>
          <ul className="text-slate-500 text-sm space-y-1 mt-3">
            <li>• Increasing your amount</li>
            <li>• Changing the category</li>
            <li>• Removing subtype filters</li>
          </ul>
        </div>
      )}
    </div>
  );
}
