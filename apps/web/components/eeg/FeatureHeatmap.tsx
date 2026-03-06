"use client";

import React, { useMemo, useState } from "react";
import type { BandPower, ChannelStats } from "@neurovault/eeg-utils";

// ── Types ──────────────────────────────────────────────────────────

interface FeatureHeatmapProps {
  /** Band power per channel */
  bandPower: Record<string, BandPower>;
  /** Stats per channel */
  stats: Record<string, ChannelStats>;
  /** Optional title */
  title?: string;
}

type FeatureKey =
  | "delta"
  | "theta"
  | "alpha"
  | "beta"
  | "gamma"
  | "mean"
  | "variance"
  | "kurtosis";

const FEATURE_COLUMNS: { key: FeatureKey; label: string; group: "band" | "stat" }[] = [
  { key: "delta", label: "\u03b4", group: "band" },
  { key: "theta", label: "\u03b8", group: "band" },
  { key: "alpha", label: "\u03b1", group: "band" },
  { key: "beta", label: "\u03b2", group: "band" },
  { key: "gamma", label: "\u03b3", group: "band" },
  { key: "mean", label: "\u03bc", group: "stat" },
  { key: "variance", label: "\u03c3\u00b2", group: "stat" },
  { key: "kurtosis", label: "\u03ba", group: "stat" },
];

// ── Color interpolation ────────────────────────────────────────────

/**
 * Map a normalized 0–1 value to a color.
 * Gradient: slate-900 → cyan-900 → cyan-400
 */
function valueToColor(t: number): string {
  // Clamp
  const v = Math.max(0, Math.min(1, t));

  if (v < 0.5) {
    // slate-900 (#0f172a) → cyan-900 (#164e63)
    const p = v * 2;
    const r = Math.round(15 + (22 - 15) * p);
    const g = Math.round(23 + (78 - 23) * p);
    const b = Math.round(42 + (99 - 42) * p);
    return `rgb(${r},${g},${b})`;
  }
  // cyan-900 (#164e63) → cyan-400 (#22d3ee)
  const p = (v - 0.5) * 2;
  const r = Math.round(22 + (34 - 22) * p);
  const g = Math.round(78 + (211 - 78) * p);
  const b = Math.round(99 + (238 - 99) * p);
  return `rgb(${r},${g},${b})`;
}

// ── Component ──────────────────────────────────────────────────────

export default function FeatureHeatmap({
  bandPower,
  stats,
  title = "Feature Heatmap",
}: FeatureHeatmapProps) {
  const channels = useMemo(() => Object.keys(bandPower), [bandPower]);
  const [hoveredCell, setHoveredCell] = useState<{
    ch: string;
    feat: string;
    value: number;
  } | null>(null);

  // Build a flat matrix and compute per-column min/max for normalization
  const { matrix, colMin, colMax } = useMemo(() => {
    const mat: number[][] = [];
    const mins = new Array(FEATURE_COLUMNS.length).fill(Infinity);
    const maxs = new Array(FEATURE_COLUMNS.length).fill(-Infinity);

    for (const ch of channels) {
      const row: number[] = [];
      const bp = bandPower[ch];
      const st = stats[ch];

      for (let ci = 0; ci < FEATURE_COLUMNS.length; ci++) {
        const col = FEATURE_COLUMNS[ci];
        let val: number;
        if (col.group === "band") {
          val = bp[col.key as keyof BandPower];
        } else {
          val = st[col.key as keyof ChannelStats];
        }
        row.push(val);
        if (val < mins[ci]) mins[ci] = val;
        if (val > maxs[ci]) maxs[ci] = val;
      }
      mat.push(row);
    }

    return { matrix: mat, colMin: mins, colMax: maxs };
  }, [channels, bandPower, stats]);

  // Normalize value to 0–1 within its column
  const normalize = (val: number, colIdx: number) => {
    const range = colMax[colIdx] - colMin[colIdx];
    if (range === 0) return 0.5;
    return (val - colMin[colIdx]) / range;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        {hoveredCell && (
          <span className="text-xs font-mono text-slate-400">
            {hoveredCell.ch} / {hoveredCell.feat}:{" "}
            <span className="text-cyan-400">{hoveredCell.value.toFixed(2)}</span>
          </span>
        )}
      </div>

      {/* Group headers */}
      <div className="overflow-x-auto">
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `64px repeat(${FEATURE_COLUMNS.length}, minmax(36px, 1fr))`,
          }}
        >
          {/* Column group labels */}
          <div /> {/* empty corner */}
          <div
            className="col-span-5 text-center text-[10px] text-violet-400 font-medium pb-1 border-b border-slate-800"
          >
            Band Power
          </div>
          <div
            className="col-span-3 text-center text-[10px] text-cyan-400 font-medium pb-1 border-b border-slate-800"
          >
            Statistics
          </div>

          {/* Column headers */}
          <div /> {/* empty corner */}
          {FEATURE_COLUMNS.map((col) => (
            <div
              key={col.key}
              className="text-center text-xs text-slate-400 py-1 font-medium"
              title={col.key}
            >
              {col.label}
            </div>
          ))}

          {/* Data rows */}
          {channels.map((ch, ri) => (
            <React.Fragment key={ch}>
              {/* Channel label */}
              <div
                className="text-xs text-slate-400 font-mono flex items-center pr-2 justify-end truncate"
              >
                {ch}
              </div>
              {/* Cells */}
              {FEATURE_COLUMNS.map((col, ci) => {
                const raw = matrix[ri][ci];
                const norm = normalize(raw, ci);
                return (
                  <div
                    key={`${ch}-${col.key}`}
                    className="aspect-square rounded-[3px] transition-transform hover:scale-110 cursor-default"
                    style={{ backgroundColor: valueToColor(norm) }}
                    onMouseEnter={() =>
                      setHoveredCell({ ch, feat: col.key, value: raw })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Color scale legend */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] text-slate-500">Low</span>
        <div className="flex-1 h-2 rounded-full overflow-hidden flex">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-full"
              style={{ backgroundColor: valueToColor(i / 19) }}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-500">High</span>
      </div>
    </div>
  );
}
