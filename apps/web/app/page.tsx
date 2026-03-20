"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  Globe,
  Coins,
  Upload,
  Search,
  ArrowRight,
  ExternalLink,
  Brain,
  Lock,
  HardDrive,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

/* ── EEG Waveform SVG ────────────────────────────────────────────── */

function EEGWaveform() {
  return (
    <div className="relative w-full h-full min-h-[400px]">
      <svg
        viewBox="0 0 500 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Channel labels */}
        <text x="8" y="53" className="fill-muted-foreground" fontSize="9" fontFamily="monospace" opacity="0.5">Fp1</text>
        <text x="8" y="103" className="fill-muted-foreground" fontSize="9" fontFamily="monospace" opacity="0.5">Fp2</text>
        <text x="8" y="153" className="fill-muted-foreground" fontSize="9" fontFamily="monospace" opacity="0.5">C3</text>
        <text x="8" y="203" className="fill-muted-foreground" fontSize="9" fontFamily="monospace" opacity="0.5">C4</text>
        <text x="8" y="253" className="fill-muted-foreground" fontSize="9" fontFamily="monospace" opacity="0.5">O1</text>
        <text x="8" y="303" className="fill-muted-foreground" fontSize="9" fontFamily="monospace" opacity="0.5">O2</text>
        <text x="8" y="353" className="fill-muted-foreground" fontSize="9" fontFamily="monospace" opacity="0.5">T3</text>

        {/* EEG Wave Channel 1 - Alpha rhythm */}
        <path
          d="M30,50 Q45,30 60,50 T90,50 Q105,25 120,50 T150,50 Q165,35 180,50 T210,50 Q225,20 240,50 T270,50 Q285,30 300,50 T330,50 Q345,25 360,50 T390,50 Q405,35 420,50 T450,50 Q465,28 480,50"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
          className="eeg-wave eeg-wave-1"
        />

        {/* EEG Wave Channel 2 - Beta rhythm */}
        <path
          d="M30,100 Q40,85 50,100 T70,100 Q80,80 90,100 T110,100 Q120,88 130,100 T150,100 Q160,78 170,100 T190,100 Q200,85 210,100 T230,100 Q240,82 250,100 T270,100 Q280,90 290,100 T310,100 Q320,75 330,100 T350,100 Q360,88 370,100 T390,100 Q400,80 410,100 T430,100 Q440,85 450,100 T470,100 Q480,90 490,100"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
          className="eeg-wave eeg-wave-2"
        />

        {/* EEG Wave Channel 3 - Theta rhythm */}
        <path
          d="M30,150 Q55,120 80,150 T130,150 Q155,115 180,150 T230,150 Q255,125 280,150 T330,150 Q355,110 380,150 T430,150 Q455,120 480,150"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
          className="eeg-wave eeg-wave-3"
        />

        {/* EEG Wave Channel 4 - Sharp waves */}
        <path
          d="M30,200 L50,200 L55,175 L60,220 L65,190 L70,210 L80,200 L110,200 L115,170 L120,225 L125,185 L130,215 L140,200 L170,200 L175,178 L180,218 L185,192 L190,208 L200,200 L230,200 L235,172 L240,222 L245,188 L250,212 L260,200 L290,200 L295,176 L300,220 L305,190 L310,210 L320,200 L350,200 L355,174 L360,222 L365,188 L370,212 L380,200 L410,200 L415,170 L420,225 L425,186 L430,214 L440,200 L470,200 L475,178 L480,200"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
          className="eeg-wave eeg-wave-4"
        />

        {/* EEG Wave Channel 5 - Slow delta */}
        <path
          d="M30,250 Q80,220 130,250 T230,250 Q280,225 330,250 T430,250 Q460,230 480,250"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.45"
          className="eeg-wave eeg-wave-5"
        />

        {/* EEG Wave Channel 6 - Mixed */}
        <path
          d="M30,300 Q45,280 60,300 T90,300 Q115,275 140,300 T170,300 Q185,285 200,300 T230,300 Q255,270 280,300 T310,300 Q325,280 340,300 T370,300 Q395,275 420,300 T450,300 Q465,285 480,300"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
          className="eeg-wave eeg-wave-6"
        />

        {/* EEG Wave Channel 7 - Spindles */}
        <path
          d="M30,350 L80,350 Q85,335 90,350 T100,350 Q105,335 110,350 T120,350 L170,350 Q175,330 180,350 T190,350 Q195,332 200,350 T210,350 L260,350 Q265,333 270,350 T280,350 Q285,335 290,350 T300,350 L350,350 Q355,330 360,350 T370,350 Q375,333 380,350 T390,350 L440,350 Q445,335 450,350 T460,350 Q465,332 470,350 T480,350"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
          className="eeg-wave eeg-wave-7"
        />

        {/* Horizontal grid lines */}
        {[50, 100, 150, 200, 250, 300, 350].map((y) => (
          <line
            key={y}
            x1="28"
            y1={y}
            x2="490"
            y2={y}
            stroke="hsl(var(--border))"
            strokeWidth="0.5"
            opacity="0.3"
          />
        ))}
      </svg>

      {/* CSS animation for stroke-dashoffset */}
      <style jsx>{`
        .eeg-wave {
          stroke-dasharray: 1200;
          stroke-dashoffset: 1200;
          animation: eeg-draw 3s ease-out forwards;
        }
        .eeg-wave-1 { animation-delay: 0s; }
        .eeg-wave-2 { animation-delay: 0.15s; }
        .eeg-wave-3 { animation-delay: 0.3s; }
        .eeg-wave-4 { animation-delay: 0.45s; }
        .eeg-wave-5 { animation-delay: 0.6s; }
        .eeg-wave-6 { animation-delay: 0.75s; }
        .eeg-wave-7 { animation-delay: 0.9s; }
        @keyframes eeg-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}

/* ── Data ─────────────────────────────────────────────────────────── */

const STEPS = [
  {
    num: "01",
    title: "Upload",
    desc: "Parse EDF+ brain recordings in-browser. Extract features, visualize channels, prepare datasets.",
    icon: Upload,
  },
  {
    num: "02",
    title: "Encrypt",
    desc: "Set token-gated access conditions with Lit Protocol. Your data stays private until conditions are met.",
    icon: Lock,
  },
  {
    num: "03",
    title: "Store",
    desc: "Data is stored on Filecoin via Storacha with verifiable storage proofs. No vendor lock-in.",
    icon: HardDrive,
  },
  {
    num: "04",
    title: "Earn",
    desc: "Researchers purchase access on-chain. Contributors receive automatic payments on Flow & NEAR.",
    icon: Wallet,
  },
];

const WHY_CARDS = [
  {
    title: "Privacy First",
    desc: "Client-side encryption with Lit Protocol. Only authorized users can decrypt. Your neural data, your rules.",
    icon: Shield,
  },
  {
    title: "Decentralized Infrastructure",
    desc: "No single point of failure. Content-addressed storage on Filecoin ensures data integrity and availability forever.",
    icon: Globe,
  },
  {
    title: "Fair Compensation",
    desc: "Smart contracts on Flow and NEAR automatically pay data contributors when researchers purchase access.",
    icon: Coins,
  },
];

const TECH_STACK = [
  {
    name: "Filecoin",
    desc: "Decentralized Storage",
    href: "https://filecoin.io",
    logo: "/logos/filecoin.svg",
  },
  {
    name: "Storacha",
    desc: "Storage SDK",
    href: "https://storacha.network",
    logo: "/logos/storacha.svg",
  },
  {
    name: "Lit Protocol",
    desc: "Access Control",
    href: "https://litprotocol.com",
    logo: "/logos/lit.svg",
  },
  {
    name: "Flow",
    desc: "Smart Contracts",
    href: "https://flow.com",
    logo: "/logos/flow.svg",
  },
  {
    name: "NEAR",
    desc: "Cross-Chain Registry",
    href: "https://near.org",
    logo: "/logos/near.svg",
  },
  {
    name: "World ID",
    desc: "Proof of Personhood",
    href: "https://worldcoin.org/world-id",
    logo: "/logos/worldcoin.svg",
  },
];

const STATS = [
  { value: "47", label: "Datasets", suffix: "" },
  { value: "23", label: "Contributors", suffix: "" },
  { value: "2.4", label: "Encrypted", suffix: " GB" },
  { value: "89", label: "Access Licenses", suffix: "" },
];

/* ── Page ─────────────────────────────────────────────────────────── */

export default function Home() {
  useScrollReveal();

  return (
    <main className="min-h-screen overflow-x-hidden bg-background">
      {/* ───── Navigation ───── */}
      <nav className="border-b border-border backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-heading font-semibold text-foreground tracking-tight">
              NeuroVault
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/explore"
              className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Explore
            </Link>
            <Link
              href="/upload"
              className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Upload
            </Link>
            <Button asChild size="sm">
              <Link href="/upload">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ───── Hero Section ───── */}
      <section className="relative border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left column - Text */}
            <div>
              <Badge variant="secondary" className="mb-6">
                Built for PL Genesis: Frontiers of Collaboration
              </Badge>

              <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.08] mb-6">
                Privacy-Preserving
                <br />
                Neural Data Commons
              </h1>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-8">
                A decentralized marketplace for securely storing, sharing, and
                monetizing brain-computer interface data -- with encrypted access
                control, on-chain licensing, and proof-of-personhood.
              </p>

              {/* Stats bar */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground mb-10">
                {STATS.map((stat, i) => (
                  <span key={stat.label} className="flex items-center gap-x-2">
                    <span className="text-foreground font-medium">
                      {stat.value}{stat.suffix}
                    </span>
                    <span>{stat.label}</span>
                    {i < STATS.length - 1 && (
                      <span className="text-border mx-1">·</span>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Button asChild>
                  <Link href="/upload">
                    <Upload className="w-4 h-4" />
                    Upload Data
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/explore">
                    <Search className="w-4 h-4" />
                    Explore Datasets
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right column - EEG Visualization */}
            <div className="hidden lg:block">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <span className="text-xs text-[var(--nv-text-tertiary)] ml-2 font-mono">
                    eeg_recording_047.edf
                  </span>
                </div>
                <EEGWaveform />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="mb-16 reveal">
            <p className="text-sm text-[var(--nv-text-tertiary)] font-medium tracking-widest uppercase mb-3">
              How It Works
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              From Brain to Blockchain
            </h2>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-0 reveal-stagger">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative flex flex-col">
                  {/* Timeline connector */}
                  <div className="flex items-center mb-6 md:mb-8">
                    <div className="w-10 h-10 rounded-full border-2 border-primary bg-background flex items-center justify-center shrink-0 relative z-10">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="hidden md:block flex-1 h-px bg-border ml-0" />
                    )}
                  </div>

                  <div className="md:pr-8">
                    <p className="text-xs text-[var(--nv-text-tertiary)] font-mono mb-1">
                      {step.num}
                    </p>
                    <h3 className="font-heading text-base font-semibold text-foreground mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── Built for Researchers ───── */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="mb-16 reveal">
            <p className="text-sm text-[var(--nv-text-tertiary)] font-medium tracking-widest uppercase mb-3">
              Why NeuroVault
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Built for Researchers
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_1.5fr_1fr] gap-6 reveal-stagger">
            {WHY_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-xl border border-border bg-card p-8 transition-colors hover:border-primary/20"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  <h3 className="font-heading text-base font-semibold text-foreground mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── Tech Stack ───── */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10 reveal">
            <p className="text-sm text-[var(--nv-text-tertiary)] font-medium tracking-widest uppercase whitespace-nowrap">
              Built with
            </p>
            <div className="flex flex-wrap items-center gap-8">
              {TECH_STACK.map((tech) => (
                <a
                  key={tech.name}
                  href={tech.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <img
                    src={tech.logo}
                    alt={tech.name}
                    className="w-5 h-5 opacity-50 group-hover:opacity-80 transition-opacity"
                  />
                  <span className="text-sm font-medium">{tech.name}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── CTA Section ───── */}
      <section className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="reveal max-w-2xl">
            <h2 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mb-4">
              Ready to Advance Neuroscience?
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Upload your EEG recordings to the decentralized commons. Help
              advance BCI research while maintaining full control over your data.
            </p>
            <Button asChild>
              <Link href="/upload">
                Start Uploading
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Brain className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-heading text-sm font-semibold text-foreground">
                NeuroVault
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                Privacy-preserving neural data commons
              </span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://github.com/imanishbarnwal/NeuroVault"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://plgenesis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Hackathon
              </a>
              <Link
                href="/explore"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Explore
              </Link>
            </div>

            <p className="text-xs text-muted-foreground">
              Built for PL Genesis: Frontiers of Collaboration
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
