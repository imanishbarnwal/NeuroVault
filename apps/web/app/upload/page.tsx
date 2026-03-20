"use client";

import { toast } from "sonner";
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
import AccessConditionBuilder from "@/components/upload/AccessConditionBuilder";
import Navbar from "@/components/layout/Navbar";
import WorldIDButton from "@/components/WorldIDButton";
import { useStoracha } from "@/hooks/useStoracha";
import { useLitProtocol } from "@/hooks/useLitProtocol";
import { useFlow } from "@/hooks/useFlow";
import { useWorldID } from "@/hooks/useWorldID";
import { buildWalletCondition } from "@/lib/lit";
import { describeConditions } from "@/lib/conditions";
import type { AccessConditionItem } from "@/types";
import {
  MOCK_SIGNALS,
  MOCK_METADATA,
  CHANNEL_NAMES as MOCK_CHANNEL_NAMES,
  MOCK_SAMPLE_RATE,
  MOCK_DURATION,
  MOCK_FEATURES,
} from "@/components/eeg/mockEEGData";

// ── Types ──────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5;

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

interface OnChainResult {
  id: number;
  txHash: string;
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

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

// ── Step indicator ─────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: "Select Data" },
  { num: 2, label: "Access" },
  { num: 3, label: "Upload" },
  { num: 4, label: "Register" },
  { num: 5, label: "Complete" },
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
                  isDone ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-all duration-300
                  ${isActive ? "bg-primary text-primary-foreground scale-110" : ""}
                  ${isDone ? "bg-primary/20 text-primary border border-primary/40" : ""}
                  ${!isActive && !isDone ? "bg-muted text-[hsl(var(--nv-text-tertiary))] border border-border" : ""}
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
                  isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-[hsl(var(--nv-text-tertiary))]"
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
          edf: null as unknown as EdfFile,
          filename: sample.filename,
          fileSize: sample.duration * sample.channels * 160 * 2,
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
        <h2 className="text-xl font-semibold text-foreground">Select EEG Data</h2>
        <p className="text-sm text-muted-foreground mt-1">
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
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-border hover:bg-card"
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
              <p className="text-sm text-primary">Parsing EDF file...</p>
            </>
          ) : (
            <>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[hsl(var(--nv-text-tertiary))]">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-primary font-medium">Click to browse</span> or drag & drop
                </p>
                <p className="text-xs text-[hsl(var(--nv-text-tertiary))] mt-1">EDF+ format (.edf)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-muted" />
        <span className="text-xs text-[hsl(var(--nv-text-tertiary))] font-medium">OR</span>
        <div className="flex-1 h-px bg-muted" />
      </div>

      {/* Sample datasets */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">PhysioNet Samples</h3>
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
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-card hover:border-border hover:bg-muted/60"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                {loadingSample === sample.id ? (
                  <Spinner size={14} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium">{sample.filename}</p>
                <p className="text-xs text-[hsl(var(--nv-text-tertiary))] truncate">{sample.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">{sample.channels} ch</p>
                <p className="text-xs text-[hsl(var(--nv-text-tertiary))]">{formatDuration(sample.duration)}</p>
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
// STEP 4: Register On-Chain
// ════════════════════════════════════════════════════════════════════

function StepRegisterOnChain({
  uploadResult,
  wallet,
  isFlowDemo,
  onConnect,
  onRegister,
  registering,
  error,
}: {
  uploadResult: import("@/types").UploadResult;
  wallet: import("@/types").FlowWalletState;
  isFlowDemo: boolean;
  onConnect: () => void;
  onRegister: (price: string) => void;
  registering: boolean;
  error: string | null;
}) {
  const [price, setPrice] = useState("0.1");

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-100">Register On-Chain</h2>
        <p className="text-sm text-slate-400 mt-1">
          Register your dataset on the Flow blockchain for discovery and access licensing
        </p>
      </div>

      {isFlowDemo && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm text-amber-200 font-medium">Demo Mode</p>
            <p className="text-xs text-amber-300/70 mt-0.5">
              Flow contract not configured. Registration will be simulated.
            </p>
          </div>
        </div>
      )}

      {/* Upload result summary */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Uploaded to Filecoin
        </h3>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div>
            <span className="text-slate-500">Data CID</span>
            <p className="text-cyan-400 font-mono truncate">{uploadResult.dataCID}</p>
          </div>
          <div>
            <span className="text-slate-500">Metadata CID</span>
            <p className="text-violet-400 font-mono truncate">{uploadResult.metadataCID}</p>
          </div>
        </div>
      </div>

      {/* Price input */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Access Pricing
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-500 mb-1 block">Price per access (FLOW)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white
                           focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">FLOW</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-5">
            {price === "0" || price === "" ? "Free access" : `${price} FLOW per 30-day license`}
          </div>
        </div>
      </div>

      {/* Wallet connection */}
      {!wallet.isConnected && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-300">Wallet Required</p>
            <p className="text-xs text-slate-500 mt-0.5">Connect your wallet to register on Flow</p>
          </div>
          <button
            onClick={onConnect}
            className="px-4 py-2 text-sm rounded-lg border border-cyan-500/40 text-cyan-400
                       hover:bg-cyan-500/10 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Register button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => onRegister(price || "0")}
          disabled={registering || (!wallet.isConnected && !isFlowDemo)}
          className="group relative px-8 py-3 text-sm font-semibold rounded-lg
                     bg-gradient-to-r from-violet-500 to-cyan-500 text-white
                     hover:from-violet-400 hover:to-cyan-400
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-lg shadow-violet-500/20"
        >
          <span className="flex items-center gap-2">
            {registering ? (
              <>
                <Spinner size={16} />
                Registering on Flow...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h5.25A2.25 2.25 0 0121 6v6zm0 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V6" />
                </svg>
                Register On-Chain
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 5: Success
// ════════════════════════════════════════════════════════════════════

function StepSuccess({
  result,
  onChainResult,
  onReset,
}: {
  result: import("@/types").UploadResult;
  onChainResult: OnChainResult | null;
  onReset: () => void;
}) {
  const [showCheck, setShowCheck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 200);
    return () => clearTimeout(t);
  }, []);

  const explorerUrl = onChainResult
    ? `https://evm-testnet.flowscan.io/tx/${onChainResult.txHash}`
    : null;

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
          Your data is stored on Filecoin and registered on Flow blockchain.
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

      {/* On-chain registration result */}
      {onChainResult && (
        <div className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-2">
          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium">
            Flow Transaction
          </span>
          <div className="flex items-center justify-between">
            <code className="text-sm text-emerald-300 font-mono">
              {truncateHash(onChainResult.txHash)}
            </code>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                View on Explorer
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
          <p className="text-xs text-emerald-400/70">
            On-chain ID: #{onChainResult.id}
          </p>
        </div>
      )}

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
  const [accessConditions, setAccessConditions] = useState<AccessConditionItem[]>([]);
  const [onChainResult, setOnChainResult] = useState<OnChainResult | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const { upload, getProof, progress, setProgress, resetProgress, isLoading } = useStoracha();
  const { encrypt, isReady: litReady, isDemo: litIsDemo } = useLitProtocol();
  const {
    wallet,
    connectWallet,
    disconnectWallet,
    registerDataset,
    isDemo: flowIsDemo,
    isLoading: flowLoading,
  } = useFlow();
  const { isVerified: worldIDVerified } = useWorldID();

  // Step 1 → 2
  const handleParsed = useCallback((data: ParsedEEG) => {
    setParsed(data);
    setStep(2);
  }, []);

  // Step 3: Upload with encryption
  const handleUpload = useCallback(async () => {
    if (!parsed) return;

    try {
      setProgress({
        stage: "preparing",
        percent: 5,
        message: "Serializing EEG data...",
      });

      const rawData = new TextEncoder().encode(
        JSON.stringify({
          filename: parsed.metadata.filename,
          channels: parsed.metadata.channels,
          sampleRate: parsed.sampleRate,
          duration: parsed.duration,
          signals: parsed.signals,
        })
      );

      let dataToUpload: Uint8Array;

      if (accessType === "public") {
        dataToUpload = rawData;
      } else {
        setProgress({
          stage: "encrypting",
          percent: 20,
          message: "Encrypting with Lit Protocol...",
        });

        let conditions = accessConditions;

        if (accessType === "private" && conditions.length === 0) {
          conditions = [
            buildWalletCondition(
              "0x0000000000000000000000000000000000000000"
            ),
          ];
        }

        const envelope = await encrypt(rawData, conditions);
        dataToUpload = new TextEncoder().encode(JSON.stringify(envelope));
      }

      const result = await upload(
        dataToUpload,
        parsed.metadata,
        accessType,
        accessConditions
      );

      if (result) {
        toast.success("Dataset encrypted & uploaded to Filecoin!");
        // Move to step 4 (Register On-Chain) instead of step 5
        setTimeout(() => setStep(4), 800);
      }
    } catch (e) {
      console.error("Upload failed:", e);
      toast.error("Upload failed — check console for details");
      if (
        e instanceof Error &&
        (e.message.includes("STORACHA") || e.message.includes("Missing"))
      ) {
        console.warn(
          "Storacha not configured — running in demo mode with mock CIDs"
        );
      }
    }
  }, [parsed, upload, setProgress, accessType, accessConditions, encrypt]);

  // Step 4: Register on-chain
  const handleRegister = useCallback(async (price: string) => {
    const result = uploadResult;
    if (!result) return;

    setIsRegistering(true);
    setRegisterError(null);

    try {
      const chainResult = await registerDataset(
        result.dataCID,
        result.metadataCID,
        price
      );
      setOnChainResult(chainResult);
      toast.success(`Registered on-chain as Dataset #${chainResult.id}`);
      setStep(5);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to register on-chain";
      setRegisterError(msg);
      toast.error(msg);
    } finally {
      setIsRegistering(false);
    }
  }, [registerDataset]);

  // Reset everything
  const handleReset = useCallback(() => {
    setStep(1);
    setParsed(null);
    setAccessType("public");
    setCredentials("");
    setAccessConditions([]);
    setOnChainResult(null);
    setRegisterError(null);
    resetProgress();
    if (typeof window !== "undefined") {
      delete (window as unknown as Record<string, unknown>).__neurovaultMockResult;
    }
  }, [resetProgress]);

  // Demo fallback: if upload errors due to missing config, create mock result
  useEffect(() => {
    if (progress.stage === "error" && progress.error?.includes("STORACHA")) {
      const mockCid = `bafybeig${crypto.randomUUID().replace(/-/g, "").slice(0, 50)}`;
      const mockMetaCid = `bafybeim${crypto.randomUUID().replace(/-/g, "").slice(0, 50)}`;

      console.warn("Demo mode: generating mock CIDs since Storacha is not configured");

      const mockTimeout = setTimeout(() => {
        resetProgress();
        setParsed((prev) =>
          prev
            ? {
                ...prev,
                metadata: {
                  ...prev.metadata,
                },
              }
            : prev
        );
        setStep(4); // Go to register step
      }, 1500);

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
      <Navbar
        wallet={wallet}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isLoading={flowLoading}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-lg font-semibold text-slate-100">Upload Dataset</h1>
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
            <>
              <AccessConditionBuilder
                accessType={accessType}
                onAccessChange={setAccessType}
                onConditionsChange={setAccessConditions}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
                isDemo={litIsDemo}
              />
              {(accessType !== "public" || accessConditions.length > 0) && (
                <div className="max-w-lg mx-auto mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <h4 className="text-xs font-semibold text-slate-400 mb-2">
                    Access Summary
                  </h4>
                  <p className="text-sm text-slate-200">
                    This dataset will be decryptable by:{" "}
                    {describeConditions(accessConditions, accessType)
                      .map((d, i) =>
                        d === "AND" || d === "OR" ? (
                          <span
                            key={i}
                            className="text-xs text-cyan-400 font-semibold mx-1"
                          >
                            {d}
                          </span>
                        ) : (
                          <span
                            key={i}
                            className="font-mono text-cyan-300 text-xs"
                          >
                            [{d}]
                          </span>
                        )
                      )}
                  </p>
                </div>
              )}
            </>
          )}

          {step === 3 && parsed && (
            <>
              {/* World ID verification gate */}
              {!worldIDVerified && (
                <div className="max-w-2xl mx-auto mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                    <div>
                      <p className="text-sm text-amber-200 font-medium">Verify your humanity</p>
                      <p className="text-xs text-amber-300/60 mt-0.5">Prove you are a unique human to upload data (prevents sybil attacks)</p>
                    </div>
                  </div>
                  <WorldIDButton />
                </div>
              )}
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
            </>
          )}

          {step === 4 && uploadResult && (
            <StepRegisterOnChain
              uploadResult={uploadResult}
              wallet={wallet}
              isFlowDemo={flowIsDemo}
              onConnect={connectWallet}
              onRegister={handleRegister}
              registering={isRegistering}
              error={registerError}
            />
          )}

          {step === 5 && uploadResult && (
            <StepSuccess
              result={uploadResult}
              onChainResult={onChainResult}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </main>
  );
}
