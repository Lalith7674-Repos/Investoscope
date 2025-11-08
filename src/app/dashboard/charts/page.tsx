"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, TrendingUp } from "lucide-react";
import LineChart from "@/components/charts/LineChart";
import Logo from "@/components/Logo";
import { toast } from "sonner";

type SearchResult = {
  id: string;
  name: string;
  symbol: string | null;
  category: string;
  unitPrice: number | null;
};

type TimePeriod = "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | "5y" | "max";

const TIME_PERIODS: { key: TimePeriod; label: string }[] = [
  { key: "1d", label: "1 Day" },
  { key: "1w", label: "1 Week" },
  { key: "1m", label: "1 Month" },
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "5y", label: "5 Years" },
  { key: "max", label: "Max" },
];

export default function ChartsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SearchResult | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("1y");
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [controlsPinned, setControlsPinned] = useState(false);

  // Load preferences
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/preferences/charts", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && data.state) {
          const st = data.state;
          if (st.searchQuery) setSearchQuery(st.searchQuery);
          if (st.selectedCompany) setSelectedCompany(st.selectedCompany);
          if (st.timePeriod) setTimePeriod(st.timePeriod);
        }
      } catch (error) {
        console.error("Failed to load charts preferences", error);
      } finally {
        setHasLoadedPrefs(true);
      }
    }
    load();
  }, []);

  // Persist preferences
  useEffect(() => {
    if (!hasLoadedPrefs) return;
    const timeout = setTimeout(async () => {
      try {
        await fetch("/api/preferences/charts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            state: {
              searchQuery,
              selectedCompany,
              timePeriod,
            },
          }),
        });
      } catch (error) {
        if ((error as any)?.name !== "AbortError") {
          console.error("Failed to persist charts preferences", error);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
    };
  }, [searchQuery, selectedCompany, timePeriod, hasLoadedPrefs]);

  useEffect(() => {
    function handleScroll() {
      if (!controlsRef.current) return;
      const { top } = controlsRef.current.getBoundingClientRect();
      setControlsPinned(top <= 80);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.ok) {
          setSearchResults(data.results || []);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch chart data when company or period changes
  useEffect(() => {
    if (!selectedCompany?.symbol) {
      setChartData([]);
      return;
    }

    async function fetchChart() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/charts/${encodeURIComponent(selectedCompany.symbol!)}?period=${timePeriod}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (data.ok && data.data) {
          setChartData(data.data);
        } else {
          toast.error(data.error || "Failed to fetch chart data");
          setChartData([]);
        }
      } catch (error) {
        console.error("Chart fetch error:", error);
        toast.error("Failed to load chart data");
        setChartData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchChart();
  }, [selectedCompany, timePeriod]);

  function handleSelectCompany(company: SearchResult) {
    setSelectedCompany(company);
    setSearchQuery(company.name);
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.blur();
    }
  }

  function handleClear() {
    setSelectedCompany(null);
    setSearchQuery("");
    setChartData([]);
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }

  return (
    <main className="space-y-8 animate-fade-in">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-white">Stock Charts</h1>
        <p className="text-white/60 text-lg">
          Search for any company and view its historical performance over different time periods
        </p>
      </div>

      {/* Search Section */}
      <div className="card p-6 space-y-4 md:sticky md:top-20 md:z-30">
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for a company (e.g., Reliance, TCS, Infosys)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-12 pr-4 w-full"
              autoFocus
            />
            {searching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40 animate-spin" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !selectedCompany && (
            <div className="absolute z-50 w-full mt-2 bg-black/95 border border-white/20 rounded-xl shadow-xl max-h-96 overflow-y-auto">
              {searchResults.map((company) => (
                <button
                  key={company.id}
                  onClick={() => handleSelectCompany(company)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors border-b border-white/10 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    {company.symbol && (
                      <Logo symbol={company.symbol} name={company.name} size="sm" />
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium">{company.name}</p>
                      <p className="text-white/60 text-sm">
                        {company.symbol} · {company.category}
                        {company.unitPrice && ` · ₹${company.unitPrice.toLocaleString("en-IN")}`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Company */}
        {selectedCompany && (
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/20">
            <div className="flex items-center gap-4">
              {selectedCompany.symbol && (
                <Logo symbol={selectedCompany.symbol} name={selectedCompany.name} size="md" />
              )}
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedCompany.name}</h3>
                <p className="text-white/60 text-sm">
                  {selectedCompany.symbol} · {selectedCompany.category}
                </p>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Chart Section */}
      {selectedCompany && (
        <div className="space-y-6">
          {controlsPinned && (
            <div className="hidden md:block fixed left-0 right-0 top-20 h-16 bg-gradient-to-b from-[#0b1120] via-[#0b1120]/90 to-transparent pointer-events-none" />
          )}
          {/* Time Period Selector */}
          <div
            ref={controlsRef}
            className={`flex flex-wrap gap-2 bg-white/5 rounded-2xl px-4 py-3 md:px-5 md:py-3 transition-shadow md:sticky md:top-[calc(20px+4rem)] md:z-20 ${
              controlsPinned ? "shadow-lg shadow-black/30" : ""
            }`}
          >
            {TIME_PERIODS.map((period) => (
              <button
                key={period.key}
                onClick={() => setTimePeriod(period.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timePeriod === period.key
                    ? "bg-primary text-white"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-white/60" />
              <h2 className="text-xl font-semibold text-white">
                {selectedCompany.name} - {TIME_PERIODS.find((p) => p.key === timePeriod)?.label}
              </h2>
            </div>

            {loading ? (
              <div className="w-full h-[500px] flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 text-white/60 animate-spin mx-auto" />
                  <p className="text-white/60">Loading chart data...</p>
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <LineChart data={chartData} />
            ) : (
              <div className="w-full h-[500px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-white/60">No chart data available</p>
                  <p className="text-white/40 text-sm">
                    Chart data may not be available for this symbol or time period
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedCompany && searchResults.length === 0 && searchQuery.length === 0 && (
        <div className="card p-12 text-center">
          <TrendingUp className="h-16 w-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Search for a Company</h3>
          <p className="text-white/60">
            Enter a company name or symbol above to view its historical performance chart
          </p>
        </div>
      )}
    </main>
  );
}

