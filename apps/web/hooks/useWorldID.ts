"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { WorldIDVerification, WorldIDProofResult } from "@/lib/worldid";

export function useWorldID() {
  const [verification, setVerification] = useState<WorldIDVerification | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const initRef = useRef(false);

  // Load persisted verification on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      const { loadVerification, isWorldIDConfigured } = await import(
        "@/lib/worldid"
      );
      setIsConfigured(isWorldIDConfigured());
      const stored = loadVerification();
      if (stored) setVerification(stored);
    })();
  }, []);

  /** Called by IDKitWidget's handleVerify — validates proof server-side */
  const handleVerify = useCallback(async (proof: WorldIDProofResult) => {
    setIsLoading(true);
    setError(null);

    try {
      const { verifyProofOnBackend } = await import("@/lib/worldid");
      const result = await verifyProofOnBackend(proof);
      setVerification(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      setError(message);
      throw err; // Re-throw so IDKitWidget shows error state
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Called by IDKitWidget's onSuccess — proof already verified */
  const onSuccess = useCallback(() => {
    // Verification already saved by handleVerify, nothing extra needed
  }, []);

  /** Clear verification state */
  const reset = useCallback(async () => {
    const { clearVerification } = await import("@/lib/worldid");
    clearVerification();
    setVerification(null);
    setError(null);
  }, []);

  return {
    /** Current verification state (null if not verified) */
    verification,
    /** Whether the user is verified as human */
    isVerified: verification?.verified === true,
    /** Nullifier hash (unique anonymous ID) */
    nullifierHash: verification?.nullifierHash ?? null,
    /** Whether a verification is in progress */
    isLoading,
    /** Whether World ID is configured (has app_id) */
    isConfigured,
    /** Last error message */
    error,
    /** IDKitWidget handleVerify callback */
    handleVerify,
    /** IDKitWidget onSuccess callback */
    onSuccess,
    /** Clear stored verification */
    reset,
  };
}
