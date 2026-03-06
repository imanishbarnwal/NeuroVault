import { NextRequest, NextResponse } from "next/server";
import { getStorageProof } from "@/lib/storacha.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/proof?cid=...
 *
 * Query Filecoin storage proof for a given CID.
 *
 * Response: StorageProof
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get("cid");

    if (!cid) {
      return NextResponse.json(
        { error: "Missing 'cid' query parameter" },
        { status: 400 }
      );
    }

    const proof = await getStorageProof(cid);
    return NextResponse.json(proof);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get storage proof";
    console.error("Storage proof error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
