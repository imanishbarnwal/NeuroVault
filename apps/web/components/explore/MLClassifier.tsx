"use client";

import { useState, useCallback } from "react";
import type { ClassificationResult } from "@/lib/impulse";

interface MLClassifierProps {
  /** Raw EEG signals (number[][] — channels x samples) */
  signals: number[][];
  /** Channel names */
  channelNames: string[];
  /** Sample rate in Hz */
  sampleRate: number;
}

const CLASS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  "left-hand": {
    label: "Left Hand",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    icon: "M11 17a4 4 0 01-8 0V5a2 2 0 012-2h2a2 2 0 012 2v12zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v8a4 4 0 01-4 4h-2",
  },
  "right-hand": {
    label: "Right Hand",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    icon: "M11 17a4 4 0 01-8 0V5a2 2 0 012-2h2a2 2 0 012 2v12zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v8a4 4 0 01-4 4h-2",
  },
  rest: {
    label: "Resting State",
    color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
    icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
  },
  unknown: {
    label: "Unknown",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
};

export default function MLClassifier({
  signals,
  channelNames,
  sampleRate,
}: MLClassifierProps) {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runClassification = useCallback(async () => {
    setIsRunning(true);
    setError(null);

    try {
      const { classifyMotorImagery } = await import("@/lib/impulse");
      const classification = await classifyMotorImagery(
        signals,
        channelNames,
        sampleRate
      );
      setResult(classification);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Classification failed"
      );
    } finally {
      setIsRunning(false);
    }
  }, [signals, channelNames, sampleRate]);

  const classInfo = result
    ? CLASS_LABELS[result.predictedClass] || CLASS_LABELS.unknown
    : null;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-orange-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
            />
          </svg>
          <h4 className="text-xs font-semibold text-slate-300">
            Motor Imagery Classification
          </h4>
        </div>
        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
          Powered by Impulse AI
        </span>
      </div>

      {/* Run button or results */}
      {!result ? (
        <div className="flex flex-col items-center gap-2 py-3">
          {error && (
            <div className="w-full rounded bg-red-500/10 border border-red-500/20 px-3 py-2 mb-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
          <p className="text-xs text-slate-500 text-center">
            Classify which motor imagery task this EEG segment represents
            (left hand vs right hand).
          </p>
          <button
            onClick={runClassification}
            disabled={isRunning}
            className="px-4 py-2 text-xs font-medium rounded-lg bg-orange-500 text-white
                       hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="animate-spin"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeOpacity="0.2"
                  />
                  <path
                    d="M12 2a10 10 0 019.95 9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Classifying...
              </>
            ) : (
              <>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
                  />
                </svg>
                Run Classification
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Prediction */}
          <div
            className={`flex items-center gap-3 rounded-lg border p-3 ${classInfo!.color}`}
          >
            <svg
              className="w-6 h-6 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={classInfo!.icon}
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold">{classInfo!.label}</p>
              <p className="text-[10px] opacity-70">
                {result.engine === "impulse-ai"
                  ? "Classified by Impulse AI"
                  : "ERD-based classifier (built-in)"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">
                {Math.round(result.confidence * 100)}%
              </p>
              <p className="text-[10px] opacity-60">confidence</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded bg-slate-900 p-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Time
              </p>
              <p className="text-xs font-mono text-slate-300">
                {result.processingTimeMs.toFixed(1)}ms
              </p>
            </div>
            <div className="rounded bg-slate-900 p-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Mu Lat.
              </p>
              <p className="text-xs font-mono text-slate-300">
                {result.features.muLaterality.toFixed(3)}
              </p>
            </div>
            <div className="rounded bg-slate-900 p-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Beta Lat.
              </p>
              <p className="text-xs font-mono text-slate-300">
                {result.features.betaLaterality.toFixed(3)}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="rounded bg-slate-900 p-2.5">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
              Explanation
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              {result.explanation}
            </p>
          </div>

          {/* Channels used */}
          <div className="flex gap-4 text-[10px] text-slate-500">
            <span>
              L motor:{" "}
              <span className="text-slate-400 font-mono">
                {result.features.leftChannels.join(", ") || "—"}
              </span>
            </span>
            <span>
              R motor:{" "}
              <span className="text-slate-400 font-mono">
                {result.features.rightChannels.join(", ") || "—"}
              </span>
            </span>
          </div>

          {/* Re-run button */}
          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            className="text-xs text-slate-500 hover:text-orange-400 transition-colors"
          >
            Run again
          </button>
        </div>
      )}
    </div>
  );
}
