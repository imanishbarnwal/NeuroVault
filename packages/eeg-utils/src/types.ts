/** EDF+ signal (channel) header information */
export interface EdfSignal {
  /** Channel label, e.g. "Fc5.", "EDF Annotations" */
  label: string;
  /** Transducer type */
  transducerType: string;
  /** Physical dimension / units, e.g. "uV" */
  physicalDimension: string;
  /** Physical minimum value */
  physicalMinimum: number;
  /** Physical maximum value */
  physicalMaximum: number;
  /** Digital (raw integer) minimum */
  digitalMinimum: number;
  /** Digital (raw integer) maximum */
  digitalMaximum: number;
  /** Prefiltering description */
  prefiltering: string;
  /** Number of samples per data record for this signal */
  samplesPerRecord: number;
}

/** A time-stamped annotation from an EDF+ file */
export interface EdfAnnotation {
  /** Onset time in seconds from recording start */
  onset: number;
  /** Duration in seconds (undefined if not specified) */
  duration: number | undefined;
  /** Annotation text, e.g. "T0", "T1", "T2" */
  text: string;
}

/** Parsed EDF+ file header */
export interface EdfHeader {
  /** Version string (usually "0") */
  version: string;
  /** Patient identification */
  patientId: string;
  /** Recording identification */
  recordingId: string;
  /** Recording start date */
  startDate: string;
  /** Recording start time */
  startTime: string;
  /** Total header size in bytes */
  headerBytes: number;
  /** Reserved field — "EDF+C" or "EDF+D" for EDF+ files */
  reserved: string;
  /** Number of data records */
  numDataRecords: number;
  /** Duration of each data record in seconds */
  dataRecordDuration: number;
  /** Number of signals (channels) including annotation channel */
  numSignals: number;
  /** Per-signal header info */
  signals: EdfSignal[];
}

/** Full parsed result of an EDF+ file */
export interface EdfFile {
  /** Parsed header */
  header: EdfHeader;
  /**
   * Signal data per non-annotation channel.
   * Index corresponds to the channel list (annotation channels excluded).
   * Each Float32Array contains all samples, converted to physical units.
   */
  signals: Float32Array[];
  /** Channel names for the signal data (annotation channels excluded) */
  channelNames: string[];
  /** Parsed annotations from EDF Annotations channels */
  annotations: EdfAnnotation[];
  /** Effective sample rate in Hz (from first non-annotation signal) */
  sampleRate: number;
  /** Total recording duration in seconds */
  duration: number;
}

/** Band power values in dB */
export interface BandPower {
  /** 0.5 – 4 Hz */
  delta: number;
  /** 4 – 8 Hz */
  theta: number;
  /** 8 – 13 Hz */
  alpha: number;
  /** 13 – 30 Hz */
  beta: number;
  /** 30 – 100 Hz */
  gamma: number;
}

/** Statistical features for a single channel */
export interface ChannelStats {
  mean: number;
  variance: number;
  kurtosis: number;
}

/** Feature extraction result */
export interface EegFeatures {
  bandPower: Record<string, BandPower>;
  stats: Record<string, ChannelStats>;
}

/** Standardized dataset metadata for NeuroVault */
export interface DatasetMetadata {
  id: string;
  filename: string;
  subject: string;
  channels: number;
  sampleRate: number;
  duration: number;
  task: string;
  features: EegFeatures;
  timestamp: string;
  format: "edf+";
}
