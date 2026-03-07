/**
 * NEAR Protocol integration for NeuroVault AI-powered dataset matching.
 *
 * Dual-mode:
 *   - Real mode: Reads/writes to a DatasetMatcher contract on NEAR testnet
 *   - Demo mode: Uses local /api/match endpoint only (no on-chain state)
 */

import type {
  NEARMatchQuery,
  NEARMatchResult,
  NEARStoredMatch,
  MatchResponse,
} from "@/types";

// ── Constants ─────────────────────────────────────────────────────

const NEAR_NETWORK_ID =
  process.env.NEXT_PUBLIC_NEAR_NETWORK_ID || "testnet";
const NEAR_NODE_URL =
  process.env.NEXT_PUBLIC_NEAR_NODE_URL || "https://rpc.testnet.near.org";
const NEAR_CONTRACT_ID =
  process.env.NEXT_PUBLIC_NEAR_CONTRACT_ID || "";

// ── Singleton State ───────────────────────────────────────────────

let _isDemo = false;
let _initPromise: Promise<void> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _nearConnection: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _account: any = null;

// ── Demo State ──────────────────────────────────────────────────

let _demoQueryCounter = 0;
const _demoQueries: Map<string, NEARMatchQuery> = new Map();
const _demoMatches: Map<string, NEARStoredMatch> = new Map();
const _demoRecentIds: string[] = [];

// ── Initialization ──────────────────────────────────────────────

/**
 * Initialize NEAR connection. Falls back to demo mode if
 * contract ID is unset or the connection fails.
 */
export async function initNear(): Promise<{ isDemo: boolean }> {
  if (_initPromise) {
    await _initPromise;
    return { isDemo: _isDemo };
  }

  _initPromise = (async () => {
    if (!NEAR_CONTRACT_ID) {
      console.warn(
        "NEXT_PUBLIC_NEAR_CONTRACT_ID not set — using demo mode"
      );
      _isDemo = true;
      return;
    }

    try {
      // Dynamic import to avoid SSR issues
      const nearAPI = await import("near-api-js");
      const { connect, keyStores } = nearAPI;

      const keyStore =
        typeof window !== "undefined"
          ? new keyStores.BrowserLocalStorageKeyStore()
          : new keyStores.InMemoryKeyStore();

      const config = {
        networkId: NEAR_NETWORK_ID,
        keyStore,
        nodeUrl: NEAR_NODE_URL,
        headers: {},
      };

      _nearConnection = await connect(config);

      // Smoke test: try to query the contract
      _account = await _nearConnection.account(NEAR_CONTRACT_ID);
      await _account.viewFunction({
        contractId: NEAR_CONTRACT_ID,
        methodName: "get_query_count",
        args: {},
      });

      _isDemo = false;
    } catch (err) {
      console.warn(
        "NEAR contract unreachable — using demo mode:",
        err instanceof Error ? err.message : err
      );
      _isDemo = true;
    }
  })();

  await _initPromise;
  return { isDemo: _isDemo };
}

/** Check if currently in demo mode */
export function isNearDemo(): boolean {
  return _isDemo;
}

/** Get the configured contract ID */
export function getNearContractId(): string {
  return NEAR_CONTRACT_ID;
}

/** Get the NEAR explorer URL for a transaction */
export function getNearExplorerTxUrl(txHash: string): string {
  const base =
    NEAR_NETWORK_ID === "mainnet"
      ? "https://nearblocks.io"
      : "https://testnet.nearblocks.io";
  return `${base}/txns/${txHash}`;
}

// ── AI Matching (local engine) ──────────────────────────────────

/**
 * Run the AI matching engine against available datasets.
 * This always works (real or demo mode) since it uses the local API.
 */
export async function runMatch(query: {
  naturalLanguage: string;
  minChannels?: number;
  maxChannels?: number;
  minDuration?: number;
  maxDuration?: number;
  taskType?: string;
}): Promise<MatchResponse> {
  const res = await fetch("/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Match request failed" }));
    throw new Error(err.error || "Match request failed");
  }

  return res.json();
}

