export type QuizInput = {
  budget: number;                // e.g., 50, 200, 1000
  horizon: "short" | "medium" | "long";
  risk: "low" | "medium" | "high";
  style: "lumpsum" | "sip";
};

export function quizToPreset(q: QuizInput) {
  // Simple, opinionated mapping
  if (q.style === "sip") {
    if (q.horizon === "long" && q.risk !== "low") {
      return { category: "MUTUAL_FUND", mode: "sip", subtype: "EQUITY", amount: q.budget };
    }
    // medium/short horizons on SIP -> index
    return { category: "MUTUAL_FUND", mode: "sip", subtype: "INDEX", amount: q.budget };
  }

  // lumpsum
  if (q.horizon === "short" || q.risk === "low") {
    return { category: "MUTUAL_FUND", mode: "lumpsum", subtype: "DEBT", amount: q.budget };
  }
  if (q.horizon === "medium") {
    return { category: "ETF", subtype: "BROAD_MARKET", amount: q.budget };
  }
  // long + medium/high risk
  return { category: "MUTUAL_FUND", mode: "lumpsum", subtype: "EQUITY", amount: q.budget };
}
