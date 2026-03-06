import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseEdf } from "../src/parser";
import {
  computeBandPower,
  computeStats,
  extractFeatures,
} from "../src/features";
import { fftPowerSpectrum } from "../src/fft";
import type { EdfFile } from "../src/types";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("FFT", () => {
  it("should compute power spectrum for a simple sine wave", () => {
    // 256-sample 10 Hz sine wave at 256 Hz sample rate → peak at bin 10
    const N = 256;
    const sampleRate = 256;
    const freq = 10;
    const signal = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      signal[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
    }

    const power = fftPowerSpectrum(signal);
    expect(power.length).toBe(N / 2 + 1);

    // Find the bin with maximum power
    let maxBin = 0;
    let maxVal = 0;
    for (let i = 1; i < power.length; i++) {
      if (power[i] > maxVal) {
        maxVal = power[i];
        maxBin = i;
      }
    }

    // The peak should be at bin 10 (= 10 Hz)
    expect(maxBin).toBe(freq);
  });

  it("should throw for non-power-of-2 length", () => {
    expect(() => fftPowerSpectrum(new Float32Array(100))).toThrow();
  });

  it("should return correct length", () => {
    const power = fftPowerSpectrum(new Float32Array(512));
    expect(power.length).toBe(257);
  });
});

describe("Feature Extractor", () => {
  let edf: EdfFile;

  beforeAll(() => {
    const filePath = path.join(FIXTURES_DIR, "S001R01.edf");
    if (!fs.existsSync(filePath)) {
      throw new Error(
        "Sample EDF file not found. Run: pnpm --filter @neurovault/eeg-utils download-data"
      );
    }
    const buf = fs.readFileSync(filePath);
    edf = parseEdf(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  });

  describe("Band power", () => {
    it("should compute all 5 frequency bands", () => {
      const bp = computeBandPower(edf.signals[0], edf.sampleRate);
      expect(bp).toHaveProperty("delta");
      expect(bp).toHaveProperty("theta");
      expect(bp).toHaveProperty("alpha");
      expect(bp).toHaveProperty("beta");
      expect(bp).toHaveProperty("gamma");
    });

    it("should return finite numeric values", () => {
      const bp = computeBandPower(edf.signals[0], edf.sampleRate);
      for (const [, value] of Object.entries(bp)) {
        expect(typeof value).toBe("number");
        expect(Number.isFinite(value)).toBe(true);
      }
    });

    it("should have higher low-frequency power for resting EEG", () => {
      // For resting-state EEG, alpha/theta should generally be stronger than gamma
      const bp = computeBandPower(edf.signals[0], edf.sampleRate);
      expect(bp.alpha).toBeGreaterThan(bp.gamma);
    });
  });

  describe("Statistical features", () => {
    it("should compute mean, variance, and kurtosis", () => {
      const stats = computeStats(edf.signals[0]);
      expect(stats).toHaveProperty("mean");
      expect(stats).toHaveProperty("variance");
      expect(stats).toHaveProperty("kurtosis");
    });

    it("should compute correct mean for a known signal", () => {
      const signal = new Float32Array([1, 2, 3, 4, 5]);
      const stats = computeStats(signal);
      expect(stats.mean).toBeCloseTo(3, 5);
    });

    it("should compute correct variance for a known signal", () => {
      const signal = new Float32Array([1, 2, 3, 4, 5]);
      const stats = computeStats(signal);
      // Population variance of [1,2,3,4,5] = 2.0
      expect(stats.variance).toBeCloseTo(2.0, 5);
    });

    it("should compute negative excess kurtosis for a uniform-like distribution", () => {
      // [1,2,3,4,5] has excess kurtosis = -1.3 (platykurtic)
      const signal = new Float32Array([1, 2, 3, 4, 5]);
      const stats = computeStats(signal);
      expect(stats.kurtosis).toBeCloseTo(-1.3, 1);
    });

    it("should return zeros for an empty signal", () => {
      const stats = computeStats(new Float32Array(0));
      expect(stats.mean).toBe(0);
      expect(stats.variance).toBe(0);
      expect(stats.kurtosis).toBe(0);
    });

    it("should have non-zero variance for real EEG data", () => {
      const stats = computeStats(edf.signals[0]);
      expect(stats.variance).toBeGreaterThan(0);
    });
  });

  describe("extractFeatures (integration)", () => {
    it("should return bandPower and stats for all channels", () => {
      // Test with first 3 channels to keep it fast
      const subset = edf.signals.slice(0, 3);
      const names = edf.channelNames.slice(0, 3);
      const features = extractFeatures(subset, names, edf.sampleRate);

      expect(Object.keys(features.bandPower)).toHaveLength(3);
      expect(Object.keys(features.stats)).toHaveLength(3);

      for (const name of names) {
        expect(features.bandPower[name]).toBeDefined();
        expect(features.stats[name]).toBeDefined();
        expect(features.bandPower[name].alpha).toBeDefined();
        expect(features.stats[name].mean).toBeDefined();
      }
    });

    it("should produce JSON-serializable output", () => {
      const subset = edf.signals.slice(0, 2);
      const names = edf.channelNames.slice(0, 2);
      const features = extractFeatures(subset, names, edf.sampleRate);

      const json = JSON.stringify(features);
      const parsed = JSON.parse(json);
      expect(parsed.bandPower).toBeDefined();
      expect(parsed.stats).toBeDefined();
    });
  });
});
