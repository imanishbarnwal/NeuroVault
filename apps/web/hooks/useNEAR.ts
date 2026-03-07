"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { NEARMatchResult, NEARMatchQuery, MatchResponse } from "@/types";

interface UseNEARReturn {
  /** Run the AI matching engine with a query */
  search: (query: {
    naturalLanguage: string;
    minChannels?: number;
    maxChannels?: number;
    minDuration?: number;
    maxDuration?: number;
    taskType?: string;
  }) => Promise<MatchResponse>;
  /** Current match results */
  results: NEARMatchResult[];
  /** Whether the matching engine is processing */
  isSearching: boolean;
  /** Whether NEAR is initialized and ready */
  isReady: boolean;
  /** Whether running in demo mode */
  isDemo: boolean;
  /** Total query count */
  queryCount: number;
  /** Recent queries */
  recentQueries: NEARMatchQuery[];
  /** Error message if any */
  error: string | null;
  /** Clear current results */
  clearResults: () => void;
}

export function useNEAR(): UseNEARReturn {
  const [results, setResults] = useState<NEARMatchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [recentQueries, setRecentQueries] = useState<NEARMatchQuery[]>([]);
  const [error, setError] = useState<string | null>(null);

  const initRef = useRef(false);

  // Initialize NEAR on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    (async () => {
      try {
        const { initNear, getQueryCount, getRecentQueries } = await import(
          "@/lib/near"
        );
        const { isDemo: demo } = await initNear();
        setIsDemo(demo);
        setIsReady(true);

        // Load initial stats
        const count = await getQueryCount();
        setQueryCount(count);
        const recent = await getRecentQueries(5);
        setRecentQueries(recent);
      } catch (err) {
        console.warn(
          "NEAR init failed:",
          err instanceof Error ? err.message : err
        );
        setIsDemo(true);
        setIsReady(true);
      }
    })();
  }, []);

  const search = useCallback(
    async (query: {
      naturalLanguage: string;
      minChannels?: number;
      maxChannels?: number;
      minDuration?: number;
      maxDuration?: number;
      taskType?: string;
    }): Promise<MatchResponse> => {
      setIsSearching(true);
      setError(null);

      try {
        const { runMatch, submitQuery, storeMatchResults, getQueryCount } =
          await import("@/lib/near");

        // 1. Run AI matching engine (always works)
        const matchResponse = await runMatch(query);
        setResults(matchResponse.results);

        // 2. Try to record on NEAR (best-effort)
        try {
          const queryId = await submitQuery(query);
          await storeMatchResults(queryId, matchResponse.results);

          // Update query count
          const count = await getQueryCount();
          setQueryCount(count);
        } catch {
          // On-chain recording is best-effort — matching still works
        }

        return matchResponse;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Search failed";
        setError(message);
        throw err;
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    search,
    results,
    isSearching,
    isReady,
    isDemo,
    queryCount,
    recentQueries,
    error,
    clearResults,
  };
}
