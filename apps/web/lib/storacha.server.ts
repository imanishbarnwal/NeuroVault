/**
 * Storacha / Filecoin server-side operations.
 *
 * This module is SERVER-ONLY — it imports @storacha/client which requires
 * Node.js APIs. Never import this from client components or pages.
 * Client code should call through /api/storage/ routes instead.
 *
 * Handles:
 *   1. Client initialization with UCAN auth (Ed25519 agent keys + delegation proofs)
 *   2. Uploading encrypted EEG data + metadata → CIDs
 *   3. Dataset registry management (JSON on Storacha)
 *   4. Filecoin storage proof queries
 */

import "server-only";
import * as Client from "@storacha/client";
import { StoreMemory } from "@storacha/client/stores/memory";
import * as Proof from "@storacha/client/proof";
import { Signer } from "@storacha/client/principal/ed25519";
import type { Client as StorachaClient } from "@storacha/client";
import type { DatasetMetadata } from "@neurovault/eeg-utils";
import type {
  UploadResult,
  DatasetEntry,
  DatasetRegistry,
  StorageProof,
  AccessConditionItem,
} from "@/types";
import { getGatewayUrl } from "./storacha";

// ── Singleton client ───────────────────────────────────────────────

const REGISTRY_FILENAME = "neurovault-registry.json";

let _client: StorachaClient | null = null;
let _initPromise: Promise<StorachaClient> | null = null;

/**
 * Get or create a Storacha client singleton.
 *
 * Requires environment variables:
 *   - STORACHA_PRIVATE_KEY: Ed25519 agent private key (from `storacha key create`)
 *   - STORACHA_PROOF: Base64-encoded UCAN delegation proof
 *
 * The proof must delegate at least:
 *   space/blob/add, space/index/add, filecoin/offer, upload/add, upload/list
 */
export async function getClient(): Promise<StorachaClient> {
  if (_client) return _client;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const privateKey = process.env.STORACHA_PRIVATE_KEY;
    const proofStr = process.env.STORACHA_PROOF;

    if (!privateKey || !proofStr) {
      throw new Error(
        "Missing STORACHA_PRIVATE_KEY or STORACHA_PROOF environment variables. " +
          "See README for setup instructions."
      );
    }

    const principal = Signer.parse(privateKey);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });

    const proof = await Proof.parse(proofStr);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());

    _client = client;
    return client;
  })();

  return _initPromise;
}

/**
 * Reset the client singleton (for testing or reconnection).
 */
export function resetClient(): void {
  _client = null;
  _initPromise = null;
}

// ── Upload Pipeline ────────────────────────────────────────────────

/**
 * Upload encrypted EEG data and its metadata to Storacha.
 *
 * @param encryptedData - Already-encrypted EEG data (from Lit Protocol layer)
 * @param metadata - EEG dataset metadata
 * @returns Upload result with both CIDs
 */
export async function uploadEncryptedEEG(
  encryptedData: Uint8Array,
  metadata: DatasetMetadata,
  accessType?: string,
  accessConditions?: AccessConditionItem[]
): Promise<UploadResult> {
  const client = await getClient();

  // Upload encrypted data blob
  const dataBlob = new Blob([encryptedData as BlobPart], {
    type: "application/octet-stream",
  });
  const dataFile = new File([dataBlob], `${metadata.id}.enc`, {
    type: "application/octet-stream",
  });
  const dataCID = await client.uploadFile(dataFile);

  // Upload metadata JSON (include access info if provided)
  const metadataWithAccess = {
    ...metadata,
    ...(accessType ? { accessType } : {}),
    ...(accessConditions && accessConditions.length > 0
      ? { accessConditions }
      : {}),
  };
  const metadataJson = JSON.stringify(metadataWithAccess, null, 2);
  const metadataBlob = new Blob([metadataJson], {
    type: "application/json",
  });
  const metadataFile = new File([metadataBlob], `${metadata.id}.meta.json`, {
    type: "application/json",
  });
  const metadataCID = await client.uploadFile(metadataFile);

  const result: UploadResult = {
    dataCID: dataCID.toString(),
    metadataCID: metadataCID.toString(),
    timestamp: new Date().toISOString(),
    uploader: client.agent.did(),
  };

  // Register in the dataset registry
  await addToRegistry(client, metadata, result, accessType, accessConditions);

  return result;
}

