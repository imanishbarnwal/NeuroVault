/**
 * Backend API route for verifying World ID proofs.
 *
 * Proofs must be verified server-side — users can manipulate frontend data.
 * This calls the World Developer Portal API to validate the ZK proof.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyCloudProof,
  type IVerifyResponse,
  type ISuccessResult,
} from "@worldcoin/idkit";

const APP_ID = (process.env.NEXT_PUBLIC_WORLD_APP_ID || "app_staging_0") as `app_${string}`;
const ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION || "verify-neurovault-user";

export async function POST(req: NextRequest) {
  try {
    const proof = (await req.json()) as ISuccessResult;

    if (!proof.proof || !proof.nullifier_hash || !proof.merkle_root) {
      return NextResponse.json(
        { error: "Invalid proof payload" },
        { status: 400 }
      );
    }

    // If no real app ID is configured, accept as demo verification
    if (APP_ID === "app_staging_0" || !process.env.NEXT_PUBLIC_WORLD_APP_ID) {
      return NextResponse.json({
        success: true,
        nullifier_hash: proof.nullifier_hash,
        verification_level: proof.verification_level,
        demo: true,
      });
    }

    const verifyRes: IVerifyResponse = await verifyCloudProof(
      proof,
      APP_ID,
      ACTION
    );

    if (verifyRes.success) {
      return NextResponse.json({
        success: true,
        nullifier_hash: proof.nullifier_hash,
        verification_level: proof.verification_level,
      });
    }

    return NextResponse.json(
      {
        error: "Verification failed",
        code: verifyRes.code,
        detail: verifyRes.detail,
      },
      { status: 400 }
    );
  } catch (err) {
    console.error("World ID verification error:", err);
    return NextResponse.json(
      {
        error: "Internal verification error",
        detail: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
