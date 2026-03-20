"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import EmptyState from "@/components/layout/EmptyState";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useFlow } from "@/hooks/useFlow";
import { useWorldID } from "@/hooks/useWorldID";
import {
  User,
  Database,
  DollarSign,
  Key,
  Star,
  Shield,
  Upload,
  Plus,
  FileText,
  Award,
  CheckCircle,
} from "lucide-react";
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

/* ── Page ─────────────────────────────────────────────────────────── */

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
          <Card className="mb-8">
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                  {worldIDVerified && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-nv-success border-2 border-card flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-foreground font-heading mb-1">
                    {wallet.isConnected ? "Researcher" : "Not Connected"}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {wallet.isConnected && wallet.address && (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-2 h-2 rounded-full bg-nv-success" />
                        <span className="font-mono text-xs">{truncateAddress(wallet.address)}</span>
                      </span>
                    )}
                    <span className="text-border">|</span>
                    {worldIDVerified ? (
                      <Badge variant="default" className="gap-1">
                        <Shield className="w-3 h-3" />
                        Verified Human
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Unverified</Badge>
                    )}
                    <span className="text-border">|</span>
                    <span className="text-xs text-muted-foreground">Joined {joinDate}</span>
                  </div>
                </div>

                {/* Connect/Disconnect */}
                <div className="flex gap-2">
                  {wallet.isConnected ? (
                    <Button variant="outline" size="sm" onClick={disconnectWallet}>
                      Disconnect
                    </Button>
                  ) : (
                    <Button size="sm" onClick={connectWallet} disabled={isLoading}>
                      {isLoading ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <Separator className="my-6" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Database className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground font-heading">{stats.datasetCount}</p>
                  <p className="text-xs text-muted-foreground">Datasets</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <DollarSign className="w-4 h-4 text-nv-success" />
                  </div>
                  <p className="text-2xl font-bold text-nv-success font-heading">
                    {formatFlow(stats.totalEarnings)}
                  </p>
                  <p className="text-xs text-muted-foreground">FLOW Earned</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Key className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground font-heading">
                    {researcherData.licenses.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Licenses</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Star className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold text-foreground font-heading">{impactScore}</p>
                  <p className="text-xs text-muted-foreground">Impact Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="contributor">
            <TabsList className="mb-6">
              <TabsTrigger value="contributor">
                <Upload className="w-4 h-4" />
                Contributor
              </TabsTrigger>
              <TabsTrigger value="researcher">
                <FileText className="w-4 h-4" />
                Researcher
              </TabsTrigger>
            </TabsList>

            {/* ── Contributor Tab ── */}
            <TabsContent value="contributor">
              <div className="space-y-6">
                {/* Earnings Breakdown */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground font-heading mb-4">Earnings Breakdown</h2>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : myDatasets.length === 0 ? (
                    <EmptyState
                      title="No earnings yet"
                      description="Upload datasets and set a price to start earning FLOW from researchers."
                      actionLabel="Upload Dataset"
                      actionHref="/upload"
                    />
                  ) : (
                    <Card>
                      <CardContent>
                        <div className="space-y-4">
                          {myDatasets.map((ds) => {
                            const priceFlow = Number(ds.price) / 1e18;
                            const totalEarnings = Number(stats.totalEarnings) / 1e18;
                            const pct = totalEarnings > 0 ? (priceFlow / totalEarnings) * 100 : 0;

                            return (
                              <div key={ds.id}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-foreground font-medium">Dataset #{ds.id}</span>
                                    <Badge variant={ds.active ? "default" : "secondary"}>
                                      {ds.active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                  <span className="text-sm text-nv-success font-medium">
                                    {priceFlow > 0 ? `${priceFlow} FLOW` : "Free"}
                                  </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(priceFlow > 0 ? pct : 5, 5)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 font-mono">{truncateCid(ds.dataCID)}</p>
                              </div>
                            );
                          })}
                        </div>

                        <Separator className="my-4" />
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Earnings</span>
                          <span className="text-lg font-bold text-nv-success font-heading">
                            {formatFlow(stats.totalEarnings)} FLOW
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* My Datasets */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground font-heading">My Datasets</h2>
                    <Link href="/upload" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                      Upload New
                    </Link>
                  </div>

                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
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
                        <Card key={ds.id}>
                          <CardContent>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">Dataset #{ds.id}</p>
                                <p className="text-xs text-muted-foreground font-mono truncate">{truncateCid(ds.dataCID, 12)}</p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-sm font-medium ${Number(ds.price) > 0 ? "text-nv-success" : "text-muted-foreground"}`}>
                                  {Number(ds.price) / 1e18 > 0 ? `${Number(ds.price) / 1e18} FLOW` : "Free"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(ds.registeredAt * 1000).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Impact Certificates */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground font-heading mb-4">Impact Certificates</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Card>
                      <CardContent>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Database className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">Data Contributor</p>
                            <p className="text-xs text-muted-foreground">{stats.datasetCount} datasets shared</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Contributed neural data to the decentralized commons, advancing BCI research.
                        </p>
                      </CardContent>
                    </Card>

                    {worldIDVerified && (
                      <Card>
                        <CardContent>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-nv-success-muted flex items-center justify-center">
                              <Award className="w-5 h-5 text-nv-success" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">Verified Human</p>
                              <p className="text-xs text-muted-foreground">World ID verified</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Proven unique human identity via World ID, preventing sybil attacks.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Researcher Tab ── */}
            <TabsContent value="researcher">
              <div className="space-y-6">
                {/* Accessed Datasets */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground font-heading mb-4">Accessed Datasets</h2>
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
                        <Card key={ds.id}>
                          <CardContent>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-5 h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{ds.name}</p>
                                  <p className="text-xs text-muted-foreground">by {ds.contributor}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 sm:flex-shrink-0 pl-13 sm:pl-0">
                                <div className="text-xs text-muted-foreground">
                                  <span className="text-muted-foreground/70">Accessed:</span> {ds.accessedAt}
                                </div>
                                <Badge variant="default">Active</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Active Licenses */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground font-heading mb-4">Active Licenses</h2>
                  {!wallet.isConnected ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-14 w-full" />
                      <Skeleton className="h-14 w-full" />
                    </div>
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
                      <Card className="hidden sm:block overflow-hidden">
                        <CardContent className="p-0">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">Dataset</th>
                                <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">Purchased</th>
                                <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">Expires</th>
                                <th className="text-left text-xs text-muted-foreground uppercase tracking-wider font-medium px-5 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {researcherData.licenses.map((lic) => {
                                const daysLeft = Math.ceil(
                                  (new Date(lic.expiresAt).getTime() - Date.now()) / 86400000
                                );
                                return (
                                  <tr key={lic.datasetId} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-5 py-4 font-medium text-foreground">Dataset #{lic.datasetId}</td>
                                    <td className="px-5 py-4 text-muted-foreground">{lic.purchasedAt}</td>
                                    <td className="px-5 py-4 text-muted-foreground">
                                      {lic.expiresAt}
                                      <span className={`ml-2 text-xs ${daysLeft > 7 ? "text-nv-success" : "text-amber-400"}`}>
                                        ({daysLeft}d left)
                                      </span>
                                    </td>
                                    <td className="px-5 py-4">
                                      <Badge variant={daysLeft > 7 ? "default" : "secondary"}>
                                        {daysLeft > 7 ? "Active" : "Expiring"}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </CardContent>
                      </Card>

                      {/* Mobile cards */}
                      <div className="sm:hidden space-y-3">
                        {researcherData.licenses.map((lic) => {
                          const daysLeft = Math.ceil(
                            (new Date(lic.expiresAt).getTime() - Date.now()) / 86400000
                          );
                          return (
                            <Card key={lic.datasetId}>
                              <CardContent>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-foreground">Dataset #{lic.datasetId}</span>
                                  <Badge variant={daysLeft > 7 ? "default" : "secondary"}>
                                    {daysLeft > 7 ? "Active" : "Expiring"}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-muted-foreground/70">Purchased:</span>{" "}
                                    <span className="text-muted-foreground">{lic.purchasedAt}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground/70">Expires:</span>{" "}
                                    <span className={daysLeft > 7 ? "text-nv-success" : "text-amber-400"}>
                                      {daysLeft}d left
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </ErrorBoundary>
  );
}
