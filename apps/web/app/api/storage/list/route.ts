import { NextResponse } from "next/server";
import { listDatasets } from "@/lib/storacha.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/list
 *
 * List all datasets in the NeuroVault registry.
 *
 * Response: { datasets: DatasetEntry[] }
 */
export async function GET() {
  try {
    const datasets = await listDatasets();
    return NextResponse.json({ datasets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list datasets";
    console.error("Storage list error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
