/**
 * Backend API route for verifying World ID proofs.
 *
 * Proofs must be verified server-side — users can manipulate frontend data.
 * Calls the World Developer Portal API directly to validate the ZK proof.
 */

import { NextRequest, NextResponse } from "next/server";

interface WorldIDProof {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: string;
}

const APP_ID = process.env.NEXT_PUBLIC_WORLD_APP_ID || "";
const ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION || "verify-neurovault-user";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WorldIDProof;

    if (!body.proof || !body.nullifier_hash || !body.merkle_root) {
      return NextResponse.json(
        { error: "Invalid proof payload" },
        { status: 400 }
      );
    }

    // If no real app ID is configured, accept as demo verification
    if (!APP_ID) {
      return NextResponse.json({
        success: true,
        nullifier_hash: body.nullifier_hash,
        verification_level: body.verification_level,
        demo: true,
      });
    }

    const appId = APP_ID.startsWith("app_") ? APP_ID : `app_${APP_ID}`;

    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/verify/${appId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merkle_root: body.merkle_root,
          nullifier_hash: body.nullifier_hash,
          proof: body.proof,
          verification_level: body.verification_level,
          action: ACTION,
        }),
      }
    );

    const data = await verifyRes.json();

    if (verifyRes.ok) {
      return NextResponse.json({
        success: true,
        nullifier_hash: body.nullifier_hash,
        verification_level: body.verification_level,
      });
    }

    return NextResponse.json(
      {
        error: "Verification failed",
        code: data.code,
        detail: data.detail,
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
