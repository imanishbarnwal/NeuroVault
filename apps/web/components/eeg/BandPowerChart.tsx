"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { BandPower } from "@neurovault/eeg-utils";

// ── Types ──────────────────────────────────────────────────────────

interface BandPowerChartProps {
  /** Band power values for one or more channels */
  data: Record<string, BandPower>;
  /** Which channel to display (defaults to first key) */
  selectedChannel?: string;
  /** Chart title */
  title?: string;
}

// ── Band metadata ──────────────────────────────────────────────────

const BAND_CONFIG = [
  { key: "delta", label: "Delta", range: "0.5–4 Hz", color: "#6366f1" }, // indigo-500
  { key: "theta", label: "Theta", range: "4–8 Hz", color: "#8b5cf6" }, // violet-500
  { key: "alpha", label: "Alpha", range: "8–13 Hz", color: "#22d3ee" }, // cyan-400
  { key: "beta", label: "Beta", range: "13–30 Hz", color: "#34d399" }, // emerald-400
  { key: "gamma", label: "Gamma", range: "30–100 Hz", color: "#f472b6" }, // pink-400
] as const;

// ── Custom tooltip ─────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; range: string; value: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 shadow-lg">
      <p className="text-sm font-semibold text-slate-100">{d.label}</p>
      <p className="text-xs text-slate-400">{d.range}</p>
      <p className="text-sm text-cyan-400 mt-1">{d.value.toFixed(1)} dB</p>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────

export default function BandPowerChart({
  data,
  selectedChannel,
  title = "Band Power Distribution",
}: BandPowerChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const channel = selectedChannel ?? Object.keys(data)[0];
  const bandPower = data[channel];

  if (!bandPower) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-500 text-sm">
        No band power data available.
      </div>
    );
  }

  const chartData = BAND_CONFIG.map(({ key, label, range, color }) => ({
    key,
    label,
    range,
    color,
    value: bandPower[key as keyof BandPower],
  }));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <span className="text-xs text-slate-500 font-mono">{channel}</span>
      </div>
      <div className="h-56">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 4, left: -12 }}
              barCategoryGap="20%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e293b"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                unit=" dB"
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(148,163,184,0.05)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full bg-slate-800/30 rounded-lg animate-pulse" />
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
        {BAND_CONFIG.map(({ key, label, range, color }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-slate-400">
              {label}{" "}
              <span className="text-slate-600">({range})</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
