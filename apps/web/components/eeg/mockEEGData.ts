import type {
  BandPower,
  ChannelStats,
  DatasetMetadata,
  EegFeatures,
} from "@neurovault/eeg-utils";

// ── Channel definitions ────────────────────────────────────────────

export const CHANNEL_NAMES = [
  "Fp1", "Fp2", "F3", "F4", "C3", "C4", "P3", "P4",
  "O1", "O2", "F7", "F8", "T7", "T8", "P7", "P8",
  "Fz", "Cz", "Pz", "Fc1", "Fc2", "Cp1", "Cp2", "Oz",
];

export const CHANNEL_COLORS = [
  "#22d3ee", // cyan-400
  "#06b6d4", // cyan-500
  "#67e8f9", // cyan-300
  "#a78bfa", // violet-400
  "#8b5cf6", // violet-500
  "#c4b5fd", // violet-300
  "#34d399", // emerald-400
  "#10b981", // emerald-500
  "#f472b6", // pink-400
  "#ec4899", // pink-500
  "#fbbf24", // amber-400
  "#f59e0b", // amber-500
  "#22d3ee",
  "#06b6d4",
  "#67e8f9",
  "#a78bfa",
  "#8b5cf6",
  "#c4b5fd",
  "#34d399",
  "#10b981",
  "#f472b6",
  "#ec4899",
  "#fbbf24",
  "#f59e0b",
];

// ── Signal generation ──────────────────────────────────────────────

const SAMPLE_RATE = 160;
const DURATION = 10; // seconds
const TOTAL_SAMPLES = SAMPLE_RATE * DURATION;

/**
 * Seeded pseudo-random number generator for reproducible mock data.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a realistic-looking EEG waveform for one channel.
 * Superimposes typical brain rhythms: alpha (10 Hz), beta (20 Hz),
 * theta (6 Hz), and some broadband noise.
 */
function generateChannel(channelIndex: number): number[] {
  const rng = mulberry32(channelIndex * 1337 + 42);
  const data: number[] = [];

  // Per-channel rhythm emphasis — simulates topographical variation
  const alphaAmp = 15 + (rng() - 0.5) * 20; // 5–25 µV
  const betaAmp = 3 + rng() * 6; // 3–9 µV
  const thetaAmp = 5 + rng() * 10; // 5–15 µV
  const deltaAmp = 10 + rng() * 15; // 10–25 µV
  const noiseAmp = 2 + rng() * 3; // 2–5 µV

  const alphaFreq = 9.5 + rng() * 2; // 9.5–11.5 Hz
  const betaFreq = 18 + rng() * 8; // 18–26 Hz
  const thetaFreq = 5 + rng() * 2; // 5–7 Hz
  const deltaFreq = 1.5 + rng() * 1.5; // 1.5–3 Hz

  // Phase offsets
  const alphaPhase = rng() * Math.PI * 2;
  const betaPhase = rng() * Math.PI * 2;
  const thetaPhase = rng() * Math.PI * 2;
  const deltaPhase = rng() * Math.PI * 2;

  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const t = i / SAMPLE_RATE;
    const alpha =
      alphaAmp * Math.sin(2 * Math.PI * alphaFreq * t + alphaPhase);
    const beta = betaAmp * Math.sin(2 * Math.PI * betaFreq * t + betaPhase);
    const theta =
      thetaAmp * Math.sin(2 * Math.PI * thetaFreq * t + thetaPhase);
    const delta =
      deltaAmp * Math.sin(2 * Math.PI * deltaFreq * t + deltaPhase);
    const noise = noiseAmp * (rng() * 2 - 1);

    data.push(alpha + beta + theta + delta + noise);
  }

  return data;
}

/**
 * All channel data: number[][] — [channelIndex][sampleIndex].
 * Values are in microvolts (µV).
 */
export const MOCK_SIGNALS: number[][] = CHANNEL_NAMES.map((_, i) =>
  generateChannel(i)
);

export const MOCK_SAMPLE_RATE = SAMPLE_RATE;
export const MOCK_DURATION = DURATION;

// ── Band power mock data ───────────────────────────────────────────

function mockBandPower(seed: number): BandPower {
  const rng = mulberry32(seed);
  return {
    delta: 25 + rng() * 15, // 25–40 dB (dominant at rest)
    theta: 18 + rng() * 12, // 18–30 dB
    alpha: 22 + rng() * 18, // 22–40 dB (strong at rest, eyes closed)
    beta: 10 + rng() * 10, // 10–20 dB
    gamma: 5 + rng() * 8, // 5–13 dB (weakest)
  };
}

function mockStats(seed: number): ChannelStats {
  const rng = mulberry32(seed);
  return {
    mean: (rng() - 0.5) * 4, // near zero
    variance: 100 + rng() * 400, // 100–500 µV²
    kurtosis: -0.5 + rng() * 3, // -0.5 to 2.5
  };
}

export const MOCK_BAND_POWER: Record<string, BandPower> = {};
export const MOCK_STATS: Record<string, ChannelStats> = {};

CHANNEL_NAMES.forEach((name, i) => {
  MOCK_BAND_POWER[name] = mockBandPower(i * 7 + 1);
  MOCK_STATS[name] = mockStats(i * 13 + 3);
});

export const MOCK_FEATURES: EegFeatures = {
  bandPower: MOCK_BAND_POWER,
  stats: MOCK_STATS,
};

// ── Dataset metadata ───────────────────────────────────────────────

export const MOCK_METADATA: DatasetMetadata = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  filename: "S001R03.edf",
  subject: "S001",
  channels: CHANNEL_NAMES.length,
  sampleRate: SAMPLE_RATE,
  duration: DURATION,
  task: "motor-imagery-fist",
  features: MOCK_FEATURES,
  timestamp: "2026-03-06T12:00:00.000Z",
  format: "edf+",
};

// ── Annotation events ──────────────────────────────────────────────

export const MOCK_ANNOTATIONS = [
  { onset: 0, duration: 4.2, text: "T0" },
  { onset: 4.2, duration: 4.1, text: "T1" },
  { onset: 8.3, duration: 1.7, text: "T2" },
];
