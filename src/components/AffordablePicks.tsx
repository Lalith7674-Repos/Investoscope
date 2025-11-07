"use client";

import { useEffect, useState } from "react";
import ResultCard from "./ResultCard";
import Carousel from "./Carousel";

type Group = { title: string; items: any[] };

export default function AffordablePicks() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/affordable");
      const json = await res.json();
      setLoading(false);
      if (json.ok) setGroups(json.groups || []);
    })();
  }, []);

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-400">Loading affordable picks…</p>
      </div>
    );
  }
  if (!groups.length) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      {groups.map((g, i) => (
        <Carousel 
          key={i} 
          title={g.title}
          autoScroll={true}
          scrollSpeed={25}
          showControls={true}
        >
          {g.items.map((it: any, idx: number) => (
            <div 
              key={it.id} 
              className="flex-shrink-0 w-[280px] sm:w-[300px] animate-slide-up" 
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <ResultCard option={it} />
            </div>
          ))}
        </Carousel>
      ))}
    </div>
  );
}



