"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EncryptedEnvelope, AccessConditionItem } from "@/types";

/**
 * React hook for Lit Protocol encryption/decryption.
 *
 * Initializes the Lit client on mount (or falls back to demo mode).
 * Provides encrypt/decrypt functions for EEG data.
 */
export function useLitProtocol() {
  const [isReady, setIsReady] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Lazy-load and initialize Lit client
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const { getLitClient } = await import("@/lib/lit");
        const result = await getLitClient();
        if (!cancelled) {
          setIsDemo(result.isDemo);
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to initialize Lit"
          );
          setIsDemo(true);
          setIsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Encrypt EEG data with the given access conditions.
   */
  const encrypt = useCallback(
    async (
      data: Uint8Array,
      accessConditions: AccessConditionItem[]
    ): Promise<EncryptedEnvelope> => {
      const { encryptEEGData } = await import("@/lib/lit");
      return encryptEEGData(data, accessConditions);
    },
    []
  );

  /**
   * Decrypt an encrypted envelope.
   */
  const decrypt = useCallback(
    async (
      envelope: EncryptedEnvelope,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionSigs?: any
    ): Promise<Uint8Array> => {
      const { decryptEEGData } = await import("@/lib/lit");
      return decryptEEGData(envelope, sessionSigs);
    },
    []
  );

  return { encrypt, decrypt, isReady, isDemo, error };
}
