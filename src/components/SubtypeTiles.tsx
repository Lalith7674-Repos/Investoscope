"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Item = {
  key: string;
  label: string;
  hint: string;
};

type Props = {
  category: "MUTUAL_FUND" | "ETF" | "STOCK" | "SIP";
  value?: string;
  onChange: (subtype: string) => void;
};

const MF_ITEMS: Item[] = [
  { key: "INDEX",  label: "Index",  hint: "Tracks Nifty/Sensex. Low cost, beginner friendly." },
  { key: "EQUITY", label: "Equity", hint: "Higher growth potential; more ups & downs." },
  { key: "DEBT",   label: "Debt",   hint: "Lower risk; short-term parking." },
  { key: "HYBRID", label: "Hybrid", hint: "Mix of equity + debt for balance." },
];

const ETF_ITEMS: Item[] = [
  { key: "BROAD_MARKET", label: "Broad Mkt", hint: "Represents an index like Nifty 50." },
  { key: "SECTOR",       label: "Sector",    hint: "Focuses on one sector; higher concentration risk." },
  { key: "GOLD",         label: "Gold",      hint: "Moves with domestic gold price." },
  { key: "INTERNATIONAL",label: "Intl",      hint: "Tracks foreign markets; currency impact." },
];

const STOCK_ITEMS: Item[] = [
  { key: "LARGE", label: "Large Cap", hint: "Big companies; relatively more stable." },
  { key: "MID",   label: "Mid Cap",   hint: "Growth companies; moderate risk." },
  { key: "SMALL", label: "Small Cap", hint: "High growth potential; high volatility." },
];

const SIP_ITEMS: Item[] = [
  { key: "MONTHLY", label: "Monthly", hint: "Auto-invest once every month (default)." },
  { key: "WEEKLY",  label: "Weekly",  hint: "More frequent averaging (if scheme supports)." },
  { key: "DAILY",   label: "Daily",   hint: "Tiny daily amounts (rare; scheme-specific)." },
];

function listFor(category: Props["category"]): Item[] {
  if (category === "MUTUAL_FUND") return MF_ITEMS;
  if (category === "ETF") return ETF_ITEMS;
  if (category === "STOCK") return STOCK_ITEMS;
  if (category === "SIP") return SIP_ITEMS;
  return [];
}

export default function SubtypeTiles({ category, value, onChange }: Props) {
  const items = listFor(category);
  if (!items.length) return null;

  return (
    <TooltipProvider>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => {
          const active = value?.toUpperCase() === it.key;
          return (
            <Tooltip key={it.key} delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(it.key)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium text-left transition-all duration-200",
                    active 
                      ? "border-blue-500 bg-blue-500/20 text-blue-300 shadow-md shadow-blue-500/10" 
                      : "border-slate-600 bg-slate-800/40 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500"
                  )}
                >
                  {it.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {it.hint}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}



