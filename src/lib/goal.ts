export type GoalKey = "PHONE" | "EMERGENCY" | "TRAVEL" | "ONE_YEAR" | "LONG_TERM";

export const GOALS: { key: GoalKey; label: string; desc: string }[] = [
  { key: "PHONE",     label: "Buy a Phone",     desc: "3–9 months horizon; moderate risk." },
  { key: "EMERGENCY", label: "Emergency Fund",  desc: "Keep it safer and liquid." },
  { key: "TRAVEL",    label: "Travel Plan",     desc: "6–12 months horizon; balanced." },
  { key: "ONE_YEAR",  label: "Save for 1 Year", desc: "Short term; lower to medium risk." },
  { key: "LONG_TERM", label: "Long-Term Wealth",desc: "3–10 years; growth oriented." },
];

export function goalToPreset(goal: GoalKey, amount: number) {
  switch (goal) {
    case "EMERGENCY":
      return { category: "MUTUAL_FUND", mode: "lumpsum", subtype: "DEBT", amount };
    case "PHONE":
    case "TRAVEL":
    case "ONE_YEAR":
      return amount <= 500
        ? { category: "MUTUAL_FUND", mode: "sip", subtype: "INDEX", amount }
        : { category: "ETF", subtype: "BROAD_MARKET", amount };
    case "LONG_TERM":
    default:
      return amount <= 500
        ? { category: "MUTUAL_FUND", mode: "sip", subtype: "EQUITY", amount }
        : { category: "MUTUAL_FUND", mode: "lumpsum", subtype: "EQUITY", amount };
  }
}
