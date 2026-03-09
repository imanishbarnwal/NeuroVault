"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/* ── EEG Waveform Canvas ─────────────────────────────────────────── */

function EEGCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const CHANNELS = 8;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const chH = h / CHANNELS;

      for (let ch = 0; ch < CHANNELS; ch++) {
        const baseY = chH * (ch + 0.5);
        const isCyan = ch % 2 === 0;
        const alpha = 0.12 + ch * 0.015;

        ctx.beginPath();
        ctx.strokeStyle = isCyan
          ? `rgba(34, 211, 238, ${alpha})`
          : `rgba(167, 139, 250, ${alpha})`;
        ctx.lineWidth = 1.2;

        for (let x = 0; x < w; x++) {
          const s = t + x * 0.004;
          const y =
            baseY +
            Math.sin(s * 1.8 + ch * 1.1) * 18 +
            Math.sin(s * 4.7 + ch * 2.3) * 9 +
            Math.sin(s * 11 + ch * 3.7) * 5 +
            Math.sin(s * 23 + ch * 0.8) * 2.5 +
            (Math.random() - 0.5) * 1;

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      t += 0.012;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

/* ── Scroll reveal observer ──────────────────────────────────────── */

function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal, .reveal-stagger");
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ── Data ─────────────────────────────────────────────────────────── */

const STEPS = [
  {
    num: "01",
    title: "Upload",
    desc: "Parse EDF+ brain recordings in-browser. Extract features, visualize channels, prepare datasets.",
    color: "cyan",
  },
  {
    num: "02",
    title: "Encrypt",
    desc: "Set token-gated access conditions with Lit Protocol. Your data stays private until conditions are met.",
    color: "violet",
  },
  {
    num: "03",
    title: "Store",
    desc: "Data is stored on Filecoin via Storacha with verifiable storage proofs. No vendor lock-in.",
    color: "emerald",
  },
  {
    num: "04",
    title: "Earn",
    desc: "Researchers purchase access on-chain. Contributors receive automatic payments on Flow & NEAR.",
    color: "amber",
  },
];

const WHY_CARDS = [
  {
    title: "Privacy First",
    desc: "Client-side encryption with Lit Protocol. Only authorized users can decrypt. Your neural data, your rules.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    ),
    gradient: "from-cyan-400 to-teal-400",
  },
  {
    title: "Decentralized",
    desc: "No single point of failure. Content-addressed storage on Filecoin ensures data integrity and availability forever.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
      />
    ),
    gradient: "from-violet-400 to-purple-400",
  },
  {
    title: "Fair Compensation",
    desc: "Smart contracts on Flow and NEAR automatically pay data contributors when researchers purchase access.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
      />
    ),
    gradient: "from-emerald-400 to-green-400",
  },
];

const TECH_STACK = [
  {
    name: "Filecoin",
    desc: "Decentralized Storage",
    href: "https://filecoin.io",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-400/40",
  },
  {
    name: "Storacha",
    desc: "Storage SDK",
    href: "https://storacha.network",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-400/40",
  },
  {
    name: "Lit Protocol",
    desc: "Access Control",
    href: "https://litprotocol.com",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:border-violet-400/40",
  },
  {
    name: "Flow",
    desc: "Smart Contracts",
    href: "https://flow.com",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-400/40",
  },
  {
    name: "NEAR",
    desc: "Cross-Chain Registry",
    href: "https://near.org",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-400/40",
  },
  {
    name: "World ID",
    desc: "Proof of Personhood",
    href: "https://worldcoin.org/world-id",
    color: "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:border-sky-400/40",
  },
];

const STATS = [
  { value: "47", label: "Datasets", suffix: "" },
  { value: "23", label: "Contributors", suffix: "" },
  { value: "2.4", label: "Encrypted", suffix: " GB" },
  { value: "89", label: "Access Licenses", suffix: "" },
];

/* ── Color helpers ────────────────────────────────────────────────── */

