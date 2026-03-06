"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { DatasetEntry } from "@/types";

function truncateCid(cid: string, chars = 6): string {
  if (cid.length <= chars * 2 + 3) return cid;
  return `${cid.slice(0, chars)}...${cid.slice(-chars)}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function DashboardPage() {
  const [datasets, setDatasets] = useState<DatasetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/storage/list");
        if (res.ok) {
          const { datasets: ds } = await res.json();
          setDatasets(ds ?? []);
        }
      } catch {
        // Silent fail — empty state shown
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalChannels = datasets.reduce((acc, d) => acc + d.channels, 0);
  const totalDuration = datasets.reduce((acc, d) => acc + d.duration, 0);

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            <span className="text-sm">NeuroVault</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/explore" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              Explore
            </Link>
            <Link href="/upload" className="text-sm px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium transition-colors">
              Upload
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400 mb-8">Overview of your uploaded datasets and storage status.</p>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Datasets</p>
            <p className="text-3xl font-bold text-white">{datasets.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Total Channels</p>
            <p className="text-3xl font-bold text-white">{totalChannels}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Recording Time</p>
            <p className="text-3xl font-bold text-white">{formatDuration(totalDuration)}</p>
          </div>
        </div>

        {/* Recent uploads */}
        <h2 className="text-lg font-semibold text-white mb-4">Recent Uploads</h2>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && datasets.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <h3 className="text-base font-medium text-slate-400">No datasets yet</h3>
            <p className="text-sm text-slate-500 mt-1 mb-4">Upload your first EEG dataset to get started.</p>
            <Link href="/upload" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-medium transition-colors">
              Upload Dataset
            </Link>
          </div>
        )}

        {!loading && datasets.length > 0 && (
          <div className="grid gap-3">
            {datasets.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{d.filename}</p>
                  <p className="text-xs text-slate-500">{d.channels} ch / {formatDuration(d.duration)} / {new Date(d.timestamp).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-mono text-slate-600">{truncateCid(d.dataCID)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
