import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <span className="text-lg font-semibold text-white">NeuroVault</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/explore" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              Explore
            </Link>
            <Link href="/upload" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
              Upload
            </Link>
            <Link
              href="/upload"
              className="text-sm px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-medium transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Built for PL Genesis Hackathon
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              <span className="text-white">Privacy-Preserving</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                Neural Data Commons
              </span>
            </h1>

            <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              A decentralized platform for securely storing, sharing, and analyzing
              brain-computer interface research data — powered by Filecoin and
              Storacha.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload Dataset
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View Source
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            NeuroVault combines decentralized storage with privacy-preserving
            cryptography to create a trustless neural data marketplace.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-cyan-500/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Upload EEG Data</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Parse EDF+ brain recordings directly in your browser. Extract features,
              visualize waveforms, and prepare datasets for sharing.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-violet-500/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Encrypt & Control Access</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Set fine-grained access conditions. Choose public sharing, credential-gated
              access, or keep data fully private with client-side encryption.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/30 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Store on Filecoin</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Data is stored on the Filecoin network via Storacha with verifiable
              storage proofs. No single point of failure, no vendor lock-in.
            </p>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Tech Stack</h2>
            <p className="text-slate-400">Built with cutting-edge decentralized infrastructure</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Filecoin", desc: "Decentralized storage", color: "cyan" },
              { name: "Storacha", desc: "Storage client SDK", color: "cyan" },
              { name: "Next.js 14", desc: "React framework", color: "slate" },
              { name: "TypeScript", desc: "Type-safe code", color: "slate" },
              { name: "Lit Protocol", desc: "Access control", color: "violet" },
              { name: "NEAR", desc: "Smart contracts", color: "violet" },
              { name: "Tailwind CSS", desc: "Styling", color: "slate" },
              { name: "PhysioNet", desc: "EEG datasets", color: "emerald" },
            ].map((tech) => (
              <div
                key={tech.name}
                className="rounded-lg border border-slate-800 bg-slate-900/30 p-4 text-center hover:border-slate-700 transition-colors"
              >
                <p className="font-medium text-white text-sm">{tech.name}</p>
                <p className="text-xs text-slate-500 mt-1">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Share Your Neural Data?
              </h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-8">
                Upload your EEG recordings to the decentralized commons. Help advance
                BCI research while maintaining full control over your data.
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white font-semibold transition-all"
              >
                Start Uploading
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <span className="text-sm text-slate-500">NeuroVault</span>
          </div>
          <p className="text-sm text-slate-600">
            Built for PL Genesis Hackathon 2026
          </p>
        </div>
      </footer>
    </main>
  );
}