// ── Dataset Registry ───────────────────────────────────────────────

/** CID of the current registry file (updated on each write) */
let _registryCid: string | null = null;

/**
 * Load the dataset registry from Storacha.
 */
export async function loadRegistry(): Promise<DatasetRegistry> {
  if (_registryCid) {
    try {
      const url = getGatewayUrl(_registryCid);
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as DatasetRegistry;
      }
    } catch {
      // Fall through
    }
  }

  const envCid = process.env.STORACHA_REGISTRY_CID;
  if (envCid) {
    try {
      const url = getGatewayUrl(envCid);
      const res = await fetch(url);
      if (res.ok) {
        _registryCid = envCid;
        return (await res.json()) as DatasetRegistry;
      }
    } catch {
      // Fall through
    }
  }

  return { version: 1, entries: [] };
}

/**
 * Save the dataset registry back to Storacha.
 */
async function saveRegistry(
  client: StorachaClient,
  registry: DatasetRegistry
): Promise<string> {
  const json = JSON.stringify(registry, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const file = new File([blob], REGISTRY_FILENAME, {
    type: "application/json",
  });
  const cid = await client.uploadFile(file);
  _registryCid = cid.toString();
  return _registryCid;
}

/**
 * Add a dataset to the registry after upload.
 */
async function addToRegistry(
  client: StorachaClient,
  metadata: DatasetMetadata,
  upload: UploadResult,
  accessType?: string,
  accessConditions?: AccessConditionItem[]
): Promise<void> {
  const registry = await loadRegistry();

  const entry: DatasetEntry = {
    id: metadata.id,
    dataCID: upload.dataCID,
    metadataCID: upload.metadataCID,
    uploader: upload.uploader,
    timestamp: upload.timestamp,
    channels: metadata.channels,
    duration: metadata.duration,
    task: metadata.task,
    filename: metadata.filename,
    ...(accessType
      ? { accessType: accessType as "public" | "restricted" | "private" }
      : {}),
    ...(accessConditions && accessConditions.length > 0
      ? { accessConditions }
      : {}),
  };

  registry.entries = registry.entries.filter((e) => e.id !== metadata.id);
  registry.entries.push(entry);

  await saveRegistry(client, registry);
}

/**
 * List all datasets in the registry.
 */
export async function listDatasets(): Promise<DatasetEntry[]> {
  const registry = await loadRegistry();
  return registry.entries;
}

// ── Storage Proofs ─────────────────────────────────────────────────

/**
 * Query Filecoin storage deal status for uploaded content.
 */
export async function getStorageProof(cid: string): Promise<StorageProof> {
  const baseProof: StorageProof = {
    cid,
    dealId: null,
    miner: null,
    startEpoch: null,
    expiry: null,
    status: "unknown",
    pieceCid: null,
  };

  try {
    const client = await getClient();

    const uploads = await client.capability.upload.list();

    const upload = uploads.results?.find(
      (u: { root: { toString(): string } }) => u.root.toString() === cid
    );

    if (!upload) {
      return { ...baseProof, status: "queued" };
    }

    const shards: Array<{ toString(): string }> = upload.shards ?? [];
    if (shards.length === 0) {
      return { ...baseProof, status: "queued" };
    }

    for (const shard of shards) {
      try {
        const receipt = await client.capability.filecoin.info(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          shard as any
        );

        // Receipt has .out with { ok, error } structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (receipt as any).out?.ok;
        if (result) {
          const deals = result.deals;
          if (deals && deals.length > 0) {
            const deal = deals[0];
            return {
              cid,
              dealId: deal.aux?.dataSource?.dealID ?? null,
              miner: deal.provider ? `f0${deal.provider}` : null,
              startEpoch: null,
              expiry: null,
              status: "active",
              pieceCid: shard.toString(),
            };
          }

          if (result.aggregates && result.aggregates.length > 0) {
            return {
              ...baseProof,
              status: "sealed",
              pieceCid: shard.toString(),
            };
          }
        }
      } catch {
        continue;
      }
    }

    return { ...baseProof, status: "queued" };
  } catch {
    return baseProof;
  }
}
