"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import RiskBadge from "./RiskBadge";
import Logo from "./Logo";
import { toggleSavedAction, getSavedStatus } from "@/lib/saved-actions";
import type { InvestmentOption } from "@/types";

type Props = {
  option: InvestmentOption;
};

function formatINR(n?: number | null) {
  if (n == null) return "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

export default function ResultCard({ option }: Props) {
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  // Initialize saved status on mount
  useEffect(() => {
    getSavedStatus(option.id).then(setSaved).catch(() => {
      // Silently fail if not authenticated or error
    });
  }, [option.id]);

  async function handleBookmark(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    const result = await toggleSavedAction(option.id);
    if (result.ok) {
      setSaved(result.saved ?? false);
      toast.success(result.saved ? "Saved!" : "Removed from saved");
    } else if (result.error === "Not authenticated") {
      toast.info("Sign in to save items", {
        action: {
          label: "Sign in",
          onClick: () => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`),
        },
      });
    }
    setPending(false);
  }
  const minBadge =
    option.category === "STOCK" || option.category === "ETF"
      ? option.unitPrice != null ? `Min: ${formatINR(option.unitPrice)} (1 unit)` : "Min: —"
      : option.minSIP != null
      ? `Min SIP: ${formatINR(option.minSIP)}`
      : option.minLumpSum != null
      ? `Min Lumpsum: ${formatINR(option.minLumpSum)}`
      : "Min: —";

  return (
    <div className="relative">
      <Link href={`/dashboard/option/${option.id}`} className="block">
        <div className="interactive-card p-5 group">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 flex items-start gap-3">
              {(option.category === "STOCK" || option.category === "ETF") && option.symbol ? (
                <Logo symbol={option.symbol} name={option.name} size="sm" />
              ) : null}
              <div className="flex-1">
                <h3 className="text-base font-semibold leading-6 mb-1 text-slate-100 group-hover:text-white transition-colors">
                  {option.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {option.category}
                  {option.symbol ? ` · ${option.symbol}` : ""}
                  {option.subtypeMF ? ` · ${option.subtypeMF}` : ""}
                  {option.subtypeETF ? ` · ${option.subtypeETF}` : ""}
                </p>
              </div>
            </div>
            <RiskBadge level={option.riskLevel} />
          </div>

          <div className="flex items-center justify-between text-sm mb-3">
            <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs text-blue-300">
              {minBadge}
            </span>
            <span className="text-slate-400 group-hover:text-blue-400 transition-colors font-medium flex items-center gap-1">
              View details
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </span>
          </div>

          {option.riskReason ? (
            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{option.riskReason}</p>
          ) : null}
        </div>
      </Link>
      <button
        onClick={handleBookmark}
        disabled={pending}
        className="absolute top-4 right-4 p-2 rounded-lg bg-slate-700/60 hover:bg-slate-600/80 transition-colors z-10 backdrop-blur-sm border border-slate-600/50"
        aria-label={saved ? "Remove bookmark" : "Save bookmark"}
      >
        <Bookmark className={`h-4 w-4 transition-all ${saved ? "fill-blue-400 text-blue-400" : "text-slate-400"}`} />
      </button>
    </div>
  );
}



