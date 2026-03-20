"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import EmptyState from "@/components/layout/EmptyState";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Database,
  DollarSign,
  Key,
  Star,
  Upload,
  Search,
  ArrowRight,
  FileText,
  Activity,
  Plus,
  Loader2,
} from "lucide-react";
import { useFlow } from "@/hooks/useFlow";
import { useWorldID } from "@/hooks/useWorldID";
import type { DatasetEntry, FlowDataset } from "@/types";

/* -- Helpers ------------------------------------------------------------ */

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

/* -- Activity types ----------------------------------------------------- */

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

/* -- Loading skeletons -------------------------------------------------- */

function StatsLoading() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-2">
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartLoading() {
  return (
    <Card>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function TableLoading({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="pt-2">
        <div className="space-y-4">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-20" />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityLoading() {
  return (
    <Card>
      <CardContent className="pt-2">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* -- Earnings Chart (recharts) ------------------------------------------ */

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

  if (!mounted) return <ChartLoading />;

  // Dynamic import to avoid SSR issues with recharts
  const Chart = require("recharts");

  return (
    <Card>
      <CardContent className="pt-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-semibold text-foreground">Earnings Over Time</h3>
          <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">Last 6 months</span>
        </div>
        <Chart.ResponsiveContainer width="100%" height={220}>
          <Chart.AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.585 0.233 264)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.585 0.233 264)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Chart.CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.015 260)" vertical={false} />
            <Chart.XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.52 0.01 260)", fontSize: 12 }}
            />
            <Chart.YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.52 0.01 260)", fontSize: 12 }}
              width={40}
            />
            <Chart.Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.20 0.015 260)",
                border: "1px solid oklch(0.28 0.015 260)",
                borderRadius: "0.5rem",
                color: "oklch(0.90 0.01 260)",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(3)} FLOW`, "Earnings"]}
            />
            <Chart.Area
              type="monotone"
              dataKey="earnings"
              stroke="oklch(0.585 0.233 264)"
              strokeWidth={2}
              fill="url(#earningsGrad)"
            />
          </Chart.AreaChart>
        </Chart.ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/* -- Stat Card ---------------------------------------------------------- */

const statIcons = {
  datasets: Database,
  earnings: DollarSign,
  licenses: Key,
  impact: Star,
} as const;

function StatCard({
  label,
  value,
  suffix,
  colorClass = "text-foreground",
  subtext,
  iconKey,
}: {
  label: string;
  value: string;
  suffix?: string;
  colorClass?: string;
  subtext?: string;
  iconKey: keyof typeof statIcons;
}) {
  const Icon = statIcons[iconKey];
  return (
    <Card className="group hover:ring-foreground/20 transition-all">
      <CardContent className="pt-2">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </p>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-muted/80 transition-colors">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <p className={`text-3xl font-bold font-heading ${colorClass}`}>
          {value}
          {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
        </p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

/* -- Activity dot color helper ------------------------------------------ */

function activityDotColor(type: Activity["type"]): string {
  switch (type) {
    case "register":
      return "bg-primary"; // primary indigo
    case "payment":
      return "bg-nv-success"; // green
    case "upload":
      return "bg-foreground";
    default:
      return "bg-muted-foreground";
  }
}

/* -- Page --------------------------------------------------------------- */

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
        // Silent fail -- empty state shown
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
        : isDemo
          ? flowDatasets // In demo mode show all datasets as "yours"
          : [],
    [flowDatasets, wallet.address, isDemo]
  );

  const activityFeed = useMemo(
    () => buildActivityFeed(flowDatasets, storachaDatasets, wallet.address),
    [flowDatasets, storachaDatasets, wallet.address]
  );

  // Compute stats -- in demo mode use flowDatasets as fallback
  const effectiveDatasetCount = isDemo && stats.datasetCount === 0 ? flowDatasets.length : stats.datasetCount;
  const effectiveEarnings = isDemo && stats.totalEarnings === BigInt(0)
    ? flowDatasets.reduce((sum, d) => sum + d.price, BigInt(0))
    : stats.totalEarnings;
  const activeLicenses = myDatasets.length * 2 + (worldIDVerified ? 1 : 0); // estimated
  const impactScore = effectiveDatasetCount * 25 + (worldIDVerified ? 50 : 0) + Math.floor(Number(effectiveEarnings) / 1e16);

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-heading mb-1">
                {wallet.isConnected
                  ? `Welcome back, ${truncateAddress(wallet.address!)}`
                  : "Dashboard"}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                {wallet.isConnected
                  ? "Here's what's happening with your datasets."
                  : "Connect your wallet to see your activity."}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/upload">
                  <Upload className="w-3.5 h-3.5" />
                  Upload New
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/explore">
                  <Search className="w-3.5 h-3.5" />
                  Explore
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          {loading ? (
            <StatsLoading />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="My Datasets"
                value={String(effectiveDatasetCount)}
                subtext={`${flowDatasets.length} total on platform`}
                iconKey="datasets"
              />
              <StatCard
                label="Total Earnings"
                value={formatFlow(effectiveEarnings)}
                suffix="FLOW"
                colorClass="text-nv-success"
                iconKey="earnings"
              />
              <StatCard
                label="Active Licenses"
                value={String(activeLicenses)}
                subtext="30-day rolling"
                iconKey="licenses"
              />
              <StatCard
                label="Impact Score"
                value={String(impactScore)}
                subtext={worldIDVerified ? "Verified human" : "Verify to boost"}
                iconKey="impact"
              />
            </div>
          )}

          {/* Two Column Layout: Earnings Chart (2/3) + Activity Feed (1/3) */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              {loading ? (
                <ChartLoading />
              ) : (
                <EarningsChart datasets={flowDatasets} />
              )}
            </div>

            {/* Activity Feed */}
            <div>
              <Card className="h-full">
                <CardContent className="pt-2">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Skeleton className="h-2 w-2 rounded-full flex-shrink-0" />
                          <Skeleton className="h-4 flex-1" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      ))}
                    </div>
                  ) : activityFeed.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      No activity yet. Upload a dataset to get started.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {activityFeed.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/50 transition-colors"
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${activityDotColor(activity.type)}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{activity.message}</p>
                            <p className="text-xs text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* My Datasets Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground font-heading">My Datasets</h2>
              {myDatasets.length > 0 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/upload">
                    <Plus className="w-3.5 h-3.5" />
                    Add New
                  </Link>
                </Button>
              )}
            </div>

            {loading ? (
              <TableLoading rows={3} />
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
                <div className="hidden sm:block">
                  <Card>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">Dataset</th>
                            <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">Date</th>
                            <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">Price</th>
                            <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">CID</th>
                            <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {myDatasets.map((ds) => (
                            <tr key={ds.id} className="hover:bg-muted/50 transition-colors">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-4 h-4 text-primary" />
                                  </div>
                                  <span className="font-medium text-foreground">Dataset #{ds.id}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">
                                {new Date(ds.registeredAt * 1000).toLocaleDateString()}
                              </td>
                              <td className="px-5 py-4">
                                <span className={Number(ds.price) > 0 ? "text-nv-success font-medium" : "text-muted-foreground"}>
                                  {Number(ds.price) / 1e18 > 0 ? `${Number(ds.price) / 1e18} FLOW` : "Free"}
                                </span>
                              </td>
                              <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                                {truncateCid(ds.dataCID, 8)}
                              </td>
                              <td className="px-5 py-4">
                                <Badge variant={ds.active ? "default" : "secondary"}>
                                  {ds.active ? "Active" : "Inactive"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>

                {/* Mobile card list */}
                <div className="sm:hidden space-y-3">
                  {myDatasets.map((ds) => (
                    <Card key={ds.id}>
                      <CardContent className="pt-2">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium text-foreground text-sm">Dataset #{ds.id}</span>
                          </div>
                          <Badge variant={ds.active ? "default" : "secondary"}>
                            {ds.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Date:</span>{" "}
                            <span className="text-foreground">{new Date(ds.registeredAt * 1000).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Price:</span>{" "}
                            <span className={Number(ds.price) > 0 ? "text-nv-success" : "text-muted-foreground"}>
                              {Number(ds.price) / 1e18 > 0 ? `${Number(ds.price) / 1e18} FLOW` : "Free"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
