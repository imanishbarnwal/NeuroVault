import type { DatasetMetadata } from "@neurovault/eeg-utils";

// ── Storacha / Storage ─────────────────────────────────────────────

/** Result of uploading an encrypted EEG dataset */
export interface UploadResult {
  /** CID of the encrypted EEG data blob */
  dataCID: string;
  /** CID of the metadata JSON */
  metadataCID: string;
  /** Upload timestamp (ISO string) */
  timestamp: string;
  /** Uploader identifier (agent DID or wallet address) */
  uploader: string;
}

/** An entry in the on-chain dataset registry */
export interface DatasetEntry {
  /** Unique dataset ID (from metadata) */
  id: string;
  /** CID of the encrypted EEG data */
  dataCID: string;
  /** CID of the metadata JSON */
  metadataCID: string;
  /** Uploader identifier */
  uploader: string;
  /** Upload timestamp (ISO string) */
  timestamp: string;
  /** Number of EEG channels */
  channels: number;
  /** Recording duration in seconds */
  duration: number;
  /** Task type (e.g. "motor-imagery-fist") */
  task: string;
  /** Original filename */
  filename: string;
}

/** Filecoin storage proof for verifying data persistence */
export interface StorageProof {
  /** The CID being proven */
  cid: string;
  /** Filecoin deal ID (if available) */
  dealId: number | null;
  /** Storage provider / miner ID (e.g. "f01234") */
  miner: string | null;
  /** Deal start epoch on Filecoin */
  startEpoch: number | null;
  /** Deal expiry epoch on Filecoin */
  expiry: number | null;
  /** Current status */
  status: "queued" | "active" | "sealed" | "unknown";
  /** Piece CID (used for Filecoin proofs) */
  pieceCid: string | null;
}

/** Upload progress state for the UI */
export interface UploadProgress {
  stage:
    | "idle"
    | "preparing"
    | "uploading-data"
    | "uploading-metadata"
    | "registering"
    | "complete"
    | "error";
  /** 0-100 progress percentage */
  percent: number;
  /** Human-readable status message */
  message: string;
  /** Result after completion */
  result?: UploadResult;
  /** Error message if stage === "error" */
  error?: string;
}

/** Dataset registry stored as JSON on Storacha */
export interface DatasetRegistry {
  version: number;
  entries: DatasetEntry[];
}

// Re-export eeg-utils types for convenience
export type { DatasetMetadata };
