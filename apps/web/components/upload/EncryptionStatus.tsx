"use client";

import type { AccessConditionItem } from "@/types";
import { describeConditions } from "@/lib/conditions";

interface EncryptionStatusProps {
  accessType?: "public" | "restricted" | "private";
  accessConditions?: AccessConditionItem[];
  isEncrypted: boolean;
  isDemo?: boolean;
}

export default function EncryptionStatus({
  accessType,
  accessConditions,
  isEncrypted,
  isDemo,
}: EncryptionStatusProps) {
  const descriptions = describeConditions(
    accessConditions ?? [],
    accessType
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Lock/Globe icon */}
      {isEncrypted ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-violet-400 flex-shrink-0"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-400 flex-shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      )}

      {/* Condition descriptions */}
      <span className="text-[11px] text-slate-400 truncate">
        {descriptions.filter((d) => d !== "AND" && d !== "OR").join(", ") ||
          (isEncrypted ? "Encrypted" : "Public")}
      </span>

      {/* Badge */}
      {isDemo ? (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 flex-shrink-0">
          Demo
        </span>
      ) : isEncrypted ? (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 flex-shrink-0">
          Lit Protocol
        </span>
      ) : (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex-shrink-0">
          Public
        </span>
      )}
    </div>
  );
}