// ── On-Chain Operations ─────────────────────────────────────────

/**
 * Submit a query to the NEAR contract.
 * In demo mode, stores locally.
 */
export async function submitQuery(query: {
  naturalLanguage: string;
  minChannels?: number;
  maxChannels?: number;
  minDuration?: number;
  maxDuration?: number;
  taskType?: string;
}): Promise<string> {
  if (_isDemo) {
    return _demoSubmitQuery(query);
  }

  const result = await _account.functionCall({
    contractId: NEAR_CONTRACT_ID,
    methodName: "submit_query",
    args: {
      naturalLanguage: query.naturalLanguage || "",
      minChannels: query.minChannels || 0,
      maxChannels: query.maxChannels || 0,
      minDuration: query.minDuration || 0,
      maxDuration: query.maxDuration || 0,
      taskType: query.taskType || "",
    },
    gas: BigInt("30000000000000"), // 30 TGas
  });

  // Parse return value from transaction
  const returnValue = Buffer.from(
    result.status.SuccessValue,
    "base64"
  ).toString();
  return JSON.parse(returnValue) as string;
}

/**
 * Store match results on the NEAR contract.
 * In demo mode, stores locally.
 */
export async function storeMatchResults(
  queryId: string,
  results: NEARMatchResult[]
): Promise<void> {
  if (_isDemo) {
    _demoStoreResults(queryId, results);
    return;
  }

  await _account.functionCall({
    contractId: NEAR_CONTRACT_ID,
    methodName: "store_match_results",
    args: { queryId, results },
    gas: BigInt("30000000000000"),
  });
}

/**
 * Get match results from the NEAR contract.
 */
export async function getMatches(
  queryId: string
): Promise<NEARStoredMatch | null> {
  if (_isDemo) {
    return _demoMatches.get(queryId) || null;
  }

  return _account.viewFunction({
    contractId: NEAR_CONTRACT_ID,
    methodName: "get_matches",
    args: { queryId },
  });
}

/**
 * Get recent queries from the NEAR contract.
 */
export async function getRecentQueries(
  limit = 10
): Promise<NEARMatchQuery[]> {
  if (_isDemo) {
    return _demoRecentIds
      .slice(-limit)
      .reverse()
      .map((id) => _demoQueries.get(id)!)
      .filter(Boolean);
  }

  return _account.viewFunction({
    contractId: NEAR_CONTRACT_ID,
    methodName: "get_recent_queries",
    args: { limit },
  });
}

/**
 * Get total query count.
 */
export async function getQueryCount(): Promise<number> {
  if (_isDemo) {
    return _demoQueryCounter;
  }

  return _account.viewFunction({
    contractId: NEAR_CONTRACT_ID,
    methodName: "get_query_count",
    args: {},
  });
}

// ── Demo Mode Implementations ───────────────────────────────────

function _demoSubmitQuery(query: {
  naturalLanguage: string;
  minChannels?: number;
  maxChannels?: number;
  minDuration?: number;
  maxDuration?: number;
  taskType?: string;
}): string {
  const queryId = `q-${_demoQueryCounter++}`;

  const stored: NEARMatchQuery = {
    queryId,
    caller: "demo.testnet",
    naturalLanguage: query.naturalLanguage || "",
    minChannels: query.minChannels || 0,
    maxChannels: query.maxChannels || 0,
    minDuration: query.minDuration || 0,
    maxDuration: query.maxDuration || 0,
    taskType: query.taskType || "",
    submittedAt: Date.now() * 1_000_000, // Nanoseconds like NEAR
  };

  _demoQueries.set(queryId, stored);
  _demoRecentIds.push(queryId);
  if (_demoRecentIds.length > 50) _demoRecentIds.shift();

  return queryId;
}

function _demoStoreResults(
  queryId: string,
  results: NEARMatchResult[]
): void {
  _demoMatches.set(queryId, {
    queryId,
    results,
    processedAt: Date.now() * 1_000_000,
  });
}
