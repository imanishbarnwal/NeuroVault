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
      metadata: DatasetMetadata,
      accessType?: string,
      accessConditions?: import("@/types").AccessConditionItem[]
    ): Promise<UploadResult | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Stage 1: Preparing
        setProgress({
          stage: "preparing",
          percent: 5,
          message: "Serializing EEG data...",
        });

        const formData = new FormData();
        const dataBlob = new Blob([encryptedData as BlobPart], {
          type: "application/octet-stream",
        });
        formData.append("data", dataBlob, `${metadata.id}.enc`);
        formData.append("metadata", JSON.stringify(metadata));

        // Append access control fields if provided
        if (accessType) {
          formData.append("accessType", accessType);
        }
        if (accessConditions && accessConditions.length > 0) {
          formData.append(
            "accessConditions",
            JSON.stringify(accessConditions)
          );
        }

        // Stage 2: Uploading data
        setProgress({
          stage: "uploading-data",
          percent: 50,
          message: "Uploading to Filecoin...",
        });

        const response = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let errMessage = `Upload failed: ${response.status}`;
          try {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const err = await response.json();
              errMessage = err.error || errMessage;
            } else {
              const text = await response.text();
              console.error("Non-JSON error response from server:", text);
              if (response.status === 413) {
                errMessage = "File is too large for the server.";
              } else {
                errMessage = `Server error ${response.status}`;
              }
            }
          } catch (parseErr) {
            console.error("Failed to parse error response:", parseErr);
          }
          throw new Error(errMessage);
        }

        // Stage 3: Registering
        setProgress({
          stage: "registering",
          percent: 90,
          message: "Registering dataset...",
        });

        const result: UploadResult = await response.json();

        // Stage 4: Complete
        setProgress({
          stage: "complete",
          percent: 100,
          message: "Done!",
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
    setProgress,
    resetProgress,
    isLoading,
    error,
    // Re-export utility functions for use in components
    getGatewayUrl,
    getFilecoinExplorerUrl,
  };
}
