"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FlowWalletState, FlowContributorStats } from "@/types";

/**
 * React hook for Flow EVM blockchain integration.
 *
 * Initializes the Flow provider on mount (or falls back to demo mode).
 * Provides wallet connection, dataset registration, access purchasing,
 * and contributor stats.
 */
export function useFlow() {
  const [wallet, setWallet] = useState<FlowWalletState>({
    address: null,
    isConnected: false,
    chainId: null,
  });
  const [stats, setStats] = useState<FlowContributorStats>({
    totalEarnings: BigInt(0),
    datasetIds: [],
    datasetCount: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  // Lazy-load and initialize Flow provider
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const { initFlow } = await import("@/lib/flow");
        const result = await initFlow();
        if (!cancelled) {
          setIsDemo(result.isDemo);
          setIsReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to initialize Flow"
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

  // Refresh contributor stats
  const refreshStats = useCallback(async (address?: string) => {
    try {
      const { getContributorStats } = await import("@/lib/flow");
      const result = await getContributorStats(address);
      setStats(result);
    } catch {
      // Stats refresh is non-critical, silently ignore
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const flow = await import("@/lib/flow");
      const walletState = await flow.connectWallet();
      setWallet(walletState);

      // Auto-refresh stats after connect
      await refreshStats(walletState.address ?? undefined);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [refreshStats]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    const flow = import("@/lib/flow");
    flow.then((mod) => {
      const state = mod.disconnectWallet();
      setWallet(state);
      setStats({ totalEarnings: BigInt(0), datasetIds: [], datasetCount: 0 });
    });
  }, []);

  // Register dataset on-chain
  const registerDataset = useCallback(
    async (
      dataCID: string,
      metadataCID: string,
      priceInFlow: string
    ): Promise<{ id: number; txHash: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const { registerDatasetOnChain } = await import("@/lib/flow");
        const result = await registerDatasetOnChain(
          dataCID,
          metadataCID,
          priceInFlow
        );

        // Auto-refresh stats after registration
        await refreshStats(wallet.address ?? undefined);

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to register dataset";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshStats, wallet.address]
  );

  // List all on-chain datasets
  const listDatasets = useCallback(async () => {
    try {
      const flow = await import("@/lib/flow");
      return await flow.listOnChainDatasets();
    } catch {
      return [];
    }
  }, []);

  // Purchase access to a dataset
  const purchaseAccess = useCallback(
    async (datasetId: number): Promise<string> => {
      setIsLoading(true);
      setError(null);

      try {
        const flow = await import("@/lib/flow");
        const txHash = await flow.purchaseAccess(datasetId);
        return txHash;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to purchase access";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Check access to a dataset
  const checkAccess = useCallback(
    async (datasetId: number, userAddress?: string): Promise<boolean> => {
      try {
        const flow = await import("@/lib/flow");
        return await flow.checkAccess(datasetId, userAddress);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to check access";
        setError(message);
        return false;
      }
    },
    []
  );

  return {
    registerDataset,
    purchaseAccess,
    checkAccess,
    listDatasets,
    stats,
    wallet,
    connectWallet,
    disconnectWallet,
    isConnected: wallet.isConnected,
    isReady,
    isDemo,
    isLoading,
    error,
  };
}
