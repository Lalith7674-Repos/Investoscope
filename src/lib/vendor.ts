import { parseCsv } from "./csv";

// --- AMFI ---
export async function fetchAmfiSchemeMaster(): Promise<any[]> {
  // Using NAVAll.txt (semi-colon delimited) as a broad, frequently updated source
  const url = "https://www.amfiindia.com/spages/NAVAll.txt";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("AMFI master fetch failed");
  const text = await res.text();
  const rows = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const header = ["Scheme Code","ISIN Div Payout/ISIN Growth","ISIN Div Reinvestment","Scheme Name","Net Asset Value","Date"];
  const out: any[] = [];
  for (const line of rows) {
    const parts = line.split(";");
    if (parts.length < 6) continue;
    const obj: any = {};
    header.forEach((h, i) => (obj[h] = parts[i]?.trim()));
    out.push(obj);
  }
  return out;
}

export async function fetchAmfiLatestNavMap(): Promise<Map<string, { date: string; nav: number }>> {
  const rows = await fetchAmfiSchemeMaster();
  const map = new Map<string, { date: string; nav: number }>();
  for (const r of rows) {
    const code = String(r["Scheme Code"] || "").trim();
    const navStr = String(r["Net Asset Value"] || "").trim();
    const date = String(r["Date"] || "").trim();
    if (!code || !navStr) continue;
    const nav = Number(navStr.replace(/,/g, ""));
    if (!isFinite(nav)) continue;
    map.set(code, { date, nav });
  }
  return map;
}

// --- NSE ---
export async function fetchNseSecuritiesCsv(): Promise<any[]> {
  // NSE requires proper headers and sometimes blocks direct access
  // Try multiple endpoints and headers
  const urls = [
    "https://www.nseindia.com/api/reportDownload?reportName=equities_t2t&fileName=cm_securities_available_for_trading.csv",
    "https://archives.nseindia.com/content/equities/EQUITY_L.csv",
    "https://www.nseindia.com/api/equity-stockIndices?index=SECURITIES%20IN%20F%26O",
  ];

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/csv,application/json,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Referer": "https://www.nseindia.com/",
    "Origin": "https://www.nseindia.com",
  };

  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds

      const res = await fetch(url, {
        headers,
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        lastError = new Error(`NSE fetch failed: ${res.status} ${res.statusText}`);
        continue; // Try next URL
      }

      const text = await res.text();
      
      // Check if we got valid CSV data
      if (!text || text.length < 100) {
        lastError = new Error("NSE returned empty or invalid data");
        continue;
      }

      // Try to parse CSV
      try {
        const rows = parseCsv(text, { skip_empty_lines: true });
        if (rows && rows.length > 0) {
          return rows as any[];
        }
      } catch (parseError) {
        lastError = new Error(`CSV parse failed: ${parseError}`);
        continue;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        lastError = new Error("NSE request timed out (30s)");
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      // Continue to next URL
      continue;
    }
  }

  // If all URLs failed, throw the last error with helpful message
  throw new Error(
    `NSE securities CSV fetch failed. NSE may be blocking requests or the endpoint has changed. ` +
    `Last error: ${lastError?.message || "Unknown error"}. ` +
    `Try: 1) Check internet connection, 2) Disable VPN, 3) Wait a few minutes (NSE rate-limits), ` +
    `4) Use manual data import or alternative data source.`
  );
}

// --- Prices ---
export async function fetchDailyPrices(symbol: string, since?: Date): Promise<{ date: Date; close: number }[]> {
  const tdKey = process.env.TWELVEDATA_API_KEY;
  if (tdKey) {
    const outputSize = since ? "200" : "5000";
    const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${outputSize}&apikey=${tdKey}`;
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j?.values) {
        const arr = j.values
          .map((v: any) => ({ date: new Date(v.datetime), close: Number(v.close) }))
          .filter((x: any) => isFinite(x.close))
          .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
        if (arr.length) return arr;
      }
    }
  }

  const avKey = process.env.ALPHAVANTAGE_API_KEY;
  if (avKey) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${avKey}`;
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      const ts = j["Time Series (Daily)"];
      if (ts) {
        const arr = Object.entries(ts)
          .map(([d, v]: any) => ({ date: new Date(d), close: Number(v["4. close"]) }))
          .filter((x: any) => isFinite(x.close))
          .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
        if (arr.length) return arr;
      }
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const from = since ? Math.floor(since.getTime() / 1000) : now - 2 * 365 * 24 * 3600;
  const yurl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${from}&period2=${now}`;
  const ry = await fetch(yurl, { cache: "no-store" });
  if (ry.ok) {
    const j = await ry.json();
    const r = j?.chart?.result?.[0];
    if (r?.timestamp && r?.indicators?.quote?.[0]?.close) {
      const ts = r.timestamp as number[];
      const closes = r.indicators.quote[0].close as (number | null)[];
      const out: { date: Date; close: number }[] = [];
      ts.forEach((t, i) => {
        const c = closes[i];
        if (c != null) out.push({ date: new Date(t * 1000), close: Number(c) });
      });
      out.sort((a, b) => a.date.getTime() - b.date.getTime());
      return out;
    }
  }

  return [];
}

export async function fetchFundamentals(symbol: string): Promise<{ peRatio?: number; beta?: number; marketCap?: number; expenseRatio?: number } | null> {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=price,summaryDetail,defaultKeyStatistics`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.quoteSummary?.result?.[0];
    if (!result) return null;
    const summaryDetail = result.summaryDetail || {};
    const keyStats = result.defaultKeyStatistics || {};
    const metrics: any = {};
    const pe = summaryDetail.trailingPE?.raw ?? keyStats.trailingPE?.raw ?? keyStats.forwardPE?.raw;
    if (pe != null && isFinite(pe)) metrics.peRatio = Number(pe);
    const beta = summaryDetail.beta?.raw ?? keyStats.beta?.raw;
    if (beta != null && isFinite(beta)) metrics.beta = Number(beta);
    const marketCap = summaryDetail.marketCap?.raw ?? result.price?.marketCap?.raw;
    if (marketCap != null && isFinite(marketCap)) metrics.marketCap = Number(marketCap);
    const expenseRatio = summaryDetail.expenseRatio?.raw ?? summaryDetail.annualReportExpenseRatio?.raw;
    if (expenseRatio != null && isFinite(expenseRatio)) metrics.expenseRatio = Number(expenseRatio);
    return metrics;
  } catch (error) {
    console.error("Failed to fetch fundamentals", error);
    return null;
  }
}
