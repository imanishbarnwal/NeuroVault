import { NextRequest, NextResponse } from "next/server";

// ── Types ───────────────────────────────────────────────────────────

interface MatchRequest {
  naturalLanguage: string;
  minChannels?: number;
  maxChannels?: number;
  minDuration?: number;
  maxDuration?: number;
  taskType?: string;
}

interface DatasetCandidate {
  id: string;
  dataCID: string;
  channels: number;
  duration: number;
  task: string;
  filename: string;
  description?: string;
}

interface MatchScore {
  datasetId: string;
  dataCID: string;
  overallScore: number;
  channelScore: number;
  durationScore: number;
  taskScore: number;
  textScore: number;
  explanation: string;
}

// ── Scoring Weights ─────────────────────────────────────────────────

const WEIGHTS = {
  channel: 0.25,
  duration: 0.20,
  task: 0.30,
  text: 0.25,
} as const;

// ── Task Category Mapping ───────────────────────────────────────────

const TASK_CATEGORIES: Record<string, string> = {
  "baseline-eyes-open": "baseline",
  "baseline-eyes-closed": "baseline",
  "motor-execution-fist": "motor",
  "motor-imagery-fist": "motor",
  "motor-execution-feet": "motor",
  "motor-imagery-feet": "motor",
  "p300-oddball": "erp",
  "ssvep": "bci",
  "emotion-recognition": "emotion",
  "sleep-staging": "sleep",
};

const TASK_KEYWORDS: Record<string, string[]> = {
  "baseline-eyes-open": ["baseline", "resting", "eyes open", "resting state", "alpha"],
  "baseline-eyes-closed": ["baseline", "resting", "eyes closed", "resting state", "alpha"],
  "motor-execution-fist": ["motor", "execution", "fist", "hand", "movement", "grip"],
  "motor-imagery-fist": ["motor", "imagery", "fist", "hand", "imagine", "mental", "bci"],
  "motor-execution-feet": ["motor", "execution", "feet", "foot", "leg", "movement"],
  "motor-imagery-feet": ["motor", "imagery", "feet", "foot", "leg", "imagine", "mental", "bci"],
  "p300-oddball": ["p300", "oddball", "erp", "event-related", "attention"],
  "ssvep": ["ssvep", "steady-state", "visual", "bci", "frequency"],
  "emotion-recognition": ["emotion", "affect", "valence", "arousal", "feeling"],
  "sleep-staging": ["sleep", "staging", "rem", "nrem", "polysomnography"],
};

// ── Scoring Functions ───────────────────────────────────────────────

function scoreChannelCompatibility(
  datasetChannels: number,
  minChannels: number,
  maxChannels: number
): number {
  // No filter specified — full score
  if (minChannels === 0 && maxChannels === 0) return 100;

  const min = minChannels || 0;
  const max = maxChannels || Infinity;

  // Perfect match: within range
  if (datasetChannels >= min && datasetChannels <= max) return 100;

  // Partial match: close to range
  if (datasetChannels < min) {
    const ratio = datasetChannels / min;
    return Math.round(Math.max(0, ratio * 100));
  }

  if (max !== Infinity && datasetChannels > max) {
    const ratio = max / datasetChannels;
    return Math.round(Math.max(0, ratio * 100));
  }

  return 50;
}

function scoreDurationMatch(
  datasetDuration: number,
  minDuration: number,
  maxDuration: number
): number {
  // No filter — full score
  if (minDuration === 0 && maxDuration === 0) return 100;

  const min = minDuration || 0;
  const max = maxDuration || Infinity;

  // Perfect match
  if (datasetDuration >= min && datasetDuration <= max) return 100;

  // Below minimum
  if (datasetDuration < min) {
    const ratio = datasetDuration / min;
    return Math.round(Math.max(0, ratio * 100));
  }

  // Above maximum
  if (max !== Infinity && datasetDuration > max) {
    // Longer data is less penalized than shorter
    const ratio = max / datasetDuration;
    return Math.round(Math.max(20, ratio * 100));
  }

  return 50;
}

function scoreTaskRelevance(datasetTask: string, queryTask: string): number {
  if (!queryTask) return 80; // No task specified — mild default

  // Exact match
  if (datasetTask === queryTask) return 100;

  // Same category (e.g., motor-execution-fist ↔ motor-imagery-fist)
  const datasetCat = TASK_CATEGORIES[datasetTask] || datasetTask;
  const queryCat = TASK_CATEGORIES[queryTask] || queryTask;
  if (datasetCat === queryCat) return 70;

  // Different category
  return 10;
}

function scoreTextMatch(
  dataset: DatasetCandidate,
  naturalLanguage: string
): number {
  if (!naturalLanguage || naturalLanguage.trim().length === 0) return 80;

  const queryLower = naturalLanguage.toLowerCase();
  const queryTokens = queryLower
    .split(/[\s,;.!?]+/)
    .filter((t) => t.length > 2);

  if (queryTokens.length === 0) return 80;

  let matchedTokens = 0;

  // Check against task keywords
  const taskKeywords = TASK_KEYWORDS[dataset.task] || [];
  const allSearchable = [
    ...taskKeywords,
    dataset.task.replace(/-/g, " "),
    dataset.filename.toLowerCase().replace(/\.[^.]+$/, ""),
    dataset.description?.toLowerCase() || "",
    `${dataset.channels} channels`,
    `${dataset.channels}ch`,
  ].join(" ");

  for (const token of queryTokens) {
    if (allSearchable.includes(token)) {
      matchedTokens++;
    }
  }

  // Check for numeric references (e.g., "64 channel" matches 64-ch dataset)
  const numericMatches = queryLower.match(/\d+/g);
  if (numericMatches) {
    for (const num of numericMatches) {
      if (parseInt(num) === dataset.channels) matchedTokens++;
      if (Math.abs(parseInt(num) - dataset.duration) < 5) matchedTokens++;
    }
  }

  const ratio = matchedTokens / queryTokens.length;
  return Math.round(Math.min(100, ratio * 100));
}

