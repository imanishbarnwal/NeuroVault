/**
 * Lit Protocol client-side encryption/decryption for EEG data.
 *
 * This module is CLIENT-SIDE — it runs in the browser.
 * Uses Lit Protocol v6+ Unified Access Control Conditions for
 * programmable encryption with EVM-based access gates.
 *
 * Dual-mode:
 *   - Real mode: Uses Lit Protocol datil-dev network
 *   - Demo mode: Falls back to Web Crypto AES-GCM when Lit is unavailable
 */

import type {
  EncryptedEnvelope,
  AccessConditionItem,
  EvmCondition,
} from "@/types";

// ── Constants ─────────────────────────────────────────────────────

const LIT_NETWORK = "datil-dev";
const LIT_CONNECT_TIMEOUT_MS = 10_000;

// ── Singleton Client ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _litClient: any = null;
let _litInitPromise: Promise<unknown> | null = null;
let _isDemo = false;

/**
 * Get or create a LitNodeClient singleton.
 * Falls back to demo mode if the network is unreachable.
 */
export async function getLitClient(): Promise<{ client: unknown; isDemo: boolean }> {
  if (_litClient) return { client: _litClient, isDemo: _isDemo };
  if (_litInitPromise) {
    await _litInitPromise;
    return { client: _litClient, isDemo: _isDemo };
  }

  _litInitPromise = (async () => {
    try {
      const { LitNodeClient } = await import("@lit-protocol/lit-node-client");

      const client = new LitNodeClient({
        litNetwork: "datil-dev" as const,
        debug: false,
      });

      await client.connect();
      _litClient = client;
      _isDemo = false;
    } catch (err) {
      console.warn(
        "Lit Protocol connection failed — using demo mode (Web Crypto fallback):",
        err instanceof Error ? err.message : err
      );
      _litClient = null;
      _isDemo = true;
    }
  })();

  await _litInitPromise;
  return { client: _litClient, isDemo: _isDemo };
}

/**
 * Disconnect and reset the Lit client singleton.
 */
export async function disconnectLit(): Promise<void> {
  if (_litClient && typeof _litClient.disconnect === "function") {
    await _litClient.disconnect();
  }
  _litClient = null;
  _litInitPromise = null;
  _isDemo = false;
}

// ── Access Condition Builders ─────────────────────────────────────

/**
 * Build an access condition that requires a specific wallet address.
 */
export function buildWalletCondition(
  address: string,
  chain = "ethereum"
): EvmCondition {
  return {
    contractAddress: "",
    standardContractType: "",
    chain,
    method: "",
    parameters: [":userAddress"],
    returnValueTest: {
      comparator: "=",
      value: address.toLowerCase(),
    },
  };
}

/**
 * Build an access condition that requires ownership of an NFT (ERC-721).
 */
export function buildNFTCondition(
  contractAddress: string,
  chain = "ethereum"
): EvmCondition {
  return {
    contractAddress,
    standardContractType: "ERC721",
    chain,
    method: "balanceOf",
    parameters: [":userAddress"],
    returnValueTest: {
      comparator: ">",
      value: "0",
    },
  };
}

/**
 * Build an access condition that requires a minimum ERC-20 token balance.
 */
export function buildTokenCondition(
  contractAddress: string,
  minBalance: string,
  chain = "ethereum"
): EvmCondition {
  return {
    contractAddress,
    standardContractType: "ERC20",
    chain,
    method: "balanceOf",
    parameters: [":userAddress"],
    returnValueTest: {
      comparator: ">=",
      value: minBalance,
    },
  };
}

/**
 * Build a timelock condition that unlocks after a specific timestamp.
 */
export function buildTimelockCondition(
  unlockTimestamp: number
): EvmCondition {
  return {
    contractAddress: "",
    standardContractType: "timestamp",
    chain: "ethereum",
    method: "eth_getBlockByNumber",
    parameters: ["latest"],
    returnValueTest: {
      comparator: ">=",
      value: unlockTimestamp.toString(),
    },
  };
}

/**
 * Combine multiple conditions with AND/OR boolean operators.
 * Inserts the operator between each condition.
 */
export function combineConditions(
  conditions: EvmCondition[],
  operator: "and" | "or" = "and"
): AccessConditionItem[] {
  if (conditions.length === 0) return [];
  if (conditions.length === 1) return [conditions[0]];

  const result: AccessConditionItem[] = [];
  conditions.forEach((cond, i) => {
    if (i > 0) {
      result.push({ operator });
    }
    result.push(cond);
  });
  return result;
}

