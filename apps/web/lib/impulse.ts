/**
 * Impulse AI integration for EEG motor imagery classification.
 *
 * Impulse AI (https://impulse-ai.webflow.io/) is an LLM fine-tuning and
 * deployment platform. This module provides:
 *
 *   1. Integration point for Impulse AI's API (when API access is available)
 *   2. Built-in fallback classifier using neuroscience-grounded heuristics
 *      for motor imagery classification (left hand vs right hand)
 *
 * The fallback uses Event-Related Desynchronization (ERD) in the mu (8-13 Hz)
 * and beta (13-30 Hz) bands over motor cortex channels (C3/C4), which is the
 * standard approach in BCI research for detecting motor imagery.
 *
 * @see https://impulse-ai.webflow.io/
 */

// ── Types ───────────────────────────────────────────────────────────

export interface ClassificationResult {
  /** Predicted motor imagery class */
  predictedClass: "left-hand" | "right-hand" | "rest" | "unknown";
  /** Confidence score 0-1 */
  confidence: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Which engine produced the result */
  engine: "impulse-ai" | "built-in-erd";
  /** Feature breakdown used for classification */
  features: {
    /** Mu-band (8-13 Hz) laterality index: (C4 - C3) / (C4 + C3) */
    muLaterality: number;
    /** Beta-band (13-30 Hz) laterality index */
    betaLaterality: number;
    /** Combined laterality (weighted) */
    combinedLaterality: number;
    /** Channels used for left motor cortex */
    leftChannels: string[];
    /** Channels used for right motor cortex */
    rightChannels: string[];
  };
  /** Human-readable explanation */
  explanation: string;
}

export interface ImpulseConfig {
  /** Impulse AI API key (if available) */
  apiKey?: string;
  /** Impulse AI endpoint URL */
  endpoint?: string;
  /** Model ID on Impulse AI platform */
  modelId?: string;
}

