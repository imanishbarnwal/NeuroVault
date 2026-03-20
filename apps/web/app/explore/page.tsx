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

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  FileText,
  Lock,
  Unlock,
  Eye,
  ShoppingCart,
  Loader2,
  X,
  ExternalLink,
  Brain,
  Zap,
  ChevronRight,
} from "lucide-react";

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

const TASK_LABELS: Record<string, { label: string; category: string }> = {
  "baseline-eyes-open": { label: "Baseline (EO)", category: "Baseline" },
  "baseline-eyes-closed": { label: "Baseline (EC)", category: "Baseline" },
  "motor-execution-fist": { label: "Motor Exec", category: "Motor" },
  "motor-imagery-fist": { label: "Motor Imagery", category: "Motor" },
  "motor-execution-feet": { label: "Motor Exec (Feet)", category: "Motor" },
  "motor-imagery-feet": { label: "Motor Imagery (Feet)", category: "Motor" },
};

const FILTER_CHIPS = ["All", "Baseline", "Motor", "Cognitive"] as const;

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

// ── Purchase Step Indicator ──────────────────────────────────────────

function PurchaseStepItem({
  label,
  status,
}: {
  label: string;
  status: "pending" | "active" | "done";
}) {
  return (
    <div className="flex items-center gap-3">
      {status === "done" ? (
        <div className="w-5 h-5 rounded-full bg-nv-success/20 flex items-center justify-center">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-nv-success">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : status === "active" ? (
        <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center">
          <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700" />
      )}
      <span className={`text-xs ${
        status === "done" ? "text-nv-success" : status === "active" ? "text-indigo-300" : "text-slate-600"
      }`}>
        {status === "done" ? label.replace("...", "") : label}
      </span>
    </div>
  );
}

// ── Score Badge ──────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "bg-nv-success/20 text-nv-success border-nv-success/30"
      : score >= 50
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : "bg-slate-500/20 text-slate-400 border-slate-500/30";

  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {score}%
    </span>
  );
}

// ── Dataset Detail (rendered inside Sheet) ───────────────────────────

