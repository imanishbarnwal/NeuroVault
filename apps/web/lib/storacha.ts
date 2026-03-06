/**
 * Storacha / Filecoin shared utilities.
 *
 * This module contains ONLY client-safe code (no @storacha/client imports).
 * Server-side operations (upload, proof queries) live in storacha.server.ts
 * and are accessed via /api/storage/ routes.
 */

// ── Configuration ──────────────────────────────────────────────────

export const STORACHA_GATEWAY = "https://w3s.link";

// ── URL builders ───────────────────────────────────────────────────

/**
 * Build a gateway URL for a given CID.
 */
export function getGatewayUrl(cid: string, filename?: string): string {
  const base = `${STORACHA_GATEWAY}/ipfs/${cid}`;
  return filename ? `${base}?filename=${encodeURIComponent(filename)}` : base;
}

/**
 * Get a Filecoin explorer URL for a deal.
 */
export function getFilecoinExplorerUrl(dealId: number): string {
  return `https://filfox.info/en/deal/${dealId}`;
}

/**
 * Get an IPFS explorer URL for a CID.
 */
export function getIpfsExplorerUrl(cid: string): string {
  return `${STORACHA_GATEWAY}/ipfs/${cid}`;
}

// ── Gateway retrieval (works client-side and server-side) ──────────

/**
 * Retrieve raw bytes from Storacha by CID via the IPFS gateway.
 */
export async function retrieveDataset(cid: string): Promise<Uint8Array> {
  const url = getGatewayUrl(cid);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve dataset ${cid}: ${response.status} ${response.statusText}`
    );
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Retrieve and parse metadata JSON from Storacha by CID.
 */
export async function retrieveMetadata(
  cid: string
): Promise<import("@neurovault/eeg-utils").DatasetMetadata> {
  const url = getGatewayUrl(cid);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to retrieve metadata ${cid}: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
