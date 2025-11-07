"use client";

import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

type Point = { date: string | Date; close: number };

export default function LineChart({ data }: { data: Point[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[400px] rounded-xl border border-white/20 bg-white/5 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-white/60 text-sm">No chart data available</p>
          <p className="text-white/40 text-xs">Historical data will appear here once available</p>
        </div>
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date: typeof d.date === "string" ? d.date : d.date.toISOString(),
    close: d.close,
  }));

  return (
    <div className="w-full h-[400px] min-h-[400px] rounded-xl border border-white/20 bg-white/5 p-4">
      <ResponsiveContainer width="100%" height="100%" minHeight={400}>
        <RLineChart data={formatted} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <XAxis
            dataKey="date"
            tickFormatter={(v) => format(new Date(v), "MMM dd")}
            stroke="#ffffff"
            strokeOpacity={0.6}
            fontSize={11}
            tick={{ fill: '#ffffff', opacity: 0.7 }}
          />
          <YAxis
            stroke="#ffffff"
            strokeOpacity={0.6}
            fontSize={11}
            tick={{ fill: '#ffffff', opacity: 0.7 }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff'
            }}
            formatter={(value: number) =>
              new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2,
              }).format(value as number)
            }
            labelFormatter={(label) =>
              format(new Date(label as string), "dd MMM yyyy")
            }
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke="#ffffff"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#ffffff' }}
            strokeOpacity={0.9}
          />
        </RLineChart>
      </ResponsiveContainer>
    </div>
  );
}