function DatasetDetail({
  dataset,
  flowDataset,
  isDemo,
  isFlowDemo,
  onPurchaseAccess,
  onConnectWallet,
  isPurchasing,
  walletConnected,
}: {
  dataset: DatasetEntry;
  flowDataset?: FlowDataset;
  isDemo: boolean;
  isFlowDemo: boolean;
  onPurchaseAccess: (datasetId: number) => Promise<void>;
  onConnectWallet: () => void;
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
  const [purchaseStep, setPurchaseStep] = useState<
    "idle" | "connecting" | "confirming" | "processing" | "done"
  >("idle");

  const isEncrypted = dataset.accessType !== "public";
  const isFree = flowDataset ? flowDataset.price === BigInt(0) : false;
  const needsPurchase = isEncrypted && !isFree && !purchased;
  const isDemoMode = isDemo || isFlowDemo;
  const purchaseInProgress = purchaseStep !== "idle" && purchaseStep !== "done";

  const handlePurchase = useCallback(async () => {
    if (flowDataset && !isDemoMode) {
      setPurchaseStep("processing");
      try {
        await onPurchaseAccess(flowDataset.id);
        setPurchaseStep("done");
        setPurchased(true);
      } catch {
        setPurchaseStep("idle");
      }
    } else {
      // Demo mode — simulate multi-step payment flow
      setPurchaseStep("connecting");
      await new Promise((r) => setTimeout(r, 1200));

      setPurchaseStep("confirming");
      await new Promise((r) => setTimeout(r, 1500));

      setPurchaseStep("processing");
      await new Promise((r) => setTimeout(r, 1800));

      setPurchaseStep("done");
      setPurchased(true);
    }
  }, [flowDataset, onPurchaseAccess, isDemoMode]);

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

  const taskInfo = TASK_LABELS[dataset.task] || { label: dataset.task, category: "Other" };

  return (
    <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-6">
      {/* Dataset summary header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
          <Brain className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-100 truncate">{dataset.filename}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary">{taskInfo.label}</Badge>
            {isEncrypted ? (
              <Lock className="w-3 h-3 text-amber-400" />
            ) : (
              <Unlock className="w-3 h-3 text-nv-success" />
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* On-chain info */}
      {flowDataset && (
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-4">
          <h5 className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            On-Chain Info
          </h5>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Price</span>
              <p className="text-nv-success font-medium">{formatFlowPrice(flowDataset.price)}</p>
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

      {/* Dataset metadata */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 p-4">
        <h5 className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          Dataset Info
        </h5>
        <div className="grid grid-cols-2 gap-3 text-xs">
          {dataset.channels > 0 && (
            <div>
              <span className="text-slate-500">Channels</span>
              <p className="text-slate-300 font-medium">{dataset.channels}</p>
            </div>
          )}
          {dataset.duration > 0 && (
            <div>
              <span className="text-slate-500">Duration</span>
              <p className="text-slate-300 font-medium">{formatDuration(dataset.duration)}</p>
            </div>
          )}
          <div>
            <span className="text-slate-500">Data CID</span>
            <p className="text-slate-400 font-mono text-[11px]">{truncateCid(dataset.dataCID, 8)}</p>
          </div>
          <div>
            <span className="text-slate-500">Uploaded</span>
            <p className="text-slate-300 font-medium">{new Date(dataset.timestamp).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Encryption status */}
      <div className="rounded-lg bg-slate-900 border border-slate-800 p-4">
        <EncryptionStatus
          accessType={dataset.accessType}
          accessConditions={dataset.accessConditions}
          isEncrypted={isEncrypted}
          isDemo={isDemo || litIsDemo}
        />
      </div>

      <Separator />

      {/* Waveform viewer or purchase/decrypt button */}
      {eegData ? (
        <>
          <div className="rounded-lg border border-slate-800 p-4">
            <h5 className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
              EEG Waveform
            </h5>
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
        <div className="flex flex-col items-center gap-3 py-4">
          {decryptError && (
            <div className="w-full rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400 font-medium mb-1">Access Denied</p>
              <p className="text-xs text-red-300/70">{decryptError}</p>
            </div>
          )}

          {/* Purchase access button (for encrypted/paid datasets) */}
          {needsPurchase && (
            <div className="w-full rounded-lg bg-indigo-500/5 border border-indigo-500/20 px-4 py-4">
              {/* Price & info header */}
              <div className="text-center mb-4">
                <p className="text-sm font-medium text-slate-200 mb-1">
                  Access License Required
                </p>
                <p className="text-xs text-slate-400">
                  {flowDataset
                    ? "Purchase a 30-day access license to decrypt this dataset."
                    : "This dataset requires access authorization to decrypt."}
                </p>
              </div>

              {/* Price card */}
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 mb-4">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Price</span>
                    <p className="text-nv-success font-semibold text-sm mt-0.5">
                      {flowDataset ? formatFlowPrice(flowDataset.price) : "0.05 FLOW"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Duration</span>
                    <p className="text-slate-300 font-medium mt-0.5">30 days</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Network</span>
                    <p className="text-slate-300 font-medium mt-0.5">Flow EVM</p>
                  </div>
                </div>
              </div>

              {/* World ID gate (real mode only) */}
              {!isDemoMode && !worldIDVerified && (
                <div className="mb-3 flex items-center justify-center gap-2">
                  <span className="text-xs text-amber-400">Verify your humanity first:</span>
                  <WorldIDButton compact />
                </div>
              )}

              {/* Wallet connection required */}
              {!walletConnected && !purchaseInProgress && (
                <div className="mb-4 rounded-lg bg-slate-950 border border-amber-500/20 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-300">Wallet Required</p>
                    <p className="text-xs text-slate-500 mt-0.5">Connect your wallet to purchase access</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={onConnectWallet}>
                    Connect Wallet
                  </Button>
                </div>
              )}

              {/* Purchase progress steps */}
              {purchaseInProgress && (
                <div className="mb-4 rounded-lg bg-slate-950 border border-indigo-500/20 p-4">
                  <div className="flex flex-col gap-3">
                    <PurchaseStepItem
                      label="Connecting wallet..."
                      status={purchaseStep === "connecting" ? "active" : purchaseStep === "confirming" || purchaseStep === "processing" ? "done" : "pending"}
                    />
                    <PurchaseStepItem
                      label="Confirming transaction..."
                      status={purchaseStep === "confirming" ? "active" : purchaseStep === "processing" ? "done" : "pending"}
                    />
                    <PurchaseStepItem
                      label="Processing payment on Flow..."
                      status={purchaseStep === "processing" ? "active" : "pending"}
                    />
                  </div>
                </div>
              )}

              {/* Purchase button */}
              <div className="text-center">
                <Button
                  onClick={handlePurchase}
                  disabled={purchaseInProgress || !walletConnected || (!isDemoMode && !worldIDVerified)}
                  className="mx-auto"
                >
                  {purchaseInProgress ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {purchaseStep === "connecting" && "Connecting wallet..."}
                      {purchaseStep === "confirming" && "Confirming transaction..."}
                      {purchaseStep === "processing" && "Processing payment..."}
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Purchase Access — {flowDataset ? formatFlowPrice(flowDataset.price) : "0.05 FLOW"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Decrypt / View button — only when access is granted */}
          {!needsPurchase && (
            <>
              <p className="text-sm text-slate-400 text-center">
                {isEncrypted
                  ? purchased ? "Access purchased! Decrypt to view waveform." : "Click below to view the waveform data."
                  : "Click below to load and view the waveform data."}
              </p>
              <Button
                onClick={handleDecrypt}
                disabled={decrypting}
              >
                {decrypting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isEncrypted ? "Decrypting..." : "Loading..."}
                  </>
                ) : (
                  <>
                    {isEncrypted ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {decryptError ? "Retry" : isEncrypted ? "Decrypt & View" : "Load & View"}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Metadata link */}
      <div className="pt-2">
        <a
          href={`https://w3s.link/ipfs/${dataset.metadataCID}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Metadata on IPFS
        </a>
      </div>
    </div>
  );
}

// ── Smart Search (integrated into search bar area) ───────────────────

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
    <div className="space-y-3">
      {/* AI search input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
          <Input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Describe the EEG data you need... (e.g., 'motor imagery with 64 channels')"
            className="pl-10 h-9 bg-slate-900 border-indigo-500/30 focus-visible:border-indigo-500/50 focus-visible:ring-indigo-500/20"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || (!nlQuery.trim() && !taskType)}
          size="default"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Matching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Match
            </>
          )}
        </Button>
        {lastResults.length > 0 && (
          <Button variant="outline" size="default" onClick={handleClear}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filters toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          <SlidersHorizontal className="w-3 h-3" />
          Structured Filters
          <ChevronRight className={`w-3 h-3 transition-transform ${showFilters ? "rotate-90" : ""}`} />
        </button>
        {queryCount > 0 && (
          <span className="text-[10px] text-slate-500">{queryCount} queries processed</span>
        )}
        {isNearDemo && (
          <Badge variant="secondary" className="text-[10px] h-4">demo</Badge>
        )}
      </div>

      {/* Structured filters */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Min Channels</label>
            <Input
              type="number"
              value={minChannels}
              onChange={(e) => setMinChannels(e.target.value)}
              placeholder="e.g., 32"
              min={0}
              className="h-7 text-xs bg-slate-950"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max Channels</label>
            <Input
              type="number"
              value={maxChannels}
              onChange={(e) => setMaxChannels(e.target.value)}
              placeholder="e.g., 128"
              min={0}
              className="h-7 text-xs bg-slate-950"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Min Duration (s)</label>
            <Input
              type="number"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
              placeholder="e.g., 60"
              min={0}
              className="h-7 text-xs bg-slate-950"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max Duration (s)</label>
            <Input
              type="number"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
              placeholder="e.g., 300"
              min={0}
              className="h-7 text-xs bg-slate-950"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Task Type</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full h-7 px-2 rounded-lg bg-slate-950 border border-input text-xs text-slate-300
                         focus:outline-none focus:border-ring transition-colors"
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
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results summary */}
      {lastResults.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {lastResults.length} datasets ranked
          </span>
          <Separator orientation="vertical" className="h-3" />
          <span className="text-xs text-nv-success">
            Top match: {lastResults[0].overallScore}% — {lastResults[0].explanation}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────

export default function ExplorePage() {
  const [datasets, setDatasets] = useState<DatasetEntry[]>([]);
  const [flowDatasets, setFlowDatasets] = useState<FlowDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDataset, setSelectedDataset] = useState<DatasetEntry | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [matchResults, setMatchResults] = useState<NEARMatchResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [aiSearchActive, setAiSearchActive] = useState(false);

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
    .filter((d) => {
      // Text search filter
      const matchesSearch =
        d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.task.toLowerCase().includes(searchQuery.toLowerCase());

      // Category chip filter
      if (activeFilter === "All") return matchesSearch;
      const taskInfo = TASK_LABELS[d.task];
      const category = taskInfo?.category || "Other";
      return matchesSearch && category === activeFilter;
    })
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

  const sheetOpen = selectedDataset !== null;

  return (
    <main className="min-h-screen">
      <Navbar
        wallet={wallet}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isLoading={flowLoading}
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header + Search */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Explore Datasets</h1>
              <p className="text-slate-400 mt-1">
                Browse EEG datasets on Filecoin. Purchase access and view waveforms.
              </p>
            </div>
            {/* Search bar with AI toggle */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder={aiSearchActive ? "Describe EEG data you need..." : "Search datasets..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 bg-slate-900"
                />
              </div>
              {nearReady && (
                <Button
                  variant={aiSearchActive ? "default" : "outline"}
                  size="icon"
                  onClick={() => setAiSearchActive(!aiSearchActive)}
                  title="Toggle AI-powered search"
                >
                  <Sparkles className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* AI Smart Search (expanded when active) */}
          {nearReady && aiSearchActive && (
            <SmartSearchPanel
              onResultsReady={handleSmartSearchResults}
              isNearDemo={nearIsDemo}
            />
          )}

          {/* Filter chips */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
            {FILTER_CHIPS.map((chip) => (
              <Button
                key={chip}
                variant={activeFilter === chip ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(chip)}
              >
                {chip}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-slate-900/50">
                <CardContent className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <Brain className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-400">No datasets found</h3>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery ? "Try a different search term." : "Upload your first dataset to get started."}
            </p>
            {!searchQuery && (
              <Link href="/upload">
                <Button className="mt-4">
                  Upload Dataset
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Dataset grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((dataset) => {
              const taskInfo = TASK_LABELS[dataset.task] || {
                label: dataset.task,
                category: "Other",
              };
              const isEncrypted = dataset.accessType !== "public";
              const flowDs = getFlowDataset(dataset.dataCID);
              const matchScore = getMatchScore(dataset.dataCID);

              return (
                <Card
                  key={dataset.id}
                  className={`bg-slate-900/50 cursor-pointer transition-all hover:ring-indigo-500/30 ${
                    matchScore && matchScore.overallScore >= 80
                      ? "ring-indigo-500/30"
                      : ""
                  } ${
                    selectedDataset?.id === dataset.id
                      ? "ring-2 ring-indigo-500/50"
                      : ""
                  }`}
                  onClick={() => setSelectedDataset(dataset)}
                >
                  <CardContent className="space-y-3">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <h3 className="text-sm font-semibold text-white truncate">
                          {dataset.filename}
                        </h3>
                      </div>
                      {isEncrypted ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-nv-success flex-shrink-0" />
                      )}
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{taskInfo.label}</Badge>
                      {matchScore && <ScoreBadge score={matchScore.overallScore} />}
                    </div>

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {dataset.channels > 0 && <span>{dataset.channels} ch</span>}
                      {dataset.duration > 0 && <span>{formatDuration(dataset.duration)}</span>}
                      {flowDs && (
                        <span className="text-nv-success font-medium">
                          {formatFlowPrice(flowDs.price)}
                        </span>
                      )}
                    </div>

                    {/* Match explanation */}
                    {matchScore && (
                      <p className="text-[11px] text-indigo-400/80 italic line-clamp-2">
                        {matchScore.explanation}
                      </p>
                    )}

                    {/* Action */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDataset(dataset);
                      }}
                    >
                      {isEncrypted ? (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Purchase Access
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          View Data
                        </>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
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

      {/* Dataset Detail Sheet (slide-over from right) */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedDataset(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-slate-950 border-slate-800">
          {selectedDataset && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{selectedDataset.filename}</SheetTitle>
                <SheetDescription>
                  Dataset detail — view on-chain info, encryption status, and waveform data.
                </SheetDescription>
              </SheetHeader>
              <DatasetDetail
                dataset={selectedDataset}
                flowDataset={getFlowDataset(selectedDataset.dataCID)}
                isDemo={isDemo}
                isFlowDemo={flowIsDemo}
                onPurchaseAccess={handlePurchaseAccess}
                onConnectWallet={connectWallet}
                isPurchasing={isPurchasing}
                walletConnected={wallet.isConnected}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
}
