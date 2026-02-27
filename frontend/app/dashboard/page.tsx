"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis as RadarAngle,
  PolarRadiusAxis,
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import {
  ShieldAlert,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Lock,
  Globe,
  Building2,
  Users,
  Brain,
  Zap,
  FileText,
  Download,
  Target,
  Activity,
  ChevronRight,
  Mail,
  MessageSquare,
  Linkedin,
  Phone,
  CheckSquare,
  Square,
  Eye,
  Shield,
  Cpu,
  Network,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface AnalysisData {
  report_id: string;
  analysis_timestamp: string;
  original_text: string;
  entities: Record<string, string[]>;
  overall_risk_score: number;
  risk_percentile: number;
  confidence_score: number;
  risk_vectors: string[];
  feature_contributions: Record<string, number>;
  threat_simulations: Record<string, string>;
  phishing_preview_simple: string;
  phishing_report_detailed: string;
  behavioral_analysis: {
    sentiment: { label: string; score: number };
    exposure_explanation: string;
  };
  trend_analysis: { "30_days_ago": number; "14_days_ago": number; current: number };
  mitigation_plan: string;
  industry_contextual_risk: string;
}

// ─── Hook: Count-Up Animation ─────────────────────────────────────────────────
function useCountUp(target: number, duration = 1000, trigger = true) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start: number | null = null;
    const initial = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(initial + (target - initial) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, trigger]);
  return current;
}

// ─── Hook: Typewriter Effect ──────────────────────────────────────────────────
function useTypewriter(text: string, speed = 12, trigger = true) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!trigger || !text) return;
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, trigger]);
  return displayed;
}


