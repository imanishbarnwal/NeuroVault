import { randomUUID } from "crypto";
import type { DatasetMetadata, EdfFile, EegFeatures } from "./types";
import { extractFeatures } from "./features";

/**
 * Infer the task type from EDF+ annotations or filename.
 *
 * PhysioNet EEG Motor Movement/Imagery Dataset conventions:
 *   R01, R02 → baseline (eyes open / eyes closed)
 *   R03, R07, R11 → motor execution (left/right fist)
 *   R04, R08, R12 → motor imagery (left/right fist)
 *   R05, R09, R13 → motor execution (both fists/feet)
 *   R06, R10, R14 → motor imagery (both fists/feet)
 */
function inferTask(filename: string, annotations: { text: string }[]): string {
  // Check annotations for task markers
  const hasT1 = annotations.some((a) => a.text === "T1");
  const hasT2 = annotations.some((a) => a.text === "T2");

  if (hasT1 || hasT2) {
    // Try to identify from run number
    const runMatch = filename.match(/R(\d+)/i);
    if (runMatch) {
      const run = parseInt(runMatch[1], 10);
      if ([3, 7, 11].includes(run)) return "motor-execution-fist";
      if ([4, 8, 12].includes(run)) return "motor-imagery-fist";
      if ([5, 9, 13].includes(run)) return "motor-execution-fist-feet";
      if ([6, 10, 14].includes(run)) return "motor-imagery-fist-feet";
    }
    return "motor-task";
  }

  // Baseline runs
  const runMatch = filename.match(/R(\d+)/i);
  if (runMatch) {
    const run = parseInt(runMatch[1], 10);
    if (run === 1) return "baseline-eyes-open";
    if (run === 2) return "baseline-eyes-closed";
  }

  return "unknown";
}

/**
 * Extract the subject identifier from an EDF header or filename.
 */
function extractSubject(patientId: string, filename: string): string {
  // Try patient ID field first
  const trimmed = patientId.trim();
  if (trimmed && trimmed !== "X" && trimmed !== "X X X X") {
    return trimmed;
  }

  // Fall back to filename (e.g., "S001R03.edf" → "S001")
  const match = filename.match(/S(\d+)/i);
  if (match) {
    return `S${match[1]}`;
  }

  return "unknown";
}

/**
 * Generate a standardized metadata object for a parsed EDF file.
 *
 * @param edf - Parsed EDF file
 * @param filename - Original filename (e.g., "S001R03.edf")
 * @param precomputedFeatures - Optional pre-computed features (skips extraction)
 */
export function generateMetadata(
  edf: EdfFile,
  filename: string,
  precomputedFeatures?: EegFeatures
): DatasetMetadata {
  const features =
    precomputedFeatures ??
    extractFeatures(edf.signals, edf.channelNames, edf.sampleRate);

  return {
    id: randomUUID(),
    filename,
    subject: extractSubject(edf.header.patientId, filename),
    channels: edf.channelNames.length,
    sampleRate: edf.sampleRate,
    duration: edf.duration,
    task: inferTask(filename, edf.annotations),
    features,
    timestamp: new Date().toISOString(),
    format: "edf+",
  };
}
