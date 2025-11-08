"use client";

import { useEffect, useState } from "react";
import Carousel from "@/components/Carousel";
import Link from "next/link";

type Mover = {
  optionId: string;
  name: string;
  category: string;
  symbol: string | null;
  latestPrice: number | null;
  changePct: number;
  changeValue: number;
};

type Group = {
  title: string;
  items: Mover[];
};

export default function TopMovers() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/api/movers", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok) {
          setGroups(data.groups || []);
        }
      } catch (error) {
        console.error("Failed to load movers", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-400">Loading today's movers…</p>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="card p-8 text-center space-y-2">
        <p className="text-slate-400">No market data available yet.</p>
        <p className="text-slate-500 text-sm">
          The sync job runs daily at 3 AM UTC (8:30 AM IST).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {groups.map((group, idx) => (
        <Carousel
          key={idx}
          title={group.title}
          autoScroll={false}
          showControls={true}
        >
          {group.items.map((item) => (
            <div key={item.optionId} className="flex-shrink-0 w-[260px] sm:w-[280px]">
              <MoverCard mover={item} />
            </div>
          ))}
        </Carousel>
      ))}
    </div>
  );
}

function MoverCard({ mover }: { mover: Mover }) {
  const changePct = mover.changePct * 100;
  const positive = changePct >= 0;
  const changeColor = positive ? "text-emerald-300" : "text-rose-300";

  return (
    <Link
      href={`/dashboard/option/${mover.optionId}`}
      className="block card p-5 space-y-3 hover:scale-[1.02] transition"
    >
      <div>
        <p className="text-sm font-semibold text-slate-100">{mover.name}</p>
        <p className="text-xs text-slate-400">
          {mover.category}
          {mover.symbol ? ` · ${mover.symbol}` : ""}
        </p>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500">Last price</p>
          <p className="text-sm text-slate-100 font-medium">
            {mover.latestPrice != null
              ? `₹${mover.latestPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
              : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Daily move</p>
          <p className={`text-sm font-semibold ${changeColor}`}>
            {changePct.toFixed(2)}%
          </p>
        </div>
      </div>
    </Link>
  );
}


