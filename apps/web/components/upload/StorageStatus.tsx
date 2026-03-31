"use client";

import { useEffect, useState, useCallback } from "react";
import type { UploadProgress, StorageProof } from "@/types";
import {
  getGatewayUrl,
  getFilecoinExplorerUrl,
} from "@/lib/storacha";

// ── Types ──────────────────────────────────────────────────────────

interface StorageStatusProps {
  progress: UploadProgress;
  /** Callback to fetch storage proof for a CID */
  onFetchProof?: (cid: string) => Promise<StorageProof | null>;
}

// ── Helpers ────────────────────────────────────────────────────────

function truncateCid(cid: string, chars = 8): string {
  if (cid.length <= chars * 2 + 3) return cid;
  return `${cid.slice(0, chars)}...${cid.slice(-chars)}`;
}

const STAGE_LABELS: Record<string, string> = {
  idle: "Ready",
  encrypting: "Encrypting",
  preparing: "Preparing",
  "uploading-data": "Uploading Data",
  "uploading-metadata": "Uploading Metadata",
  registering: "Registering",
  complete: "Complete",
  error: "Error",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  queued: { label: "Queued for Filecoin", color: "text-nv-warning" },
  active: { label: "Active on Filecoin", color: "text-nv-success" },
  sealed: { label: "Sealed", color: "text-primary" },
  unknown: { label: "Checking...", color: "text-muted-foreground" },
};

// ── Component ──────────────────────────────────────────────────────

export default function StorageStatus({
  progress,
  onFetchProof,
}: StorageStatusProps) {
  const [proof, setProof] = useState<StorageProof | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  const fetchProof = useCallback(
    async (cid: string) => {
      if (!onFetchProof) return;
      setProofLoading(true);
      try {
        const p = await onFetchProof(cid);
        setProof(p);
      } finally {
        setProofLoading(false);
      }
    },
    [onFetchProof]
  );

  // Auto-fetch proof when upload completes
  useEffect(() => {
    if (progress.stage === "complete" && progress.result?.dataCID) {
      fetchProof(progress.result.dataCID);
    }
  }, [progress.stage, progress.result?.dataCID, fetchProof]);

  if (progress.stage === "idle") return null;

  const isActive =
    progress.stage !== "complete" &&
    progress.stage !== "error";

  return (
    <div className="rounded-xl border border-border bg-card p-5 w-full max-w-lg flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className={`w-3 h-3 rounded-full ${
            progress.stage === "error"
              ? "bg-destructive"
              : progress.stage === "complete"
                ? "bg-nv-success"
                : "bg-primary animate-pulse"
          }`}
        />
        <h3 className="text-sm font-semibold text-foreground">
          {STAGE_LABELS[progress.stage] ?? progress.stage}
        </h3>
      </div>

      {/* Progress bar */}
      {isActive && (
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      )}

      {/* Status message */}
      <p className="text-xs text-muted-foreground">{progress.message}</p>

      {/* Error display */}
      {progress.stage === "error" && progress.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
          <p className="text-xs text-destructive">{progress.error}</p>
        </div>
      )}

      {/* Upload result */}
      {progress.result && (
        <div className="flex flex-col gap-3 pt-1">
          {/* CIDs */}
          <div className="grid grid-cols-1 gap-2">
            <CidRow
              label="Data CID"
              cid={progress.result.dataCID}
            />
            <CidRow
              label="Metadata CID"
              cid={progress.result.metadataCID}
            />
          </div>

          {/* Upload info */}
          <div className="flex items-center justify-between text-[10px] text-[hsl(var(--nv-text-tertiary))] pt-1 border-t border-border">
            <span>Uploaded {new Date(progress.result.timestamp).toLocaleString()}</span>
            <span className="font-mono">{truncateCid(progress.result.uploader, 6)}</span>
          </div>

          {/* Filecoin proof section */}
          <div className="rounded-lg border border-border bg-background p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                Filecoin Storage Proof
              </span>
              {proofLoading && (
                <span className="text-[10px] text-[hsl(var(--nv-text-tertiary))] animate-pulse">
                  Checking...
                </span>
              )}
            </div>

            {proof ? (
              <div className="flex flex-col gap-1.5">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${
                      STATUS_LABELS[proof.status]?.color ?? "text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABELS[proof.status]?.label ?? proof.status}
                  </span>
                </div>

                {/* Deal details */}
                {proof.dealId && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    <div>
                      <span className="text-[hsl(var(--nv-text-tertiary))]">Deal ID: </span>
                      <a
                        href={getFilecoinExplorerUrl(proof.dealId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 underline underline-offset-2"
                      >
                        {proof.dealId}
                      </a>
                    </div>
                    {proof.miner && (
                      <div>
                        <span className="text-[hsl(var(--nv-text-tertiary))]">Miner: </span>
                        <span className="text-muted-foreground font-mono">
                          {proof.miner}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {proof.pieceCid && (
                  <div className="text-[10px] text-[hsl(var(--nv-text-tertiary))] font-mono truncate">
                    Piece: {proof.pieceCid}
                  </div>
                )}

                {!proof.dealId && proof.status === "queued" && (
                  <p className="text-[10px] text-[hsl(var(--nv-text-tertiary))]">
                    Data is stored on IPFS and queued for Filecoin deals.
                    Deals are typically made within 24-48 hours.
                  </p>
                )}
              </div>
            ) : (
              !proofLoading && (
                <p className="text-[10px] text-[hsl(var(--nv-text-tertiary))]">
                  Storage proof not yet available.
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CID Row sub-component ──────────────────────────────────────────

function CidRow({ label, cid }: { label: string; cid: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2">
      <span className="text-[10px] text-[hsl(var(--nv-text-tertiary))] w-20 flex-shrink-0">
        {label}
      </span>
      <a
        href={getGatewayUrl(cid)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:text-primary/80 font-mono truncate flex-1"
        title={cid}
      >
        {truncateCid(cid, 12)}
      </a>
      <button
        onClick={handleCopy}
        className="text-[10px] text-[hsl(var(--nv-text-tertiary))] hover:text-muted-foreground flex-shrink-0 transition-colors"
        title="Copy CID"
      >
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-nv-success">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
