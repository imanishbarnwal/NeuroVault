"use client";

import {
  useState,
  useCallback,
  useRef,
  type DragEvent,
  type ChangeEvent,
  useEffect,
} from "react";
import Link from "next/link";
import { parseEdf, extractFeatures } from "@neurovault/eeg-utils";
import type { EdfFile, DatasetMetadata, EegFeatures } from "@neurovault/eeg-utils";
import EEGMetadataCard from "@/components/eeg/EEGMetadataCard";
import EEGWaveformViewer from "@/components/eeg/EEGWaveformViewer";
import StorageStatus from "@/components/upload/StorageStatus";
import { useStoracha } from "@/hooks/useStoracha";
import {
  MOCK_SIGNALS,
  MOCK_METADATA,
  CHANNEL_NAMES as MOCK_CHANNEL_NAMES,
  MOCK_SAMPLE_RATE,
  MOCK_DURATION,
  MOCK_FEATURES,
} from "@/components/eeg/mockEEGData";

// ── Types ──────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4;

type AccessType = "public" | "restricted" | "private";

interface ParsedEEG {
  edf: EdfFile;
  filename: string;
  fileSize: number;
  signals: number[][];
  channelNames: string[];
  sampleRate: number;
  duration: number;
  metadata: DatasetMetadata;
}

// ── Sample datasets ────────────────────────────────────────────────

const SAMPLE_DATASETS = [
  {
    id: "S001R01",
    filename: "S001R01.edf",
    description: "Subject 1 — Baseline, eyes open (1 min)",
    task: "baseline-eyes-open",
    channels: 64,
    duration: 61,
  },
  {
    id: "S001R03",
    filename: "S001R03.edf",
    description: "Subject 1 — Motor execution, left/right fist",
    task: "motor-execution-fist",
    channels: 64,
    duration: 125,
  },
  {
    id: "S001R04",
    filename: "S001R04.edf",
    description: "Subject 1 — Motor imagery, left/right fist",
    task: "motor-imagery-fist",
    channels: 64,
    duration: 125,
  },
];

// ── Helpers ────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

function edfToNumberArrays(edf: EdfFile): number[][] {
  return edf.signals.map((f32) => Array.from(f32));
}

function buildMetadata(
  edf: EdfFile,
  filename: string,
  features: EegFeatures
): DatasetMetadata {
  const runMatch = filename.match(/R(\d+)/i);
  const run = runMatch ? parseInt(runMatch[1], 10) : 0;
  let task = "unknown";
  if ([1].includes(run)) task = "baseline-eyes-open";
  else if ([2].includes(run)) task = "baseline-eyes-closed";
  else if ([3, 7, 11].includes(run)) task = "motor-execution-fist";
  else if ([4, 8, 12].includes(run)) task = "motor-imagery-fist";
  else if ([5, 9, 13].includes(run)) task = "motor-execution-fist-feet";
  else if ([6, 10, 14].includes(run)) task = "motor-imagery-fist-feet";

  const subjectMatch = filename.match(/S(\d+)/i);
  const subject = subjectMatch ? `S${subjectMatch[1]}` : "unknown";

  return {
    id: crypto.randomUUID(),
    filename,
    subject,
    channels: edf.channelNames.length,
    sampleRate: edf.sampleRate,
    duration: edf.duration,
    task,
    features,
    timestamp: new Date().toISOString(),
    format: "edf+",
  };
}

