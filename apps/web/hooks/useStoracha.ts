"use client";

import { useState, useCallback } from "react";
import type { DatasetMetadata } from "@neurovault/eeg-utils";
import type {
  UploadResult,
  UploadProgress,
  DatasetEntry,
  StorageProof,
} from "@/types";
import { getGatewayUrl, getFilecoinExplorerUrl } from "@/lib/storacha";

// ── Hook ───────────────────────────────────────────────────────────

export function useStoracha() {
  const [progress, setProgress] = useState<UploadProgress>({
    stage: "idle",
    percent: 0,
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Upload ─────────────────────────────────────────────────────

  const upload = useCallback(
    async (
      encryptedData: Uint8Array,
      metadata: DatasetMetadata
    ): Promise<UploadResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Stage 1: Preparing
        setProgress({
          stage: "preparing",
          percent: 10,
          message: "Preparing encrypted data for upload...",
        });

        const formData = new FormData();
        const dataBlob = new Blob([encryptedData as BlobPart], {
          type: "application/octet-stream",
        });
        formData.append("data", dataBlob, `${metadata.id}.enc`);
        formData.append("metadata", JSON.stringify(metadata));

        // Stage 2: Uploading
        setProgress({
          stage: "uploading-data",
          percent: 30,
          message: "Uploading encrypted EEG data to Storacha...",
        });

        const response = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `Upload failed: ${response.status}`);
        }

        // Stage 3: Complete
        const result: UploadResult = await response.json();

        setProgress({
          stage: "complete",
          percent: 100,
          message: "Upload complete! Data stored on Filecoin network.",
          result,
        });

        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed";
        setError(message);
        setProgress({
          stage: "error",
          percent: 0,
          message,
          error: message,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ── Retrieve ───────────────────────────────────────────────────

  const retrieve = useCallback(
    async (
      cid: string,
      type: "data" | "metadata" = "metadata"
    ): Promise<Uint8Array | DatasetMetadata | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/storage/retrieve?cid=${encodeURIComponent(cid)}&type=${type}`
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `Retrieval failed: ${response.status}`);
        }

        if (type === "data") {
          const buffer = await response.arrayBuffer();
          return new Uint8Array(buffer);
        }

        return (await response.json()) as DatasetMetadata;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Retrieval failed";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ── List datasets ──────────────────────────────────────────────

  const listDatasets = useCallback(async (): Promise<DatasetEntry[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/storage/list");

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || `Failed to list: ${response.status}`);
      }

      const { datasets } = await response.json();
      return datasets as DatasetEntry[];
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to list datasets";
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Storage proof ──────────────────────────────────────────────

  const getProof = useCallback(
    async (cid: string): Promise<StorageProof | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/storage/proof?cid=${encodeURIComponent(cid)}`
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || `Proof query failed: ${response.status}`);
        }

        return (await response.json()) as StorageProof;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Proof query failed";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ── Reset ──────────────────────────────────────────────────────

  const resetProgress = useCallback(() => {
    setProgress({ stage: "idle", percent: 0, message: "" });
    setError(null);
  }, []);

  return {
    upload,
    retrieve,
    listDatasets,
    getProof,
    progress,
    resetProgress,
    isLoading,
    error,
    // Re-export utility functions for use in components
    getGatewayUrl,
    getFilecoinExplorerUrl,
  };
}
