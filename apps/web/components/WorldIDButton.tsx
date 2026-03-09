"use client";

import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { useWorldID } from "@/hooks/useWorldID";
import { getWorldAppId, WORLD_ACTION } from "@/lib/worldid";

interface WorldIDButtonProps {
  /** Compact mode shows just the badge when verified */
  compact?: boolean;
  /** Called after successful verification */
  onVerified?: () => void;
}

export default function WorldIDButton({
  compact = false,
  onVerified,
}: WorldIDButtonProps) {
  const {
    isVerified,
    nullifierHash,
    isLoading,
    isConfigured,
    error,
    handleVerify,
    onSuccess,
    reset,
  } = useWorldID();

  // Verified state — show badge
  if (isVerified) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 ${
            compact ? "px-2 py-1" : "px-3 py-1.5"
          } rounded-lg bg-emerald-500/10 border border-emerald-500/30`}
        >
          {/* Checkmark icon */}
          <svg
            className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} text-emerald-400`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
            />
          </svg>
          <span
            className={`${
              compact ? "text-[10px]" : "text-xs"
            } font-medium text-emerald-400`}
          >
            Verified Human
          </span>
        </div>
        {!compact && (
          <button
            onClick={reset}
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            title="Clear verification"
          >
            clear
          </button>
        )}
      </div>
    );
  }

  // Not configured — show demo bypass
  if (!isConfigured) {
    return (
      <button
        onClick={async () => {
          const { saveVerification } = await import("@/lib/worldid");
          saveVerification({
            verified: true,
            nullifierHash: `demo_${crypto.randomUUID().slice(0, 8)}`,
            verificationLevel: "device",
            verifiedAt: new Date().toISOString(),
          });
          // Force re-render by reloading the verification
          window.location.reload();
        }}
        className={`flex items-center gap-2 ${
          compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
        } rounded-lg border border-slate-700 text-slate-400
                   hover:border-cyan-500/40 hover:text-cyan-400 transition-colors`}
      >
        <svg
          className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
          />
        </svg>
        Verify (Demo)
      </button>
    );
  }

  // IDKit widget — real verification
  return (
    <div>
      <IDKitWidget
        app_id={getWorldAppId()}
        action={WORLD_ACTION}
        onSuccess={() => {
          onSuccess();
          onVerified?.();
        }}
        handleVerify={handleVerify}
        verification_level={VerificationLevel.Device}
      >
        {({ open }) => (
          <button
            onClick={open}
            disabled={isLoading}
            className={`flex items-center gap-2 ${
              compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"
            } rounded-lg border border-slate-700 text-slate-300 font-medium
                       hover:border-cyan-500/40 hover:text-cyan-400 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <svg
                className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} animate-spin`}
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeOpacity="0.2"
                />
                <path
                  d="M12 2a10 10 0 019.95 9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            )}
            {isLoading ? "Verifying..." : "Verify with World ID"}
          </button>
        )}
      </IDKitWidget>
      {error && (
        <p className="text-[10px] text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
