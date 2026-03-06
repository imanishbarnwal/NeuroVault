import type { BandPower, ChannelStats, EegFeatures } from "./types";
import { fftPowerSpectrum } from "./fft";

/** Standard EEG frequency bands in Hz */
const BANDS = {
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 13],
  beta: [13, 30],
  gamma: [30, 100],
} as const;

/**
 * Find the next power of 2 >= n.
 */
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Compute band power for a single channel signal using FFT.
 * Returns power in each band as mean power spectral density (log10 scale, dB).
 *
 * @param signal - Raw signal samples (physical units)
 * @param sampleRate - Sampling rate in Hz
 */
export function computeBandPower(
  signal: Float32Array,
  sampleRate: number
): BandPower {
  // Zero-pad to next power of 2
  const N = nextPow2(signal.length);
  const padded = new Float32Array(N);
  padded.set(signal);

  const powerSpectrum = fftPowerSpectrum(padded);
  const freqResolution = sampleRate / N; // Hz per bin
  const numBins = powerSpectrum.length;

  const result: Record<string, number> = {};

  for (const [band, [fLow, fHigh]] of Object.entries(BANDS)) {
    const binLow = Math.max(1, Math.ceil(fLow / freqResolution));
    const binHigh = Math.min(numBins - 1, Math.floor(fHigh / freqResolution));

    let sum = 0;
    let count = 0;
    for (let i = binLow; i <= binHigh; i++) {
      sum += powerSpectrum[i];
      count++;
    }

    // Mean power in band, convert to dB (10 * log10)
    const meanPower = count > 0 ? sum / count : 0;
    result[band] = meanPower > 0 ? 10 * Math.log10(meanPower) : -Infinity;
  }

  return result as unknown as BandPower;
}

/**
 * Compute statistical features for a single channel.
 */
export function computeStats(signal: Float32Array): ChannelStats {
  const n = signal.length;
  if (n === 0) {
    return { mean: 0, variance: 0, kurtosis: 0 };
  }

  // Mean
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += signal[i];
  }
  const mean = sum / n;

  // Variance and fourth central moment (for kurtosis)
  let m2 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i++) {
    const diff = signal[i] - mean;
    const diff2 = diff * diff;
    m2 += diff2;
    m4 += diff2 * diff2;
  }
  const variance = m2 / n;
  const m4avg = m4 / n;

  // Excess kurtosis: m4 / variance^2 - 3
  const kurtosis =
    variance > 0 ? m4avg / (variance * variance) - 3 : 0;

  return { mean, variance, kurtosis };
}

/**
 * Extract features from all channels of an EEG recording.
 *
 * @param signals - Array of per-channel Float32Arrays
 * @param channelNames - Channel name for each signal
 * @param sampleRate - Sampling rate in Hz
 */
export function extractFeatures(
  signals: Float32Array[],
  channelNames: string[],
  sampleRate: number
): EegFeatures {
  const bandPower: Record<string, BandPower> = {};
  const stats: Record<string, ChannelStats> = {};

  for (let i = 0; i < signals.length; i++) {
    const name = channelNames[i];
    bandPower[name] = computeBandPower(signals[i], sampleRate);
    stats[name] = computeStats(signals[i]);
  }

  return { bandPower, stats };
}
