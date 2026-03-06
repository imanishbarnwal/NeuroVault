"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type MouseEvent,
} from "react";
import { CHANNEL_COLORS } from "./mockEEGData";

// ── Types ──────────────────────────────────────────────────────────

interface EEGWaveformViewerProps {
  /** Per-channel signal data: signals[channel][sample] in µV */
  signals: number[][];
  /** Channel name per signal */
  channelNames: string[];
  /** Sampling rate in Hz */
  sampleRate: number;
  /** Total duration in seconds */
  duration: number;
  /** Visible time window in seconds (default: 4) */
  windowSeconds?: number;
  /** How many channels to display at once (default: 8) */
  visibleChannels?: number;
  /** Optional per-channel colors (falls back to defaults) */
  colors?: string[];
}

// ── Constants ──────────────────────────────────────────────────────

const LABEL_WIDTH = 56;
const TIME_AXIS_HEIGHT = 28;
const SCRUB_BAR_HEIGHT = 32;
const PADDING_TOP = 8;

// ── Component ──────────────────────────────────────────────────────

export default function EEGWaveformViewer({
  signals,
  channelNames,
  sampleRate,
  duration,
  windowSeconds = 4,
  visibleChannels = 8,
  colors = CHANNEL_COLORS,
}: EEGWaveformViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);
  const [offset, setOffset] = useState(0); // seconds
  const [channelStart, setChannelStart] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 400 });

  const maxOffset = Math.max(0, duration - windowSeconds);
  const displayCount = Math.min(visibleChannels, signals.length - channelStart);
  const maxChannelStart = Math.max(0, signals.length - visibleChannels);

  // ── Resize observer ────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const h = displayCount * 56 + TIME_AXIS_HEIGHT + PADDING_TOP;
      setCanvasSize({ w: Math.floor(width), h: Math.max(h, 200) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [displayCount]);

  // ── Drawing ────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = canvasSize;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#020617"; // slate-950
    ctx.fillRect(0, 0, w, h);

    const plotW = w - LABEL_WIDTH;
    const plotH = h - TIME_AXIS_HEIGHT - PADDING_TOP;
    const channelH = displayCount > 0 ? plotH / displayCount : plotH;

    const startSample = Math.floor(offset * sampleRate);
    const windowSamples = Math.floor(windowSeconds * sampleRate);
    const endSample = Math.min(startSample + windowSamples, signals[0]?.length ?? 0);
    const samplesInView = endSample - startSample;

    // ── Draw each visible channel ───────────────────────────────

    for (let ci = 0; ci < displayCount; ci++) {
      const chIdx = channelStart + ci;
      const signal = signals[chIdx];
      if (!signal) continue;

      const yCenter = PADDING_TOP + ci * channelH + channelH / 2;
      const color = colors[chIdx % colors.length];

      // Channel label
      ctx.fillStyle = "#cbd5e1"; // slate-300
      ctx.font = "11px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(channelNames[chIdx] ?? `Ch${chIdx}`, LABEL_WIDTH - 8, yCenter);

      // Separator line
      if (ci > 0) {
        ctx.strokeStyle = "#1e293b"; // slate-800
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(LABEL_WIDTH, PADDING_TOP + ci * channelH);
        ctx.lineTo(w, PADDING_TOP + ci * channelH);
        ctx.stroke();
      }

      // Find amplitude range for auto-scaling
      let min = Infinity;
      let max = -Infinity;
      for (let s = startSample; s < endSample; s++) {
        if (signal[s] < min) min = signal[s];
        if (signal[s] > max) max = signal[s];
      }
      const range = max - min || 1;
      const scale = (channelH * 0.8) / range;

      // Draw waveform
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();

      // If there are more samples than pixels, downsample
      const pixelCount = plotW;
      if (samplesInView > pixelCount * 2) {
        // Min-max downsampling per pixel
        const samplesPerPx = samplesInView / pixelCount;
        for (let px = 0; px < pixelCount; px++) {
          const sFrom = startSample + Math.floor(px * samplesPerPx);
          const sTo = startSample + Math.floor((px + 1) * samplesPerPx);
          let pxMin = Infinity;
          let pxMax = -Infinity;
          for (let s = sFrom; s < sTo && s < endSample; s++) {
            if (signal[s] < pxMin) pxMin = signal[s];
            if (signal[s] > pxMax) pxMax = signal[s];
          }
          const x = LABEL_WIDTH + px;
          const y1 = yCenter - (pxMin - (min + max) / 2) * scale;
          const y2 = yCenter - (pxMax - (min + max) / 2) * scale;
          if (px === 0) {
            ctx.moveTo(x, y1);
          }
          ctx.lineTo(x, y1);
          ctx.lineTo(x, y2);
        }
      } else {
        // Draw every sample
        for (let s = startSample; s < endSample; s++) {
          const x =
            LABEL_WIDTH + ((s - startSample) / samplesInView) * plotW;
          const y = yCenter - (signal[s] - (min + max) / 2) * scale;
          if (s === startSample) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // ── Time axis ───────────────────────────────────────────────

    const axisY = h - TIME_AXIS_HEIGHT;
    ctx.strokeStyle = "#334155"; // slate-700
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LABEL_WIDTH, axisY);
    ctx.lineTo(w, axisY);
    ctx.stroke();

    // Tick marks — approximately every 0.5s
    const tickInterval = windowSeconds <= 2 ? 0.25 : windowSeconds <= 5 ? 0.5 : 1;
    const firstTick = Math.ceil(offset / tickInterval) * tickInterval;
    ctx.fillStyle = "#94a3b8"; // slate-400
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let t = firstTick; t <= offset + windowSeconds; t += tickInterval) {
      const x = LABEL_WIDTH + ((t - offset) / windowSeconds) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
      ctx.fillText(`${t.toFixed(1)}s`, x, axisY + 6);
    }
  }, [
    canvasSize,
    offset,
    channelStart,
    displayCount,
    signals,
    channelNames,
    sampleRate,
    windowSeconds,
    colors,
  ]);

  useEffect(() => {
    draw();
  }, [draw]);

  // ── Playback loop ──────────────────────────────────────────────

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setOffset((prev) => {
        const next = prev + dt;
        if (next >= maxOffset) {
          setPlaying(false);
          return maxOffset;
        }
        return next;
      });
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animRef.current);
  }, [playing, maxOffset]);

  // ── Scrub bar click ────────────────────────────────────────────

  const handleScrub = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setOffset(pct * maxOffset);
  };

  const scrubPct = maxOffset > 0 ? offset / maxOffset : 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Canvas */}
      <div ref={containerRef} className="w-full rounded-lg border border-slate-800 overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: canvasSize.w, height: canvasSize.h }}
          className="block"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play / Pause */}
        <button
          onClick={() => {
            if (offset >= maxOffset) setOffset(0);
            setPlaying((p) => !p);
          }}
          className="flex items-center justify-center w-8 h-8 rounded-md
                     bg-slate-800 border border-slate-700 text-cyan-400
                     hover:bg-slate-700 transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="2" y="1" width="3.5" height="12" rx="1" />
              <rect x="8.5" y="1" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M3 1.5v11l9-5.5z" />
            </svg>
          )}
        </button>

        {/* Scrub bar */}
        <div
          className="flex-1 h-2 bg-slate-800 rounded-full cursor-pointer relative"
          onClick={handleScrub}
        >
          <div
            className="absolute top-0 left-0 h-full bg-cyan-500 rounded-full transition-[width] duration-75"
            style={{ width: `${scrubPct * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full border-2 border-slate-950 shadow"
            style={{ left: `calc(${scrubPct * 100}% - 6px)` }}
          />
        </div>

        {/* Time display */}
        <span className="text-xs font-mono text-slate-400 w-24 text-right">
          {offset.toFixed(1)}s / {duration.toFixed(1)}s
        </span>

        {/* Channel pagination */}
        <div className="flex items-center gap-1 ml-2 border-l border-slate-800 pl-3">
          <button
            onClick={() => setChannelStart((s) => Math.max(0, s - visibleChannels))}
            disabled={channelStart === 0}
            className="px-1.5 py-0.5 text-xs rounded bg-slate-800 border border-slate-700
                       text-slate-300 hover:bg-slate-700 disabled:opacity-30
                       disabled:cursor-not-allowed transition-colors"
          >
            &#9650;
          </button>
          <span className="text-xs text-slate-500 font-mono w-16 text-center">
            {channelStart + 1}&ndash;{channelStart + displayCount} / {signals.length}
          </span>
          <button
            onClick={() =>
              setChannelStart((s) => Math.min(maxChannelStart, s + visibleChannels))
            }
            disabled={channelStart >= maxChannelStart}
            className="px-1.5 py-0.5 text-xs rounded bg-slate-800 border border-slate-700
                       text-slate-300 hover:bg-slate-700 disabled:opacity-30
                       disabled:cursor-not-allowed transition-colors"
          >
            &#9660;
          </button>
        </div>
      </div>
    </div>
  );
}
