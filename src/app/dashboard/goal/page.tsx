"use client";

import { useState } from "react";
import { GOALS, goalToPreset } from "@/lib/goal";
import ResultCard from "@/components/ResultCard";
import { toast } from "sonner";
import Carousel from "@/components/Carousel";

export default function GoalPage() {
  const [amount, setAmount] = useState(300);
  const [goal, setGoal] = useState<"PHONE" | "EMERGENCY" | "TRAVEL" | "ONE_YEAR" | "LONG_TERM">("LONG_TERM");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [note, setNote] = useState<string>("");

  async function run() {
    const preset = goalToPreset(goal, amount);
    setNote(
      `Using ${preset.category}${preset.subtype ? " · " + preset.subtype : ""}${
        preset.mode ? " · " + preset.mode.toUpperCase() : ""
      } as per your goal.`
    );
    setLoading(true);
    const res = await fetch("/api/discover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(preset),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      toast.error(json.error || "Failed");
      return;
    }
    const list = json.exactMatches.length ? json.exactMatches : json.fallbackMatches || [];
    setItems(list);
  }

  return (
    <main className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white">Goal-based suggestions</h1>
        <p className="text-white/60">Plan your investments based on specific goals</p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Amount (₹)</label>
            <input
              type="number"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Choose goal</label>
            <select
              className="input-field"
              value={goal}
              onChange={(e) => setGoal(e.target.value as any)}
            >
              {GOALS.map(g => <option key={g.key} value={g.key} className="bg-black">{g.label}</option>)}
            </select>
            <p className="text-xs text-white/60 mt-2">
              {GOALS.find(g => g.key === goal)?.desc}
            </p>
          </div>
        </div>

        <button
          onClick={run}
          className="btn-primary w-full sm:w-auto"
          disabled={loading}
        >
          {loading ? "Finding options…" : "See options"}
        </button>
      </div>

      {note ? (
        <div className="card p-4 animate-fade-in">
          <p className="text-sm text-white/80">{note}</p>
        </div>
      ) : null}

      {items.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-2xl font-semibold text-white">Recommended Options</h2>
          <Carousel 
            autoScroll={true}
            scrollSpeed={30}
            showControls={true}
          >
            {items.map((it, idx) => (
              <div 
                key={it.id} 
                className="flex-shrink-0 w-[280px] sm:w-[300px] animate-slide-up" 
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <ResultCard option={it} />
              </div>
            ))}
          </Carousel>
        </div>
      )}
    </main>
  );
}



