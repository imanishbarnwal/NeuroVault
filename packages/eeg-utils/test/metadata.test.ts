import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { parseEdf } from "../src/parser";
import { generateMetadata } from "../src/metadata";
import type { EdfFile } from "../src/types";

const FIXTURES_DIR = path.join(__dirname, "fixtures");

describe("Metadata Generator", () => {
  let baseline: EdfFile;
  let task: EdfFile;

  beforeAll(() => {
    const baselineBuf = fs.readFileSync(
      path.join(FIXTURES_DIR, "S001R01.edf")
    );
    baseline = parseEdf(
      baselineBuf.buffer.slice(
        baselineBuf.byteOffset,
        baselineBuf.byteOffset + baselineBuf.byteLength
      )
    );

    const taskBuf = fs.readFileSync(path.join(FIXTURES_DIR, "S001R03.edf"));
    task = parseEdf(
      taskBuf.buffer.slice(
        taskBuf.byteOffset,
        taskBuf.byteOffset + taskBuf.byteLength
      )
    );
  });

  it("should generate metadata with all required fields", () => {
    const meta = generateMetadata(baseline, "S001R01.edf");

    expect(meta.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(meta.filename).toBe("S001R01.edf");
    expect(meta.subject).toBe("S001");
    expect(meta.channels).toBe(64);
    expect(meta.sampleRate).toBe(160);
    expect(meta.duration).toBeGreaterThan(0);
    expect(meta.format).toBe("edf+");
    expect(meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should infer baseline-eyes-open task for R01", () => {
    const meta = generateMetadata(baseline, "S001R01.edf");
    expect(meta.task).toBe("baseline-eyes-open");
  });

  it("should infer motor-execution-fist task for R03", () => {
    const meta = generateMetadata(task, "S001R03.edf");
    expect(meta.task).toBe("motor-execution-fist");
  });

  it("should include band power features for all channels", () => {
    const meta = generateMetadata(baseline, "S001R01.edf");
    expect(Object.keys(meta.features.bandPower).length).toBe(64);
  });

  it("should include stats features for all channels", () => {
    const meta = generateMetadata(baseline, "S001R01.edf");
    expect(Object.keys(meta.features.stats).length).toBe(64);
  });

  it("should generate unique IDs", () => {
    const meta1 = generateMetadata(baseline, "S001R01.edf");
    const meta2 = generateMetadata(baseline, "S001R01.edf");
    expect(meta1.id).not.toBe(meta2.id);
  });

  it("should produce JSON-serializable output", () => {
    const meta = generateMetadata(baseline, "S001R01.edf");
    const json = JSON.stringify(meta);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(meta.id);
    expect(parsed.features.bandPower).toBeDefined();
  });
});
