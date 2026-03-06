import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseEdf } from "../src/parser";
import type { EdfFile } from "../src/types";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

/**
 * Tests use S001R01.edf (baseline, eyes open, 1 min) and S001R03.edf
 * (motor execution task with T0/T1/T2 annotations).
 *
 * PhysioNet EEG Motor Movement/Imagery Dataset:
 *   - 64 EEG channels + 1 annotation channel = 65 signals total
 *   - 160 Hz sample rate
 *   - Data in BDF+/EDF+ format
 */

describe("EDF Parser", () => {
  let baselineFile: EdfFile;
  let taskFile: EdfFile;

  beforeAll(() => {
    const baselinePath = path.join(FIXTURES_DIR, "S001R01.edf");
    const taskPath = path.join(FIXTURES_DIR, "S001R03.edf");

    if (!fs.existsSync(baselinePath) || !fs.existsSync(taskPath)) {
      throw new Error(
        "Sample EDF files not found. Run: pnpm --filter @neurovault/eeg-utils download-data"
      );
    }

    const baselineBuf = fs.readFileSync(baselinePath);
    baselineFile = parseEdf(baselineBuf.buffer.slice(
      baselineBuf.byteOffset,
      baselineBuf.byteOffset + baselineBuf.byteLength
    ));

    const taskBuf = fs.readFileSync(taskPath);
    taskFile = parseEdf(taskBuf.buffer.slice(
      taskBuf.byteOffset,
      taskBuf.byteOffset + taskBuf.byteLength
    ));
  });

  describe("Header parsing", () => {
    it("should parse the version field", () => {
      expect(baselineFile.header.version).toBe("0");
    });

    it("should parse patient ID", () => {
      expect(baselineFile.header.patientId).toBeTruthy();
    });

    it("should parse start date and time", () => {
      // Format: dd.mm.yy
      expect(baselineFile.header.startDate).toMatch(/^\d{2}\.\d{2}\.\d{2}$/);
      // Format: hh.mm.ss
      expect(baselineFile.header.startTime).toMatch(/^\d{2}\.\d{2}\.\d{2}$/);
    });

    it("should detect 65 total signals (64 EEG + 1 annotation)", () => {
      expect(baselineFile.header.numSignals).toBe(65);
    });

    it("should parse header byte count correctly", () => {
      // 256 + 65 * 256 = 16896
      expect(baselineFile.header.headerBytes).toBe(256 + 65 * 256);
    });

    it("should have correct data record duration", () => {
      expect(baselineFile.header.dataRecordDuration).toBeGreaterThan(0);
    });

    it("should have positive number of data records", () => {
      expect(baselineFile.header.numDataRecords).toBeGreaterThan(0);
    });

    it("should parse per-signal header fields", () => {
      const firstSig = baselineFile.header.signals[0];
      expect(firstSig.label).toBeTruthy();
      expect(firstSig.samplesPerRecord).toBeGreaterThan(0);
      expect(firstSig.digitalMinimum).toBeLessThan(firstSig.digitalMaximum);
    });
  });

  describe("Channel extraction", () => {
    it("should extract 64 data channels (excluding annotation channel)", () => {
      expect(baselineFile.channelNames.length).toBe(64);
      expect(baselineFile.signals.length).toBe(64);
    });

    it("should include standard 10-20 electrode positions", () => {
      const names = baselineFile.channelNames.map((n) => n.replace(/\.+$/g, ""));
      // PhysioNet EEGMMIDB uses these electrode names
      expect(names).toContain("Fc5");
      expect(names).toContain("Fc3");
      expect(names).toContain("Fc1");
      expect(names).toContain("Cz");
      expect(names).toContain("Oz");
    });

    it("should not include EDF Annotations as a data channel", () => {
      expect(baselineFile.channelNames).not.toContain("EDF Annotations");
    });
  });

  describe("Signal data", () => {
    it("should return Float32Array for each channel", () => {
      for (const signal of baselineFile.signals) {
        expect(signal).toBeInstanceOf(Float32Array);
      }
    });

    it("should have non-zero signal data", () => {
      // At least some channels should have non-zero data
      const hasNonZero = baselineFile.signals.some((sig) =>
        sig.some((v) => v !== 0)
      );
      expect(hasNonZero).toBe(true);
    });

    it("should have correct total sample count", () => {
      const firstSig = baselineFile.header.signals[0];
      const expected =
        firstSig.samplesPerRecord * baselineFile.header.numDataRecords;
      expect(baselineFile.signals[0].length).toBe(expected);
    });

    it("should produce physical values in a reasonable range for EEG (microvolts)", () => {
      // EEG signals are typically in the range of -200 to +200 µV
      const signal = baselineFile.signals[0];
      let min = Infinity;
      let max = -Infinity;
      for (let i = 0; i < signal.length; i++) {
        if (signal[i] < min) min = signal[i];
        if (signal[i] > max) max = signal[i];
      }
      // Should be within ±1000 µV (generous bound)
      expect(min).toBeGreaterThan(-1000);
      expect(max).toBeLessThan(1000);
    });
  });

  describe("Sample rate and duration", () => {
    it("should compute a 160 Hz sample rate", () => {
      expect(baselineFile.sampleRate).toBe(160);
    });

    it("should compute approximately 61 seconds for baseline recording", () => {
      // S001R01 is a ~61 second baseline recording
      expect(baselineFile.duration).toBeGreaterThanOrEqual(60);
      expect(baselineFile.duration).toBeLessThanOrEqual(62);
    });

    it("should compute approximately 125 seconds for task recording", () => {
      // S001R03 is a ~125 second task recording
      expect(taskFile.duration).toBeGreaterThanOrEqual(124);
      expect(taskFile.duration).toBeLessThanOrEqual(126);
    });
  });

  describe("Annotations", () => {
    it("should parse annotations from baseline file", () => {
      expect(baselineFile.annotations.length).toBeGreaterThan(0);
    });

    it("should have T0 annotations in baseline file", () => {
      const t0 = baselineFile.annotations.filter((a) => a.text === "T0");
      expect(t0.length).toBeGreaterThan(0);
    });

    it("should have T0, T1, and T2 annotations in task file", () => {
      const texts = new Set(taskFile.annotations.map((a) => a.text));
      expect(texts.has("T0")).toBe(true);
      expect(texts.has("T1")).toBe(true);
      expect(texts.has("T2")).toBe(true);
    });

    it("should have increasing onset times", () => {
      const onsets = taskFile.annotations
        .filter((a) => a.text.length > 0)
        .map((a) => a.onset);
      for (let i = 1; i < onsets.length; i++) {
        expect(onsets[i]).toBeGreaterThanOrEqual(onsets[i - 1]);
      }
    });

    it("should have onset = 0 for the first annotation", () => {
      expect(taskFile.annotations[0].onset).toBe(0);
    });
  });

  describe("EDF+ format detection", () => {
    it("should identify as EDF+ in the reserved field", () => {
      expect(baselineFile.header.reserved).toMatch(/^EDF\+/);
    });
  });
});
