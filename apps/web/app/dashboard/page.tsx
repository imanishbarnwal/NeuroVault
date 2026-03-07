"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useFlow } from "@/hooks/useFlow";
import type { DatasetEntry, FlowDataset } from "@/types";

function truncateCid(cid: string, chars = 6): string {
  if (cid.length <= chars * 2 + 3) return cid;
  return `${cid.slice(0, chars)}...${cid.slice(-chars)}`;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatFlow(value: bigint): string {
  const eth = Number(value) / 1e18;
  if (eth === 0) return "0";
  return eth.toFixed(eth < 0.01 ? 4 : 2);
}

export default function DashboardPage() {
  const [storachaDatasets, setStorachaDatasets] = useState<DatasetEntry[]>([]);
  const [flowDatasets, setFlowDatasets] = useState<FlowDataset[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    wallet,
    connectWallet,
    disconnectWallet,
    stats,
    listDatasets,
    isReady,
    isDemo,
    isLoading: flowLoading,
  } = useFlow();

  // Load Storacha datasets
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/storage/list");
        if (res.ok) {
          const { datasets: ds } = await res.json();
          setStorachaDatasets(ds ?? []);
        }
      } catch {
        // Silent fail — empty state shown
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load Flow datasets
  useEffect(() => {
    if (!isReady) return;
    listDatasets().then(setFlowDatasets);
  }, [isReady, listDatasets]);

  const totalOnChain = flowDatasets.length;
  const totalChannels = storachaDatasets.reduce((acc, d) => acc + d.channels, 0);
  const totalDuration = storachaDatasets.reduce((acc, d) => acc + d.duration, 0);
  const totalValueLocked = flowDatasets.reduce(
    (acc, d) => acc + Number(d.price) / 1e18,
    0
  );
  const uniqueContributors = new Set(flowDatasets.map((d) => d.contributor.toLowerCase())).size;

  return (
    <main className="min-h-screen">
      <Navbar
        wallet={wallet}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isLoading={flowLoading}
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400 mb-8">Platform overview and your activity on NeuroVault.</p>

        {isDemo && (
          <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-amber-300">Demo Mode — showing simulated data</span>
          </div>
        )}

        {/* Platform Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Datasets</p>
            <p className="text-3xl font-bold text-white">{Math.max(totalOnChain, storachaDatasets.length)}</p>
            <p className="text-xs text-slate-500 mt-1">{totalOnChain} on-chain</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Contributors</p>
            <p className="text-3xl font-bold text-white">{uniqueContributors}</p>
            <p className="text-xs text-slate-500 mt-1">unique addresses</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Total Value</p>
            <p className="text-3xl font-bold text-emerald-400">{totalValueLocked.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">FLOW in pricing</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Recording Time</p>
            <p className="text-3xl font-bold text-white">{formatDuration(totalDuration)}</p>
            <p className="text-xs text-slate-500 mt-1">{totalChannels} channels</p>
          </div>
        </div>

        {/* Your Stats (if connected) */}
        {wallet.isConnected && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4">Your Activity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                <p className="text-xs text-cyan-400 uppercase tracking-wider font-medium mb-1">Your Datasets</p>
                <p className="text-3xl font-bold text-white">{stats.datasetCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="text-xs text-emerald-400 uppercase tracking-wider font-medium mb-1">Your Earnings</p>
                <p className="text-3xl font-bold text-emerald-400">
                  {formatFlow(stats.totalEarnings)} <span className="text-sm text-slate-500">FLOW</span>
                </p>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                <p className="text-xs text-violet-400 uppercase tracking-wider font-medium mb-1">Wallet</p>
                <p className="text-sm font-mono text-white mt-2">{truncateAddress(wallet.address!)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Link
            href="/upload"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-cyan-500/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Upload Data</h3>
            <p className="text-xs text-slate-400">Upload EEG recordings and register on-chain</p>
          </Link>

          <Link
            href="/explore"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-violet-500/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Explore Datasets</h3>
            <p className="text-xs text-slate-400">Browse, purchase access, and decrypt EEG data</p>
          </Link>

          <Link
            href="/profile"
            className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-white mb-1">View Earnings</h3>
            <p className="text-xs text-slate-400">Track your contributor earnings and datasets</p>
          </Link>
        </div>

        {/* Recent On-Chain Activity */}
        <h2 className="text-lg font-semibold text-white mb-4">Recent On-Chain Datasets</h2>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && flowDatasets.length === 0 && storachaDatasets.length === 0 && (
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

        {/* On-chain datasets list */}
        {flowDatasets.length > 0 && (
          <div className="grid gap-3">
            {flowDatasets.slice(0, 10).map((d) => (
              <div key={d.id} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">Dataset #{d.id}</p>
                  <p className="text-xs text-slate-500">
                    by {truncateAddress(d.contributor)} / {new Date(d.registeredAt * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-emerald-400">
                    {Number(d.price) / 1e18 > 0 ? `${Number(d.price) / 1e18} FLOW` : "Free"}
                  </p>
                  <p className="text-xs font-mono text-slate-600">{truncateCid(d.dataCID)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Storacha datasets fallback (if no on-chain data) */}
        {flowDatasets.length === 0 && storachaDatasets.length > 0 && (
          <div className="grid gap-3">
            {storachaDatasets.slice(0, 10).map((d) => (
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
