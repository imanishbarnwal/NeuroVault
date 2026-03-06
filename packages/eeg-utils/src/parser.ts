import type {
  EdfHeader,
  EdfSignal,
  EdfAnnotation,
  EdfFile,
} from "./types";

const FIXED_HEADER_SIZE = 256;
const SIGNAL_HEADER_FIELD_WIDTHS = [16, 80, 8, 8, 8, 8, 8, 80, 8, 32] as const;
const BYTES_PER_SIGNAL_HEADER = 256;

/**
 * Read an ASCII string from a buffer slice and trim trailing spaces.
 */
function readAscii(
  view: DataView,
  offset: number,
  length: number
): string {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
  let str = "";
  for (let i = 0; i < length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return str.trim();
}

/**
 * Parse the 256-byte fixed header of an EDF/EDF+ file.
 */
function parseFixedHeader(view: DataView): Omit<EdfHeader, "signals"> {
  return {
    version: readAscii(view, 0, 8),
    patientId: readAscii(view, 8, 80),
    recordingId: readAscii(view, 88, 80),
    startDate: readAscii(view, 168, 8),
    startTime: readAscii(view, 176, 8),
    headerBytes: parseInt(readAscii(view, 184, 8), 10),
    reserved: readAscii(view, 192, 44),
    numDataRecords: parseInt(readAscii(view, 236, 8), 10),
    dataRecordDuration: parseFloat(readAscii(view, 244, 8)),
    numSignals: parseInt(readAscii(view, 252, 4), 10),
  };
}

/**
 * Parse per-signal header fields.
 * EDF stores fields grouped by field type, not by signal.
 */
function parseSignalHeaders(
  view: DataView,
  numSignals: number
): EdfSignal[] {
  const signals: EdfSignal[] = [];

  // Cumulative offset tracking for field groups
  // Field order: label(16), transducer(80), physDim(8), physMin(8), physMax(8),
  //              digMin(8), digMax(8), prefilter(80), samplesPerRecord(8), reserved(32)
  const fieldWidths = SIGNAL_HEADER_FIELD_WIDTHS;

  // Read each field group
  const fieldValues: string[][] = [];
  let groupOffset = FIXED_HEADER_SIZE;
  for (const width of fieldWidths) {
    const values: string[] = [];
    for (let i = 0; i < numSignals; i++) {
      values.push(readAscii(view, groupOffset + i * width, width));
    }
    fieldValues.push(values);
    groupOffset += numSignals * width;
  }

  for (let i = 0; i < numSignals; i++) {
    signals.push({
      label: fieldValues[0][i],
      transducerType: fieldValues[1][i],
      physicalDimension: fieldValues[2][i],
      physicalMinimum: parseFloat(fieldValues[3][i]),
      physicalMaximum: parseFloat(fieldValues[4][i]),
      digitalMinimum: parseInt(fieldValues[5][i], 10),
      digitalMaximum: parseInt(fieldValues[6][i], 10),
      prefiltering: fieldValues[7][i],
      samplesPerRecord: parseInt(fieldValues[8][i], 10),
    });
  }

  return signals;
}

/**
 * Parse EDF+ annotations from the raw bytes of an annotation signal's data
 * within a single data record (TAL - Time-stamped Annotation List).
 */
function parseAnnotationBytes(bytes: Uint8Array): EdfAnnotation[] {
  const annotations: EdfAnnotation[] = [];
  let pos = 0;

  while (pos < bytes.length) {
    // Skip NUL padding
    if (bytes[pos] === 0) {
      pos++;
      continue;
    }

    // Onset must start with '+' or '-'
    if (bytes[pos] !== 0x2b && bytes[pos] !== 0x2d) {
      pos++;
      continue;
    }

    // Read onset until 0x14 (DC4) or 0x15 (NAK)
    let onsetStr = "";
    while (
      pos < bytes.length &&
      bytes[pos] !== 0x14 &&
      bytes[pos] !== 0x15
    ) {
      onsetStr += String.fromCharCode(bytes[pos]);
      pos++;
    }

    // Optional duration (preceded by 0x15)
    let durationStr = "";
    if (pos < bytes.length && bytes[pos] === 0x15) {
      pos++; // skip 0x15
      while (pos < bytes.length && bytes[pos] !== 0x14) {
        durationStr += String.fromCharCode(bytes[pos]);
        pos++;
      }
    }

    // Read annotation texts (separated by 0x14, terminated by 0x00)
    const texts: string[] = [];
    while (pos < bytes.length && bytes[pos] === 0x14) {
      pos++; // skip 0x14
      let text = "";
      while (
        pos < bytes.length &&
        bytes[pos] !== 0x14 &&
        bytes[pos] !== 0x00
      ) {
        text += String.fromCharCode(bytes[pos]);
        pos++;
      }
      if (text.length > 0) {
        texts.push(text);
      }
    }

    // Skip terminating 0x00
    if (pos < bytes.length && bytes[pos] === 0x00) {
      pos++;
    }

    const onset = parseFloat(onsetStr);
    const duration = durationStr ? parseFloat(durationStr) : undefined;

    for (const text of texts) {
      annotations.push({ onset, duration, text });
    }
  }

  return annotations;
}

/**
 * Parse a complete EDF/EDF+ file from an ArrayBuffer.
 *
 * Returns parsed header, signal data as Float32Arrays (physical units),
 * channel names, annotations, sample rate, and recording duration.
 */
export function parseEdf(buffer: ArrayBuffer): EdfFile {
  const view = new DataView(buffer);
  const fixedHeader = parseFixedHeader(view);
  const signalHeaders = parseSignalHeaders(view, fixedHeader.numSignals);

  const header: EdfHeader = {
    ...fixedHeader,
    signals: signalHeaders,
  };

  // Identify annotation vs data channels
  const annotationIndices: number[] = [];
  const dataIndices: number[] = [];
  for (let i = 0; i < signalHeaders.length; i++) {
    if (signalHeaders[i].label === "EDF Annotations") {
      annotationIndices.push(i);
    } else {
      dataIndices.push(i);
    }
  }

  // Calculate data record size in bytes
  let recordSizeBytes = 0;
  for (const sig of signalHeaders) {
    recordSizeBytes += sig.samplesPerRecord * 2;
  }

  // Pre-compute per-signal byte offsets within a data record
  const signalOffsets: number[] = [];
  let runningOffset = 0;
  for (const sig of signalHeaders) {
    signalOffsets.push(runningOffset);
    runningOffset += sig.samplesPerRecord * 2;
  }

  // Pre-compute gain and offset for digital-to-physical conversion
  const gains: number[] = [];
  const offsets: number[] = [];
  for (const sig of signalHeaders) {
    const gain =
      (sig.physicalMaximum - sig.physicalMinimum) /
      (sig.digitalMaximum - sig.digitalMinimum);
    gains.push(gain);
    offsets.push(sig.physicalMinimum - gain * sig.digitalMinimum);
  }

  // Total samples per data channel
  const totalSamplesPerChannel = dataIndices.map(
    (idx) => signalHeaders[idx].samplesPerRecord * header.numDataRecords
  );

  // Allocate output Float32Arrays
  const signals: Float32Array[] = dataIndices.map(
    (_, i) => new Float32Array(totalSamplesPerChannel[i])
  );

  const allAnnotations: EdfAnnotation[] = [];
  const dataStart = header.headerBytes;

  // Parse each data record
  for (let rec = 0; rec < header.numDataRecords; rec++) {
    const recordStart = dataStart + rec * recordSizeBytes;

    // Extract data signals
    for (let di = 0; di < dataIndices.length; di++) {
      const sigIdx = dataIndices[di];
      const sig = signalHeaders[sigIdx];
      const gain = gains[sigIdx];
      const offset = offsets[sigIdx];
      const sampleOffset = rec * sig.samplesPerRecord;
      let bytePos = recordStart + signalOffsets[sigIdx];

      for (let s = 0; s < sig.samplesPerRecord; s++) {
        const digital = view.getInt16(bytePos, true); // little-endian
        signals[di][sampleOffset + s] = digital * gain + offset;
        bytePos += 2;
      }
    }

    // Extract annotations
    for (const annIdx of annotationIndices) {
      const sig = signalHeaders[annIdx];
      const bytePos = recordStart + signalOffsets[annIdx];
      const annBytes = new Uint8Array(
        buffer,
        bytePos,
        sig.samplesPerRecord * 2
      );
      const parsed = parseAnnotationBytes(annBytes);
      allAnnotations.push(...parsed);
    }
  }

  const channelNames = dataIndices.map((idx) => signalHeaders[idx].label);

  // Sample rate from first data channel
  const firstDataSig =
    dataIndices.length > 0 ? signalHeaders[dataIndices[0]] : null;
  const sampleRate = firstDataSig
    ? firstDataSig.samplesPerRecord / header.dataRecordDuration
    : 0;

  const duration = header.numDataRecords * header.dataRecordDuration;

  return {
    header,
    signals,
    channelNames,
    annotations: allAnnotations,
    sampleRate,
    duration,
  };
}
