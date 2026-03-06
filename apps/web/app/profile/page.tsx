"use client";

import Link from "next/link";

export default function ProfilePage() {
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
            <Link href="/dashboard" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              Dashboard
            </Link>
            <Link href="/upload" className="text-sm px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium transition-colors">
              Upload
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
        <p className="text-slate-400 mb-8">Your researcher identity and wallet connections.</p>

        {/* Profile card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Researcher</h2>
              <p className="text-sm text-slate-500">No wallet connected</p>
            </div>
          </div>

          <div className="grid gap-4">
            {/* Wallet connection */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Wallet</p>
                  <p className="text-xs text-slate-500 mt-0.5">Connect a wallet to sign uploads and manage access</p>
                </div>
                <button className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors">
                  Connect
                </button>
              </div>
            </div>

            {/* DID */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-300">Decentralized ID</p>
                  <p className="text-xs text-slate-500 mt-0.5">Auto-generated from your Storacha agent key</p>
                </div>
                <span className="text-xs font-mono text-slate-600">Not configured</span>
              </div>
            </div>

            {/* Storage quota */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-300">Storage Usage</p>
                <span className="text-xs text-slate-500">0 / 5 GB</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" style={{ width: "0%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <h2 className="text-lg font-semibold text-white mb-4">Settings</h2>
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
              <p className="text-sm font-medium text-slate-300">Email Notifications</p>
              <p className="text-xs text-slate-500">Get notified on access requests</p>
            </div>
            <button className="w-10 h-5 rounded-full bg-slate-700 relative transition-colors">
              <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-slate-400 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
