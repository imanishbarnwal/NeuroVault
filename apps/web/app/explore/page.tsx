"use client";

import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { DatasetEntry, EncryptedEnvelope, FlowDataset, NEARMatchResult } from "@/types";
import EncryptionStatus from "@/components/upload/EncryptionStatus";
import EEGWaveformViewer from "@/components/eeg/EEGWaveformViewer";
import MLClassifier from "@/components/explore/MLClassifier";
import WorldIDButton from "@/components/WorldIDButton";
import Navbar from "@/components/layout/Navbar";
import { useLitProtocol } from "@/hooks/useLitProtocol";
import { useStoracha } from "@/hooks/useStoracha";
import { useFlow } from "@/hooks/useFlow";
import { useNEAR } from "@/hooks/useNEAR";
import { useWorldID } from "@/hooks/useWorldID";
import {
  MOCK_SIGNALS,
  CHANNEL_NAMES as MOCK_CHANNEL_NAMES,
  MOCK_SAMPLE_RATE,
  MOCK_DURATION,
} from "@/components/eeg/mockEEGData";

// ── Helpers ───────────────────────────────────────────────────────────

function truncateCid(cid: string, chars = 6): string {
  if (cid.length <= chars * 2 + 3) return cid;
  return `${cid.slice(0, chars)}...${cid.slice(-chars)}`;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatFlowPrice(price: bigint): string {
  const eth = Number(price) / 1e18;
  if (eth === 0) return "Free";
  return `${eth.toFixed(eth < 0.01 ? 4 : 2)} FLOW`;
}

const TASK_LABELS: Record<string, { label: string; color: string }> = {
  "baseline-eyes-open": { label: "Baseline (EO)", color: "bg-cyan-500/20 text-cyan-400" },
  "baseline-eyes-closed": { label: "Baseline (EC)", color: "bg-cyan-500/20 text-cyan-400" },
  "motor-execution-fist": { label: "Motor Exec", color: "bg-violet-500/20 text-violet-400" },
  "motor-imagery-fist": { label: "Motor Imagery", color: "bg-violet-500/20 text-violet-400" },
  "motor-execution-feet": { label: "Motor Exec (Feet)", color: "bg-emerald-500/20 text-emerald-400" },
  "motor-imagery-feet": { label: "Motor Imagery (Feet)", color: "bg-emerald-500/20 text-emerald-400" },
};

// ── Demo datasets for when no real data is available ─────────────────

const DEMO_DATASETS: DatasetEntry[] = [
  {
    id: "demo-001",
    dataCID: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    metadataCID: "bafybeif2uxl4g72q7qpvdnaat7gkzme2xhqtpd67y7rghvzb2n4eampsu",
    uploader: "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
    timestamp: "2026-03-06T10:30:00.000Z",
    channels: 64,
    duration: 61,
    task: "baseline-eyes-open",
    filename: "S001R01.edf",
    accessType: "public",
  },
  {
    id: "demo-002",
    dataCID: "bafybeihkoviema7g3gxyt6la7vd5ho32lbp7r5y46iqfwqaau7uscwasni",
    metadataCID: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    uploader: "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
    timestamp: "2026-03-06T11:15:00.000Z",
    channels: 64,
    duration: 125,
    task: "motor-execution-fist",
    filename: "S001R03.edf",
    accessType: "restricted",
    accessConditions: [
      {
        contractAddress: "",
        standardContractType: "",
        chain: "ethereum",
        method: "",
        parameters: [":userAddress"],
        returnValueTest: { comparator: "=", value: "0x1234567890abcdef1234567890abcdef12345678" },
      },
    ],
  },
  {
    id: "demo-003",
    dataCID: "bafybeibml5uieyxa5tufngvg7fgwbkwvlsuntwbxgtskoqynbt7wlchmfm",
    metadataCID: "bafybeif2uxl4g72q7qpvdnaat7gkzme2xhqtpd67y7rghvzb2n4eampsu",
    uploader: "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    timestamp: "2026-03-05T16:45:00.000Z",
    channels: 64,
    duration: 125,
    task: "motor-imagery-fist",
    filename: "S001R04.edf",
    accessType: "private",
  },
];

// ── Decrypted data shape ─────────────────────────────────────────────

interface DecryptedEEG {
  signals: number[][];
  channelNames: string[];
  sampleRate: number;
  duration: number;
}

// ── Dataset Detail Panel ─────────────────────────────────────────────

function DatasetDetail({
  dataset,
  flowDataset,
  isDemo,
  onClose,
  onPurchaseAccess,
  isPurchasing,
  walletConnected,
}: {
  dataset: DatasetEntry;
  flowDataset?: FlowDataset;
  isDemo: boolean;
  onClose: () => void;
  onPurchaseAccess: (datasetId: number) => Promise<void>;
  isPurchasing: boolean;
  walletConnected: boolean;
}) {
  const { decrypt, isDemo: litIsDemo } = useLitProtocol();
  const { retrieve } = useStoracha();
  const { isVerified: worldIDVerified } = useWorldID();
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);
  const [eegData, setEegData] = useState<DecryptedEEG | null>(null);
  const [purchased, setPurchased] = useState(false);

  const isEncrypted = dataset.accessType !== "public";
  const isFree = flowDataset ? flowDataset.price === BigInt(0) : !isEncrypted;

  const handlePurchase = useCallback(async () => {
    if (!flowDataset) return;
    try {
      await onPurchaseAccess(flowDataset.id);
      setPurchased(true);
    } catch {
      // Error is handled by parent
    }
  }, [flowDataset, onPurchaseAccess]);

  const handleDecrypt = useCallback(async () => {
    setDecrypting(true);
    setDecryptError(null);

    try {
      if (isDemo) {
        await new Promise((r) => setTimeout(r, 800));
        setEegData({
          signals: MOCK_SIGNALS.slice(0, Math.min(8, MOCK_SIGNALS.length)),
          channelNames: MOCK_CHANNEL_NAMES.slice(0, 8),
          sampleRate: MOCK_SAMPLE_RATE,
          duration: Math.min(MOCK_DURATION, dataset.duration),
        });
        return;
      }

      const rawData = await retrieve(dataset.dataCID, "data");
      if (!rawData || !(rawData instanceof Uint8Array)) {
        throw new Error("Failed to retrieve dataset from storage");
      }

      if (!isEncrypted) {
        const text = new TextDecoder().decode(rawData);
        const parsed = JSON.parse(text);
        setEegData({
          signals: parsed.signals,
          channelNames: parsed.channelNames ||
            Array.from({ length: parsed.channels }, (_, i) => `Ch${i + 1}`),
          sampleRate: parsed.sampleRate,
          duration: parsed.duration,
        });
        return;
      }

      const text = new TextDecoder().decode(rawData);
      const envelope: EncryptedEnvelope = JSON.parse(text);

      const decryptedBytes = await decrypt(envelope);
      const decryptedText = new TextDecoder().decode(decryptedBytes);
      const parsed = JSON.parse(decryptedText);

      setEegData({
        signals: parsed.signals,
        channelNames: parsed.channelNames ||
          Array.from({ length: parsed.channels }, (_, i) => `Ch${i + 1}`),
        sampleRate: parsed.sampleRate,
        duration: parsed.duration,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Decryption failed";
      setDecryptError(message);
    } finally {
      setDecrypting(false);
    }
  }, [dataset, isDemo, isEncrypted, retrieve, decrypt]);

  return (
    <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900 p-5 animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-100">
          {dataset.filename} — Detail View
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* On-chain info */}
      {flowDataset && (
        <div className="mb-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Price</span>
              <p className="text-emerald-400 font-medium">{formatFlowPrice(flowDataset.price)}</p>
            </div>
            <div>
              <span className="text-slate-500">Contributor</span>
              <p className="text-slate-300 font-mono">{truncateAddress(flowDataset.contributor)}</p>
            </div>
            <div>
              <span className="text-slate-500">On-Chain ID</span>
              <p className="text-slate-300 font-mono">#{flowDataset.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Encryption status */}
      <div className="mb-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
        <EncryptionStatus
          accessType={dataset.accessType}
          accessConditions={dataset.accessConditions}
          isEncrypted={isEncrypted}
          isDemo={isDemo || litIsDemo}
        />
      </div>

      {/* Waveform viewer or purchase/decrypt button */}
      {eegData ? (
        <>
          <div className="rounded-lg border border-slate-800 p-4">
            <h4 className="text-xs font-semibold text-slate-400 mb-3">
              EEG Waveform
            </h4>
            <EEGWaveformViewer
              signals={eegData.signals}
              channelNames={eegData.channelNames}
              sampleRate={eegData.sampleRate}
              duration={eegData.duration}
              windowSeconds={Math.min(4, eegData.duration)}
              visibleChannels={4}
            />
          </div>

          {/* ML Classification */}
          <MLClassifier
            signals={eegData.signals}
            channelNames={eegData.channelNames}
            sampleRate={eegData.sampleRate}
          />
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          {decryptError && (
            <div className="w-full rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400 font-medium mb-1">Access Denied</p>
              <p className="text-xs text-red-300/70">{decryptError}</p>
            </div>
          )}

          {/* Purchase access button (for paid datasets) */}
          {flowDataset && !isFree && !purchased && isEncrypted && (
            <div className="w-full rounded-lg bg-violet-500/5 border border-violet-500/20 px-4 py-4 text-center">
              <p className="text-sm text-slate-300 mb-3">
                Purchase a 30-day access license to decrypt this dataset.
              </p>
              {!worldIDVerified && (
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="text-xs text-amber-400">Verify your humanity first:</span>
                  <WorldIDButton compact />
                </div>
              )}
              <button
                onClick={handlePurchase}
                disabled={isPurchasing || !walletConnected || !worldIDVerified}
                className="px-6 py-2 text-sm font-medium rounded-lg bg-violet-500 text-white
                           hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                           flex items-center gap-2 mx-auto"
              >
                {isPurchasing ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Purchase Access — {formatFlowPrice(flowDataset.price)}
                  </>
                )}
              </button>
              {!walletConnected && (
                <p className="text-xs text-slate-500 mt-2">Connect your wallet first</p>
              )}
            </div>
          )}

          {/* Decrypt / View button */}
          {(isFree || purchased || !isEncrypted || !flowDataset) && (
            <>
              <p className="text-sm text-slate-400">
                {isEncrypted
                  ? purchased ? "Access purchased! Decrypt to view waveform." : "Request access to view the waveform."
                  : "Click below to load and view the waveform data."}
              </p>
              <button
                onClick={handleDecrypt}
                disabled={decrypting}
                className="px-5 py-2 text-sm font-medium rounded-lg bg-cyan-500 text-slate-950
                           hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                           flex items-center gap-2"
              >
                {decrypting ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                      <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    {isEncrypted ? "Decrypting..." : "Loading..."}
                  </>
                ) : (
                  <>
                    {isEncrypted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                    {decryptError ? "Retry" : isEncrypted ? "Decrypt & View" : "Load & View"}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Score Badge ──────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : score >= 50
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : "bg-slate-500/20 text-slate-400 border-slate-500/30";

  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {score}%
    </span>
  );
}

// ── Smart Search Panel ──────────────────────────────────────────────

function SmartSearchPanel({
  onResultsReady,
  isNearDemo,
}: {
  onResultsReady: (results: NEARMatchResult[]) => void;
  isNearDemo: boolean;
}) {
  const { search, isSearching, queryCount, error } = useNEAR();
  const [nlQuery, setNlQuery] = useState("");
  const [minChannels, setMinChannels] = useState("");
  const [maxChannels, setMaxChannels] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [taskType, setTaskType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [lastResults, setLastResults] = useState<NEARMatchResult[]>([]);

  const handleSearch = useCallback(async () => {
    if (!nlQuery.trim() && !taskType && !minChannels && !maxChannels) return;

    try {
      const res = await search({
        naturalLanguage: nlQuery,
        minChannels: minChannels ? parseInt(minChannels) : undefined,
        maxChannels: maxChannels ? parseInt(maxChannels) : undefined,
        minDuration: minDuration ? parseInt(minDuration) : undefined,
        maxDuration: maxDuration ? parseInt(maxDuration) : undefined,
        taskType: taskType || undefined,
      });
      setLastResults(res.results);
      onResultsReady(res.results);
    } catch {
      // Error state handled by hook
    }
  }, [nlQuery, minChannels, maxChannels, minDuration, maxDuration, taskType, search, onResultsReady]);

  const handleClear = useCallback(() => {
    setNlQuery("");
    setMinChannels("");
    setMaxChannels("");
    setMinDuration("");
    setMaxDuration("");
    setTaskType("");
    setLastResults([]);
    onResultsReady([]);
  }, [onResultsReady]);

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
          <h3 className="text-sm font-semibold text-violet-300">Smart Search</h3>
          <span className="text-[10px] text-violet-500 font-medium px-1.5 py-0.5 rounded bg-violet-500/10">
            NEAR AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          {queryCount > 0 && (
            <span className="text-[10px] text-slate-500">{queryCount} queries processed</span>
          )}
          {isNearDemo && (
            <span className="text-[10px] text-amber-400">demo</span>
          )}
        </div>
      </div>

      {/* Natural language input */}
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Describe the EEG data you need... (e.g., 'motor imagery with 64 channels')"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-200
                       placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20
                       transition-colors"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || (!nlQuery.trim() && !taskType)}
          className="px-5 py-2.5 rounded-lg bg-violet-500 text-white text-sm font-medium
                     hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Matching...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Match
            </>
          )}
        </button>
        {lastResults.length > 0 && (
          <button
            onClick={handleClear}
            className="px-3 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm
                       hover:border-slate-600 hover:text-slate-300 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filters toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="text-xs text-slate-500 hover:text-violet-400 transition-colors flex items-center gap-1 mb-2"
      >
        <svg className={`w-3 h-3 transition-transform ${showFilters ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        Structured Filters
      </button>

      {/* Structured filters */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-lg bg-slate-950 border border-slate-800">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Min Channels</label>
            <input
              type="number"
              value={minChannels}
              onChange={(e) => setMinChannels(e.target.value)}
              placeholder="e.g., 32"
              min="0"
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300
                         focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max Channels</label>
            <input
              type="number"
              value={maxChannels}
              onChange={(e) => setMaxChannels(e.target.value)}
              placeholder="e.g., 128"
              min="0"
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300
                         focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Min Duration (s)</label>
            <input
              type="number"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
              placeholder="e.g., 60"
              min="0"
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300
                         focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max Duration (s)</label>
            <input
              type="number"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
              placeholder="e.g., 300"
              min="0"
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300
                         focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Task Type</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300
                         focus:outline-none focus:border-violet-500/50 transition-colors"
            >
              <option value="">Any</option>
              <option value="baseline-eyes-open">Baseline (EO)</option>
              <option value="baseline-eyes-closed">Baseline (EC)</option>
              <option value="motor-execution-fist">Motor Exec (Fist)</option>
              <option value="motor-imagery-fist">Motor Imagery (Fist)</option>
              <option value="motor-execution-feet">Motor Exec (Feet)</option>
              <option value="motor-imagery-feet">Motor Imagery (Feet)</option>
            </select>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results summary */}
      {lastResults.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {lastResults.length} datasets ranked
          </span>
          <span className="text-[10px] text-slate-600">|</span>
          <span className="text-xs text-emerald-400">
            Top match: {lastResults[0].overallScore}% — {lastResults[0].explanation}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────

export default function ExplorePage() {
  const [datasets, setDatasets] = useState<DatasetEntry[]>([]);
  const [flowDatasets, setFlowDatasets] = useState<FlowDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [matchResults, setMatchResults] = useState<NEARMatchResult[]>([]);

  const { isReady: nearReady, isDemo: nearIsDemo } = useNEAR();

  const {
    wallet,
    connectWallet,
    disconnectWallet,
    listDatasets: listFlowDatasets,
    purchaseAccess,
    isReady: flowReady,
    isDemo: flowIsDemo,
    isLoading: flowLoading,
  } = useFlow();

  // Load datasets from both Storacha and Flow contract
  useEffect(() => {
    async function load() {
      try {
        // Try loading from Storacha API
        const res = await fetch("/api/storage/list");
        if (res.ok) {
          const { datasets: ds } = await res.json();
          if (ds && ds.length > 0) {
            setDatasets(ds);
          } else {
            setDatasets(DEMO_DATASETS);
            setIsDemo(true);
          }
        } else {
          setDatasets(DEMO_DATASETS);
          setIsDemo(true);
        }
      } catch {
        setDatasets(DEMO_DATASETS);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load on-chain datasets when Flow is ready
  useEffect(() => {
    if (!flowReady) return;
    listFlowDatasets().then(setFlowDatasets);
  }, [flowReady, listFlowDatasets]);

  // Merge: match flow datasets by dataCID
  const getFlowDataset = (dataCID: string): FlowDataset | undefined => {
    return flowDatasets.find((fd) => fd.dataCID === dataCID);
  };

  // Also show on-chain-only datasets not in Storacha
  const onChainOnly = flowDatasets.filter(
    (fd) => !datasets.some((d) => d.dataCID === fd.dataCID)
  );

  const allDatasets: DatasetEntry[] = [
    ...datasets,
    ...onChainOnly.map((fd): DatasetEntry => ({
      id: `flow-${fd.id}`,
      dataCID: fd.dataCID,
      metadataCID: fd.metadataCID,
      uploader: fd.contributor,
      timestamp: new Date(fd.registeredAt * 1000).toISOString(),
      channels: 0,
      duration: 0,
      task: "unknown",
      filename: `Dataset #${fd.id}`,
      accessType: fd.price > BigInt(0) ? "restricted" : "public",
    })),
  ];

  // Get match score for a dataset (if smart search was used)
  const getMatchScore = (dataCID: string): NEARMatchResult | undefined => {
    return matchResults.find((r) => r.dataCID === dataCID);
  };

  const handleSmartSearchResults = useCallback((results: NEARMatchResult[]) => {
    setMatchResults(results);
  }, []);

  // Filter + sort: if smart search results exist, sort by score
  const filtered = allDatasets
    .filter(
      (d) =>
        d.filename.toLowerCase().includes(search.toLowerCase()) ||
        d.task.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (matchResults.length === 0) return 0;
      const scoreA = getMatchScore(a.dataCID)?.overallScore ?? -1;
      const scoreB = getMatchScore(b.dataCID)?.overallScore ?? -1;
      return scoreB - scoreA;
    });

  const handlePurchaseAccess = useCallback(async (datasetId: number) => {
    setIsPurchasing(true);
    try {
      await purchaseAccess(datasetId);
      toast.success(`Access granted to Dataset #${datasetId}`);
    } catch {
      toast.error("Purchase failed — please try again");
    } finally {
      setIsPurchasing(false);
    }
  }, [purchaseAccess]);

  return (
    <main className="min-h-screen">
      <Navbar
        wallet={wallet}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isLoading={flowLoading}
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Explore Datasets</h1>
            <p className="text-slate-400 mt-1">
              Browse EEG datasets on Filecoin. Purchase access and view waveforms.
            </p>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="Search datasets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Smart Search Panel */}
        {nearReady && (
          <SmartSearchPanel
            onResultsReady={handleSmartSearchResults}
            isNearDemo={nearIsDemo}
          />
        )}

        {isDemo && flowIsDemo && (
          <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm text-amber-200 font-medium">Demo Mode</p>
              <p className="text-xs text-amber-300/70 mt-0.5">
                Showing sample datasets. Connect your wallet and configure credentials to see real data.
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-slate-700 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
            <h3 className="text-lg font-medium text-slate-400">No datasets found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {search ? "Try a different search term." : "Upload your first dataset to get started."}
            </p>
            {!search && (
              <Link href="/upload" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-medium transition-colors">
                Upload Dataset
              </Link>
            )}
          </div>
        )}

        {/* Dataset grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-4">
            {filtered.map((dataset) => {
              const taskInfo = TASK_LABELS[dataset.task] || {
                label: dataset.task,
                color: "bg-slate-500/20 text-slate-400",
              };
              const isEncrypted = dataset.accessType !== "public";
              const isExpanded = expandedId === dataset.id;
              const flowDs = getFlowDataset(dataset.dataCID);
              const matchScore = getMatchScore(dataset.dataCID);

              return (
                <div key={dataset.id}>
                  <div
                    className={`group rounded-xl border bg-slate-900/50 p-5 transition-colors ${
                      isExpanded
                        ? "border-cyan-500/40"
                        : matchScore && matchScore.overallScore >= 80
                          ? "border-violet-500/30 hover:border-violet-500/50"
                          : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Icon */}
                      <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-base font-semibold text-white truncate">
                            {dataset.filename}
                          </h3>
                          {matchScore && <ScoreBadge score={matchScore.overallScore} />}
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${taskInfo.color}`}>
                            {taskInfo.label}
                          </span>
                          {flowDs && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                              {formatFlowPrice(flowDs.price)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400 mb-2">
                          {dataset.channels > 0 && <span>{dataset.channels} channels</span>}
                          {dataset.duration > 0 && <span>{formatDuration(dataset.duration)}</span>}
                          <span className="font-mono text-slate-500">
                            {truncateCid(dataset.dataCID)}
                          </span>
                          {flowDs && (
                            <span className="text-slate-500 font-mono">
                              by {truncateAddress(flowDs.contributor)}
                            </span>
                          )}
                        </div>
                        <EncryptionStatus
                          accessType={dataset.accessType}
                          accessConditions={dataset.accessConditions}
                          isEncrypted={isEncrypted}
                          isDemo={isDemo}
                        />
                        {matchScore && (
                          <p className="text-[11px] text-violet-400/80 mt-1 italic">
                            {matchScore.explanation}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : dataset.id)
                          }
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            isExpanded
                              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                              : "border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400"
                          }`}
                        >
                          {isExpanded
                            ? "Close"
                            : flowDs && flowDs.price > BigInt(0)
                              ? "Purchase Access"
                              : isEncrypted
                                ? "Request Access"
                                : "View Data"}
                        </button>
                        <a
                          href={`https://w3s.link/ipfs/${dataset.metadataCID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-xs text-slate-400 hover:text-white transition-colors"
                        >
                          Metadata
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Expandable detail panel */}
                  {isExpanded && (
                    <DatasetDetail
                      dataset={dataset}
                      flowDataset={flowDs}
                      isDemo={isDemo}
                      onClose={() => setExpandedId(null)}
                      onPurchaseAccess={handlePurchaseAccess}
                      isPurchasing={isPurchasing}
                      walletConnected={wallet.isConnected}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Stats footer */}
        {!loading && filtered.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
            <span>{filtered.length} dataset{filtered.length !== 1 ? "s" : ""}</span>
            <span>
              {flowDatasets.length > 0 && `${flowDatasets.length} on-chain / `}
              {allDatasets.reduce((acc, d) => acc + d.channels, 0)} total channels
              {" / "}
              {formatDuration(allDatasets.reduce((acc, d) => acc + d.duration, 0))} total recording time
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