function stepColor(c: string, part: "num" | "border" | "dot") {
  const map: Record<string, Record<string, string>> = {
    cyan: {
      num: "text-cyan-400",
      border: "border-cyan-500/30 hover:border-cyan-400/50",
      dot: "bg-cyan-400",
    },
    violet: {
      num: "text-violet-400",
      border: "border-violet-500/30 hover:border-violet-400/50",
      dot: "bg-violet-400",
    },
    emerald: {
      num: "text-emerald-400",
      border: "border-emerald-500/30 hover:border-emerald-400/50",
      dot: "bg-emerald-400",
    },
    amber: {
      num: "text-amber-400",
      border: "border-amber-500/30 hover:border-amber-400/50",
      dot: "bg-amber-400",
    },
  };
  return map[c]?.[part] ?? "";
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function Home() {
  useScrollReveal();

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* ───── Navigation ───── */}
      <nav className="border-b border-slate-800/50 backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white font-heading tracking-tight">
              NeuroVault
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/explore" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              Explore
            </Link>
            <Link href="/upload" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              Upload
            </Link>
            <Link
              href="/upload"
              className="text-sm px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-medium transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ───── Hero Section ───── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* EEG animated background */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <EEGCanvas />
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-[120px]" />
          <div className="absolute top-20 -left-40 w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-full h-48 bg-gradient-to-t from-slate-950 to-transparent" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 py-24 relative z-10 w-full">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-10 glow-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Built for PL Genesis: Frontiers of Collaboration
            </div>

            {/* Headline */}
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
              <span className="text-white">Privacy-Preserving</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
                Neural Data Commons
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              A decentralized marketplace for securely storing, sharing, and
              monetizing brain-computer interface data — with encrypted access
              control, on-chain licensing, and proof-of-personhood.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/upload"
                className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload Data
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/explore"
                className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-all hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                Explore Datasets
              </Link>
            </div>

            {/* Tech logos row */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm">
              <span className="text-slate-600 text-xs uppercase tracking-widest">Powered by</span>
              {TECH_STACK.slice(0, 5).map((t) => (
                <a
                  key={t.name}
                  href={t.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-300 transition-colors font-medium"
                >
                  {t.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section className="relative border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-20 reveal">
            <p className="text-cyan-400 text-sm font-medium tracking-widest uppercase mb-4">
              How It Works
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
              From Brain to Blockchain
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              Four steps to contribute neural data to the decentralized commons
              while maintaining full privacy control.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 reveal-stagger">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className={`group relative rounded-2xl border bg-slate-900/40 backdrop-blur-sm p-8 transition-all hover:-translate-y-1 ${stepColor(step.color, "border")}`}
              >
                {/* Step number */}
                <span className={`font-heading text-5xl font-bold ${stepColor(step.color, "num")} opacity-20 absolute top-4 right-6`}>
                  {step.num}
                </span>

                {/* Dot indicator */}
                <div className={`w-3 h-3 rounded-full ${stepColor(step.color, "dot")} mb-6 shadow-lg`} />

                <h3 className="font-heading text-xl font-semibold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Why NeuroVault ───── */}
      <section className="relative border-t border-slate-800/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 py-28 relative">
          <div className="text-center mb-20 reveal">
            <p className="text-violet-400 text-sm font-medium tracking-widest uppercase mb-4">
              Why NeuroVault
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
              Built for Researchers, by Researchers
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              The neural data infrastructure that neuroscience deserves.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 reveal-stagger">
            {WHY_CARDS.map((card) => (
              <div
                key={card.title}
                className="group relative rounded-2xl border border-slate-800 bg-slate-900/40 p-8 hover:border-slate-700 transition-all hover:-translate-y-1"
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} p-[1px] mb-6`}>
                  <div className="w-full h-full rounded-xl bg-slate-900 flex items-center justify-center">
                    <svg
                      className={`w-6 h-6 bg-gradient-to-br ${card.gradient} bg-clip-text`}
                      style={{ color: "rgb(34, 211, 238)" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      {card.icon}
                    </svg>
                  </div>
                </div>

                <h3 className="font-heading text-xl font-semibold text-white mb-3">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Tech Stack ───── */}
      <section className="border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="text-center mb-16 reveal">
            <p className="text-emerald-400 text-sm font-medium tracking-widest uppercase mb-4">
              Tech Stack
            </p>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
              Cutting-Edge Infrastructure
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              Built on the most advanced decentralized protocols for storage,
              access control, payments, and identity.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto reveal-stagger">
            {TECH_STACK.map((tech) => (
              <a
                key={tech.name}
                href={tech.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group rounded-xl border p-6 text-center transition-all hover:-translate-y-1 ${tech.color}`}
              >
                <p className="font-heading font-semibold text-lg mb-1">
                  {tech.name}
                </p>
                <p className="text-xs opacity-60">{tech.desc}</p>
                <svg
                  className="w-4 h-4 mx-auto mt-3 opacity-0 group-hover:opacity-60 transition-opacity"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Stats ───── */}
      <section className="border-t border-slate-800/50 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto px-6 py-24">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 reveal-stagger">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="font-heading text-4xl sm:text-5xl font-bold bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                  {stat.suffix && (
                    <span className="text-2xl sm:text-3xl">{stat.suffix}</span>
                  )}
                </p>
                <p className="text-sm text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA Section ───── */}
      <section className="border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-28">
          <div className="reveal relative rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/80 to-slate-950 p-16 text-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10">
              <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-6">
                Ready to Advance
                <br />
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  Neuroscience?
                </span>
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-10 text-lg">
                Upload your EEG recordings to the decentralized commons. Help
                advance BCI research while maintaining full control over your data.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/upload"
                  className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
                >
                  Start Uploading
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-all hover:-translate-y-0.5"
                >
                  Browse Datasets
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo + tagline */}
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <span className="font-heading font-semibold text-white">NeuroVault</span>
              </div>
              <p className="text-xs text-slate-600">
                Privacy-preserving neural data commons
              </p>
            </div>

            {/* Links */}
            <div className="flex items-center gap-8">
              <a
                href="https://github.com/imanishbarnwal/NeuroVault"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                GitHub
              </a>
              <a
                href="https://plgenesis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Hackathon
              </a>
              <Link href="/explore" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                Explore
              </Link>
            </div>

            {/* Hackathon badge */}
            <div className="text-center md:text-right">
              <p className="text-xs text-slate-600">
                Built for{" "}
                <span className="text-slate-400">
                  PL Genesis: Frontiers of Collaboration
                </span>
              </p>
              <p className="text-xs text-slate-700 mt-1">
                Neurotech Track &middot; Fresh Code
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
