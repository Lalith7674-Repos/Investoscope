"use client";

import { useEffect, useState } from "react";
import { Loader2, Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { InvestmentOption } from "@/types";

type Alert = {
  id: string;
  direction: "above" | "below";
  targetPrice: number;
  createdAt: string;
};

export default function PriceAlertsCard({ option }: { option: InvestmentOption }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState<number>(option.unitPrice || 0);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/alerts/${option.id}`, { cache: "no-store" });
    if (res.status === 401) {
      setAuthorized(false);
      setAlerts([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (data?.ok) {
      setAlerts(data.alerts || []);
      setAuthorized(true);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addAlert() {
    if (!authorized) {
      toast.info("Sign in to set price alerts");
      return;
    }
    if (!targetPrice || targetPrice <= 0) {
      toast.error("Enter a valid price target");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/alerts/${option.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ direction, targetPrice }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.error || "Failed to create alert");
      } else {
        toast.success("Alert created");
        setTargetPrice(option.unitPrice || 0);
        load();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create alert");
    } finally {
      setSaving(false);
    }
  }

  async function removeAlert(alertId: string) {
    try {
      await fetch(`/api/alerts/${option.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete alert");
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Price alerts</h3>
          <p className="text-xs text-white/50 mt-1">Get an email when this option crosses your target.</p>
        </div>
        <Bell className="h-4 w-4 text-white/60" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as any)}
          className="input-field sm:w-40"
          disabled={!authorized}
        >
          <option value="above" className="bg-black">Notify when price goes above</option>
          <option value="below" className="bg-black">Notify when price goes below</option>
        </select>
        <input
          type="number"
          className="input-field"
          placeholder="Target price"
          value={targetPrice}
          onChange={(e) => setTargetPrice(Number(e.target.value))}
          disabled={!authorized}
        />
        <button
          type="button"
          onClick={addAlert}
          disabled={saving || !authorized}
          className="btn-primary inline-flex items-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create alert
        </button>
      </div>

      {!authorized ? (
        <p className="text-sm text-white/50">Sign in to manage price alerts.</p>
      ) : loading ? (
        <div className="text-sm text-white/60 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading alerts…
        </div>
      ) : alerts.length ? (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              <div>
                <span className="font-medium text-white">{alert.direction === "above" ? "Above" : "Below"} ₹{alert.targetPrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                <span className="ml-2 text-xs text-white/40">Created {new Date(alert.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
              <button
                type="button"
                onClick={() => removeAlert(alert.id)}
                className="text-white/50 hover:text-white transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/50">No active alerts yet.</p>
      )}
    </div>
  );
}


