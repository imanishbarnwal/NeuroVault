import { NextRequest, NextResponse } from "next/server";
import { retrieveDataset, retrieveMetadata } from "@/lib/storacha";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/retrieve?cid=...&type=data|metadata
 *
 * Retrieve encrypted data or metadata from Storacha by CID.
 *
 * Query params:
 *   - cid: Content identifier
 *   - type: "data" (returns binary) or "metadata" (returns JSON)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get("cid");
    const type = searchParams.get("type") ?? "metadata";

    if (!cid) {
      return NextResponse.json(
        { error: "Missing 'cid' query parameter" },
        { status: 400 }
      );
    }

    if (type === "data") {
      const data = await retrieveDataset(cid);
      return new NextResponse(data as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${cid}.enc"`,
        },
      });
    }

    if (type === "metadata") {
      const metadata = await retrieveMetadata(cid);
      return NextResponse.json(metadata);
    }

    return NextResponse.json(
      { error: "Invalid 'type' parameter. Use 'data' or 'metadata'" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Retrieval failed";
    console.error("Storage retrieve error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