// ─── Mini Sparkline (inline SVG) ─────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const w = 80, h = 28;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Summary Card (with count-up) ───────────────────────────────────────────
interface CardProps {
  label: string;
  numericValue?: number;   // if provided, count-up animation runs
  value: string | number;  // fallback or formatted display
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: "up" | "down" | "flat";
  sparkData?: number[];
  glow?: boolean;
  staggerMs?: number;
}
function MetricCard({ label, numericValue, value, sub, icon, color, trend, sparkData, glow, staggerMs = 0 }: CardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "#f87171" : trend === "down" ? "#4ade80" : "#94a3b8";

  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), staggerMs);
    return () => clearTimeout(t);
  }, [staggerMs]);

  const animated = useCountUp(numericValue ?? 0, 1100, visible);
  const displayVal = numericValue !== undefined ? `${animated}%` : value;

  return (
    <div
      className="relative overflow-hidden rounded-xl border bg-zinc-900/70 backdrop-blur p-4 flex flex-col gap-2 transition-all duration-500 hover:scale-[1.02]"
      style={{
        borderColor: glow ? color + "60" : "#27272a",
        boxShadow: glow ? `0 0 28px ${color}35` : "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      {/* gradient accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-400 font-medium tracking-wide uppercase">{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums" style={{ color }}>
            {displayVal}
          </p>
          {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
        </div>
        <div
          className="p-2 rounded-lg"
          style={{ background: color + "20", color }}
        >
          {icon}
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        {sparkData && <Sparkline data={sparkData} color={color} />}
        {trend && (
          <div className="flex items-center gap-1" style={{ color: trendColor }}>
            <TrendIcon size={13} />
            <span className="text-xs font-medium">
              {trend === "up" ? "Rising" : trend === "down" ? "Falling" : "Stable"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typewriter Panel ─────────────────────────────────────────────────────────
function TypewriterText({ text, speed = 8, className = "" }: { text: string; speed?: number; className?: string }) {
  const displayed = useTypewriter(text, speed, !!text);
  const done = displayed.length >= text.length;
  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span
          className="inline-block w-[2px] h-[1em] ml-0.5 align-middle"
          style={{
            background: "#60a5fa",
            animation: "blink 0.7s step-end infinite",
          }}
        />
      )}
    </span>
  );
}

// ─── Attack Path Flow ─────────────────────────────────────────────────────────
const ATTACK_STAGES = [
  { label: "Public Post", icon: <Globe size={14} />, color: "#60a5fa" },
  { label: "OSINT Harvest", icon: <Eye size={14} />, color: "#a78bfa" },
  { label: "Profile Build", icon: <Users size={14} />, color: "#f59e0b" },
  { label: "Spear Phishing", icon: <Mail size={14} />, color: "#f87171" },
  { label: "Credential Theft", icon: <Lock size={14} />, color: "#ef4444" },
];

function AttackPathFlow({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) { setStep(0); return; }
    const interval = setInterval(() => {
      setStep((s) => (s < ATTACK_STAGES.length - 1 ? s + 1 : s));
    }, 600);
    return () => clearInterval(interval);
  }, [active]);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {ATTACK_STAGES.map((stage, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-500"
            style={
              i <= step
                ? {
                  background: stage.color + "25",
                  borderColor: stage.color,
                  color: stage.color,
                  boxShadow: `0 0 10px ${stage.color}40`,
                }
                : {
                  background: "transparent",
                  borderColor: "#3f3f46",
                  color: "#52525b",
                }
            }
          >
            {stage.icon}
            {stage.label}
          </div>
          {i < ATTACK_STAGES.length - 1 && (
            <ChevronRight
              size={14}
              className="transition-colors duration-500"
              style={{ color: i < step ? "#f87171" : "#3f3f46" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Heatmap Row ─────────────────────────────────────────────────────────────
function HeatmapRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>
        {Math.round(value)}%
      </span>
    </div>
  );
}

// ─── Checklist Item ───────────────────────────────────────────────────────────
function CheckItem({ text, checked, onToggle }: { text: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 text-sm w-full text-left transition-colors"
      style={{ color: checked ? "#4ade80" : "#a1a1aa" }}
    >
      {checked ? <CheckSquare size={16} className="text-green-400" /> : <Square size={16} className="text-zinc-500" />}
      <span style={{ textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.6 : 1 }}>
        {text}
      </span>
    </button>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────
function Panel({ title, icon, children, className = "" }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/70 backdrop-blur p-5 ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-4">
          {icon && <span className="text-blue-400">{icon}</span>}
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-300">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("Engineer");
  const [industry, setIndustry] = useState("finance");
  const [execMode, setExecMode] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  const [selectedSim, setSelectedSim] = useState("email");
  const [checklist, setChecklist] = useState([false, false, false, false]);
  const [showResults, setShowResults] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const score = data?.overall_risk_score ?? 0;
  const effectiveScore = execMode ? Math.min(Math.round(score * 1.2), 100) : score;
  const confidence = data ? Math.round((data.confidence_score ?? 0) * 100) : 0;
  const percentile = data?.risk_percentile ?? 0;

  // Seeded pseudo-random for stable sparklines (no hydration mismatch)
  const seededRand = (seed: number) => {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  };

  const getRiskColor = (s = effectiveScore) => {
    if (execMode) return "#f87171";
    if (s <= 30) return "#4ade80";
    if (s <= 60) return "#facc15";
    if (s <= 80) return "#fb923c";
    return "#f87171";
  };
  const getRiskLabel = (s = effectiveScore) => {
    if (s <= 30) return "Low Risk";
    if (s <= 60) return "Moderate Risk";
    if (s <= 80) return "High Risk";
    return "Critical Risk";
  };

  // derived indices
  const identityIdx = data?.feature_contributions?.PERSON ?? 0;
  const locationIdx = data?.feature_contributions?.GPE ?? 0;
  const corpIdx = data?.feature_contributions?.ORG ?? 0;
  const emoIdx = Math.round((data?.behavioral_analysis?.sentiment?.score ?? 0) * 100);
  const familyIdx = (data?.original_text ?? text).toLowerCase().includes("family") ? 73 : 0;

  // Stable sparklines — computed once when data arrives, keyed to report_id
  const makeSparkline = useMemo(() => (val: number, seed = 42) => {
    const rand = seededRand(seed + Math.round(val));
    return Array.from({ length: 7 }, (_, i) =>
      Math.max(0, val - (6 - i) * (val / 12) + rand() * 4)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.report_id]);

  // chart data
  const radialData = [{ name: "risk", value: effectiveScore, fill: getRiskColor() }];

  const breakdownData = data
    ? [
      { name: "Location Exposure", value: locationIdx || 10 },
      { name: "Corporate Mentions", value: corpIdx || 10 },
      { name: "Family Exposure", value: familyIdx },
      { name: "Emotional Signals", value: emoIdx || 15 },
      { name: "Identity", value: identityIdx || 12 },
    ]
    : [];

  const PIE_COLORS = ["#f97316", "#60a5fa", "#f87171", "#a78bfa", "#4ade80"];

  const trendData = data
    ? [
      { name: "30d", value: data.trend_analysis["30_days_ago"] },
      { name: "14d", value: data.trend_analysis["14_days_ago"] },
      { name: "Now", value: data.trend_analysis.current },
    ]
    : [];

  // radar uses real feature_contributions
  const radarData = data
    ? Object.entries(data.feature_contributions).map(([key, val]) => ({
      subject: key,
      A: Math.min(val * 5, 100),
      fullMark: 100,
    }))
    : [];

  // highlight entities in text
  const highlightText = (raw: string) => {
    if (!data?.entities) return raw;
    let html = raw;
    const colorMap: Record<string, string> = {
      GPE: "#f97316",
      PERSON: "#60a5fa",
      ORG: "#22d3ee",
      DATE: "#a78bfa",
    };
    Object.entries(data.entities).forEach(([label, vals]) => {
      vals.forEach((v) => {
        const color = colorMap[label] || "#a78bfa";
        const esc = v.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`(${esc})`, "gi");
        html = html.replace(
          regex,
          `<span style="background:${color}30;color:${color};border:1px solid ${color}60;border-radius:4px;padding:0 3px;font-weight:600;">$1</span>`
        );
      });
    });
    html = html.replace(
      /(family)/gi,
      `<span style="background:#f8717140;color:#f87171;border:1px solid #f8717160;border-radius:4px;padding:0 3px;font-weight:600;">$1</span>`
    );
    return html;
  };

  // ─── API calls ──────────────────────────────────────────────────────────────
  const analyzeText = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setShowResults(false);
    try {
      const res = await axios.post("http://127.0.0.1:8000/analyze", { text, role, industry });
      setData(res.data);
      setTimeout(() => setShowResults(true), 100);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    } catch {
      alert("Unable to reach backend. Is FastAPI running on port 8000?");
    }
    setLoading(false);
  };

  const analyzeUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setShowResults(false);
    try {
      const res = await axios.post("http://127.0.0.1:8000/analyze-url", { url, role, industry });
      setData(res.data);
      setTimeout(() => setShowResults(true), 100);
    } catch {
      alert("URL analysis failed.");
    }
    setLoading(false);
  };

  const uploadCsv = async (file: File) => {
    setLoading(true);
    setShowResults(false);
    const form = new FormData();
    form.append("file", file);
    form.append("role", role);
    form.append("industry", industry);
    try {
      const res = await axios.post("http://127.0.0.1:8000/upload-csv", form);
      setData(res.data);
      setTimeout(() => setShowResults(true), 100);
    } catch {
      alert("CSV upload failed.");
    }
    setLoading(false);
  };

  const uploadPdf = async (file: File) => {
    setLoading(true);
    setShowResults(false);
    const form = new FormData();
    form.append("file", file);
    form.append("role", role);
    form.append("industry", industry);
    try {
      const res = await axios.post("http://127.0.0.1:8000/upload-pdf", form);
      setData(res.data);
      setTimeout(() => setShowResults(true), 100);
    } catch {
      alert("PDF upload failed.");
    }
    setLoading(false);
  };

  const downloadReport = async () => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/generate-report",
        { text: text || data?.original_text || "" },
        { responseType: "blob" }
      );
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", `Risk_Report_${data?.report_id?.slice(0, 8) || "download"}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Failed to generate PDF report.");
    }
  };

  const SIM_TABS = [
    { key: "email", label: "Email", icon: <Mail size={13} /> },
    { key: "sms", label: "SMS", icon: <MessageSquare size={13} /> },
    { key: "linkedin", label: "LinkedIn", icon: <Linkedin size={13} /> },
    { key: "voice", label: "Voice", icon: <Phone size={13} /> },
  ];

  const CHECKLIST_ITEMS = [
    "Remove geotags from all posts",
    "Hide employer publicly",
    "Avoid emotional public posting",
    "Reduce posting frequency",
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: execMode
          ? "linear-gradient(135deg, #1c0505 0%, #0f172a 50%, #1a0a0a 100%)"
          : "linear-gradient(135deg, #030712 0%, #0f172a 50%, #030712 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 backdrop-blur-xl bg-zinc-950/70 px-6 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <ShieldAlert size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-white">
                CYBER RISK INTELLIGENCE
              </h1>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase">
                Social Engineering Command Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {data && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Live Analysis Active
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">AI Engine:</span>
              <span className="text-blue-400 font-mono">OpenRouter LLM</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">

        {/* ── Input row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Input Panel */}
          <Panel title="Ingestion Layer" icon={<Cpu size={14} />} className="lg:col-span-2">
            <div className="space-y-3">
              <textarea
                className="w-full h-32 bg-zinc-950 border border-zinc-700 focus:border-blue-500 p-3 rounded-lg text-sm resize-none focus:outline-none transition-colors"
                placeholder="Paste a social media post, profile bio, or public content for analysis…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={loading}
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={loading}
                >
                  {["Student", "Engineer", "HR", "CFO", "CEO"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                  disabled={loading}
                >
                  {["finance", "healthcare", "tech", "general"].map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 cursor-pointer hover:border-red-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={execMode}
                    onChange={(e) => setExecMode(e.target.checked)}
                    className="accent-red-500"
                  />
                  <span className={execMode ? "text-red-400 font-semibold" : "text-zinc-400"}>
                    High Value Target Mode
                  </span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={analyzeText}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: execMode
                      ? "linear-gradient(135deg,#7f1d1d,#b91c1c)"
                      : "linear-gradient(135deg,#1d4ed8,#2563eb)",
                    boxShadow: execMode ? "0 0 20px #f8717130" : "0 0 20px #3b82f630",
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                  {loading ? "Analyzing…" : "Run Risk Analysis"}
                </button>
              </div>
              {/* URL + PDF row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or paste a public URL…"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-700 text-sm px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  disabled={loading}
                />
                <button
                  onClick={analyzeUrl}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 transition-colors"
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : <Globe size={14} />}
                </button>
                <label className="px-4 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 transition-colors cursor-pointer flex items-center gap-1">
                  <FileText size={14} />
                  PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadPdf(f);
                    }}
                    disabled={loading}
                  />
                </label>
                <label className="px-4 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 transition-colors cursor-pointer flex items-center gap-1">
                  <Activity size={14} />
                  CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCsv(f);
                    }}
                    disabled={loading}
                  />
                </label>
              </div>
            </div>
          </Panel>

          {/* Risk Gauge */}
          <Panel title="Threat Score" icon={<Target size={14} />}>
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <div className="relative">
                <RadialBarChart
                  width={180}
                  height={180}
                  innerRadius="65%"
                  outerRadius="100%"
                  data={radialData}
                  startAngle={210}
                  endAngle={-30}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar background={{ fill: "#1f2937" }} dataKey="value" cornerRadius={12} />
                </RadialBarChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-4xl font-black"
                    style={{ color: getRiskColor(), textShadow: `0 0 20px ${getRiskColor()}60` }}
                  >
                    {effectiveScore}
                  </span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
              </div>
              {data && (
                <>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold tracking-wide border"
                    style={{
                      background: getRiskColor() + "20",
                      borderColor: getRiskColor() + "60",
                      color: getRiskColor(),
                    }}
                  >
                    {getRiskLabel()}
                  </span>
                  <div className="text-center mt-1">
                    <p className="text-xs text-zinc-400">
                      Riskier than{" "}
                      <span className="font-bold" style={{ color: getRiskColor() }}>
                        {percentile}%
                      </span>{" "}
                      of profiles
                    </p>
                    <p className="text-xs text-zinc-500">
                      AI Confidence: <span className="text-blue-400 font-semibold">{confidence}%</span>
                    </p>
                  </div>
                </>
              )}
              {!data && (
                <p className="text-xs text-zinc-600 text-center">
                  Run an analysis to see your risk score
                </p>
              )}
            </div>
          </Panel>
        </div>

        {/* ── Summary Cards (show after analysis) ── */}
        {data && (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 transition-all duration-700"
            style={{ opacity: showResults ? 1 : 0, transform: showResults ? "translateY(0)" : "translateY(16px)" }}
          >
            <MetricCard
              label="Exploitability"
              numericValue={effectiveScore}
              value={`${effectiveScore}%`}
              sub={getRiskLabel()}
              icon={<Target size={16} />}
              color={getRiskColor()}
              trend={effectiveScore > 60 ? "up" : "flat"}
              sparkData={makeSparkline(effectiveScore, 1)}
              glow={effectiveScore > 60}
              staggerMs={0}
            />
            <MetricCard
              label="Identity Exposure"
              numericValue={identityIdx}
              value={`${identityIdx}%`}
              icon={<Users size={16} />}
              color="#60a5fa"
              trend={identityIdx > 30 ? "up" : "flat"}
              sparkData={makeSparkline(identityIdx || 20, 2)}
              staggerMs={80}
            />
            <MetricCard
              label="Location Leakage"
              numericValue={locationIdx}
              value={`${locationIdx}%`}
              icon={<Globe size={16} />}
              color="#f97316"
              trend={locationIdx > 30 ? "up" : "flat"}
              sparkData={makeSparkline(locationIdx || 15, 3)}
              staggerMs={160}
            />
            <MetricCard
              label="Corporate Risk"
              numericValue={corpIdx}
              value={`${corpIdx}%`}
              icon={<Building2 size={16} />}
              color="#22d3ee"
              trend="flat"
              sparkData={makeSparkline(corpIdx || 10, 4)}
              staggerMs={240}
            />
            <MetricCard
              label="Emotional Signal"
              numericValue={emoIdx}
              value={`${emoIdx}%`}
              icon={<Brain size={16} />}
              color="#a78bfa"
              trend="flat"
              sparkData={makeSparkline(emoIdx || 20, 5)}
              staggerMs={320}
            />
            <MetricCard
              label="Risk Trend"
              value={`${data.trend_analysis.current}%`}
              sub="vs 30d avg"
              icon={<Activity size={16} />}
              color="#4ade80"
              trend={
                data.trend_analysis.current > data.trend_analysis["30_days_ago"]
                  ? "up"
                  : "down"
              }
              sparkData={[
                data.trend_analysis["30_days_ago"],
                data.trend_analysis["14_days_ago"],
                data.trend_analysis.current,
              ]}
            />
          </div>
        )}

        {/* ── Results Grid ── */}
        {data && (
          <div
            ref={resultsRef}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 transition-all duration-700"
            style={{ opacity: showResults ? 1 : 0, transform: showResults ? "translateY(0)" : "translateY(24px)" }}
          >
            {/* Highlighted Text */}
            <Panel title="Entity Intelligence" icon={<Eye size={14} />} className="xl:col-span-2">
              <div className="flex gap-3 mb-3 flex-wrap">
                {[
                  { key: "GPE", label: "Location", color: "#f97316" },
                  { key: "PERSON", label: "Person", color: "#60a5fa" },
                  { key: "ORG", label: "Organization", color: "#22d3ee" },
                  { key: "family", label: "Family", color: "#f87171" },
                ].map(({ key, label, color }) => (
                  <span
                    key={key}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{ background: color + "20", borderColor: color + "60", color }}
                  >
                    ◆ {label}
                  </span>
                ))}
              </div>
              <div
                className="text-sm leading-relaxed bg-zinc-950 p-4 rounded-lg border border-zinc-800 min-h-[80px]"
                dangerouslySetInnerHTML={{ __html: highlightText(data.original_text || text) }}
              />
              {data.entities && Object.keys(data.entities).length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap">
                  {Object.entries(data.entities).map(([type, vals]) =>
                    vals.map((v, i) => (
                      <span
                        key={`${type}-${i}`}
                        className="text-[10px] px-2 py-0.5 rounded border font-mono"
                        style={{
                          background: ({ GPE: "#f9731620", PERSON: "#60a5fa20", ORG: "#22d3ee20" }[type] || "#a78bfa20"),
                          borderColor: ({ GPE: "#f9731650", PERSON: "#60a5fa50", ORG: "#22d3ee50" }[type] || "#a78bfa50"),
                          color: ({ GPE: "#f97316", PERSON: "#60a5fa", ORG: "#22d3ee" }[type] || "#a78bfa"),
                        }}
                      >
                        {type}: {v}
                      </span>
                    ))
                  )}
                </div>
              )}
            </Panel>

            {/* Risk Vectors */}
            <Panel title="Risk Vectors" icon={<AlertTriangle size={14} />}>
              {data.risk_vectors.length === 0 ? (
                <p className="text-xs text-zinc-500">No major risk vectors detected.</p>
              ) : (
                <ul className="space-y-2">
                  {data.risk_vectors.map((v, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm p-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5"
                    >
                      <AlertTriangle size={12} className="text-yellow-400 shrink-0" />
                      <span className="text-yellow-200">{v}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Risk Breakdown Pie */}
            <Panel title="Risk Breakdown" icon={<Activity size={14} />}>
              <div className="flex items-center gap-4">
                <PieChart width={150} height={150}>
                  <Pie
                    data={breakdownData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={65}
                    innerRadius={30}
                    paddingAngle={3}
                  >
                    {breakdownData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                </PieChart>
                <div className="space-y-1.5 flex-1">
                  {breakdownData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[i % 5] }}
                      />
                      <span className="text-zinc-400 truncate">{d.name}</span>
                      <span className="ml-auto font-bold" style={{ color: PIE_COLORS[i % 5] }}>
                        {Math.round(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>

            {/* Risk Radar */}
            <Panel title="Threat Radar" icon={<Network size={14} />}>
              {radarData.length > 0 ? (
                <RadarChart
                  cx={100}
                  cy={100}
                  outerRadius={80}
                  width={200}
                  height={200}
                  data={radarData}
                >
                  <PolarGrid stroke="#27272a" />
                  <RadarAngle dataKey="subject" tick={{ fontSize: 10, fill: "#a1a1aa" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Risk"
                    dataKey="A"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.35}
                  />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                  />
                </RadarChart>
              ) : (
                <p className="text-xs text-zinc-500">Insufficient entity data for radar.</p>
              )}
            </Panel>

            {/* Risk Trend */}
            <Panel title="Risk Trend" icon={<TrendingUp size={14} />}>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                    itemStyle={{ color: "#60a5fa" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#trendGrad)"
                    dot={{ fill: "#3b82f6", r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Panel>

            {/* Org Heatmap */}
            <Panel title="Exposure Heatmap" icon={<Shield size={14} />}>
              <div className="space-y-3">
                <HeatmapRow label="Identity" value={identityIdx || 45} color="#60a5fa" />
                <HeatmapRow label="Location" value={locationIdx || 30} color="#f97316" />
                <HeatmapRow label="Corporate" value={corpIdx || 25} color="#22d3ee" />
                <HeatmapRow label="Family" value={familyIdx || 0} color="#f87171" />
                <HeatmapRow label="Emotional" value={emoIdx || 20} color="#a78bfa" />
              </div>
            </Panel>

            {/* Attack Path */}
            <Panel title="Attack Path Simulation" icon={<Target size={14} />} className="xl:col-span-2">
              <AttackPathFlow active={showResults} />
              <p className="text-xs text-zinc-500 mt-3">
                Simulated attack chain based on extracted public exposure signals.
              </p>
            </Panel>

            {/* Attack Simulation */}
            <Panel title="Attack Simulation" icon={<Zap size={14} />} className="xl:col-span-2">
              <div className="flex gap-2 mb-3 flex-wrap">
                {SIM_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setSelectedSim(tab.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    style={
                      selectedSim === tab.key
                        ? { background: "#2563eb20", borderColor: "#3b82f6", color: "#60a5fa" }
                        : { background: "transparent", borderColor: "#27272a", color: "#71717a" }
                    }
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm h-48 overflow-auto font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                <TypewriterText
                  key={selectedSim}
                  text={data.threat_simulations?.[selectedSim] || "[AI simulation unavailable — set OPENROUTER_API_KEY in backend/.env]"}
                  speed={6}
                />
              </div>
            </Panel>

            {/* Phishing Preview */}
            <Panel title="Phishing Email Preview" icon={<Mail size={14} />}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDetailed(false)}
                    className="text-xs px-2 py-1 rounded border transition-all"
                    style={
                      !showDetailed
                        ? { background: "#2563eb20", borderColor: "#3b82f6", color: "#60a5fa" }
                        : { borderColor: "#27272a", color: "#71717a" }
                    }
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setShowDetailed(true)}
                    className="text-xs px-2 py-1 rounded border transition-all"
                    style={
                      showDetailed
                        ? { background: "#2563eb20", borderColor: "#3b82f6", color: "#60a5fa" }
                        : { borderColor: "#27272a", color: "#71717a" }
                    }
                  >
                    Detailed
                  </button>
                </div>
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-blue-500 transition-colors"
                >
                  <Download size={12} />
                  PDF Report
                </button>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs font-mono text-zinc-300 h-44 overflow-auto whitespace-pre-wrap leading-relaxed">
                <TypewriterText
                  key={showDetailed ? "detailed" : "simple"}
                  text={
                    showDetailed
                      ? data.phishing_report_detailed || data.threat_simulations?.email || "[Detailed view unavailable]"
                      : data.phishing_preview_simple || data.threat_simulations?.email || "[Preview unavailable]"
                  }
                  speed={5}
                />
              </div>
            </Panel>

            {/* Mitigation Plan */}
            <Panel title="Mitigation Strategy" icon={<Shield size={14} />}>
              <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-auto">
                <TypewriterText
                  text={data.mitigation_plan || "No mitigation plan generated."}
                  speed={4}
                />
              </div>
            </Panel>

            {/* Checklist */}
            <Panel title="Security Checklist" icon={<CheckSquare size={14} />}>
              <div className="space-y-3">
                {CHECKLIST_ITEMS.map((item, i) => (
                  <CheckItem
                    key={i}
                    text={item}
                    checked={checklist[i]}
                    onToggle={() =>
                      setChecklist((prev) => {
                        const next = [...prev];
                        next[i] = !next[i];
                        return next;
                      })
                    }
                  />
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="flex justify-between text-xs text-zinc-400 mb-1">
                  <span>Remediation Progress</span>
                  <span className="text-green-400">{checklist.filter(Boolean).length}/{CHECKLIST_ITEMS.length}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-400 transition-all duration-500"
                    style={{ width: `${(checklist.filter(Boolean).length / CHECKLIST_ITEMS.length) * 100}%` }}
                  />
                </div>
              </div>
            </Panel>

            {/* Industry Context */}
            {data.industry_contextual_risk && (
              <Panel title="Industry Threat Context" icon={<Building2 size={14} />} className="xl:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 shrink-0">
                    <Building2 size={16} className="text-cyan-400" />
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {data.industry_contextual_risk}
                  </p>
                </div>
              </Panel>
            )}

            {/* Confidence + Metadata */}
            <Panel title="Analysis Metadata" icon={<Cpu size={14} />}>
              <div className="space-y-2 text-xs font-mono">
                {[
                  ["Report ID", data.report_id.slice(0, 16) + "…"],
                  ["Timestamp", data.analysis_timestamp.slice(0, 19).replace("T", " ")],
                  ["Confidence", `${confidence}%`],
                  ["Percentile", `${percentile}th`],
                  ["Role", role],
                  ["Industry", industry],
                  ["Exec Mode", execMode ? "ON (1.2×)" : "OFF"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-zinc-200">{v}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* ── Empty state ── */}
        {!data && !loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <ShieldAlert size={40} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-300">Ready for Analysis</h2>
            <p className="text-zinc-500 max-w-md text-sm">
              Paste any public social media post, LinkedIn bio, or web content above and click{" "}
              <strong className="text-blue-400">Run Risk Analysis</strong> to generate a full threat intelligence report.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 size={40} className="animate-spin text-blue-400" />
            <p className="text-zinc-400 text-sm animate-pulse">Running multi-agent analysis…</p>
            <div className="flex gap-6 text-xs text-zinc-600 mt-2">
              {["NLP Extraction", "Risk Scoring", "LLM Simulation", "Report Build"].map((s) => (
                <span key={s} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
