"use client";

import {
  EEGWaveformViewer,
  EEGMetadataCard,
  BandPowerChart,
  FeatureHeatmap,
} from "@/components/eeg";
import {
  MOCK_SIGNALS,
  MOCK_SAMPLE_RATE,
  MOCK_DURATION,
  MOCK_BAND_POWER,
  MOCK_STATS,
  MOCK_METADATA,
  CHANNEL_NAMES,
} from "@/components/eeg/mockEEGData";

export default function TestPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            EEG Component Test Page
          </h1>
          <p className="text-sm text-slate-400">
            All visualization components rendered with mock data.
          </p>
        </div>

        {/* EEG Waveform Viewer */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">
            EEGWaveformViewer
          </h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <EEGWaveformViewer
              signals={MOCK_SIGNALS}
              channelNames={CHANNEL_NAMES}
              sampleRate={MOCK_SAMPLE_RATE}
              duration={MOCK_DURATION}
              windowSeconds={4}
              visibleChannels={8}
            />
          </div>
        </section>

        {/* EEG Metadata Card */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">
            EEGMetadataCard
          </h2>
          <div className="max-w-md">
            <EEGMetadataCard
              metadata={MOCK_METADATA}
              previewSignals={MOCK_SIGNALS.slice(0, 3)}
              previewChannelNames={CHANNEL_NAMES.slice(0, 3)}
            />
          </div>
        </section>

        {/* Band Power Chart */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">
            BandPowerChart
          </h2>
          <div className="max-w-xl">
            <BandPowerChart
              data={MOCK_BAND_POWER}
              title="Band Power Distribution"
            />
          </div>
        </section>

        {/* Feature Heatmap */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-3">
            FeatureHeatmap
          </h2>
          <FeatureHeatmap
            bandPower={MOCK_BAND_POWER}
            stats={MOCK_STATS}
            title="Channel Feature Matrix"
          />
        </section>
      </div>
    </main>
  );
}
