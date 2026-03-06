"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { EncryptedEnvelope, AccessConditionItem, EvmCondition } from "@/types";

/**
 * React hook for Lit Protocol encryption/decryption.
 *
 * Initializes the Lit client on mount (or falls back to demo mode).
 * Provides encrypt/decrypt/buildConditions functions for EEG data.
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

  /**
   * Condition builder functions — lazy-loaded from lib/lit.
   */
  const buildConditions = useMemo(
    () => ({
      wallet: async (address: string, chain?: string): Promise<EvmCondition> => {
        const { buildWalletCondition } = await import("@/lib/lit");
        return buildWalletCondition(address, chain);
      },
      nft: async (contractAddress: string, chain?: string): Promise<EvmCondition> => {
        const { buildNFTCondition } = await import("@/lib/lit");
        return buildNFTCondition(contractAddress, chain);
      },
      token: async (contractAddress: string, minBalance: string, chain?: string): Promise<EvmCondition> => {
        const { buildTokenCondition } = await import("@/lib/lit");
        return buildTokenCondition(contractAddress, minBalance, chain);
      },
      timelock: async (unlockTimestamp: number): Promise<EvmCondition> => {
        const { buildTimelockCondition } = await import("@/lib/lit");
        return buildTimelockCondition(unlockTimestamp);
      },
      researcher: async (chain?: string): Promise<EvmCondition> => {
        const { buildResearcherCondition } = await import("@/lib/lit");
        return buildResearcherCondition(chain);
      },
      time: async (expiresAt: Date): Promise<EvmCondition> => {
        const { buildTimeCondition } = await import("@/lib/lit");
        return buildTimeCondition(expiresAt);
      },
      composite: async (
        conditions: EvmCondition[],
        operator?: "and" | "or"
      ): Promise<AccessConditionItem[]> => {
        const { buildCompositeCondition } = await import("@/lib/lit");
        return buildCompositeCondition(conditions, operator);
      },
    }),
    []
  );

  return {
    encrypt,
    decrypt,
    buildConditions,
    isReady,
    isConnected: isReady,
    isDemo,
    error,
  };
}