interface BandPower {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

// ── Constants ───────────────────────────────────────────────────────

const IMPULSE_API_KEY = process.env.NEXT_PUBLIC_IMPULSE_API_KEY || "";
const IMPULSE_ENDPOINT =
  process.env.NEXT_PUBLIC_IMPULSE_ENDPOINT || "https://api.impulselabs.ai/v1";
const IMPULSE_MODEL_ID =
  process.env.NEXT_PUBLIC_IMPULSE_MODEL_ID || "";

/**
 * Motor cortex channel mappings for standard 10-20 and 10-10 systems.
 * C3 (left motor cortex) → controls right hand
 * C4 (right motor cortex) → controls left hand
 * Motor imagery of a hand causes ERD over the CONTRALATERAL motor cortex.
 */
const LEFT_MOTOR_CHANNELS = [
  "C3", "C3.", "Fc3.", "Fc3", "Cp3.", "Cp3", "C1", "C1.", "Fc1.", "Fc1",
];
const RIGHT_MOTOR_CHANNELS = [
  "C4", "C4.", "Fc4.", "Fc4", "Cp4.", "Cp4", "C2", "C2.", "Fc2.", "Fc2",
];

// ── Impulse AI Integration Point ────────────────────────────────────

/**
 * Classify EEG features using Impulse AI's API.
 *
 * This is the primary integration point. When Impulse AI API access is
 * available, this function sends the EEG feature vector to the platform
 * for inference using a fine-tuned model.
 *
 * Expected Impulse AI workflow:
 *   1. Fine-tune a model on PhysioNet motor imagery dataset
 *   2. Deploy the model on Impulse AI's infrastructure
 *   3. Call this function with EEG features for real-time classification
 *
 * @param features - Band power + stats per channel
 * @param config - Optional Impulse AI configuration override
 * @returns Classification result or null if API unavailable
 */
export async function classifyWithImpulse(
  features: Record<string, BandPower>,
  _config?: ImpulseConfig
): Promise<ClassificationResult | null> {
  const apiKey = _config?.apiKey || IMPULSE_API_KEY;
  const endpoint = _config?.endpoint || IMPULSE_ENDPOINT;
  const modelId = _config?.modelId || IMPULSE_MODEL_ID;

  if (!apiKey || !modelId) {
    return null; // Impulse AI not configured — fall through to built-in
  }

  const startTime = performance.now();

  try {
    // Flatten features into a vector for the model
    const featureVector = flattenFeatures(features);

    const res = await fetch(`${endpoint}/inference/${modelId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        inputs: featureVector,
        parameters: {
          task: "motor-imagery-classification",
          classes: ["left-hand", "right-hand", "rest"],
        },
      }),
    });

    if (!res.ok) {
      console.warn("Impulse AI API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const processingTimeMs = performance.now() - startTime;

    return {
      predictedClass: data.prediction || "unknown",
      confidence: data.confidence || 0,
      processingTimeMs,
      engine: "impulse-ai",
      features: {
        muLaterality: data.features?.muLaterality || 0,
        betaLaterality: data.features?.betaLaterality || 0,
        combinedLaterality: data.features?.combinedLaterality || 0,
        leftChannels: data.features?.leftChannels || [],
        rightChannels: data.features?.rightChannels || [],
      },
      explanation: data.explanation || `Impulse AI classified as ${data.prediction}`,
    };
  } catch (err) {
    console.warn(
      "Impulse AI request failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ── Built-in ERD Classifier (Fallback) ──────────────────────────────

/**
 * Classify motor imagery using Event-Related Desynchronization (ERD).
 *
 * This is a neuroscience-grounded classifier that works without any
 * external API. It analyzes the mu/beta band power asymmetry between
 * left and right motor cortex channels to detect motor imagery.
 *
 * Principle: Motor imagery of the RIGHT hand causes ERD (power decrease)
 * over the LEFT motor cortex (C3), and vice versa. The laterality index
 * captures this asymmetry.
 *
 * @param signals - Raw EEG signals per channel (number[][])
 * @param channelNames - Channel labels
 * @param sampleRate - Sampling rate in Hz
 */
export async function classifyMotorImagery(
  signals: number[][],
  channelNames: string[],
  sampleRate: number
): Promise<ClassificationResult> {
  const startTime = performance.now();

  // 1. Try Impulse AI first
  const bandPowers = computeBandPowers(signals, channelNames, sampleRate);
  const impulseResult = await classifyWithImpulse(bandPowers);
  if (impulseResult) return impulseResult;

  // 2. Fall back to built-in ERD classifier
  return classifyWithERD(signals, channelNames, sampleRate, startTime);
}

/**
 * Built-in ERD classifier implementation.
 */
function classifyWithERD(
  signals: number[][],
  channelNames: string[],
  sampleRate: number,
  startTime: number
): ClassificationResult {
  // Find motor cortex channels
  const normalizedNames = channelNames.map((n) => n.trim());

  const leftIdx = findChannelIndices(normalizedNames, LEFT_MOTOR_CHANNELS);
  const rightIdx = findChannelIndices(normalizedNames, RIGHT_MOTOR_CHANNELS);

  const leftNames = leftIdx.map((i) => normalizedNames[i]);
  const rightNames = rightIdx.map((i) => normalizedNames[i]);

  // If we can't find motor cortex channels, use spatial fallback
  if (leftIdx.length === 0 || rightIdx.length === 0) {
    return spatialFallback(signals, channelNames, sampleRate, startTime);
  }

  // Compute band power for left and right motor cortex
  const leftMu = averageBandPower(signals, leftIdx, sampleRate, "alpha");
  const rightMu = averageBandPower(signals, rightIdx, sampleRate, "alpha");
  const leftBeta = averageBandPower(signals, leftIdx, sampleRate, "beta");
  const rightBeta = averageBandPower(signals, rightIdx, sampleRate, "beta");

  // Laterality index: (right - left) / (|right| + |left|)
  // Positive → more power on right → ERD on left → RIGHT hand imagery
  // Negative → more power on left → ERD on right → LEFT hand imagery
  const muLaterality = safeLaterality(rightMu, leftMu);
  const betaLaterality = safeLaterality(rightBeta, leftBeta);

  // Combined: mu is typically more informative (weight 0.6 mu, 0.4 beta)
  const combinedLaterality = muLaterality * 0.6 + betaLaterality * 0.4;

  // Classification decision
  const threshold = 0.05;
  let predictedClass: ClassificationResult["predictedClass"];
  let confidence: number;
  let explanation: string;

  if (Math.abs(combinedLaterality) < threshold) {
    predictedClass = "rest";
    confidence = 0.5 + (threshold - Math.abs(combinedLaterality)) * 5;
    explanation =
      "Symmetric mu/beta activity — no lateralized motor imagery detected (resting state)";
  } else if (combinedLaterality > 0) {
    predictedClass = "right-hand";
    confidence = Math.min(0.95, 0.5 + Math.abs(combinedLaterality) * 2.5);
    explanation = `ERD detected over left motor cortex (${leftNames.join(", ")}). ` +
      `Mu laterality: ${muLaterality.toFixed(3)}, Beta laterality: ${betaLaterality.toFixed(3)}. ` +
      `This pattern is consistent with right hand motor imagery.`;
  } else {
    predictedClass = "left-hand";
    confidence = Math.min(0.95, 0.5 + Math.abs(combinedLaterality) * 2.5);
    explanation = `ERD detected over right motor cortex (${rightNames.join(", ")}). ` +
      `Mu laterality: ${muLaterality.toFixed(3)}, Beta laterality: ${betaLaterality.toFixed(3)}. ` +
      `This pattern is consistent with left hand motor imagery.`;
  }

  const processingTimeMs = performance.now() - startTime;

  return {
    predictedClass,
    confidence: Math.round(confidence * 100) / 100,
    processingTimeMs: Math.round(processingTimeMs * 10) / 10,
    engine: "built-in-erd",
    features: {
      muLaterality: Math.round(muLaterality * 1000) / 1000,
      betaLaterality: Math.round(betaLaterality * 1000) / 1000,
      combinedLaterality: Math.round(combinedLaterality * 1000) / 1000,
      leftChannels: leftNames,
      rightChannels: rightNames,
    },
    explanation,
  };
}

/**
 * Spatial fallback when standard motor cortex channels aren't found.
 * Splits channels into left/right halves and computes laterality.
 */
function spatialFallback(
  signals: number[][],
  channelNames: string[],
  sampleRate: number,
  startTime: number
): ClassificationResult {
  const half = Math.floor(signals.length / 2);
  const leftIdx = Array.from({ length: half }, (_, i) => i);
  const rightIdx = Array.from({ length: signals.length - half }, (_, i) => i + half);

  const leftMu = averageBandPower(signals, leftIdx, sampleRate, "alpha");
  const rightMu = averageBandPower(signals, rightIdx, sampleRate, "alpha");
  const muLaterality = safeLaterality(rightMu, leftMu);

  const leftBeta = averageBandPower(signals, leftIdx, sampleRate, "beta");
  const rightBeta = averageBandPower(signals, rightIdx, sampleRate, "beta");
  const betaLaterality = safeLaterality(rightBeta, leftBeta);

  const combinedLaterality = muLaterality * 0.6 + betaLaterality * 0.4;
  const processingTimeMs = performance.now() - startTime;

  let predictedClass: ClassificationResult["predictedClass"];
  if (Math.abs(combinedLaterality) < 0.05) predictedClass = "rest";
  else if (combinedLaterality > 0) predictedClass = "right-hand";
  else predictedClass = "left-hand";

  return {
    predictedClass,
    confidence: Math.min(0.7, 0.4 + Math.abs(combinedLaterality) * 1.5),
    processingTimeMs: Math.round(processingTimeMs * 10) / 10,
    engine: "built-in-erd",
    features: {
      muLaterality: Math.round(muLaterality * 1000) / 1000,
      betaLaterality: Math.round(betaLaterality * 1000) / 1000,
      combinedLaterality: Math.round(combinedLaterality * 1000) / 1000,
      leftChannels: leftIdx.map((i) => channelNames[i] || `Ch${i}`),
      rightChannels: rightIdx.map((i) => channelNames[i] || `Ch${i}`),
    },
    explanation:
      `Spatial fallback: standard motor cortex channels not found. ` +
      `Used left/right channel split. Confidence is reduced.`,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────

function findChannelIndices(
  channelNames: string[],
  targetChannels: string[]
): number[] {
  const indices: number[] = [];
  const targets = new Set(targetChannels.map((c) => c.toLowerCase()));

  for (let i = 0; i < channelNames.length; i++) {
    if (targets.has(channelNames[i].toLowerCase())) {
      indices.push(i);
    }
  }
  return indices;
}

function safeLaterality(a: number, b: number): number {
  const denom = Math.abs(a) + Math.abs(b);
  if (denom === 0) return 0;
  return (a - b) / denom;
}

/**
 * Compute average power in a specific band across selected channels.
 * Uses a simple FFT approach (Welch-lite: single window).
 */
function averageBandPower(
  signals: number[][],
  channelIndices: number[],
  sampleRate: number,
  band: "alpha" | "beta"
): number {
  const bandRange = band === "alpha" ? [8, 13] : [13, 30];
  let totalPower = 0;
  let count = 0;

  for (const idx of channelIndices) {
    const signal = signals[idx];
    if (!signal || signal.length === 0) continue;

    // Use up to 4 seconds of data for stable estimate
    const maxSamples = Math.min(signal.length, sampleRate * 4);
    const segment = signal.slice(0, maxSamples);

    // Zero-pad to next power of 2
    let N = 1;
    while (N < segment.length) N *= 2;

    // Simple FFT (real-valued, returns power spectrum)
    const re = new Array(N).fill(0);
    const im = new Array(N).fill(0);
    for (let i = 0; i < segment.length; i++) re[i] = segment[i];

    fftInPlace(re, im);

    // Compute power in band
    const freqRes = sampleRate / N;
    const binLow = Math.ceil(bandRange[0] / freqRes);
    const binHigh = Math.min(Math.floor(bandRange[1] / freqRes), N / 2 - 1);

    let bandPower = 0;
    let bandCount = 0;
    for (let i = binLow; i <= binHigh; i++) {
      bandPower += re[i] * re[i] + im[i] * im[i];
      bandCount++;
    }

    if (bandCount > 0) {
      totalPower += bandPower / bandCount;
      count++;
    }
  }

  return count > 0 ? totalPower / count : 0;
}

/**
 * In-place Cooley-Tukey FFT (radix-2).
 * Operates on arrays of length N (must be power of 2).
 */
function fftInPlace(re: number[], im: number[]): void {
  const N = re.length;

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  // Butterfly operations
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);

    for (let i = 0; i < N; i += len) {
      let curRe = 1;
      let curIm = 0;

      for (let j = 0; j < halfLen; j++) {
        const tRe = curRe * re[i + j + halfLen] - curIm * im[i + j + halfLen];
        const tIm = curRe * im[i + j + halfLen] + curIm * re[i + j + halfLen];

        re[i + j + halfLen] = re[i + j] - tRe;
        im[i + j + halfLen] = im[i + j] - tIm;
        re[i + j] += tRe;
        im[i + j] += tIm;

        const newRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newRe;
      }
    }
  }
}

/**
 * Flatten band powers into a feature vector for Impulse AI.
 */
function flattenFeatures(
  bandPowers: Record<string, BandPower>
): number[] {
  const vector: number[] = [];
  for (const channel of Object.keys(bandPowers).sort()) {
    const bp = bandPowers[channel];
    vector.push(bp.delta, bp.theta, bp.alpha, bp.beta, bp.gamma);
  }
  return vector;
}

/**
 * Compute band powers for all channels (used for Impulse AI input).
 */
function computeBandPowers(
  signals: number[][],
  channelNames: string[],
  sampleRate: number
): Record<string, BandPower> {
  const result: Record<string, BandPower> = {};

  for (let i = 0; i < signals.length; i++) {
    const name = channelNames[i] || `Ch${i}`;
    const bands: Record<string, number> = {};

    for (const [bandName, range] of Object.entries({
      delta: [0.5, 4],
      theta: [4, 8],
      alpha: [8, 13],
      beta: [13, 30],
      gamma: [30, 100],
    })) {
      const signal = signals[i];
      const maxSamples = Math.min(signal.length, sampleRate * 4);
      const segment = signal.slice(0, maxSamples);

      let N = 1;
      while (N < segment.length) N *= 2;

      const re = new Array(N).fill(0);
      const im = new Array(N).fill(0);
      for (let j = 0; j < segment.length; j++) re[j] = segment[j];
      fftInPlace(re, im);

      const freqRes = sampleRate / N;
      const binLow = Math.ceil(range[0] / freqRes);
      const binHigh = Math.min(Math.floor(range[1] / freqRes), N / 2 - 1);

      let power = 0;
      let count = 0;
      for (let j = binLow; j <= binHigh; j++) {
        power += re[j] * re[j] + im[j] * im[j];
        count++;
      }

      bands[bandName] = count > 0 ? 10 * Math.log10(power / count + 1e-10) : -Infinity;
    }

    result[name] = bands as unknown as BandPower;
  }

  return result;
}
