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
  /** Access type: public, restricted, or private */
  accessType?: "public" | "restricted" | "private";
  /** Access control conditions (for restricted/private datasets) */
  accessConditions?: AccessConditionItem[];
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
    | "encrypting"
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

// ── Lit Protocol / Encryption ─────────────────────────────────────

/** A single EVM-based access control condition for Lit Protocol */
export interface EvmCondition {
  contractAddress: string;
  standardContractType: string;
  chain: string;
  method: string;
  parameters: string[];
  returnValueTest: {
    comparator: string;
    value: string;
  };
}

/** Boolean operator between conditions */
export interface ConditionOperator {
  operator: "and" | "or";
}

/** Access condition array element (condition or boolean operator) */
export type AccessConditionItem = EvmCondition | ConditionOperator;

/** Encrypted data envelope stored on Storacha */
export interface EncryptedEnvelope {
  /** Base64-encoded encrypted ciphertext */
  ciphertext: string;
  /** Hash of the original data (used by Lit for decryption) */
  dataToEncryptHash: string;
  /** Access control conditions required for decryption */
  accessConditions: AccessConditionItem[];
  /** ISO timestamp when encryption was performed */
  encryptedAt: string;
  /** Lit network used (e.g. "datil-dev") */
  litNetwork: string;
  /** Whether this was encrypted in demo mode (Web Crypto fallback) */
  isDemo?: boolean;
}

/** Configuration for Lit Protocol client */
export interface LitConfig {
  network: string;
  debug: boolean;
}

// ── Flow Blockchain / On-Chain Registry ───────────────────────────

/** On-chain dataset entry from the NeuroVaultRegistry contract */
export interface FlowDataset {
  id: number;
  contributor: string;
  dataCID: string;
  metadataCID: string;
  price: bigint;
  registeredAt: number;
  active: boolean;
}

/** On-chain access license for a dataset */
export interface FlowLicense {
  licensee: string;
  datasetId: number;
  purchasedAt: number;
  expiresAt: number;
}

/** Contributor statistics from on-chain data */
export interface FlowContributorStats {
  totalEarnings: bigint;
  datasetIds: number[];
  datasetCount: number;
}

/** Wallet connection state for Flow EVM */
export interface FlowWalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
}

// Re-export eeg-utils types for convenience
export type { DatasetMetadata };
