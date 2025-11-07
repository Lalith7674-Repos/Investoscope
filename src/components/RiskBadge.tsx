import type { RiskLevel } from "@/types";

export default function RiskBadge({ level }: { level: RiskLevel | string }) {
  const lvl = level.toLowerCase();
  const color =
    lvl === "low" ? "bg-emerald-100 text-emerald-700" :
    lvl === "medium" ? "bg-amber-100 text-amber-700" :
    "bg-rose-100 text-rose-700";

  const label =
    lvl === "low" ? "Low" :
    lvl === "medium" ? "Medium" :
    "High";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}



