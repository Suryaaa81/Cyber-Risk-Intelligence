"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert, Zap, Activity, Lock, Globe, Brain } from "lucide-react";

const FEATURES = [
  { icon: <Brain size={20} />, label: "NLP Entity Extraction", desc: "spaCy-powered named entity recognition across People, Orgs, Locations" },
  { icon: <Activity size={20} />, label: "Multi-Agent Risk Engine", desc: "Exposure, behavioral, simulation and mitigation agents run in parallel" },
  { icon: <Zap size={20} />, label: "LLM Attack Simulation", desc: "OpenRouter LLM generates realistic email, SMS, LinkedIn & voice attacks" },
  { icon: <Globe size={20} />, label: "URL / PDF Ingestion", desc: "Analyze public web pages, social profiles, PDFs and raw CSV data" },
  { icon: <Lock size={20} />, label: "Mitigation Strategy", desc: "AI-generated, role-specific cybersecurity remediation roadmap" },
  { icon: <ShieldAlert size={20} />, label: "PDF Risk Reports", desc: "Download a professional risk report for sharing or compliance records" },
];

const STATS = [
  { value: "5+", label: "Risk Vectors Detected" },
  { value: "4", label: "Attack Simulations" },
  { value: "AI", label: "Confidence Scoring" },
  { value: "PDF", label: "Exportable Report" },
];

export default function Home() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen text-white flex flex-col"
      style={{
        background: "linear-gradient(135deg, #030712 0%, #0f172a 50%, #030712 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <ShieldAlert size={20} className="text-blue-400" />
          </div>
          <span className="text-sm font-bold tracking-wider text-white uppercase">Cyber Risk Intelligence</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          AI Engine Online
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-semibold tracking-wide">
          <Zap size={12} />
          POWERED BY OPENROUTER LLM + SPACY NLP
        </div>

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight max-w-3xl leading-tight mb-6">
          Social Engineering{" "}
          <span
            style={{
              background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Risk Intelligence
          </span>
        </h1>

        <p className="text-zinc-400 text-lg max-w-xl mb-10 leading-relaxed">
          Paste any public content — social posts, bios, URLs or PDFs — and get a
          full{" "}
          <span className="text-blue-400">AI-powered threat report</span> in seconds.
          Multi-agent analysis. Real attack simulations. Enterprise-grade output.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 rounded-xl text-base font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg,#1d4ed8,#7c3aed)",
              boxShadow: "0 0 40px #3b82f630",
            }}
          >
            Launch Dashboard →
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3 rounded-xl text-base font-medium border border-zinc-700 hover:border-zinc-500 transition-colors text-zinc-300"
          >
            View Demo
          </button>
        </div>

        {/* Stats strip */}
        <div className="mt-16 flex flex-wrap gap-8 justify-center">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p
                className="text-3xl font-black"
                style={{
                  background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {value}
              </p>
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Features */}
      <section className="relative z-10 px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon, label, desc }) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-5 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-blue-400">{icon}</span>
                <span className="text-sm font-semibold text-zinc-200">{label}</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/50 px-8 py-4 flex justify-between items-center text-xs text-zinc-600">
        <span>© 2026 Cyber Risk Intelligence Platform</span>
        <span>FastAPI + Next.js + OpenRouter LLM</span>
      </footer>
    </div>
  );
}
