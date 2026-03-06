"use client";

import { useState, useCallback } from "react";
import type { EvmCondition, AccessConditionItem } from "@/types";
import {
  buildWalletCondition,
  buildNFTCondition,
  buildTokenCondition,
  buildTimelockCondition,
  combineConditions,
} from "@/lib/lit";

// ── Types ─────────────────────────────────────────────────────────

type AccessType = "public" | "restricted" | "private";

type ConditionType = "wallet" | "nft" | "token" | "timelock";

interface ConditionEntry {
  id: string;
  type: ConditionType;
  wallet?: string;
  contractAddress?: string;
  chain?: string;
  minBalance?: string;
  unlockDate?: string;
}

interface AccessConditionBuilderProps {
  accessType: AccessType;
  onAccessChange: (type: AccessType) => void;
  onConditionsChange: (conditions: AccessConditionItem[]) => void;
  onNext: () => void;
  onBack: () => void;
  isDemo: boolean;
}

// ── Chain Options ─────────────────────────────────────────────────

const CHAINS = [
  { value: "ethereum", label: "Ethereum" },
  { value: "polygon", label: "Polygon" },
  { value: "arbitrum", label: "Arbitrum" },
  { value: "optimism", label: "Optimism" },
  { value: "base", label: "Base" },
];

const CONDITION_TYPES: { value: ConditionType; label: string; desc: string }[] = [
  { value: "wallet", label: "Wallet Address", desc: "Specific Ethereum address" },
  { value: "nft", label: "NFT Gate", desc: "Must hold an NFT from a collection" },
  { value: "token", label: "Token Gate", desc: "Must hold minimum token balance" },
  { value: "timelock", label: "Timelock", desc: "Unlock after a specific date" },
];

// ── Helpers ───────────────────────────────────────────────────────

function newConditionId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function conditionEntryToEvm(entry: ConditionEntry): EvmCondition | null {
  switch (entry.type) {
    case "wallet":
      if (!entry.wallet) return null;
      return buildWalletCondition(entry.wallet, entry.chain || "ethereum");
    case "nft":
      if (!entry.contractAddress) return null;
      return buildNFTCondition(entry.contractAddress, entry.chain || "ethereum");
    case "token":
      if (!entry.contractAddress || !entry.minBalance) return null;
      return buildTokenCondition(
        entry.contractAddress,
        entry.minBalance,
        entry.chain || "ethereum"
      );
    case "timelock": {
      if (!entry.unlockDate) return null;
      const ts = Math.floor(new Date(entry.unlockDate).getTime() / 1000);
      return buildTimelockCondition(ts);
    }
    default:
      return null;
  }
}

// ── Component ─────────────────────────────────────────────────────

