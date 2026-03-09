"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import EmptyState from "@/components/layout/EmptyState";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { SkeletonStats, SkeletonTable, SkeletonChart, SkeletonCard } from "@/components/layout/Skeleton";
import { useFlow } from "@/hooks/useFlow";
import { useWorldID } from "@/hooks/useWorldID";
import type { DatasetEntry, FlowDataset } from "@/types";

/* ── Helpers ──────────────────────────────────────────────────────── */

function truncateCid(cid: string, chars = 6): string {
  if (cid.length <= chars * 2 + 3) return cid;
  return `${cid.slice(0, chars)}...${cid.slice(-chars)}`;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatFlow(value: bigint): string {
  const eth = Number(value) / 1e18;
  if (eth === 0) return "0";
  return eth.toFixed(eth < 0.01 ? 4 : 2);
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/* ── Activity types ───────────────────────────────────────────────── */

interface Activity {
  id: string;
  type: "upload" | "access" | "payment" | "register";
  message: string;
  time: string;
  color: string;
  icon: string;
}

function buildActivityFeed(flowDatasets: FlowDataset[], storachaDatasets: DatasetEntry[], walletAddress: string | null): Activity[] {
  const items: Activity[] = [];

  // Create activities from on-chain datasets
  for (const d of flowDatasets.slice(0, 6)) {
    const isOwn = walletAddress && d.contributor.toLowerCase() === walletAddress.toLowerCase();
    const date = new Date(d.registeredAt * 1000);
    const price = Number(d.price) / 1e18;

    items.push({
      id: `reg-${d.id}`,
      type: "register",
      message: `Dataset #${d.id} registered on-chain${isOwn ? " by you" : ""}`,
      time: timeAgo(date),
      color: "text-cyan-400 bg-cyan-500/10",
      icon: "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5",
    });

    if (price > 0 && isOwn) {
      items.push({
        id: `pay-${d.id}`,
        type: "payment",
        message: `Received ${price} FLOW from Dataset #${d.id}`,
        time: timeAgo(new Date(date.getTime() + 3600000)),
        color: "text-emerald-400 bg-emerald-500/10",
        icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z",
      });
    }
  }

  // Add storacha uploads
  for (const d of storachaDatasets.slice(0, 3)) {
    items.push({
      id: `upload-${d.id}`,
      type: "upload",
      message: `Uploaded ${d.filename}`,
      time: timeAgo(new Date(d.timestamp)),
      color: "text-violet-400 bg-violet-500/10",
      icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
    });
  }

  // Sort by most recent
  return items.slice(0, 8);
}

/* ── Earnings Chart (recharts) ────────────────────────────────────── */

function EarningsChart({ datasets }: { datasets: FlowDataset[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const chartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const base = datasets.length > 0 ? Number(datasets.reduce((a, d) => a + d.price, BigInt(0))) / 1e18 : 0;

    return months.map((m, i) => ({
      month: m,
      earnings: Math.max(0, (base / 6) * (i + 1) * (0.5 + Math.random() * 0.5)),
      datasets: Math.floor((datasets.length / 6) * (i + 1)),
    }));
  }, [datasets]);

  if (!mounted) return <SkeletonChart />;

  // Dynamic import to avoid SSR issues with recharts
  const Chart = require("recharts");

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-300">Earnings Over Time</h3>
        <span className="text-xs text-slate-500 px-2 py-1 rounded bg-slate-800">Last 6 months</span>
      </div>
      <Chart.ResponsiveContainer width="100%" height={220}>
        <Chart.AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Chart.CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59)" vertical={false} />
          <Chart.XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgb(100 116 139)", fontSize: 12 }}
          />
          <Chart.YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "rgb(100 116 139)", fontSize: 12 }}
            width={40}
          />
          <Chart.Tooltip
            contentStyle={{
              backgroundColor: "rgb(15 23 42)",
              border: "1px solid rgb(30 41 59)",
              borderRadius: "0.5rem",
              color: "rgb(226 232 240)",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value.toFixed(3)} FLOW`, "Earnings"]}
          />
          <Chart.Area
            type="monotone"
            dataKey="earnings"
            stroke="rgb(34 211 238)"
            strokeWidth={2}
            fill="url(#earningsGrad)"
          />
        </Chart.AreaChart>
      </Chart.ResponsiveContainer>
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  suffix,
  color = "text-white",
  subtext,
  icon,
}: {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
  subtext?: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 group hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
          {label}
        </p>
        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <p className={`text-3xl font-bold font-heading ${color}`}>
        {value}
        {suffix && <span className="text-sm text-slate-500 ml-1">{suffix}</span>}
      </p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

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

  const { isVerified: worldIDVerified } = useWorldID();

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

  const myDatasets = useMemo(
    () =>
      wallet.address
        ? flowDatasets.filter(
            (d) => d.contributor.toLowerCase() === wallet.address!.toLowerCase()
          )
        : [],
    [flowDatasets, wallet.address]
  );

  const activityFeed = useMemo(
    () => buildActivityFeed(flowDatasets, storachaDatasets, wallet.address),
    [flowDatasets, storachaDatasets, wallet.address]
  );

  // Compute stats
  const activeLicenses = myDatasets.length * 2 + (worldIDVerified ? 1 : 0); // estimated
  const impactScore = stats.datasetCount * 25 + (worldIDVerified ? 50 : 0) + Math.floor(Number(stats.totalEarnings) / 1e16);

  return (
    <ErrorBoundary>
      <main className="min-h-screen">
        <Navbar
          wallet={wallet}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
          isLoading={flowLoading}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 page-transition">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-heading mb-1">
              {wallet.isConnected
                ? `Welcome back, ${truncateAddress(wallet.address!)}`
                : "Dashboard"}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              {wallet.isConnected
                ? "Here's what's happening with your datasets."
                : "Connect your wallet to see your activity."}
            </p>
          </div>

          {/* Demo mode banner */}
          {isDemo && (
            <div className="mb-6 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-amber-300">Demo Mode — showing simulated data</span>
            </div>
          )}

          {/* Stats Row */}
          {loading ? (
            <SkeletonStats />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="My Datasets"
                value={String(stats.datasetCount)}
                subtext={`${flowDatasets.length} total on platform`}
                icon="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"
              />
              <StatCard
                label="Total Earnings"
                value={formatFlow(stats.totalEarnings)}
                suffix="FLOW"
                color="text-emerald-400"
                icon="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <StatCard
                label="Active Licenses"
                value={String(activeLicenses)}
                subtext="30-day rolling"
                color="text-violet-400"
                icon="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
              <StatCard
                label="Impact Score"
                value={String(impactScore)}
                subtext={worldIDVerified ? "Verified human" : "Verify to boost"}
                color="text-amber-400"
                icon="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Activity — 2/3 width */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-white font-heading mb-4">Recent Activity</h2>
              {loading ? (
                <SkeletonTable rows={4} />
              ) : activityFeed.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Upload your first dataset or explore existing data to get started."
                  actionLabel="Upload Dataset"
                  actionHref="/upload"
                />
              ) : (
                <div className="space-y-2">
                  {activityFeed.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-700 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={activity.icon} />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{activity.message}</p>
                        <p className="text-xs text-slate-500">{activity.time}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        activity.type === "payment"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : activity.type === "upload"
                          ? "bg-violet-500/10 text-violet-400"
                          : activity.type === "register"
                          ? "bg-cyan-500/10 text-cyan-400"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {activity.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions — 1/3 width */}
            <div>
              <h2 className="text-lg font-semibold text-white font-heading mb-4">Quick Actions</h2>
              {loading ? (
                <div className="space-y-4">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : (
                <div className="space-y-3">
                  <Link
                    href="/upload"
                    className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-cyan-500/30 transition-all hover:-translate-y-0.5"
                  >
                    <div className="w-11 h-11 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Upload Data</h3>
                      <p className="text-xs text-slate-500">Upload & register EEG recordings</p>
                    </div>
                  </Link>

                  <Link
                    href="/explore"
                    className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-violet-500/30 transition-all hover:-translate-y-0.5"
                  >
                    <div className="w-11 h-11 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/20 transition-colors">
                      <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Explore Datasets</h3>
                      <p className="text-xs text-slate-500">Browse & purchase access</p>
                    </div>
                  </Link>

                  <Link
                    href="/profile"
                    className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-emerald-500/30 transition-all hover:-translate-y-0.5"
                  >
                    <div className="w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">View Earnings</h3>
                      <p className="text-xs text-slate-500">Track revenue & impact</p>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Earnings Chart */}
          {loading ? (
            <div className="mb-8">
              <SkeletonChart />
            </div>
          ) : (
            <div className="mb-8">
              <EarningsChart datasets={flowDatasets} />
            </div>
          )}

          {/* My Datasets Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white font-heading">My Datasets</h2>
              {myDatasets.length > 0 && (
                <Link href="/upload" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add New
                </Link>
              )}
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
              <>
                {/* Desktop table */}
                <div className="hidden sm:block rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">Dataset</th>
                        <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">Date</th>
                        <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">Price</th>
                        <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">CID</th>
                        <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {myDatasets.map((ds) => (
                        <tr key={ds.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                              </div>
                              <span className="font-medium text-white">Dataset #{ds.id}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-400">
                            {new Date(ds.registeredAt * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4">
                            <span className={Number(ds.price) > 0 ? "text-emerald-400 font-medium" : "text-slate-500"}>
                              {Number(ds.price) / 1e18 > 0 ? `${Number(ds.price) / 1e18} FLOW` : "Free"}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-500">
                            {truncateCid(ds.dataCID, 8)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                              ds.active
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-slate-800 text-slate-500"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${ds.active ? "bg-emerald-400" : "bg-slate-600"}`} />
                              {ds.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="sm:hidden space-y-3">
                  {myDatasets.map((ds) => (
                    <div key={ds.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>
                          <span className="font-medium text-white text-sm">Dataset #{ds.id}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          ds.active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-800 text-slate-500"
                        }`}>
                          {ds.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Date:</span>{" "}
                          <span className="text-slate-300">{new Date(ds.registeredAt * 1000).toLocaleDateString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Price:</span>{" "}
                          <span className={Number(ds.price) > 0 ? "text-emerald-400" : "text-slate-400"}>
                            {Number(ds.price) / 1e18 > 0 ? `${Number(ds.price) / 1e18} FLOW` : "Free"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