function generateExplanation(scores: {
  channelScore: number;
  durationScore: number;
  taskScore: number;
  textScore: number;
}): string {
  const parts: string[] = [];

  if (scores.taskScore >= 90) parts.push("exact task match");
  else if (scores.taskScore >= 60) parts.push("similar task category");

  if (scores.channelScore >= 90) parts.push("channel count matches");
  else if (scores.channelScore >= 50) parts.push("partial channel match");

  if (scores.durationScore >= 90) parts.push("duration fits criteria");

  if (scores.textScore >= 70) parts.push("strong keyword overlap");
  else if (scores.textScore >= 40) parts.push("some keyword matches");

  if (parts.length === 0) parts.push("low relevance to query");

  return parts.join(", ");
}

// ── Main Scoring Engine ─────────────────────────────────────────────

function scoreDatasets(
  query: MatchRequest,
  candidates: DatasetCandidate[]
): MatchScore[] {
  return candidates
    .map((dataset) => {
      const channelScore = scoreChannelCompatibility(
        dataset.channels,
        query.minChannels || 0,
        query.maxChannels || 0
      );
      const durationScore = scoreDurationMatch(
        dataset.duration,
        query.minDuration || 0,
        query.maxDuration || 0
      );
      const taskScore = scoreTaskRelevance(dataset.task, query.taskType || "");
      const textScore = scoreTextMatch(dataset, query.naturalLanguage);

      const overallScore = Math.round(
        channelScore * WEIGHTS.channel +
          durationScore * WEIGHTS.duration +
          taskScore * WEIGHTS.task +
          textScore * WEIGHTS.text
      );

      const explanation = generateExplanation({
        channelScore,
        durationScore,
        taskScore,
        textScore,
      });

      return {
        datasetId: dataset.id,
        dataCID: dataset.dataCID,
        overallScore,
        channelScore,
        durationScore,
        taskScore,
        textScore,
        explanation,
      };
    })
    .sort((a, b) => b.overallScore - a.overallScore);
}

// ── API Route ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query: MatchRequest = {
      naturalLanguage: body.naturalLanguage || "",
      minChannels: body.minChannels || 0,
      maxChannels: body.maxChannels || 0,
      minDuration: body.minDuration || 0,
      maxDuration: body.maxDuration || 0,
      taskType: body.taskType || "",
    };

    // Load available datasets from Storacha registry
    let candidates: DatasetCandidate[] = [];

    try {
      const baseUrl = request.nextUrl.origin;
      const res = await fetch(`${baseUrl}/api/storage/list`, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const { datasets } = await res.json();
        if (datasets && Array.isArray(datasets)) {
          candidates = datasets.map((d: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
            id: d.id,
            dataCID: d.dataCID,
            channels: d.channels || 0,
            duration: d.duration || 0,
            task: d.task || "unknown",
            filename: d.filename || "",
            description: d.task,
          }));
        }
      }
    } catch {
      // If Storacha is unavailable, use demo data
    }

    // Fallback: demo candidates when no real data
    if (candidates.length === 0) {
      candidates = [
        {
          id: "demo-001",
          dataCID: "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
          channels: 64,
          duration: 61,
          task: "baseline-eyes-open",
          filename: "S001R01.edf",
        },
        {
          id: "demo-002",
          dataCID: "bafybeihkoviema7g3gxyt6la7vd5ho32lbp7r5y46iqfwqaau7uscwasni",
          channels: 64,
          duration: 125,
          task: "motor-execution-fist",
          filename: "S001R03.edf",
        },
        {
          id: "demo-003",
          dataCID: "bafybeibml5uieyxa5tufngvg7fgwbkwvlsuntwbxgtskoqynbt7wlchmfm",
          channels: 64,
          duration: 125,
          task: "motor-imagery-fist",
          filename: "S001R04.edf",
        },
        {
          id: "demo-004",
          dataCID: "bafybeief5tqfka5xaroiavpxsnn5jlpvaaadzphm3ustqbo4fvlnzqzuey",
          channels: 32,
          duration: 300,
          task: "baseline-eyes-closed",
          filename: "S002R01.edf",
        },
        {
          id: "demo-005",
          dataCID: "bafybeigvgzoolc3drupxhlevdp2ugqcni3z2eoq7tg64mwe5k3cgull4ia",
          channels: 128,
          duration: 60,
          task: "motor-imagery-feet",
          filename: "S003R08.edf",
        },
      ];
    }

    // Score all candidates
    const results = scoreDatasets(query, candidates);

    return NextResponse.json({
      queryId: `local-${Date.now()}`,
      results,
      totalCandidates: candidates.length,
      query,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Match scoring failed", details: message },
      { status: 500 }
    );
  }
}
