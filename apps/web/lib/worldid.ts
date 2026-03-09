/**
 * World ID (Proof of Personhood) integration for NeuroVault.
 *
 * Uses @worldcoin/idkit for client-side verification and
 * server-side cloud proof verification via the World Developer Portal API.
 *
 * World ID proves a user is a unique human without revealing their identity,
 * preventing sybil attacks on dataset uploads and access purchases.
 */

import type { ISuccessResult } from "@worldcoin/idkit";

// ── Types ──────────────────────────────────────────────────────────

export interface WorldIDVerification {
  /** Whether the user has been verified as human */
  verified: boolean;
  /** Unique identifier for this human (anonymized) — prevents duplicate verifications */
  nullifierHash: string;
  /** The verification level achieved (orb, device, etc.) */
  verificationLevel: string;
  /** ISO timestamp of when verification occurred */
  verifiedAt: string;
}

// ── Config ─────────────────────────────────────────────────────────

export function getWorldAppId(): `app_${string}` {
  const id = process.env.NEXT_PUBLIC_WORLD_APP_ID;
  if (!id) return "app_staging_0" as `app_${string}`;
  if (id.startsWith("app_")) return id as `app_${string}`;
  return `app_${id}`;
}

export const WORLD_ACTION =
  process.env.NEXT_PUBLIC_WORLD_ACTION || "verify-neurovault-user";

// ── Storage ────────────────────────────────────────────────────────

const STORAGE_KEY = "neurovault_world_id";

/** Persist verification to localStorage */
export function saveVerification(verification: WorldIDVerification): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(verification));
}

/** Load persisted verification from localStorage */
export function loadVerification(): WorldIDVerification | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as WorldIDVerification;
  } catch {
    return null;
  }
}

/** Clear stored verification */
export function clearVerification(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Verification ───────────────────────────────────────────────────

/**
 * Verify a World ID proof via the backend API route.
 *
 * Called from the IDKitWidget's handleVerify callback to ensure
 * the proof is validated server-side before showing success.
 */
export async function verifyProofOnBackend(
  proof: ISuccessResult
): Promise<WorldIDVerification> {
  const res = await fetch("/api/verify-world-id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proof),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data.detail || data.error || "World ID verification failed"
    );
  }

  const data = await res.json();
  const verification: WorldIDVerification = {
    verified: true,
    nullifierHash: proof.nullifier_hash,
    verificationLevel: proof.verification_level,
    verifiedAt: new Date().toISOString(),
  };

  saveVerification(verification);
  return verification;
}

/**
 * Check if the app has a valid World App ID configured.
 * When not configured, components should show demo/bypass mode.
 */
export function isWorldIDConfigured(): boolean {
  const id = process.env.NEXT_PUBLIC_WORLD_APP_ID;
  return !!id && id !== "" && id !== "app_staging_0";
}