export default function AccessConditionBuilder({
  accessType,
  onAccessChange,
  onConditionsChange,
  onNext,
  onBack,
  isDemo,
}: AccessConditionBuilderProps) {
  const [conditions, setConditions] = useState<ConditionEntry[]>([]);
  const [combinator, setCombinator] = useState<"and" | "or">("and");
  const [showPreview, setShowPreview] = useState(false);

  // Rebuild unified conditions whenever entries change
  const rebuildConditions = useCallback(
    (entries: ConditionEntry[], op: "and" | "or") => {
      const evmConditions = entries
        .map(conditionEntryToEvm)
        .filter((c): c is EvmCondition => c !== null);

      if (evmConditions.length === 0) {
        onConditionsChange([]);
        return;
      }

      const unified = combineConditions(evmConditions, op);
      onConditionsChange(unified);
    },
    [onConditionsChange]
  );

  const addCondition = useCallback(
    (type: ConditionType) => {
      const entry: ConditionEntry = {
        id: newConditionId(),
        type,
        chain: "ethereum",
      };
      const next = [...conditions, entry];
      setConditions(next);
      rebuildConditions(next, combinator);
    },
    [conditions, combinator, rebuildConditions]
  );

  const removeCondition = useCallback(
    (id: string) => {
      const next = conditions.filter((c) => c.id !== id);
      setConditions(next);
      rebuildConditions(next, combinator);
    },
    [conditions, combinator, rebuildConditions]
  );

  const updateCondition = useCallback(
    (id: string, patch: Partial<ConditionEntry>) => {
      const next = conditions.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      );
      setConditions(next);
      rebuildConditions(next, combinator);
    },
    [conditions, combinator, rebuildConditions]
  );

  const toggleCombinator = useCallback(() => {
    const next = combinator === "and" ? "or" : "and";
    setCombinator(next);
    rebuildConditions(conditions, next);
  }, [combinator, conditions, rebuildConditions]);

  // Build preview JSON
  const previewJson = (() => {
    const evmConditions = conditions
      .map(conditionEntryToEvm)
      .filter((c): c is EvmCondition => c !== null);
    if (evmConditions.length === 0) return "[]";
    const unified = combineConditions(evmConditions, combinator);
    return JSON.stringify(unified, null, 2);
  })();

  // ── Access type options ─────────────────────────────────────────

  const accessOptions: { value: AccessType; label: string; desc: string; icon: JSX.Element }[] = [
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
      desc: "Only researchers meeting access conditions",
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
        <h2 className="text-xl font-semibold text-slate-100">
          Access Conditions
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Control who can decrypt and access your data
        </p>
      </div>

      {/* Demo mode banner */}
      {isDemo && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 flex-shrink-0 mt-0.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <p className="text-xs text-amber-300">
            <span className="font-medium">Demo mode</span> — Lit Protocol is
            unavailable. Encryption will use a local Web Crypto fallback (not
            production-grade access control).
          </p>
        </div>
      )}

      {/* Access type selector */}
      <div className="grid gap-2">
        {accessOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onAccessChange(opt.value)}
            className={`
              flex items-center gap-3 p-4 rounded-xl border text-left
              transition-all duration-200
              ${
                accessType === opt.value
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
              <p
                className={`text-sm font-medium ${
                  accessType === opt.value
                    ? "text-slate-100"
                    : "text-slate-300"
                }`}
              >
                {opt.label}
              </p>
              <p className="text-xs text-slate-500">{opt.desc}</p>
            </div>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                accessType === opt.value
                  ? "border-cyan-400"
                  : "border-slate-700"
              }`}
            >
              {accessType === opt.value && (
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Restricted: Condition Builder */}
      {accessType === "restricted" && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Add condition buttons */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">
              Add Access Conditions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {CONDITION_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => addCondition(ct.value)}
                  className="flex flex-col gap-0.5 p-3 rounded-lg border border-slate-800 bg-slate-900
                             hover:border-slate-700 hover:bg-slate-800/60 transition-all text-left"
                >
                  <span className="text-xs font-medium text-slate-200">
                    {ct.label}
                  </span>
                  <span className="text-[10px] text-slate-500">{ct.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Combinator toggle */}
          {conditions.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-slate-500">Combine with:</span>
              <button
                onClick={toggleCombinator}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  combinator === "and"
                    ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                    : "bg-violet-500/15 text-violet-400 border border-violet-500/30"
                }`}
              >
                {combinator.toUpperCase()}
              </button>
            </div>
          )}

          {/* Condition cards */}
          {conditions.length > 0 && (
            <div className="flex flex-col gap-3">
              {conditions.map((cond, i) => (
                <div key={cond.id}>
                  {/* Operator badge between cards */}
                  {i > 0 && (
                    <div className="flex justify-center -my-1 relative z-10">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          combinator === "and"
                            ? "bg-cyan-500/15 text-cyan-400"
                            : "bg-violet-500/15 text-violet-400"
                        }`}
                      >
                        {combinator.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <ConditionCard
                    entry={cond}
                    onUpdate={(patch) => updateCondition(cond.id, patch)}
                    onRemove={() => removeCondition(cond.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* JSON Preview toggle */}
          {conditions.length > 0 && (
            <div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${showPreview ? "rotate-90" : ""}`}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                {showPreview ? "Hide" : "Show"} JSON preview
              </button>
              {showPreview && (
                <pre className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
                  {previewJson}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Encryption notice */}
      <div className="rounded-xl bg-violet-500/5 border border-violet-500/20 p-4 flex gap-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-violet-400 flex-shrink-0 mt-0.5"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <div>
          <p className="text-sm text-violet-300 font-medium">
            End-to-end encryption
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {accessType === "public"
              ? "Public datasets are uploaded without encryption for open access."
              : isDemo
                ? "Your data will be encrypted using AES-256 (demo mode). Connect to Lit Protocol for production-grade access control."
                : "Your data will be encrypted using Lit Protocol. Only users meeting your access conditions can decrypt it."}
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

// ── Condition Card ────────────────────────────────────────────────

function ConditionCard({
  entry,
  onUpdate,
  onRemove,
}: {
  entry: ConditionEntry;
  onUpdate: (patch: Partial<ConditionEntry>) => void;
  onRemove: () => void;
}) {
  const labels: Record<ConditionType, string> = {
    wallet: "Wallet Address",
    nft: "NFT Gate",
    token: "Token Gate",
    timelock: "Timelock",
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-300">
          {labels[entry.type]}
        </span>
        <button
          onClick={onRemove}
          className="text-slate-600 hover:text-red-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {/* Chain selector (for wallet, nft, token) */}
        {entry.type !== "timelock" && (
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">
              Chain
            </label>
            <select
              value={entry.chain || "ethereum"}
              onChange={(e) => onUpdate({ chain: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700
                         text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50
                         transition-colors"
            >
              {CHAINS.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Wallet address input */}
        {entry.type === "wallet" && (
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">
              Ethereum Address
            </label>
            <input
              type="text"
              value={entry.wallet || ""}
              onChange={(e) => onUpdate({ wallet: e.target.value })}
              placeholder="0x..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700
                         text-xs text-slate-200 placeholder:text-slate-600
                         focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
            />
          </div>
        )}

        {/* Contract address (for NFT and token) */}
        {(entry.type === "nft" || entry.type === "token") && (
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">
              Contract Address
            </label>
            <input
              type="text"
              value={entry.contractAddress || ""}
              onChange={(e) => onUpdate({ contractAddress: e.target.value })}
              placeholder="0x..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700
                         text-xs text-slate-200 placeholder:text-slate-600
                         focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
            />
          </div>
        )}

        {/* Min balance (for token) */}
        {entry.type === "token" && (
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">
              Minimum Balance (wei)
            </label>
            <input
              type="text"
              value={entry.minBalance || ""}
              onChange={(e) => onUpdate({ minBalance: e.target.value })}
              placeholder="1000000000000000000"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700
                         text-xs text-slate-200 placeholder:text-slate-600
                         focus:outline-none focus:border-cyan-500/50 transition-colors font-mono"
            />
          </div>
        )}

        {/* Unlock date (for timelock) */}
        {entry.type === "timelock" && (
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">
              Unlock Date & Time
            </label>
            <input
              type="datetime-local"
              value={entry.unlockDate || ""}
              onChange={(e) => onUpdate({ unlockDate: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700
                         text-xs text-slate-200
                         focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
}
