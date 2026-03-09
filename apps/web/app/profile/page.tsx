"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import EmptyState from "@/components/layout/EmptyState";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { SkeletonBlock, SkeletonTable, SkeletonRow } from "@/components/layout/Skeleton";
import { useFlow } from "@/hooks/useFlow";
import { useWorldID } from "@/hooks/useWorldID";
import type { FlowDataset } from "@/types";

/* ── Helpers ──────────────────────────────────────────────────────── */

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatFlow(value: bigint): string {
  const eth = Number(value) / 1e18;
  if (eth === 0) return "0";
  return eth.toFixed(eth < 0.01 ? 4 : 2);
}

function truncateCid(cid: string, chars = 8): string {
  if (cid.length <= chars * 2 + 3) return cid;
  return `${cid.slice(0, chars)}...${cid.slice(-chars)}`;
}

/* ── Mock researcher data ─────────────────────────────────────────── */

function generateResearcherData(address: string | null) {
  if (!address) return { accessed: [], licenses: [] };

  return {
    accessed: [
      { id: 1, name: "Motor Imagery - Left Hand", contributor: "0xa1b2...c3d4", accessedAt: "2026-02-28", expiresAt: "2026-03-30" },
      { id: 3, name: "Resting State EEG Alpha", contributor: "0xe5f6...g7h8", accessedAt: "2026-03-01", expiresAt: "2026-03-31" },
      { id: 5, name: "P300 Speller BCI Task", contributor: "0xi9j0...k1l2", accessedAt: "2026-03-05", expiresAt: "2026-04-04" },
    ],
    licenses: [
      { datasetId: 1, purchasedAt: "2026-02-28", expiresAt: "2026-03-30", status: "active" as const },
      { datasetId: 3, purchasedAt: "2026-03-01", expiresAt: "2026-03-31", status: "active" as const },
      { datasetId: 5, purchasedAt: "2026-03-05", expiresAt: "2026-04-04", status: "active" as const },
    ],
  };
}

/* ── Tab Button ───────────────────────────────────────────────────── */

function TabButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
          : "text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent"
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      {label}
    </button>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"contributor" | "researcher">("contributor");

  const {
    wallet,
    connectWallet,
    disconnectWallet,
    stats,
    listDatasets,
    isReady,
    isDemo,
    isLoading,
  } = useFlow();

  const { isVerified: worldIDVerified, nullifierHash, reset: resetWorldID } = useWorldID();

  const [allDatasets, setAllDatasets] = useState<FlowDataset[]>([]);
  const [loading, setLoading] = useState(true);

  // Load datasets
  useEffect(() => {
    if (!isReady) return;
    listDatasets()
      .then(setAllDatasets)
      .finally(() => setLoading(false));
  }, [isReady, listDatasets]);

  const myDatasets = useMemo(
    () =>
      wallet.address
        ? allDatasets.filter(
            (d) => d.contributor.toLowerCase() === wallet.address!.toLowerCase()
          )
        : [],
    [allDatasets, wallet.address]
  );

  const researcherData = useMemo(
    () => generateResearcherData(wallet.address),
    [wallet.address]
  );

  const joinDate = useMemo(() => {
    if (myDatasets.length === 0) return "Recently joined";
    const earliest = Math.min(...myDatasets.map((d) => d.registeredAt));
    return new Date(earliest * 1000).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [myDatasets]);

  const impactScore = stats.datasetCount * 25 + (worldIDVerified ? 50 : 0) + Math.floor(Number(stats.totalEarnings) / 1e16);

  return (
    <ErrorBoundary>
      <main className="min-h-screen">
        <Navbar
          wallet={wallet}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
          isLoading={isLoading}
        />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 page-transition">
          {/* Profile Header */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                {worldIDVerified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white font-heading mb-1">
                  {wallet.isConnected ? "Researcher" : "Not Connected"}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {wallet.isConnected && wallet.address && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-xs">{truncateAddress(wallet.address)}</span>
                    </span>
                  )}
                  <span className="text-slate-600">|</span>
                  {worldIDVerified ? (
                    <span className="flex items-center gap-1 text-emerald-400 text-xs">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      Verified Human
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Unverified</span>
                  )}
                  <span className="text-slate-600">|</span>
                  <span className="text-xs text-slate-500">Joined {joinDate}</span>
                </div>
              </div>

              {/* Connect/Disconnect */}
              <div className="flex gap-2">
                {wallet.isConnected ? (
                  <button
                    onClick={disconnectWallet}
                    className="px-4 py-2 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Connecting..." : "Connect Wallet"}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800">
              <div className="text-center">
                <p className="text-2xl font-bold text-white font-heading">{stats.datasetCount}</p>
                <p className="text-xs text-slate-500">Datasets</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400 font-heading">
                  {formatFlow(stats.totalEarnings)}
                </p>
                <p className="text-xs text-slate-500">FLOW Earned</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-400 font-heading">
                  {researcherData.licenses.length}
                </p>
                <p className="text-xs text-slate-500">Licenses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-400 font-heading">{impactScore}</p>
                <p className="text-xs text-slate-500">Impact Score</p>
              </div>
            </div>
          </div>

          {/* Demo mode */}
          {isDemo && (
            <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-amber-300">Demo Mode — showing simulated data</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            <TabButton
              active={activeTab === "contributor"}
              label="As Contributor"
              icon="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              onClick={() => setActiveTab("contributor")}
            />
            <TabButton
              active={activeTab === "researcher"}
              label="As Researcher"
              icon="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              onClick={() => setActiveTab("researcher")}
            />
          </div>

          {/* ── Contributor Tab ── */}
          {activeTab === "contributor" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Earnings Breakdown */}
              <div>
                <h2 className="text-lg font-semibold text-white font-heading mb-4">Earnings Breakdown</h2>
                {loading ? (
                  <div className="space-y-3">
                    <SkeletonBlock />
                    <SkeletonBlock />
                  </div>
                ) : myDatasets.length === 0 ? (
                  <EmptyState
                    title="No earnings yet"
                    description="Upload datasets and set a price to start earning FLOW from researchers."
                    actionLabel="Upload Dataset"
                    actionHref="/upload"
                  />
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="space-y-4">
                      {myDatasets.map((ds) => {
                        const priceFlow = Number(ds.price) / 1e18;
                        const totalEarnings = Number(stats.totalEarnings) / 1e18;
                        const pct = totalEarnings > 0 ? (priceFlow / totalEarnings) * 100 : 0;

                        return (
                          <div key={ds.id}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white font-medium">Dataset #{ds.id}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  ds.active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-500"
                                }`}>
                                  {ds.active ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <span className="text-sm text-emerald-400 font-medium">
                                {priceFlow > 0 ? `${priceFlow} FLOW` : "Free"}
                              </span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(priceFlow > 0 ? pct : 5, 5)}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1 font-mono">{truncateCid(ds.dataCID)}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-sm text-slate-400">Total Earnings</span>
                      <span className="text-lg font-bold text-emerald-400 font-heading">
                        {formatFlow(stats.totalEarnings)} FLOW
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* My Datasets */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white font-heading">My Datasets</h2>
                  <Link
                    href="/upload"
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Upload New
                  </Link>
                </div>

                {loading ? (
                  <SkeletonTable rows={3} />
                ) : myDatasets.length === 0 ? (
                  <EmptyState
                    title="No datasets yet"
                    description={
                      wallet.isConnected
                        ? "Upload your first EEG dataset to start earning."
                        : "Connect your wallet to see your datasets."
                    }
                    actionLabel="Upload Dataset"
                    actionHref="/upload"
                  />
                ) : (
                  <div className="space-y-3">
                    {myDatasets.map((ds) => (
                      <div
                        key={ds.id}
                        className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">Dataset #{ds.id}</p>
                          <p className="text-xs text-slate-500 font-mono truncate">{truncateCid(ds.dataCID, 12)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-medium ${Number(ds.price) > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                            {Number(ds.price) / 1e18 > 0 ? `${Number(ds.price) / 1e18} FLOW` : "Free"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(ds.registeredAt * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Impact Certificates */}
              <div>
                <h2 className="text-lg font-semibold text-white font-heading mb-4">Impact Certificates</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Data Contributor</p>
                        <p className="text-xs text-slate-500">{stats.datasetCount} datasets shared</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Contributed neural data to the decentralized commons, advancing BCI research.
                    </p>
                  </div>

                  {worldIDVerified && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">Verified Human</p>
                          <p className="text-xs text-slate-500">World ID verified</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        Proven unique human identity via World ID, preventing sybil attacks.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Researcher Tab ── */}
          {activeTab === "researcher" && (
            <div className="space-y-6 animate-fadeIn">
              {/* Accessed Datasets */}
              <div>
                <h2 className="text-lg font-semibold text-white font-heading mb-4">Accessed Datasets</h2>
                {!wallet.isConnected ? (
                  <EmptyState
                    title="Not connected"
                    description="Connect your wallet to view datasets you've purchased access to."
                    actionLabel="Connect Wallet"
                    onAction={connectWallet}
                  />
                ) : researcherData.accessed.length === 0 ? (
                  <EmptyState
                    title="No accessed datasets"
                    description="Browse the explore page to find and purchase access to EEG datasets."
                    actionLabel="Explore Datasets"
                    actionHref="/explore"
                  />
                ) : (
                  <div className="space-y-3">
                    {researcherData.accessed.map((ds) => (
                      <div
                        key={ds.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{ds.name}</p>
                            <p className="text-xs text-slate-500">by {ds.contributor}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 sm:flex-shrink-0 pl-13 sm:pl-0">
                          <div className="text-xs text-slate-400">
                            <span className="text-slate-500">Accessed:</span> {ds.accessedAt}
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Licenses */}
              <div>
                <h2 className="text-lg font-semibold text-white font-heading mb-4">Active Licenses</h2>
                {!wallet.isConnected ? (
                  <SkeletonTable rows={2} />
                ) : researcherData.licenses.length === 0 ? (
                  <EmptyState
                    title="No active licenses"
                    description="Purchase access to datasets to receive time-limited licenses."
                    actionLabel="Explore Datasets"
                    actionHref="/explore"
                  />
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-800">
                            <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">Dataset</th>
                            <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">Purchased</th>
                            <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">Expires</th>
                            <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {researcherData.licenses.map((lic) => {
                            const daysLeft = Math.ceil(
                              (new Date(lic.expiresAt).getTime() - Date.now()) / 86400000
                            );
                            return (
                              <tr key={lic.datasetId} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-5 py-4 font-medium text-white">Dataset #{lic.datasetId}</td>
                                <td className="px-5 py-4 text-slate-400">{lic.purchasedAt}</td>
                                <td className="px-5 py-4 text-slate-400">
                                  {lic.expiresAt}
                                  <span className={`ml-2 text-xs ${daysLeft > 7 ? "text-emerald-400" : "text-amber-400"}`}>
                                    ({daysLeft}d left)
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    Active
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                      {researcherData.licenses.map((lic) => {
                        const daysLeft = Math.ceil(
                          (new Date(lic.expiresAt).getTime() - Date.now()) / 86400000
                        );
                        return (
                          <div key={lic.datasetId} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-white">Dataset #{lic.datasetId}</span>
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                                Active
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-500">Purchased:</span>{" "}
                                <span className="text-slate-300">{lic.purchasedAt}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Expires:</span>{" "}
                                <span className={daysLeft > 7 ? "text-emerald-400" : "text-amber-400"}>
                                  {daysLeft}d left
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
}