// ── Demo Mode Fallback (Web Crypto AES-GCM) ──────────────────────

/** Convert a Uint8Array to a fresh ArrayBuffer (avoids SharedArrayBuffer type issues) */
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(arr.byteLength);
  new Uint8Array(buf).set(arr);
  return buf;
}

async function demoEncrypt(data: Uint8Array): Promise<{
  ciphertext: string;
  dataToEncryptHash: string;
}> {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    toArrayBuffer(data)
  );

  // Export key for demo storage (in production this would be Lit-managed)
  const exportedKey = await crypto.subtle.exportKey("raw", key);

  // Hash the original data
  const hashBuffer = await crypto.subtle.digest("SHA-256", toArrayBuffer(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const dataToEncryptHash = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Combine iv + key + ciphertext into a single blob for demo mode
  const combined = new Uint8Array(
    iv.byteLength + exportedKey.byteLength + encrypted.byteLength
  );
  combined.set(iv, 0);
  combined.set(new Uint8Array(exportedKey), iv.byteLength);
  combined.set(new Uint8Array(encrypted), iv.byteLength + exportedKey.byteLength);

  const ciphertext = btoa(String.fromCharCode(...combined));

  return { ciphertext, dataToEncryptHash };
}

async function demoDecrypt(ciphertext: string): Promise<Uint8Array> {
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const keyBytes = combined.slice(12, 44); // 32 bytes for AES-256
  const encrypted = combined.slice(44);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyBytes),
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    toArrayBuffer(encrypted)
  );

  return new Uint8Array(decrypted);
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────

/**
 * Encrypt EEG data using Lit Protocol (or demo fallback).
 *
 * @param data - Raw EEG data as Uint8Array
 * @param accessConditions - Unified access control conditions
 * @returns Encrypted envelope ready for storage
 */
export async function encryptEEGData(
  data: Uint8Array,
  accessConditions: AccessConditionItem[]
): Promise<EncryptedEnvelope> {
  const { client, isDemo } = await getLitClient();

  if (!isDemo && client) {
    // Real Lit Protocol encryption
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const litClient = client as any;

    // Add conditionType to each condition for Lit's unified format
    const unifiedConditions = accessConditions.map((item) => {
      if ("operator" in item) return item;
      return { ...item, conditionType: "evmBasic" };
    });

    const { ciphertext, dataToEncryptHash } = await litClient.encrypt({
      dataToEncrypt: data,
      unifiedAccessControlConditions: unifiedConditions,
    });

    return {
      ciphertext,
      dataToEncryptHash,
      accessConditions,
      encryptedAt: new Date().toISOString(),
      litNetwork: LIT_NETWORK,
    };
  }

  // Demo mode fallback
  const { ciphertext, dataToEncryptHash } = await demoEncrypt(data);

  return {
    ciphertext,
    dataToEncryptHash,
    accessConditions,
    encryptedAt: new Date().toISOString(),
    litNetwork: "demo",
    isDemo: true,
  };
}

/**
 * Decrypt EEG data using Lit Protocol (or demo fallback).
 *
 * @param envelope - The encrypted envelope from storage
 * @param sessionSigs - Lit session signatures (required for real mode)
 * @returns Decrypted EEG data
 */
export async function decryptEEGData(
  envelope: EncryptedEnvelope,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessionSigs?: any
): Promise<Uint8Array> {
  if (envelope.isDemo || envelope.litNetwork === "demo") {
    return demoDecrypt(envelope.ciphertext);
  }

  const { client, isDemo } = await getLitClient();

  if (isDemo || !client) {
    throw new Error(
      "Cannot decrypt Lit-encrypted data in demo mode. " +
        "Connect to the Lit network to decrypt."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const litClient = client as any;

  const unifiedConditions = envelope.accessConditions.map((item) => {
    if ("operator" in item) return item;
    return { ...item, conditionType: "evmBasic" };
  });

  const { decryptedData } = await litClient.decrypt({
    ciphertext: envelope.ciphertext,
    dataToEncryptHash: envelope.dataToEncryptHash,
    chain: "ethereum",
    unifiedAccessControlConditions: unifiedConditions,
    sessionSigs,
  });

  return decryptedData;
}
