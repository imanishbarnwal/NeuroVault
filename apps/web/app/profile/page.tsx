"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useFlow } from "@/hooks/useFlow";
import type { FlowDataset } from "@/types";

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatFlow(value: bigint): string {
  const eth = Number(value) / 1e18;
  if (eth === 0) return "0";
  return eth.toFixed(eth < 0.01 ? 4 : 2);
}

export default function ProfilePage() {
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

  const [myDatasets, setMyDatasets] = useState<FlowDataset[]>([]);
  const [allDatasets, setAllDatasets] = useState<FlowDataset[]>([]);

  // Load datasets when ready
  useEffect(() => {
    if (!isReady) return;
    listDatasets().then((ds) => {
      setAllDatasets(ds);
      if (wallet.address) {
        setMyDatasets(
          ds.filter(
            (d) => d.contributor.toLowerCase() === wallet.address!.toLowerCase()
          )
        );
      }
    });
  }, [isReady, listDatasets, wallet.address]);

  // Refresh my datasets when wallet changes
  useEffect(() => {
    if (wallet.address && allDatasets.length > 0) {
      setMyDatasets(
        allDatasets.filter(
          (d) => d.contributor.toLowerCase() === wallet.address!.toLowerCase()
        )
      );
    } else {
      setMyDatasets([]);
    }
  }, [wallet.address, allDatasets]);

  const totalEarningsFlow = formatFlow(stats.totalEarnings);

  return (
    <main className="min-h-screen">
      <Navbar
        wallet={wallet}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isLoading={isLoading}
      />

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-slate-400 mb-8">Your researcher identity, wallet, and on-chain activity.</p>

        {/* Profile card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {wallet.isConnected ? "Researcher" : "Not Connected"}
              </h2>
              <p className="text-sm text-slate-500">
                {wallet.isConnected && wallet.address
                  ? truncateAddress(wallet.address)
                  : "Connect wallet to view your activity"}
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {/* Wallet connection */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Wallet</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {wallet.isConnected
                      ? `Connected to Flow EVM Testnet (Chain ${wallet.chainId})`
                      : "Connect a wallet to sign uploads and manage access"}
                  </p>
                </div>
                {wallet.isConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs font-mono text-emerald-400">
                        {truncateAddress(wallet.address!)}
                      </span>
                    </span>
                    <button
                      onClick={disconnectWallet}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
            </div>

            {/* Mode indicator */}
            {isDemo && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-amber-300">Demo Mode — showing simulated data</span>
              </div>
            )}
          </div>
        </div>

        {/* Contributor Stats */}
        <h2 className="text-lg font-semibold text-white mb-4">Contributor Stats</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Datasets</p>
            <p className="text-3xl font-bold text-white">{stats.datasetCount}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">Total Earnings</p>
            <p className="text-3xl font-bold text-emerald-400">{totalEarningsFlow} <span className="text-sm text-slate-500">FLOW</span></p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-1">On-Chain ID</p>
            <p className="text-3xl font-bold text-white">
              {stats.datasetIds.length > 0 ? `#${stats.datasetIds[stats.datasetIds.length - 1]}` : "—"}
            </p>
          </div>
        </div>

        {/* Earnings Visual */}
        {stats.datasetCount > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Earnings by Dataset</h3>
            <div className="space-y-3">
              {myDatasets.map((ds) => {
                const priceFlow = Number(ds.price) / 1e18;
                return (
                  <div key={ds.id} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-20 flex-shrink-0">
                      Dataset #{ds.id}
                    </span>
                    <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(priceFlow > 0 ? 30 : 5, 5)}%` }}
                      >
                        <span className="text-[10px] text-white font-medium">
                          {priceFlow > 0 ? `${priceFlow} FLOW` : "Free"}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-mono w-28 text-right truncate">
                      {ds.dataCID.slice(0, 12)}...
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My Datasets */}
        <h2 className="text-lg font-semibold text-white mb-4">My Datasets</h2>
        {myDatasets.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8 text-center">
            <svg className="w-12 h-12 text-slate-700 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
            <p className="text-sm text-slate-400">
              {wallet.isConnected
                ? "No datasets uploaded yet. Upload your first dataset to start earning."
                : "Connect your wallet to see your datasets."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
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
                  <p className="text-xs text-slate-500 font-mono truncate">{ds.dataCID}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-emerald-400">
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

        {/* Settings */}
        <h2 className="text-lg font-semibold text-white mt-8 mb-4">Settings</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Default Access Level</p>
              <p className="text-xs text-slate-500">Applied to new uploads</p>
            </div>
            <select className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50">
              <option>Public</option>
              <option>Restricted</option>
              <option>Private</option>
            </select>
          </div>
          <div className="border-t border-slate-800" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Default Price</p>
              <p className="text-xs text-slate-500">Default FLOW price for new datasets</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue="0.1"
                step="0.01"
                min="0"
                className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 text-right focus:outline-none focus:border-cyan-500/50"
              />
              <span className="text-xs text-slate-500">FLOW</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
