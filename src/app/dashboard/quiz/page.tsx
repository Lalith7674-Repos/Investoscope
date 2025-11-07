"use client";

import { useState } from "react";
import ResultCard from "@/components/ResultCard";
import { toast } from "sonner";
import Carousel from "@/components/Carousel";

export default function QuizPage() {
  const [budget, setBudget] = useState(200);
  const [horizon, setHorizon] = useState<"short" | "medium" | "long">("medium");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [style, setStyle] = useState<"lumpsum" | "sip">("sip");
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  async function run() {
    setLoading(true);
    const res = await fetch("/api/quiz/results", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ budget, horizon, risk, style }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.ok) {
      toast.error(json.error || "Failed");
      return;
    }
    setPreset(json.preset);
    const list = json.result.exactMatches.length ? json.result.exactMatches : json.result.fallbackMatches || [];
    setItems(list);
  }

  return (
    <main className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-white">Investment Discovery Quiz</h1>
        <p className="text-white/60">Answer a few questions to get personalized investment matches</p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Budget (₹)</label>
            <input 
              type="number" 
              className="input-field"
              value={budget} 
              onChange={(e) => setBudget(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Time horizon</label>
            <select 
              className="input-field"
              value={horizon} 
              onChange={(e) => setHorizon(e.target.value as any)}
            >
              <option value="short" className="bg-black">Short (0–12 months)</option>
              <option value="medium" className="bg-black">Medium (1–3 years)</option>
              <option value="long" className="bg-black">Long (3+ years)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Risk comfort</label>
            <select 
              className="input-field"
              value={risk} 
              onChange={(e) => setRisk(e.target.value as any)}
            >
              <option value="low" className="bg-black">Low</option>
              <option value="medium" className="bg-black">Medium</option>
              <option value="high" className="bg-black">High</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-white/80 mb-2 block">Style</label>
            <select 
              className="input-field"
              value={style} 
              onChange={(e) => setStyle(e.target.value as any)}
            >
              <option value="sip" className="bg-black">SIP (recurring)</option>
              <option value="lumpsum" className="bg-black">Lumpsum (one-time)</option>
            </select>
          </div>
        </div>

        <button
          onClick={run}
          className="btn-primary w-full sm:w-auto"
          disabled={loading}
        >
          {loading ? "Finding matches…" : "See matches"}
        </button>
      </div>

      {preset ? (
        <div className="card p-4 animate-fade-in">
          <p className="text-sm text-white/80">
            <span className="font-semibold">Suggested path:</span> {preset.category}
            {preset.subtype ? ` · ${preset.subtype}` : ""}{preset.mode ? ` · ${preset.mode.toUpperCase()}` : ""} for ₹{preset.amount}.
          </p>
        </div>
      ) : null}

      {items.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-2xl font-semibold text-white">Your Matches</h2>
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

