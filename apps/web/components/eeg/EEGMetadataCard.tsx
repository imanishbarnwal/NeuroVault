"use client";

import { useRef, useEffect } from "react";
import type { DatasetMetadata } from "@neurovault/eeg-utils";
import { CHANNEL_COLORS } from "./mockEEGData";

// ── Types ──────────────────────────────────────────────────────────

interface EEGMetadataCardProps {
  metadata: DatasetMetadata;
  /** First few channels of signal data for the mini waveform preview */
  previewSignals?: number[][];
  /** Channel names for the preview signals */
  previewChannelNames?: string[];
  onClick?: () => void;
}

// ── Mini waveform preview (first 2 seconds, 3 channels) ──────────

function MiniWaveform({
  signals,
  sampleRate,
}: {
  signals: number[][];
  sampleRate: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Transparent background
    ctx.clearRect(0, 0, w, h);

    const previewSamples = Math.min(sampleRate * 2, signals[0]?.length ?? 0);
    const channelCount = Math.min(3, signals.length);
    const channelH = h / channelCount;

    for (let ci = 0; ci < channelCount; ci++) {
      const signal = signals[ci];
      if (!signal) continue;

      // Find range
      let min = Infinity;
      let max = -Infinity;
      for (let s = 0; s < previewSamples; s++) {
        if (signal[s] < min) min = signal[s];
        if (signal[s] > max) max = signal[s];
      }
      const range = max - min || 1;
      const yCenter = ci * channelH + channelH / 2;
      const scale = (channelH * 0.7) / range;

      ctx.strokeStyle = CHANNEL_COLORS[ci % CHANNEL_COLORS.length];
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();

      // Downsample to pixel count
      const samplesPerPx = previewSamples / w;
      for (let px = 0; px < w; px++) {
        const sIdx = Math.floor(px * samplesPerPx);
        const y = yCenter - (signal[sIdx] - (min + max) / 2) * scale;
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [signals, sampleRate]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

// ── Task label formatting ────────────────────────────────────────

function formatTask(task: string): string {
  return task
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(0);
  return `${m}m ${s}s`;
}

// ── Component ──────────────────────────────────────────────────────

export default function EEGMetadataCard({
  metadata,
  previewSignals,
  previewChannelNames,
  onClick,
}: EEGMetadataCardProps) {
  const { filename, subject, channels, sampleRate, duration, task } = metadata;

  return (
    <div
      onClick={onClick}
      className={`
        rounded-xl border border-slate-800 bg-slate-900 p-4
        flex flex-col gap-3 w-full max-w-sm
        ${onClick ? "cursor-pointer hover:border-cyan-500/40 hover:bg-slate-800/60 transition-colors" : ""}
      `}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Brain icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-cyan-400"
          >
            <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
            <path d="M10 21h4" />
            <path d="M9 9h.01" />
            <path d="M15 9h.01" />
            <path d="M9.5 13a3.5 3.5 0 0 0 5 0" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 truncate">
            {filename}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Subject {subject}
          </p>
        </div>
        {/* Task badge */}
        <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">
          {formatTask(task)}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Channels", value: channels.toString() },
          { label: "Rate", value: `${sampleRate} Hz` },
          { label: "Duration", value: formatDuration(duration) },
          { label: "Format", value: "EDF+" },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <div className="text-xs font-semibold text-slate-100">{value}</div>
            <div className="text-[10px] text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Mini waveform preview */}
      {previewSignals && previewSignals.length > 0 && (
        <div className="h-16 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
          <MiniWaveform signals={previewSignals} sampleRate={sampleRate} />
        </div>
      )}
    </div>
  );
}
