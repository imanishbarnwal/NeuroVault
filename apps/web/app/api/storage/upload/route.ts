import { NextRequest, NextResponse } from "next/server";
import { uploadEncryptedEEG } from "@/lib/storacha.server";

export const dynamic = "force-dynamic";
import type { DatasetMetadata } from "@neurovault/eeg-utils";

/**
 * POST /api/storage/upload
 *
 * Upload encrypted EEG data + metadata to Storacha/Filecoin.
 *
 * Request body: multipart/form-data with:
 *   - "data": encrypted EEG binary blob
 *   - "metadata": JSON string of DatasetMetadata
 *
 * Response: { dataCID, metadataCID, timestamp, uploader }
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const dataBlob = formData.get("data") as Blob | null;
    const metadataStr = formData.get("metadata") as string | null;

    if (!dataBlob) {
      return NextResponse.json(
        { error: "Missing 'data' field in form data" },
        { status: 400 }
      );
    }

    if (!metadataStr) {
      return NextResponse.json(
        { error: "Missing 'metadata' field in form data" },
        { status: 400 }
      );
    }

    let metadata: DatasetMetadata;
    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      return NextResponse.json(
        { error: "Invalid metadata JSON" },
        { status: 400 }
      );
    }

    // Validate required metadata fields
    if (!metadata.id || !metadata.filename) {
      return NextResponse.json(
        { error: "Metadata must include 'id' and 'filename'" },
        { status: 400 }
      );
    }

    const encryptedData = new Uint8Array(await dataBlob.arrayBuffer());

    const result = await uploadEncryptedEEG(encryptedData, metadata);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload failed";
    console.error("Storage upload error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