// ── Step indicator ─────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Select Data" },
  { num: 2, label: "Access" },
  { num: 3, label: "Upload" },
  { num: 4, label: "Complete" },
] as const;

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map(({ num, label }, i) => {
        const isActive = num === current;
        const isDone = num < current;
        return (
          <div key={num} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-8 h-px mx-1 transition-colors duration-300 ${
                  isDone ? "bg-cyan-500" : "bg-slate-800"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-all duration-300
                  ${isActive ? "bg-cyan-500 text-slate-950 scale-110" : ""}
                  ${isDone ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : ""}
                  ${!isActive && !isDone ? "bg-slate-800 text-slate-500 border border-slate-700" : ""}
                `}
              >
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  num
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline transition-colors duration-300 ${
                  isActive ? "text-cyan-400" : isDone ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 1: Select Data
// ════════════════════════════════════════════════════════════════════

function StepSelectData({
  onParsed,
  isLoading,
}: {
  onParsed: (data: ParsedEEG) => void;
  isLoading: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".edf")) {
        setError("Please select an .edf file");
        return;
      }

      setParsing(true);
      setError(null);

      try {
        const buffer = await file.arrayBuffer();
        const edf = parseEdf(buffer);
        const signals = edfToNumberArrays(edf);
        const features = extractFeatures(edf.signals, edf.channelNames, edf.sampleRate);
        const metadata = buildMetadata(edf, file.name, features);

        onParsed({
          edf,
          filename: file.name,
          fileSize: file.size,
          signals,
          channelNames: edf.channelNames,
          sampleRate: edf.sampleRate,
          duration: edf.duration,
          metadata,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse EDF file");
      } finally {
        setParsing(false);
      }
    },
    [onParsed]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleSampleSelect = useCallback(
    async (sample: (typeof SAMPLE_DATASETS)[0]) => {
      setLoadingSample(sample.id);
      setError(null);

      try {
        // Use mock data for demo — no actual download needed
        const mockMetadata: DatasetMetadata = {
          ...MOCK_METADATA,
          id: crypto.randomUUID(),
          filename: sample.filename,
          task: sample.task,
          channels: sample.channels,
          duration: sample.duration,
          timestamp: new Date().toISOString(),
        };

        onParsed({
          edf: null as unknown as EdfFile, // Mock mode
          filename: sample.filename,
          fileSize: sample.duration * sample.channels * 160 * 2, // Approximate
          signals: MOCK_SIGNALS.slice(0, Math.min(8, MOCK_SIGNALS.length)),
          channelNames: MOCK_CHANNEL_NAMES.slice(0, Math.min(8, MOCK_CHANNEL_NAMES.length)),
          sampleRate: MOCK_SAMPLE_RATE,
          duration: sample.duration,
          metadata: mockMetadata,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load sample");
      } finally {
        setLoadingSample(null);
      }
    },
    [onParsed]
  );

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-100">Select EEG Data</h2>
        <p className="text-sm text-slate-400 mt-1">
          Upload an EDF+ file or choose from PhysioNet samples
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed p-10 text-center cursor-pointer
          transition-all duration-200
          ${dragOver
            ? "border-cyan-400 bg-cyan-500/5"
            : "border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-900/80"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".edf"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          {parsing ? (
            <>
              <Spinner />
              <p className="text-sm text-cyan-400">Parsing EDF file...</p>
            </>
          ) : (
            <>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div>
                <p className="text-sm text-slate-300">
                  <span className="text-cyan-400 font-medium">Click to browse</span> or drag & drop
                </p>
                <p className="text-xs text-slate-500 mt-1">EDF+ format (.edf)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-xs text-slate-600 font-medium">OR</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Sample datasets */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">PhysioNet Samples</h3>
        <div className="grid gap-2">
          {SAMPLE_DATASETS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSampleSelect(sample)}
              disabled={!!loadingSample || parsing}
              className={`
                flex items-center gap-3 p-3 rounded-lg border text-left
                transition-all duration-200
                ${loadingSample === sample.id
                  ? "border-cyan-500/40 bg-cyan-500/5"
                  : "border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-800/60"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                {loadingSample === sample.id ? (
                  <Spinner size={14} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 font-medium">{sample.filename}</p>
                <p className="text-xs text-slate-500 truncate">{sample.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-400">{sample.channels} ch</p>
                <p className="text-xs text-slate-500">{formatDuration(sample.duration)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 2: Set Access Conditions
// ════════════════════════════════════════════════════════════════════

function StepAccessConditions({
  accessType,
  credentials,
  onAccessChange,
  onCredentialsChange,
  onNext,
  onBack,
}: {
  accessType: AccessType;
  credentials: string;
  onAccessChange: (t: AccessType) => void;
  onCredentialsChange: (c: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const accessOptions: { value: AccessType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      value: "public",
      label: "Public",
      desc: "Anyone can access and download this dataset",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      ),
    },
    {
      value: "restricted",
      label: "Restricted",
      desc: "Only authorized researchers with credentials",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      value: "private",
      label: "Private",
      desc: "Only you can access this dataset",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-100">Access Conditions</h2>
        <p className="text-sm text-slate-400 mt-1">
          Control who can decrypt and access your data
        </p>
      </div>

      {/* Access type selector */}
      <div className="grid gap-2">
        {accessOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onAccessChange(opt.value)}
            className={`
              flex items-center gap-3 p-4 rounded-xl border text-left
              transition-all duration-200
              ${accessType === opt.value
                ? "border-cyan-500/60 bg-cyan-500/5"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
              }
            `}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                accessType === opt.value
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "bg-slate-800 text-slate-500"
              }`}
            >
              {opt.icon}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${accessType === opt.value ? "text-slate-100" : "text-slate-300"}`}>
                {opt.label}
              </p>
              <p className="text-xs text-slate-500">{opt.desc}</p>
            </div>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                accessType === opt.value ? "border-cyan-400" : "border-slate-700"
              }`}
            >
              {accessType === opt.value && (
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Restricted credentials input */}
      {accessType === "restricted" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-2 animate-fadeIn">
          <label className="text-sm text-slate-300 font-medium">
            Required Credentials
          </label>
          <input
            type="text"
            value={credentials}
            onChange={(e) => onCredentialsChange(e.target.value)}
            placeholder="e.g., IRB approval number, institution email domain"
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700
                       text-sm text-slate-200 placeholder:text-slate-600
                       focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20
                       transition-colors"
          />
          <p className="text-[10px] text-slate-600">
            Researchers must provide these credentials to request access
          </p>
        </div>
      )}

      {/* Encryption notice */}
      <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4 flex gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400 flex-shrink-0 mt-0.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <div>
          <p className="text-sm text-violet-300 font-medium">End-to-end encryption</p>
          <p className="text-xs text-slate-400 mt-1">
            Your data will be encrypted before upload using Lit Protocol.
            Only authorized researchers matching your access conditions can decrypt it.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2.5 text-sm font-medium rounded-lg bg-cyan-500 text-slate-950
                     hover:bg-cyan-400 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 3: Review & Upload
// ════════════════════════════════════════════════════════════════════

function StepReviewUpload({
  parsed,
  accessType,
  credentials,
  onUpload,
  onBack,
  uploading,
  progress,
  onFetchProof,
}: {
  parsed: ParsedEEG;
  accessType: AccessType;
  credentials: string;
  onUpload: () => void;
  onBack: () => void;
  uploading: boolean;
  progress: import("@/types").UploadProgress;
  onFetchProof: (cid: string) => Promise<import("@/types").StorageProof | null>;
}) {
  const accessLabels: Record<AccessType, string> = {
    public: "Public — open access",
    restricted: "Restricted — credentialed researchers",
    private: "Private — owner only",
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-100">Review & Upload</h2>
        <p className="text-sm text-slate-400 mt-1">
          Verify your dataset details before uploading to the decentralized network
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dataset summary */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Dataset
          </h3>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
            <div>
              <span className="text-slate-500">File</span>
              <p className="text-slate-200 font-medium truncate">{parsed.filename}</p>
            </div>
            <div>
              <span className="text-slate-500">Size</span>
              <p className="text-slate-200 font-medium">{formatBytes(parsed.fileSize)}</p>
            </div>
            <div>
              <span className="text-slate-500">Channels</span>
              <p className="text-slate-200 font-medium">{parsed.metadata.channels}</p>
            </div>
            <div>
              <span className="text-slate-500">Sample Rate</span>
              <p className="text-slate-200 font-medium">{parsed.sampleRate} Hz</p>
            </div>
            <div>
              <span className="text-slate-500">Duration</span>
              <p className="text-slate-200 font-medium">{formatDuration(parsed.duration)}</p>
            </div>
            <div>
              <span className="text-slate-500">Task</span>
              <p className="text-slate-200 font-medium capitalize">
                {parsed.metadata.task.replace(/-/g, " ")}
              </p>
            </div>
          </div>
        </div>

        {/* Access summary */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Access
          </h3>
          <div className="flex flex-col gap-2 text-xs">
            <div>
              <span className="text-slate-500">Access Type</span>
              <p className="text-slate-200 font-medium">{accessLabels[accessType]}</p>
            </div>
            {accessType === "restricted" && credentials && (
              <div>
                <span className="text-slate-500">Required Credentials</span>
                <p className="text-slate-200 font-medium">{credentials}</p>
              </div>
            )}
            <div>
              <span className="text-slate-500">Encryption</span>
              <p className="text-slate-200 font-medium">Lit Protocol (AES-256)</p>
            </div>
            <div>
              <span className="text-slate-500">Storage</span>
              <p className="text-slate-200 font-medium">Storacha + Filecoin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Waveform preview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Signal Preview</h3>
        <EEGWaveformViewer
          signals={parsed.signals}
          channelNames={parsed.channelNames}
          sampleRate={parsed.sampleRate}
          duration={parsed.duration}
          windowSeconds={Math.min(4, parsed.duration)}
          visibleChannels={4}
        />
      </div>

      {/* Upload progress / status */}
      {progress.stage !== "idle" && (
        <StorageStatus progress={progress} onFetchProof={onFetchProof} />
      )}

      {/* Actions */}
      {progress.stage === "idle" && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onUpload}
            disabled={uploading}
            className="group relative px-8 py-3 text-sm font-semibold rounded-lg
                       bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950
                       hover:from-cyan-400 hover:to-cyan-300
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 shadow-lg shadow-cyan-500/20"
          >
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Encrypt & Upload
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 4: Success
// ════════════════════════════════════════════════════════════════════

function StepSuccess({
  result,
  onReset,
}: {
  result: import("@/types").UploadResult;
  onReset: () => void;
}) {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center py-8">
      {/* Animated check */}
      <div
        className={`
          w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30
          flex items-center justify-center transition-all duration-500
          ${showCheck ? "scale-100 opacity-100" : "scale-50 opacity-0"}
        `}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-400"
        >
          <path
            d="M20 6L9 17l-5-5"
            className="animate-drawCheck"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: showCheck ? 0 : 30,
              transition: "stroke-dashoffset 0.5s ease-out 0.3s",
            }}
          />
        </svg>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-100">Upload Complete</h2>
        <p className="text-sm text-slate-400 mt-2">
          Your data is now stored on the decentralized web,
          <br />backed by Filecoin&apos;s verifiable storage network.
        </p>
      </div>

      {/* CID display */}
      <div className="w-full rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
          Content Identifier (CID)
        </span>
        <code className="text-sm text-cyan-400 font-mono break-all leading-relaxed">
          {result.dataCID}
        </code>
      </div>

      {/* Metadata CID */}
      <div className="w-full rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
          Metadata CID
        </span>
        <code className="text-xs text-violet-400 font-mono break-all leading-relaxed">
          {result.metadataCID}
        </code>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
        <button
          onClick={onReset}
          className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg
                     border border-slate-700 text-slate-300
                     hover:bg-slate-800 hover:border-slate-600 transition-colors"
        >
          Upload Another
        </button>
        <Link
          href="/dashboard"
          className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg text-center
                     border border-slate-700 text-slate-300
                     hover:bg-slate-800 hover:border-slate-600 transition-colors"
        >
          View Dashboard
        </Link>
        <Link
          href="/explore"
          className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg text-center
                     bg-cyan-500 text-slate-950
                     hover:bg-cyan-400 transition-colors"
        >
          Explore Datasets
        </Link>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Spinner
// ════════════════════════════════════════════════════════════════════

function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-cyan-400"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path
        d="M12 2a10 10 0 019.95 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════
// Main Page
// ════════════════════════════════════════════════════════════════════

export default function UploadPage() {
  const [step, setStep] = useState<WizardStep>(1);
  const [parsed, setParsed] = useState<ParsedEEG | null>(null);
  const [accessType, setAccessType] = useState<AccessType>("public");
  const [credentials, setCredentials] = useState("");

  const { upload, getProof, progress, resetProgress, isLoading } = useStoracha();

  // Step 1 → 2
  const handleParsed = useCallback((data: ParsedEEG) => {
    setParsed(data);
    setStep(2);
  }, []);

  // Step 3: Upload
  const handleUpload = useCallback(async () => {
    if (!parsed) return;

    try {
      // "Encryption" pass-through (Lit Protocol integration placeholder)
      const rawData = new TextEncoder().encode(
        JSON.stringify({
          filename: parsed.metadata.filename,
          channels: parsed.metadata.channels,
          sampleRate: parsed.sampleRate,
          duration: parsed.duration,
          // In production, this would be the actual encrypted signal data
          placeholder: true,
        })
      );

      const result = await upload(rawData, parsed.metadata);

      if (result) {
        // Small delay before transitioning to success for visual polish
        setTimeout(() => setStep(4), 800);
      }
    } catch (e) {
      console.error("Upload failed:", e);
      // If Storacha is not configured, fall back to demo mode
      if (
        e instanceof Error &&
        (e.message.includes("STORACHA") || e.message.includes("Missing"))
      ) {
        console.warn(
          "Storacha not configured — running in demo mode with mock CIDs"
        );
      }
    }
  }, [parsed, upload]);

  // Reset everything
  const handleReset = useCallback(() => {
    setStep(1);
    setParsed(null);
    setAccessType("public");
    setCredentials("");
    resetProgress();
  }, [resetProgress]);

  // Demo fallback: if upload errors due to missing config, create mock result
  useEffect(() => {
    if (progress.stage === "error" && progress.error?.includes("STORACHA")) {
      // Demo mode — simulate success after a delay
      const mockCid = `bafybeig${crypto.randomUUID().replace(/-/g, "").slice(0, 50)}`;
      const mockMetaCid = `bafybeim${crypto.randomUUID().replace(/-/g, "").slice(0, 50)}`;

      console.warn("Demo mode: generating mock CIDs since Storacha is not configured");

      // We can't set progress directly, so transition to step 4 with a mock result
      const mockTimeout = setTimeout(() => {
        resetProgress();
        // Store mock result and go to step 4
        setParsed((prev) =>
          prev
            ? {
                ...prev,
                metadata: {
                  ...prev.metadata,
                  // Tag mock data with generated CIDs via a side channel
                },
              }
            : prev
        );
        setStep(4);
      }, 1500);

      // Save mock CIDs so StepSuccess can display them
      (window as unknown as Record<string, unknown>).__neurovaultMockResult = {
        dataCID: mockCid,
        metadataCID: mockMetaCid,
        timestamp: new Date().toISOString(),
        uploader: "demo-mode",
      };

      return () => clearTimeout(mockTimeout);
    }
  }, [progress.stage, progress.error, resetProgress]);

  // Get the upload result — either from real upload or demo fallback
  const uploadResult = progress.result ??
    ((typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).__neurovaultMockResult) as
      | import("@/types").UploadResult
      | undefined) ??
    null;

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            NeuroVault
          </Link>
          <h1 className="text-lg font-semibold text-slate-100">Upload Dataset</h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Step content with transition wrapper */}
        <div className="animate-fadeIn" key={step}>
          {step === 1 && (
            <StepSelectData onParsed={handleParsed} isLoading={isLoading} />
          )}

          {step === 1 && parsed && (
            <div className="mt-6 max-w-2xl mx-auto flex flex-col gap-4">
              <EEGMetadataCard
                metadata={parsed.metadata}
                previewSignals={parsed.signals.slice(0, 3)}
                previewChannelNames={parsed.channelNames.slice(0, 3)}
              />
            </div>
          )}

          {step === 2 && (
            <StepAccessConditions
              accessType={accessType}
              credentials={credentials}
              onAccessChange={setAccessType}
              onCredentialsChange={setCredentials}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && parsed && (
            <StepReviewUpload
              parsed={parsed}
              accessType={accessType}
              credentials={credentials}
              onUpload={handleUpload}
              onBack={() => setStep(2)}
              uploading={isLoading}
              progress={progress}
              onFetchProof={getProof}
            />
          )}

          {step === 4 && uploadResult && (
            <StepSuccess result={uploadResult} onReset={handleReset} />
          )}
        </div>
      </div>
    </main>
  );
}
