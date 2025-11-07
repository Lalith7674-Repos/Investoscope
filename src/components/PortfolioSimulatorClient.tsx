'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type SearchResult = {
  id: string;
  name: string;
  symbol: string | null;
  category: string;
  unitPrice: number | null;
};

type Holding = {
  id: string;
  amount: number;
  query: string;
  option: SearchResult | null;
  results: SearchResult[];
  searching: boolean;
};

type SimulationSummary = {
  holdings: Array<{
    optionId: string;
    name: string;
    category: string;
    symbol: string | null;
    allocation: number;
    latestPrice: number | null;
    returnPct: number | null;
    projectedValue: number;
    expenseRatioBps?: number | null;
    peRatio?: number | null;
    beta?: number | null;
    marketCapValue?: number | null;
  }>;
  totalInvested: number;
  projectedValue: number;
  expectedReturnPct: number | null;
};

const createHolding = (): Holding => ({
  id: crypto.randomUUID(),
  amount: 500,
  query: '',
  option: null,
  results: [],
  searching: false,
});

export default function PortfolioSimulatorClient() {
  const [holdings, setHoldings] = useState<Holding[]>([createHolding()]);
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const searchTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const simulateTimeout = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const validHoldings = useMemo(
    () =>
      holdings
        .filter((h) => h.option && h.amount > 0)
        .map((h) => ({ optionId: h.option!.id, amount: h.amount })),
    [holdings]
  );

  function updateHolding(id: string, patch: Partial<Holding>) {
    setHoldings((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  function handleAmountChange(id: string, amount: number) {
    updateHolding(id, { amount });
  }

  function handleQueryChange(id: string, query: string) {
    updateHolding(id, { query, option: null });
    if (searchTimeouts.current[id]) {
      clearTimeout(searchTimeouts.current[id]);
    }
    if (query.trim().length < 2) {
      updateHolding(id, { results: [], searching: false });
      return;
    }
    updateHolding(id, { searching: true });
    searchTimeouts.current[id] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        updateHolding(id, { results: data.results || [], searching: false });
      } catch (error) {
        console.error('Search error', error);
        updateHolding(id, { searching: false });
      }
    }, 300);
  }

  function handleSelectOption(id: string, option: SearchResult) {
    updateHolding(id, { option, query: option.name, results: [] });
  }

  function addHolding() {
    setHoldings((prev) => [...prev, createHolding()]);
  }

  function removeHolding(id: string) {
    setHoldings((prev) => (prev.length === 1 ? prev : prev.filter((h) => h.id !== id)));
  }

  useEffect(() => {
    if (simulateTimeout.current) {
      clearTimeout(simulateTimeout.current);
    }

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (!validHoldings.length) {
      setSummary(null);
      setLoading(false);
      return;
    }

    simulateTimeout.current = setTimeout(async () => {
      setLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch('/api/portfolio/simulate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ holdings: validHoldings }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (data?.ok) {
          setSummary(data.summary);
        } else {
          toast.error(data?.error || 'Simulation failed');
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Simulation error', error);
          toast.error('Simulation failed');
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (simulateTimeout.current) clearTimeout(simulateTimeout.current);
    };
  }, [validHoldings]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Portfolio simulator</h1>
        <p className="text-white/60 text-sm sm:text-base">
          Combine any investments from the InvestoScope universe to see how they might perform together.
        </p>
      </div>

      <div className="space-y-4">
        {holdings.map((holding) => (
          <HoldingRow
            key={holding.id}
            holding={holding}
            onAmountChange={handleAmountChange}
            onQueryChange={handleQueryChange}
            onSelectOption={handleSelectOption}
            onRemove={removeHolding}
            disableRemove={holdings.length === 1}
          />
        ))}

        <button
          type="button"
          onClick={addHolding}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-white/20 px-4 py-2 text-sm text-white/70 hover:text-white hover:border-white/40 transition"
        >
          <Plus className="h-4 w-4" /> Add another holding
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Simulation</p>
            <h2 className="text-xl font-semibold text-white">Projected outcome</h2>
          </div>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-white/60" />}
        </div>

        {summary && summary.totalInvested > 0 ? (
          <div className="grid gap-4 sm:grid-cols-3 text-sm text-white/80">
            <SummaryMetric label="Total invested" value={formatINR(summary.totalInvested)} />
            <SummaryMetric label="Projected after 1Y" value={formatINR(summary.projectedValue)} />
            <SummaryMetric
              label="Expected return"
              value={
                summary.expectedReturnPct != null
                  ? `${(summary.expectedReturnPct * 100).toFixed(2)}%`
                  : 'N/A'
              }
              tone={
                summary.expectedReturnPct != null
                  ? summary.expectedReturnPct >= 0
                    ? 'positive'
                    : 'negative'
                  : undefined
              }
            />
          </div>
        ) : (
          <p className="text-sm text-white/60">Add at least one funded holding to see projections.</p>
        )}
      </div>

      {summary && summary.holdings.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">Holding</th>
                <th className="px-4 py-3 text-right">Allocation</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">P/E</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Beta</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Expense ratio</th>
                <th className="px-4 py-3 text-right">1Y return</th>
                <th className="px-4 py-3 text-right">Projected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-white/80">
              {summary.holdings.map((row) => (
                <tr key={row.optionId}>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-white">{row.name}</span>
                      <span className="text-xs text-white/40">{row.category}{row.symbol ? ` · ${row.symbol}` : ''}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{formatINR(row.allocation)}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{formatMetric(row.peRatio)}</td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">{formatMetric(row.beta)}</td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {row.expenseRatioBps != null ? `${(row.expenseRatioBps / 100).toFixed(2)}%` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right ${row.returnPct != null && row.returnPct >= 0 ? 'text-emerald-300' : row.returnPct != null ? 'text-rose-300' : 'text-white/50'}`}>
                    {row.returnPct != null ? `${(row.returnPct * 100).toFixed(2)}%` : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-right">{formatINR(row.projectedValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function HoldingRow({
  holding,
  onAmountChange,
  onQueryChange,
  onSelectOption,
  onRemove,
  disableRemove,
}: {
  holding: Holding;
  onAmountChange: (id: string, amount: number) => void;
  onQueryChange: (id: string, query: string) => void;
  onSelectOption: (id: string, option: SearchResult) => void;
  onRemove: (id: string) => void;
  disableRemove: boolean;
}) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-4 flex-col sm:flex-row">
        <div className="relative flex-1 w-full">
          <label className="text-xs text-white/50 block mb-2">Search investment</label>
          <input
            type="text"
            className="input-field"
            value={holding.query}
            onChange={(e) => onQueryChange(holding.id, e.target.value)}
            placeholder="e.g., HDFCBANK.NS or Nifty 50 ETF"
          />
          {holding.searching && <Loader2 className="h-4 w-4 animate-spin text-white/40 absolute right-3 top-[38px]" />}
          {holding.results.length > 0 && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-black/90 shadow-lg max-h-72 overflow-y-auto">
              {holding.results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => onSelectOption(holding.id, result)}
                  className="w-full px-4 py-3 text-left hover:bg-white/10 transition"
                >
                  <p className="text-sm text-white font-medium">{result.name}</p>
                  <p className="text-xs text-white/50">
                    {result.symbol}
                    {result.unitPrice != null ? ` · ₹${result.unitPrice.toLocaleString('en-IN')}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full sm:w-[200px]">
          <label className="text-xs text-white/50 block mb-2">Amount (₹)</label>
          <input
            type="number"
            min={0}
            className="input-field"
            value={holding.amount}
            onChange={(e) => onAmountChange(holding.id, Number(e.target.value))}
          />
        </div>

        <button
          type="button"
          onClick={() => onRemove(holding.id)}
          disabled={disableRemove}
          className="mt-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> Remove
        </button>
      </div>

      {holding.option ? (
        <p className="text-xs text-white/50">Selected: {holding.option.name}</p>
      ) : (
        <p className="text-xs text-white/40">Choose an instrument to include in the projection.</p>
      )}
    </div>
  );
}

function SummaryMetric({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-xs text-white/50 uppercase tracking-wide">{label}</p>
      <p
        className={`mt-2 text-lg font-semibold ${tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-rose-300' : 'text-white'}`}
      >
        {value}
      </p>
    </div>
  );
}

function formatINR(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatMetric(value?: number | null) {
  if (value == null || !isFinite(value)) return '—';
  return value.toFixed(2);
}


