"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Bookmark } from "lucide-react";
import ResultCard from "./ResultCard";
import type { InvestmentOption } from "@/types";

type SavedOption = {
  id: string;
  createdAt: string;
  option: InvestmentOption;
};

export default function SavedClient() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SavedOption[]>([]);
  const [authorized, setAuthorized] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/saved", { cache: "no-store" });
        if (res.status === 401) {
          if (!mounted) return;
          setAuthorized(false);
          setItems([]);
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        const normalized: SavedOption[] = Array.isArray(data?.items)
          ? data.items.map((item: any) => ({
              id: item.id,
              createdAt: item.createdAt,
              option: {
                ...item.option,
                lastUpdated: item.option?.lastUpdated ? new Date(item.option.lastUpdated) : item.option?.lastUpdated,
              },
            }))
          : [];
        setItems(normalized);
        setAuthorized(true);
      } catch (error) {
        if (!mounted) return;
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!authorized) {
    return (
      <div className="card p-8 text-center space-y-3">
        <Bookmark className="w-10 h-10 mx-auto text-white/40" />
        <p className="text-white/70 text-sm">Sign in to view your saved items.</p>
        <Link href="/login" className="btn-primary inline-flex items-center justify-center mx-auto">
          Sign in
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-8 text-center space-y-3">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-white/60" />
        <p className="text-white/60 text-sm">Loading your saved investments…</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="card p-8 text-center space-y-4">
        <Bookmark className="w-10 h-10 mx-auto text-white/30" />
        <div>
          <p className="text-white font-medium">No saved items yet</p>
          <p className="text-sm text-white/60">Browse discoveries and tap the bookmark icon to keep favourites handy.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary inline-flex items-center justify-center mx-auto">
          Explore investments
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ResultCard key={item.option.id} option={item.option} />
      ))}
    </div>
  );
}


