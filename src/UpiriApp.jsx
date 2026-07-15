import { useState, useEffect, useMemo } from "react";
import {
  Wind, Activity, CalendarDays, Stethoscope, Users, Building2, ArrowLeft,
  Plus, Minus, Bluetooth, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown,
  HeartPulse, FileText, Flame, ScanLine, Phone, Sparkles, Leaf, Clock, X
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceArea, BarChart, Bar, CartesianGrid, ReferenceLine
} from "recharts";

/* ================= CONFIG — set before public launch ================= */
const WHATSAPP_NUMBER = "91XXXXXXXXXX"; // replace with the single ŪPIRI booking line
const HOSPITAL = "Yashoda Hospitals";

/* ================= BRAND TOKENS ================= */
const C = {
  indigo: "#2C2A6B",
  ink: "#1D1B4B",
  marigold: "#F5821F",
  marigoldSoft: "#FDEBD9",
  sky: "#EDF2F8",
  mist: "#DDE4EF",
  card: "#FFFFFF",
  green: "#2F8F5B",
  greenSoft: "#E3F2E9",
  amber: "#C98A00",
  amberSoft: "#FBF1DC",
  red: "#CE4438",
  redSoft: "#FBE7E5",
  indigoSoft: "#E7E7F4",
};

const waLink = (text) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

/* ================= STORAGE HELPERS ================= */
async function loadKey(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, obj) {
  try {
    window.localStorage.setItem(key, JSON.stringify(obj));
    return true;
  } catch (e) {
    console.error("storage save failed", e);
    return false;
  }
}

/* ================= DATE HELPERS ================= */
const todayStr = () => new Date().toISOString().slice(0, 10);
const dShort = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const lastNDates = (n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
};

/* ================= GLOBAL STYLE ================= */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;600&display=swap');
      .up-root { font-family:'Inter', system-ui, -apple-system, sans-serif; color:${C.ink}; }
      .disp { font-family:'Bricolage Grotesque','Inter',system-ui,sans-serif; letter-spacing:-0.02em; }
      .telugu { font-family:'Noto Sans Telugu','Inter',system-ui,sans-serif; }
      @keyframes breathe { 0%,100%{ transform:scale(1); opacity:.85;} 50%{ transform:scale(1.12); opacity:1;} }
      @keyframes breatheSlow { 0%,100%{ transform:scale(1); opacity:.35;} 50%{ transform:scale(1.22); opacity:.6;} }
      .breath-ring { animation: breathe 4.5s ease-in-out infinite; }
      .breath-ring-outer { animation: breatheSlow 4.5s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce){ .breath-ring, .breath-ring-outer { animation:none; } }
      .up-root button:focus-visible, .up-root a:focus-visible, .up-root input:focus-visible, .up-root select:focus-visible {
        outline: 3px solid ${C.marigold}; outline-offset: 2px; border-radius: 6px;
      }
      .tile:hover { transform: translateY(-2px); }
      .tile { transition: transform .15s ease, box-shadow .15s ease; }
    `}</style>
  );
}

/* ================= LOGO ================= */
function PetalMark({ size = 34 }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {petals.map((a) => (
        <ellipse key={a} cx="50" cy="26" rx="11" ry="24" fill={C.marigold}
          transform={`rotate(${a} 50 50)`} opacity="0.95" />
      ))}
      <circle cx="50" cy="50" r="9" fill="#fff" />
    </svg>
  );
}

function BreathRing({ size = 190, label = "శ్వాస", sub = "breathe" }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="breath-ring-outer absolute rounded-full"
        style={{ width: size, height: size, border: `2px solid ${C.marigold}` }} />
      <div className="breath-ring absolute rounded-full"
        style={{ width: size * 0.74, height: size * 0.74, border: `3px solid ${C.marigold}`, background: "rgba(245,130,31,0.08)" }} />
      <div className="text-center relative">
        <div className="telugu font-semibold" style={{ fontSize: size * 0.16, color: C.marigold }}>{label}</div>
        <div className="text-xs tracking-widest uppercase" style={{ color: "#B9C3D6" }}>{sub}</div>
      </div>
    </div>
  );
}

/* ================= UI ATOMS ================= */
function Btn({ children, onClick, href, kind = "primary", full, small, disabled }) {
  const styles = {
    primary: { background: C.marigold, color: "#fff" },
    dark: { background: C.indigo, color: "#fff" },
    ghost: { background: "transparent", color: C.indigo, border: `1.5px solid ${C.mist}` },
    danger: { background: C.red, color: "#fff" },
  }[kind];
  const cls = `inline-flex items-center justify-center gap-2 font-semibold rounded-xl ${small ? "px-3 py-2 text-sm" : "px-5 py-3"} ${full ? "w-full" : ""} ${disabled ? "opacity-50 pointer-events-none" : ""}`;
  if (href)
    return <a className={cls} style={styles} href={href} target="_blank" rel="noreferrer">{children}</a>;
  return <button className={cls} style={styles} onClick={onClick} disabled={disabled}>{children}</button>;
}

function Card({ children, className = "", style = {} }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: C.card, border: `1px solid ${C.mist}`, boxShadow: "0 1px 3px rgba(29,27,75,0.06)", ...style }}>
      {children}
    </div>
  );
}

function Chip({ children, tone = "indigo" }) {
  const map = {
    indigo: { bg: C.indigoSoft, fg: C.indigo },
    orange: { bg: C.marigoldSoft, fg: "#B35A08" },
    green: { bg: C.greenSoft, fg: C.green },
    amber: { bg: C.amberSoft, fg: C.amber },
    red: { bg: C.redSoft, fg: C.red },
  }[tone];
  return (
    <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: map.bg, color: map.fg }}>{children}</span>
  );
}

function BackBar({ title, telugu, onBack }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={onBack} aria-label="Back to home"
        className="p-2 rounded-full" style={{ background: C.indigoSoft, color: C.indigo }}>
        <ArrowLeft size={18} />
      </button>
      <div>
        <h1 className="disp text-xl font-bold leading-tight" style={{ color: C.indigo }}>{title}</h1>
        {telugu && <div className="telugu text-sm" style={{ color: "#6C6A9E" }}>{telugu}</div>}
      </div>
    </div>
  );
}

function Banner({ tone, icon, title, children, cta }) {
  const map = {
    green: { bg: C.greenSoft, bd: C.green, fg: C.green },
    amber: { bg: C.amberSoft, bd: C.amber, fg: C.amber },
    red: { bg: C.redSoft, bd: C.red, fg: C.red },
    indigo: { bg: C.indigoSoft, bd: C.indigo, fg: C.indigo },
  }[tone];
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: map.bg, border: `1.5px solid ${map.bd}` }}>
      <div className="flex items-start gap-3">
        <div style={{ color: map.fg }} className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <div className="font-bold" style={{ color: map.fg }}>{title}</div>
          <div className="text-sm mt-1" style={{ color: C.ink }}>{children}</div>
          {cta && <div className="mt-3">{cta}</div>}
        </div>
      </div>
    </div>
  );
}

/* ================= HOME ================= */
const MODULES = [
  { id: "risk", icon: <ScanLine size={22} />, title: "Ūpiri Risk Check", te: "మీ రిస్క్ తెలుసుకోండి", desc: "2-minute lung cancer risk check. Know if you need an AI X-ray read.", tag: "2 min" },
  { id: "breath", icon: <Wind size={22} />, title: "Breath Score™ / Lung Age", te: "మీ ఊపిరి స్కోరు", desc: "Your lungs' age from spirometry — or a quick Breath Score quiz.", tag: "New" },
  { id: "journey", icon: <Stethoscope size={22} />, title: "Nodule found? The journey", te: "నాడ్యూల్ కనబడిందా?", desc: "From shadow to answer — in days, not months. Every step explained.", tag: "48–72h fast-track" },
  { id: "asthma", icon: <HeartPulse size={22} />, title: "Asthma Academy Club", te: "ఆస్తమా క్లబ్", desc: "Log inhalers, sync your peak flow meter, catch flare-ups early.", tag: "Member portal" },
  { id: "copd", icon: <Activity size={22} />, title: "COPD Club", te: "సీఓపీడీ క్లబ్", desc: "Daily adherence, breathing diary and peak-flow trend alerts.", tag: "Member portal" },
  { id: "allergy", icon: <CalendarDays size={22} />, title: "Hyderabad Allergy Calendar", te: "అలర్జీ క్యాలెండర్", desc: "What's in the city's air this month — and how to stay ahead of it.", tag: "Monthly" },
  { id: "case", icon: <FileText size={22} />, title: "Case of the Month", te: "ఈ నెల కేసు", desc: "From the Nodule Board: real pathways, anonymised, explained.", tag: "Physicians & patients" },
  { id: "rendo", icon: <Flame size={22} />, title: "Rendo Ūpiri — quit smoking", te: "రెండో ఊపిరి", desc: "Your second breath. Track your quit, watch your lungs recover.", tag: "90-day challenge" },
  { id: "work", icon: <Building2 size={22} />, title: "ŪPIRI@Work", te: "కార్పొరేట్ ప్యాకేజీలు", desc: "Breath Score for your whole team — on-site, 4 minutes each.", tag: "For HR" },
];

function Home({ go }) {
  return (
    <div>
      {/* HERO */}
      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: C.indigo }}>
        <div className="p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-3">
              <Chip tone="orange">AI Lung Nodule Clinic</Chip>
              <Chip tone="green">Precision Pulmonary Care</Chip>
            </div>
            <h1 className="disp font-extrabold text-white leading-tight" style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)" }}>
              One X-ray. Two readings.
            </h1>
            <p className="mt-2 text-base" style={{ color: "#C9D2E6" }}>
              Your radiologist — and an AI trained on millions of lungs. From shadow to answer, in days, not months.
            </p>
            <p className="telugu mt-2" style={{ color: C.marigold }}>
              ఒక ఎక్స్-రే. రెండు నిమిషాలు. మీ ఊపిరికి భరోసా.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 justify-center sm:justify-start">
              <Btn onClick={() => go("risk")}><ScanLine size={18} /> Check my risk — 2 min</Btn>
              <Btn kind="ghost" href={waLink("Hi, I'd like to book an ŪPIRI Lung Check.")}
                ><span style={{ color: "#fff" }} className="flex items-center gap-2"><Phone size={16} /> Book on WhatsApp</span></Btn>
            </div>
          </div>
          <BreathRing />
        </div>
        <div className="px-6 sm:px-10 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ background: "#232159", color: "#AEB8D2" }}>
          <span>✓ AI second read on every X-ray</span>
          <span>✓ Nodule appointment in 48–72 hours</span>
          <span>✓ EBUS · Archimedes BTPNA · Cone-beam CT · Cryobiopsy</span>
          <span>✓ MDT Nodule Board review</span>
        </div>
      </div>

      {/* MODULES */}
      <h2 className="disp text-lg font-bold mb-3" style={{ color: C.indigo }}>Where would you like to start?</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <button key={m.id} onClick={() => go(m.id)}
            className="tile text-left rounded-2xl p-5 flex flex-col gap-2"
            style={{ background: C.card, border: `1px solid ${C.mist}` }}>
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-xl" style={{ background: C.indigoSoft, color: C.indigo }}>{m.icon}</div>
              <Chip tone="orange">{m.tag}</Chip>
            </div>
            <div>
              <div className="disp font-bold" style={{ color: C.indigo }}>{m.title}</div>
              <div className="telugu text-xs" style={{ color: "#8A88B8" }}>{m.te}</div>
            </div>
            <p className="text-sm" style={{ color: "#4A4880" }}>{m.desc}</p>
            <div className="mt-auto flex items-center gap-1 text-sm font-semibold" style={{ color: C.marigold }}>
              Open <ChevronRight size={16} />
            </div>
          </button>
        ))}
      </div>

      {/* WHY */}
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {[
          { n: "₹300–600", l: "for an X-ray + AI read — not a ₹3,000+ CT" },
          { n: "2 min", l: "walk-in. No appointment, no prep, no fear" },
          { n: "1 roof", l: "detection → biopsy → treatment → surveillance" },
        ].map((s, i) => (
          <Card key={i} className="text-center">
            <div className="disp text-2xl font-extrabold" style={{ color: C.marigold }}>{s.n}</div>
            <div className="text-sm mt-1" style={{ color: "#4A4880" }}>{s.l}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ================= 1. ŪPIRI RISK CHECK ================= */
const REDFLAGS = [
  "Coughed up blood, even once",
  "Cough lasting more than 3 weeks",
  "Unexplained weight loss",
  "Chest pain that doesn't settle",
  "Hoarse voice for over 3 weeks",
];

function RiskCheck({ onBack }) {
  const [step, setStep] = useState(0);
  const [flags, setFlags] = useState([]);
  const [age, setAge] = useState(null);
  const [smoke, setSmoke] = useState(null);
  const [years, setYears] = useState(null);
  const [quitLong, setQuitLong] = useState(null);
  const [exp, setExp] = useState([]);
  const [hist, setHist] = useState([]);

  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const score = useMemo(() => {
    let s = 0;
    s += { "<40": 0, "40–49": 1, "50–59": 2, "60–69": 3, "70+": 4 }[age] ?? 0;
    s += { never: 0, former: 2, current: 4 }[smoke] ?? 0;
    if (smoke && smoke !== "never")
      s += { "<10": 1, "10–20": 2, "21–30": 3, "30+": 4 }[years] ?? 0;
    if (smoke === "former" && quitLong === "yes") s -= 1;
    if (exp.includes("dust")) s += 2;
    if (exp.includes("traffic")) s += 1;
    if (exp.includes("biomass")) s += 1;
    if (exp.includes("secondhand")) s += 1;
    if (hist.includes("family")) s += 2;
    if (hist.includes("copd")) s += 2;
    if (hist.includes("cancer")) s += 1;
    if (hist.includes("tb")) s += 1;
    return Math.max(0, s);
  }, [age, smoke, years, quitLong, exp, hist]);

  const hasFlags = flags.length > 0;
  const tier = hasFlags ? "flag" : score >= 8 ? "high" : score >= 4 ? "mod" : "low";

  const OptRow = ({ options, value, onPick }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((o) => (
        <button key={o} onClick={() => onPick(o)}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={value === o
            ? { background: C.indigo, color: "#fff" }
            : { background: "#fff", color: C.indigo, border: `1.5px solid ${C.mist}` }}>
          {o}
        </button>
      ))}
    </div>
  );

  const CheckRow = ({ options, values, onToggle }) => (
    <div className="flex flex-col gap-2 mt-2">
      {options.map((o) => (
        <button key={o.v} onClick={() => onToggle(o.v)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left font-medium"
          style={values.includes(o.v)
            ? { background: C.indigoSoft, border: `1.5px solid ${C.indigo}`, color: C.indigo }
            : { background: "#fff", border: `1.5px solid ${C.mist}`, color: C.ink }}>
          <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
            style={{ background: values.includes(o.v) ? C.indigo : "#fff", border: `1.5px solid ${values.includes(o.v) ? C.indigo : C.mist}` }}>
            {values.includes(o.v) && <CheckCircle2 size={14} color="#fff" />}
          </span>
          {o.l}
        </button>
      ))}
    </div>
  );

  const steps = [
    {
      t: "First — any of these right now?",
      te: "ముందుగా — ఈ లక్షణాలు ఉన్నాయా?",
      body: <CheckRow options={REDFLAGS.map((f) => ({ v: f, l: f }))} values={flags} onToggle={(v) => toggle(flags, setFlags, v)} />,
      ready: true,
    },
    {
      t: "Your age",
      te: "మీ వయసు",
      body: <OptRow options={["<40", "40–49", "50–59", "60–69", "70+"]} value={age} onPick={setAge} />,
      ready: !!age,
    },
    {
      t: "Smoking (cigarettes or beedis)",
      te: "పొగ అలవాటు",
      body: (
        <>
          <OptRow options={["never", "former", "current"]} value={smoke} onPick={setSmoke} />
          {smoke && smoke !== "never" && (
            <>
              <p className="text-sm mt-4 font-semibold">For how many years, in total?</p>
              <OptRow options={["<10", "10–20", "21–30", "30+"]} value={years} onPick={setYears} />
            </>
          )}
          {smoke === "former" && (
            <>
              <p className="text-sm mt-4 font-semibold">Quit more than 15 years ago?</p>
              <OptRow options={["yes", "no"]} value={quitLong} onPick={setQuitLong} />
            </>
          )}
        </>
      ),
      ready: smoke === "never" || (!!years && (smoke === "current" || !!quitLong)),
    },
    {
      t: "The air you breathe",
      te: "మీరు పీల్చే గాలి",
      body: (
        <CheckRow
          options={[
            { v: "dust", l: "Work with dust: construction, granite/stone, mining, welding" },
            { v: "traffic", l: "Long hours in traffic (driver, traffic police, delivery)" },
            { v: "biomass", l: "Cooking on wood/coal/kerosene stove at home" },
            { v: "secondhand", l: "Someone smokes inside my home" },
          ]}
          values={exp}
          onToggle={(v) => toggle(exp, setExp, v)}
        />
      ),
      ready: true,
    },
    {
      t: "Your history",
      te: "మీ ఆరోగ్య చరిత్ర",
      body: (
        <CheckRow
          options={[
            { v: "family", l: "Parent, brother or sister had lung cancer" },
            { v: "copd", l: "Diagnosed COPD / chronic bronchitis / emphysema" },
            { v: "cancer", l: "I've had cancer before (any type)" },
            { v: "tb", l: "Past tuberculosis (TB)" },
          ]}
          values={hist}
          onToggle={(v) => toggle(hist, setHist, v)}
        />
      ),
      ready: true,
    },
  ];

  if (step === steps.length) {
    const config = {
      flag: {
        tone: "red", title: "See a pulmonologist this week",
        body: "You reported a symptom that needs a doctor's eyes regardless of any score. This is usually something simple — but a 3-week cough, blood in sputum or weight loss should never wait. We'll fast-track you.",
        cta: "PRIORITY consult — a symptom needs review this week",
      },
      high: {
        tone: "amber", title: "Higher risk — book a priority Ūpiri check",
        body: "Your answers put you in the group that benefits most from an AI-read chest X-ray and a pulmonologist review. Two minutes for the X-ray; your report on WhatsApp.",
        cta: "priority Ūpiri AI X-ray check (higher-risk result)",
      },
      mod: {
        tone: "indigo", title: "Moderate risk — an annual Ūpiri check makes sense",
        body: "Nothing alarming, but enough factors that a yearly AI-read chest X-ray is a smart habit. It costs about as much as a movie ticket and takes 2 minutes.",
        cta: "annual Ūpiri AI X-ray check (moderate-risk result)",
      },
      low: {
        tone: "green", title: "Low risk — keep breathing easy",
        body: "Your risk factors are low today. Recheck once a year, walk when the AQI allows, and come back if a cough ever crosses 3 weeks.",
        cta: "a routine ŪPIRI Lung Check",
      },
    }[tier];
    return (
      <div>
        <BackBar title="Ūpiri Risk Check" telugu="మీ రిస్క్ ఫలితం" onBack={onBack} />
        <Card>
          <div className="text-center py-2">
            {tier !== "flag" && (
              <div className="disp text-5xl font-extrabold mb-1" style={{ color: C.indigo }}>{score}<span className="text-xl" style={{ color: "#9A98C4" }}> / 18</span></div>
            )}
            <Chip tone={config.tone}>{tier === "flag" ? "Symptom red flag" : tier === "high" ? "Higher risk" : tier === "mod" ? "Moderate risk" : "Low risk"}</Chip>
          </div>
          <Banner tone={config.tone} icon={tier === "low" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />} title={config.title}
            cta={<Btn href={waLink(`Hi, I completed the Ūpiri Risk Check. Result: ${config.title}. I'd like to book ${config.cta}.`)}><Phone size={16} /> Book on WhatsApp</Btn>}>
            {config.body}
          </Banner>
          {hasFlags && (
            <div className="text-sm rounded-xl p-3" style={{ background: C.sky }}>
              You selected: {flags.join("; ")}.
            </div>
          )}
          <p className="text-xs mt-4" style={{ color: "#8A88B8" }}>
            This is an awareness and triage tool built on established risk factors (PLCO / Liverpool Lung Project models). It is not a diagnosis and does not replace a doctor. Weights are pending final review by the {HOSPITAL} pulmonology consultants.
          </p>
          <div className="mt-4"><Btn kind="ghost" small onClick={() => { setStep(0); setFlags([]); setAge(null); setSmoke(null); setYears(null); setQuitLong(null); setExp([]); setHist([]); }}>Start over</Btn></div>
        </Card>
      </div>
    );
  }

  const s = steps[step];
  return (
    <div>
      <BackBar title="Ūpiri Risk Check" telugu="2 నిమిషాల్లో మీ రిస్క్ తెలుసుకోండి" onBack={onBack} />
      <div className="flex gap-1.5 mb-4">
        {steps.map((_, i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? C.marigold : C.mist }} />
        ))}
      </div>
      <Card>
        <div className="disp font-bold text-lg" style={{ color: C.indigo }}>{s.t}</div>
        <div className="telugu text-sm mb-1" style={{ color: "#8A88B8" }}>{s.te}</div>
        {step === 0 && <p className="text-sm" style={{ color: "#4A4880" }}>Tick anything that applies — or just continue if none do.</p>}
        {s.body}
        <div className="flex gap-3 mt-6">
          {step > 0 && <Btn kind="ghost" onClick={() => setStep(step - 1)}>Back</Btn>}
          <Btn onClick={() => setStep(step + 1)} disabled={!s.ready} full>
            {step === steps.length - 1 ? "See my result" : "Continue"} <ChevronRight size={18} />
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/* ================= 2. BREATH SCORE / LUNG AGE ================= */
function LungAge({ onBack }) {
  const [mode, setMode] = useState("quiz"); // quiz | spiro
  // spiro
  const [sex, setSex] = useState("male");
  const [ageIn, setAgeIn] = useState("");
  const [ht, setHt] = useState("");
  const [fev1, setFev1] = useState("");
  const [lungAge, setLungAge] = useState(null);
  // quiz
  const [q, setQ] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  const calcSpiro = () => {
    const a = parseFloat(ageIn), h = parseFloat(ht), f = parseFloat(fev1);
    if (!a || !h || !f) return;
    const inches = h / 2.54;
    let la = sex === "male"
      ? 2.875 * inches - 31.25 * f - 39.375
      : 3.56 * inches - 40 * f - 77.28;
    la = Math.round(Math.min(95, Math.max(18, la)));
    setLungAge({ la, delta: la - a });
  };

  const QUIZ = [
    { k: "smoke", t: "Smoking", opts: [["Never smoked", 20], ["Quit smoking", 12], ["Current smoker", 0]] },
    { k: "stairs", t: "Two flights of stairs", opts: [["No problem", 15], ["Slightly breathless", 8], ["Must stop to rest", 0]] },
    { k: "cough", t: "Cough on most days", opts: [["No", 10], ["Yes", 0]] },
    { k: "wheeze", t: "Wheeze or chest tightness", opts: [["Never", 10], ["Sometimes", 4], ["Often", 0]] },
    { k: "exercise", t: "Exercise / brisk walk", opts: [["3+ days a week", 10], ["1–2 days", 5], ["Rarely", 0]] },
    { k: "air", t: "Your daily air", opts: [["Mostly indoors, clean", 10], ["Traffic / dusty work", 0]] },
    { k: "season", t: "Winter smog season", opts: [["Doesn't affect me", 10], ["I cough / wheeze more", 3]] },
    { k: "age", t: "Age group", opts: [["Under 40", 15], ["40–59", 10], ["60+", 5]] },
  ];

  const calcQuiz = () => {
    if (Object.keys(q).length < QUIZ.length) return;
    const total = Math.min(100, Object.values(q).reduce((a, b) => a + b, 0));
    setQuizResult(total);
  };

  const scoreTier = (v) => v >= 80 ? { tone: "green", t: "Strong", msg: "Your breath is on your side. An annual Ūpiri check keeps it that way." }
    : v >= 60 ? { tone: "amber", t: "Fair", msg: "A few signals worth listening to. Book an Ūpiri AI X-ray check + spirometry to get your real numbers." }
      : { tone: "red", t: "Needs attention", msg: "Your answers suggest your lungs are asking for help. Book a priority pulmonology consult this week." };

  return (
    <div>
      <BackBar title="Breath Score™ / Lung Age" telugu="మీ ఊపిరి వయసు ఎంత?" onBack={onBack} />
      <div className="flex gap-2 mb-4">
        {[["quiz", "Quick Breath Score quiz"], ["spiro", "I have spirometry values"]].map(([v, l]) => (
          <button key={v} onClick={() => setMode(v)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={mode === v ? { background: C.indigo, color: "#fff" } : { background: "#fff", color: C.indigo, border: `1.5px solid ${C.mist}` }}>
            {l}
          </button>
        ))}
      </div>

      {mode === "spiro" ? (
        <Card>
          <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
            Enter your FEV₁ from any spirometry report. We'll tell you the age of a healthy person whose lungs perform like yours.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-semibold">Sex
              <select value={sex} onChange={(e) => setSex(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }}>
                <option value="male">Male</option><option value="female">Female</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Age (years)
              <input inputMode="numeric" value={ageIn} onChange={(e) => setAgeIn(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} placeholder="45" />
            </label>
            <label className="text-sm font-semibold">Height (cm)
              <input inputMode="numeric" value={ht} onChange={(e) => setHt(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} placeholder="168" />
            </label>
            <label className="text-sm font-semibold">FEV₁ (litres)
              <input inputMode="decimal" value={fev1} onChange={(e) => setFev1(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} placeholder="2.8" />
            </label>
          </div>
          <div className="mt-4"><Btn onClick={calcSpiro} full><Wind size={18} /> Calculate my Lung Age</Btn></div>
          {lungAge && (
            <div className="mt-5 text-center rounded-2xl p-5" style={{ background: C.indigo }}>
              <div className="text-xs uppercase tracking-widest" style={{ color: "#AEB8D2" }}>Your lungs perform like age</div>
              <div className="disp text-6xl font-extrabold" style={{ color: C.marigold }}>{lungAge.la}</div>
              <div className="text-sm mt-1" style={{ color: "#C9D2E6" }}>
                {lungAge.delta > 2 ? `${lungAge.delta} years older than you. The good news: lungs respond fast — especially if you quit smoking.` :
                  lungAge.delta < -2 ? `${Math.abs(lungAge.delta)} years younger than you. Keep it that way.` :
                    "About the same as your real age."}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Btn small href={waLink(`Hi, my Lung Age result is ${lungAge.la}. I'd like to book a full Ūpiri check.`)}><Phone size={14} /> Book a full check</Btn>
                {lungAge.delta > 2 && <Btn small kind="dark" onClick={() => { }} href={waLink("I'd like to join Rendo Ūpiri, the quit-smoking program.")}>Rendo Ūpiri — make them younger</Btn>}
              </div>
            </div>
          )}
          <p className="text-xs mt-4" style={{ color: "#8A88B8" }}>
            Lung Age uses the Morris–Temple spirometric equations; derived reference populations differ from Indian norms, so treat this as an indicative motivator, not a diagnosis. Get lab spirometry at the Advanced Lung Function Laboratory for exact values.
          </p>
        </Card>
      ) : (
        <Card>
          {quizResult === null ? (
            <>
              {QUIZ.map((item) => (
                <div key={item.k} className="mb-4">
                  <div className="text-sm font-semibold mb-2">{item.t}</div>
                  <div className="flex flex-wrap gap-2">
                    {item.opts.map(([l, v]) => (
                      <button key={l} onClick={() => setQ({ ...q, [item.k]: v })}
                        className="px-3.5 py-2 rounded-xl text-sm font-medium"
                        style={q[item.k] === v ? { background: C.indigo, color: "#fff" } : { background: "#fff", color: C.indigo, border: `1.5px solid ${C.mist}` }}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <Btn onClick={calcQuiz} full disabled={Object.keys(q).length < QUIZ.length}>
                <Sparkles size={18} /> Reveal my Breath Score
              </Btn>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="mx-auto mb-3 relative flex items-center justify-center" style={{ width: 170, height: 170 }}>
                <div className="breath-ring absolute rounded-full" style={{ width: 170, height: 170, border: `4px solid ${scoreTier(quizResult).tone === "green" ? C.green : scoreTier(quizResult).tone === "amber" ? C.amber : C.red}` }} />
                <div>
                  <div className="disp text-5xl font-extrabold" style={{ color: C.indigo }}>{quizResult}</div>
                  <div className="text-xs uppercase tracking-widest" style={{ color: "#8A88B8" }}>Breath Score</div>
                </div>
              </div>
              <Chip tone={scoreTier(quizResult).tone}>{scoreTier(quizResult).t}</Chip>
              <p className="text-sm mt-3 max-w-md mx-auto" style={{ color: "#4A4880" }}>{scoreTier(quizResult).msg}</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Btn href={waLink(`Hi, my Breath Score is ${quizResult}/100. I'd like to book an Ūpiri check.`)}><Phone size={16} /> Book my Ūpiri check</Btn>
                <Btn kind="ghost" onClick={() => { setQ({}); setQuizResult(null); }}>Retake</Btn>
              </div>
              <p className="text-xs mt-4" style={{ color: "#8A88B8" }}>
                A lifestyle awareness score — the full Breath Score™ report (AI X-ray read + spirometry Lung Age + risk tier) comes with your ŪPIRI Lung Check.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ================= 3. NODULE JOURNEY ================= */
const JOURNEY = [
  { t: "Day 0 · The X-ray", d: "A routine 2-minute chest X-ray — walk-in, at the hospital, a camp, or a partner lab. Your radiologist reads it, and Qure.ai's qXR reads it again. Two readings on every film." },
  { t: "Day 0 · The AI flag", d: "If the AI or radiologist spots a shadow, it isn't a diagnosis — it's a question. Most nodules are NOT cancer. You get a call the same day and a fast-track slot within 48–72 hours." },
  { t: "Day 1–2 · The consult & scan", d: "A pulmonologist reviews everything with you. If needed, a low-dose CT sizes and characterises the nodule precisely. Many patients need nothing more than a follow-up scan on a schedule." },
  { t: "Day 2–3 · The Nodule Board", d: "Pulmonology, radiology, oncology and thoracic surgery review your case together in one multidisciplinary sitting — so you get one plan, not four opinions." },
  { t: "Day 3–5 · The answer (if tissue is needed)", d: "The region's widest biopsy arsenal, chosen to fit your nodule: EBUS · radial EBUS · Archimedes BTPNA navigational bronchoscopy · cone-beam CT-guided biopsy · cryobiopsy. Most are day procedures." },
  { t: "Beyond · Treatment or watchfulness", d: "Benign? A clear surveillance calendar with WhatsApp reminders. If treatment is needed, surgery/oncology begins under the same roof — with the earliest possible stage on your side." },
];

function NoduleJourney({ onBack }) {
  const [open, setOpen] = useState(0);
  return (
    <div>
      <BackBar title="A nodule was found. Now what?" telugu="నాడ్యూల్ కనబడింది — తర్వాత ఏంటి?" onBack={onBack} />
      <Banner tone="indigo" icon={<Clock size={20} />} title="From shadow to answer — in days, not months"
        cta={<Btn small href={waLink("A nodule was found on my X-ray/CT report. I'd like a 48–72h fast-track appointment at the AI Lung Nodule Clinic.")}><Phone size={14} /> Fast-track my report</Btn>}>
        Any nodule found anywhere — our hospital, another hospital, any lab — gets a guaranteed Nodule Clinic appointment within 48–72 hours. Bring the report; we handle the rest.
      </Banner>

      <div className="mb-4 rounded-2xl p-4" style={{ background: C.greenSoft, border: `1px solid ${C.green}` }}>
        <div className="font-bold text-sm" style={{ color: C.green }}>First, breathe:</div>
        <div className="text-sm mt-1">The large majority of lung nodules turn out to be benign — old infections, TB scars, tiny lymph nodes. The point of moving fast is not fear. It's certainty.</div>
      </div>

      {JOURNEY.map((s, i) => (
        <button key={i} onClick={() => setOpen(open === i ? -1 : i)}
          className="w-full text-left mb-2 rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${open === i ? C.marigold : C.mist}` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: open === i ? C.marigold : C.indigoSoft, color: open === i ? "#fff" : C.indigo }}>{i + 1}</div>
            <div className="disp font-bold flex-1" style={{ color: C.indigo }}>{s.t}</div>
            <ChevronDown size={18} style={{ color: "#8A88B8", transform: open === i ? "rotate(180deg)" : "none" }} />
          </div>
          {open === i && <p className="text-sm mt-3 ml-11" style={{ color: "#4A4880" }}>{s.d}</p>}
        </button>
      ))}

      <Card className="mt-4">
        <div className="disp font-bold mb-2" style={{ color: C.indigo }}>Why here?</div>
        <div className="flex flex-wrap gap-2">
          {["EBUS", "Radial EBUS", "Archimedes BTPNA", "Cone-beam CT biopsy", "Cryobiopsy", "MDT Nodule Board", "Phase III trial access", "One-roof surgery & oncology"].map((x) => (
            <Chip key={x} tone="orange">{x}</Chip>
          ))}
        </div>
        <p className="text-sm mt-3" style={{ color: "#4A4880" }}>
          No other centre in the region owns the complete journey — detection to biopsy to treatment to surveillance. Referring physicians and labs: your patient returns to you with an outcome summary within 72 hours of diagnosis.
        </p>
      </Card>
    </div>
  );
}

/* ================= 4. ALLERGY CALENDAR ================= */
const ALLERGY = [
  { m: "January", air: "red", allergens: ["Winter smog (peak)", "Dust mites (indoor)", "Mold in damp corners"], tip: "Shift walks to late morning; N95 on AQI > 200 days; wash bedding weekly in hot water." },
  { m: "February", air: "red", allergens: ["Tree pollen begins", "Smog continues"], tip: "Start antihistamines early if February always gets you — pre-emption beats rescue." },
  { m: "March", air: "amber", allergens: ["Tree pollen (peak)", "Road dust"], tip: "Keep car windows up on highways; rinse face and nostrils after outdoor time." },
  { m: "April", air: "amber", allergens: ["Dust storms", "Parthenium (congress grass)"], tip: "Evenings are dustier than mornings in summer — flip your walk schedule." },
  { m: "May", air: "amber", allergens: ["Heat + dust", "AC duct mold"], tip: "Get AC filters cleaned before the season — a moldy filter is an allergy machine." },
  { m: "June", air: "green", allergens: ["Mold spores rise (monsoon onset)", "Dust mites surge with humidity"], tip: "Air out mattresses on sunny breaks; watch for that 'first rain' wheeze." },
  { m: "July", air: "green", allergens: ["Mold (peak)", "Dust mites (peak)", "Viral triggers"], tip: "Monsoon = mold season. Fix seepage now; asthmatics, keep your controller inhaler regular even on good days." },
  { m: "August", air: "green", allergens: ["Parthenium pollen begins", "Mold continues"], tip: "The itchy-eyes-runny-nose of August is usually weed pollen, not a cold." },
  { m: "September", air: "amber", allergens: ["Weed pollen peak (Parthenium, Amaranthus)", "Mold"], tip: "Peak weed month. If September is always bad, ask about allergy testing + immunotherapy." },
  { m: "October", air: "red", allergens: ["Pollution season begins", "Festival smoke", "Weed pollen tail"], tip: "The Oct–Feb pollution season starts now. Check AQI like you check the weather." },
  { m: "November", air: "red", allergens: ["Smog + firecracker aftermath", "Cold-air trigger"], tip: "Lung Health Month at ŪPIRI — free community checks all month. Masks outdoors on red-AQI days." },
  { m: "December", air: "red", allergens: ["Winter inversion smog", "Indoor allergens (closed windows)"], tip: "Morning smog sits low till ~10 am; late-morning sun is your walking window." },
];

function AllergyCalendar({ onBack }) {
  const nowM = new Date().getMonth();
  const [sel, setSel] = useState(nowM);
  const airChip = (a) => a === "red" ? <Chip tone="red">Poor air</Chip> : a === "amber" ? <Chip tone="amber">Moderate air</Chip> : <Chip tone="green">Cleaner air</Chip>;
  const cur = ALLERGY[sel];
  return (
    <div>
      <BackBar title="Hyderabad Allergy Calendar" telugu="ఈ నెల గాలిలో ఏముంది?" onBack={onBack} />
      <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
        A monthly advisory from the Allergy & Immunology Clinic — what's in the city's air, and what to do about it.
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
        {ALLERGY.map((a, i) => (
          <button key={a.m} onClick={() => setSel(i)}
            className="py-2 rounded-xl text-xs font-bold"
            style={sel === i ? { background: C.indigo, color: "#fff" }
              : i === nowM ? { background: C.marigoldSoft, color: "#B35A08", border: `1.5px solid ${C.marigold}` }
                : { background: "#fff", color: C.indigo, border: `1px solid ${C.mist}` }}>
            {a.m.slice(0, 3)}
          </button>
        ))}
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <div className="disp text-xl font-bold" style={{ color: C.indigo }}>
            {cur.m} {sel === nowM && <span className="text-xs font-semibold" style={{ color: C.marigold }}>· this month</span>}
          </div>
          {airChip(cur.air)}
        </div>
        <div className="mt-3">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#8A88B8" }}>In the air</div>
          <div className="flex flex-wrap gap-2">{cur.allergens.map((x) => <Chip key={x} tone="indigo">{x}</Chip>)}</div>
        </div>
        <div className="mt-4 rounded-xl p-3 text-sm flex gap-2" style={{ background: C.sky }}>
          <Leaf size={18} style={{ color: C.green }} className="shrink-0 mt-0.5" />
          <span>{cur.tip}</span>
        </div>
        <div className="mt-4">
          <Btn small kind="dark" href={waLink(`Hi, I get seasonal allergy symptoms (worst around ${cur.m}). I'd like an Allergy & Immunology Clinic appointment.`)}>
            <Phone size={14} /> Book allergy testing
          </Btn>
        </div>
      </Card>
      <p className="text-xs mt-3" style={{ color: "#8A88B8" }}>
        General seasonal guidance for Hyderabad; individual triggers vary. Skin-prick testing identifies yours precisely — and immunotherapy can retrain the response.
      </p>
    </div>
  );
}

/* ================= 5. CASE OF THE MONTH ================= */
function CaseOfMonth({ onBack }) {
  return (
    <div>
      <BackBar title="Case of the Month" telugu="ఈ నెల కేసు — నాడ్యూల్ బోర్డ్ నుంచి" onBack={onBack} />
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Chip tone="orange">July 2026</Chip>
          <Chip tone="indigo">From the Nodule Board</Chip>
        </div>
        <h2 className="disp text-2xl font-extrabold" style={{ color: C.indigo }}>The pea-sized shadow</h2>
        <p className="text-sm mt-1 mb-4" style={{ color: "#8A88B8" }}>
          Illustrative composite case; details anonymised and altered to protect identity. Presented with consent principles at the ŪPIRI Nodule Board.
        </p>
        <div className="space-y-4 text-sm" style={{ color: "#3A3870" }}>
          <p><strong style={{ color: C.indigo }}>The patient.</strong> A 48-year-old software architect. Never smoked. No symptoms. A routine pre-employment chest X-ray — the kind most people never think about again.</p>
          <p><strong style={{ color: C.indigo }}>Day 0.</strong> The radiologist's read: normal. The AI second read (qXR) flagged a subtle 9 mm opacity in the right upper zone, partially hidden behind the second rib — exactly where human eyes tire. The radiologist re-reviewed and agreed: worth a closer look.</p>
          <p><strong style={{ color: C.indigo }}>Day 1.</strong> Fast-track Nodule Clinic consult. Low-dose CT confirmed a 9 mm part-solid nodule with mild spiculation. Malignancy probability estimated with the Brock model: not low enough to watch.</p>
          <p><strong style={{ color: C.indigo }}>Day 2.</strong> Nodule Board (pulmonology + radiology + oncology + thoracic surgery). Decision: tissue diagnosis via Archimedes BTPNA navigational bronchoscopy — the nodule sat beyond the reach of conventional bronchoscopy.</p>
          <p><strong style={{ color: C.indigo }}>Day 4.</strong> Navigation biopsy under cone-beam CT confirmation. On-site cytology: adenocarcinoma. Staging PET the same week: Stage IA. No nodes, no spread.</p>
          <p><strong style={{ color: C.indigo }}>The outcome.</strong> Minimally invasive lobectomy three weeks later. No chemotherapy required. He was back at his desk in a month, now on a simple surveillance calendar. Five-year outlook at this stage is excellent — the entire reason early detection exists.</p>
        </div>
        <div className="mt-5 rounded-2xl p-4" style={{ background: C.indigo }}>
          <div className="disp font-bold text-white mb-2">Teaching pearls</div>
          <ul className="text-sm space-y-1.5" style={{ color: "#C9D2E6" }}>
            <li>• You don't have to smoke to get lung cancer — a large share of Indian lung cancer occurs in never-smokers.</li>
            <li>• Rib overlap zones are where small nodules hide; a structured second read (AI or human) catches them.</li>
            <li>• Time-to-diagnosis here: <strong style={{ color: C.marigold }}>4 days</strong>. The national norm for incidental nodules is often months — or never.</li>
            <li>• For referring physicians: any nodule, any report, any lab → 48–72h fast-track, outcome summary back to you.</li>
          </ul>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn small href={waLink("I read the Case of the Month. I have an X-ray/CT report with a finding I'd like reviewed.")}><Phone size={14} /> Get my report reviewed</Btn>
          <Btn small kind="ghost" href={waLink("I'm a physician. Please add me to the quarterly Nodule Board invite list.")}>Physicians: join the Nodule Board</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ================= 6 & 7. CLUBS (COPD / ASTHMA) ================= */
const MED_PRESETS = {
  asthma: [
    { name: "Budesonide+Formoterol (e.g., Foracort)", type: "controller", perDay: 2 },
    { name: "Fluticasone+Salmeterol (e.g., Seroflo)", type: "controller", perDay: 2 },
    { name: "Budesonide (e.g., Budecort)", type: "controller", perDay: 2 },
    { name: "Salbutamol (e.g., Asthalin) — reliever", type: "reliever", perDay: 0 },
    { name: "Montelukast tablet", type: "controller", perDay: 1 },
  ],
  copd: [
    { name: "Tiotropium (e.g., Tiova)", type: "controller", perDay: 1 },
    { name: "Glycopyrronium+Formoterol", type: "controller", perDay: 2 },
    { name: "Budesonide+Formoterol (e.g., Foracort)", type: "controller", perDay: 2 },
    { name: "Ipratropium+Levosalbutamol (e.g., Duolin) — reliever", type: "reliever", perDay: 0 },
  ],
};

function emptyClub() {
  return { profile: null, inhalerLogs: [], pefLogs: [], symptoms: [] };
}

function Club({ condition, onBack }) {
  const key = condition === "copd" ? "copd-club" : "asthma-club";
  const label = condition === "copd" ? "COPD Club" : "Asthma Academy Club";
  const teLabel = condition === "copd" ? "సీఓపీడీ క్లబ్" : "ఆస్తమా క్లబ్";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pefInput, setPefInput] = useState("");
  const [saveErr, setSaveErr] = useState(false);

  useEffect(() => {
    let live = true;
    loadKey(key, emptyClub()).then((d) => { if (live) { setData(d); setLoading(false); } });
    return () => { live = false; };
  }, [key]);

  const persist = async (next) => {
    setData(next);
    const ok = await saveKey(key, next);
    setSaveErr(!ok);
  };

  if (loading) return (
    <div>
      <BackBar title={label} telugu={teLabel} onBack={onBack} />
      <Card><div className="text-center py-8 text-sm" style={{ color: "#8A88B8" }}>Opening your club diary…</div></Card>
    </div>
  );

  if (!data.profile) return <ClubSetup condition={condition} label={label} teLabel={teLabel} onBack={onBack} onDone={(p) => persist({ ...data, profile: p })} />;

  /* ---------- derived ---------- */
  const today = todayStr();
  const meds = data.profile.meds || [];
  const controllers = meds.filter((m) => m.type === "controller");
  const relievers = meds.filter((m) => m.type === "reliever");

  const takenToday = (medId) =>
    data.inhalerLogs.filter((l) => l.date === today && l.medId === medId).reduce((a, l) => a + l.count, 0);

  const logDose = (medId, delta) => {
    const cur = takenToday(medId);
    if (cur + delta < 0) return;
    const others = data.inhalerLogs.filter((l) => !(l.date === today && l.medId === medId));
    const next = { ...data, inhalerLogs: [...others, { date: today, medId, count: cur + delta }] };
    persist(next);
  };

  // adherence last 7 days (controllers only)
  const days7 = lastNDates(7);
  const adherenceData = days7.map((d) => {
    let expected = 0, taken = 0;
    controllers.forEach((m) => {
      expected += m.perDay;
      const t = data.inhalerLogs.filter((l) => l.date === d && l.medId === m.id).reduce((a, l) => a + l.count, 0);
      taken += Math.min(t, m.perDay);
    });
    return { d: dShort(d), pct: expected ? Math.round((taken / expected) * 100) : 0 };
  });
  const adherencePct = Math.round(adherenceData.reduce((a, x) => a + x.pct, 0) / 7);

  // reliever use last 7 days
  const relieverUse = data.inhalerLogs.filter((l) => days7.includes(l.date) && relievers.some((r) => r.id === l.medId));
  const relieverPuffs = relieverUse.reduce((a, l) => a + l.count, 0);
  const relieverDays = new Set(relieverUse.filter((l) => l.count > 0).map((l) => l.date)).size;

  // PEF
  const pb = data.profile.personalBest || (data.pefLogs.length >= 5 ? Math.max(...data.pefLogs.map((p) => p.value)) : null);
  const sortedPef = [...data.pefLogs].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const recentPef = sortedPef.slice(-14);
  const latest = sortedPef[sortedPef.length - 1];
  const zone = (v) => !pb ? null : v >= 0.8 * pb ? "green" : v >= 0.5 * pb ? "amber" : "red";
  const latestZone = latest ? zone(latest.value) : null;
  const last7Pef = sortedPef.filter((p) => days7.includes(p.date));
  const yellowCount7 = last7Pef.filter((p) => zone(p.value) === "amber").length;
  const last3 = sortedPef.slice(-3);
  const declining = pb && last3.length === 3 && last3[0].value > last3[1].value && last3[1].value > last3[2].value && (last3[0].value - last3[2].value) >= 0.15 * pb;

  // symptoms
  const symToday = data.symptoms.find((s) => s.date === today)?.status || null;
  const worseStreak = (() => {
    let n = 0;
    for (const d of [...lastNDates(4)].reverse()) {
      const s = data.symptoms.find((x) => x.date === d);
      if (s?.status === "worse") n++; else break;
    }
    return n;
  })();

  const logSymptom = (status) => {
    const others = data.symptoms.filter((s) => s.date !== today);
    persist({ ...data, symptoms: [...others, { date: today, status }] });
  };

  const addPef = (value, source = "manual", dateIso = today, time) => {
    const t = time || new Date().toTimeString().slice(0, 5);
    return { date: dateIso, time: t, value: Math.round(value), source };
  };

  const submitPef = () => {
    const v = parseFloat(pefInput);
    if (!v || v < 50 || v > 900) return;
    persist({ ...data, pefLogs: [...data.pefLogs, addPef(v)] });
    setPefInput("");
  };

  const syncDevice = () => {
    setSyncing(true);
    setTimeout(() => {
      const base = pb || 400;
      const newLogs = [];
      const dates = lastNDates(5);
      dates.forEach((d, i) => {
        if (!data.pefLogs.some((p) => p.date === d && p.source === "device")) {
          const wobble = 0.78 + Math.random() * 0.17 - i * 0.005;
          newLogs.push(addPef(base * wobble, "device", d, "07:3" + Math.floor(Math.random() * 9)));
        }
      });
      persist({ ...data, pefLogs: [...data.pefLogs, ...newLogs] });
      setSyncing(false);
    }, 1400);
  };

  /* ---------- risk engine ---------- */
  let risk = null;
  if (latestZone === "red") {
    risk = {
      tone: "red", title: "RED ZONE — act now",
      body: `Your latest peak flow (${latest.value} L/min) is below 50% of your personal best. Use your reliever as per your action plan and seek urgent care immediately. Do not wait for an appointment.`,
      cta: <Btn kind="danger" href={waLink(`URGENT: ${label} member ${data.profile.name}. Peak flow ${latest.value} vs personal best ${pb}. Red zone — need urgent guidance.`)}><Phone size={16} /> Urgent — contact the clinic now</Btn>,
    };
  } else if (declining || yellowCount7 >= 3 || worseStreak >= 2) {
    const reasons = [
      declining && "a falling peak-flow trend across your last three readings",
      yellowCount7 >= 3 && `${yellowCount7} yellow-zone readings this week`,
      worseStreak >= 2 && `${worseStreak} days of "worse than usual" breathing`,
    ].filter(Boolean).join(", ");
    risk = {
      tone: "amber", title: "Early-warning pattern — book an OPD review within 48 hours",
      body: `We're seeing ${reasons}. Flare-ups whisper before they shout — a review now usually means a small medication adjustment instead of an emergency later.`,
      cta: <Btn href={waLink(`Hi, I'm a ${label} member (${data.profile.name}). My app flagged an early-warning pattern (${reasons}). Please book me an OPD review within 48 hours.`)}><Phone size={16} /> Book OPD review</Btn>,
    };
  } else if (condition === "asthma" && (relieverPuffs > 6 || relieverDays >= 3)) {
    risk = {
      tone: "amber", title: "Reliever overuse — your control needs a review",
      body: `You've needed your reliever ${relieverPuffs} times across ${relieverDays} day(s) this week. Needing rescue more than twice a week means the underlying inflammation isn't controlled — a controller adjustment usually fixes this.`,
      cta: <Btn href={waLink(`Hi, I'm an Asthma Club member (${data.profile.name}). The app flagged reliever overuse (${relieverPuffs} puffs this week). Please book an asthma control review.`)}><Phone size={16} /> Book control review</Btn>,
    };
  } else if (adherencePct < 70 && controllers.length > 0) {
    risk = {
      tone: "indigo", title: `Adherence at ${adherencePct}% this week`,
      body: "Controller inhalers only work when they're boringly regular — they treat tomorrow's inflammation, not today's symptoms. Tie doses to brushing your teeth; it's the oldest trick and it works.",
      cta: null,
    };
  } else {
    risk = {
      tone: "green", title: "All steady this week",
      body: `Adherence ${adherencePct}%${pb ? `, peak flow in your green zone` : ""}. Keep the streak — and see you at this month's ${condition === "copd" ? "COPD Club" : "Asthma Academy"} session.`,
      cta: null,
    };
  }

  const zoneColor = { green: C.green, amber: C.amber, red: C.red };

  return (
    <div>
      <BackBar title={label} telugu={teLabel} onBack={onBack} />
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm" style={{ color: "#4A4880" }}>
          Namaste, <strong style={{ color: C.indigo }}>{data.profile.name}</strong>
          {pb && <> · personal best <strong>{pb} L/min</strong></>}
        </div>
        <button onClick={() => persist({ ...data, profile: null })} className="text-xs font-semibold underline" style={{ color: "#8A88B8" }}>Edit profile</button>
      </div>

      {saveErr && <Banner tone="amber" icon={<AlertTriangle size={18} />} title="Couldn't save just now">Your entry is on screen but didn't reach storage. Check your connection and tap the entry again.</Banner>}

      <Banner tone={risk.tone}
        icon={risk.tone === "green" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
        title={risk.title} cta={risk.cta}>{risk.body}</Banner>

      {/* SYMPTOM QUICK LOG */}
      <Card className="mb-4">
        <div className="disp font-bold mb-2" style={{ color: C.indigo }}>How is your breathing today?</div>
        <div className="flex gap-2">
          {[["good", "Better than usual", "green"], ["usual", "My usual", "indigo"], ["worse", "Worse than usual", "amber"]].map(([v, l, tone]) => (
            <button key={v} onClick={() => logSymptom(v)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={symToday === v
                ? { background: tone === "green" ? C.green : tone === "amber" ? C.amber : C.indigo, color: "#fff" }
                : { background: "#fff", color: C.indigo, border: `1.5px solid ${C.mist}` }}>
              {l}
            </button>
          ))}
        </div>
      </Card>

      {/* INHALER LOG */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="disp font-bold" style={{ color: C.indigo }}>Today's inhalers</div>
          <Chip tone={adherencePct >= 80 ? "green" : adherencePct >= 60 ? "amber" : "red"}>{adherencePct}% this week</Chip>
        </div>
        <p className="text-xs mb-3" style={{ color: "#8A88B8" }}>Tap + each time you take a dose. Relievers count too — that's how we spot flare-ups early.</p>
        {meds.map((m) => {
          const t = takenToday(m.id);
          const done = m.type === "controller" && t >= m.perDay;
          return (
            <div key={m.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: `1px solid ${C.sky}` }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: C.indigo }}>{m.name}</div>
                <div className="text-xs" style={{ color: "#8A88B8" }}>
                  {m.type === "reliever" ? "Reliever — as needed" : `Controller — ${m.perDay}×/day`}
                </div>
              </div>
              <button onClick={() => logDose(m.id, -1)} aria-label="remove dose"
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.sky, color: C.indigo }}><Minus size={15} /></button>
              <div className="w-10 text-center font-bold" style={{ color: done ? C.green : C.indigo }}>
                {t}{m.type === "controller" && <span className="text-xs font-medium" style={{ color: "#8A88B8" }}>/{m.perDay}</span>}
              </div>
              <button onClick={() => logDose(m.id, 1)} aria-label="add dose"
                className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: done ? C.greenSoft : C.marigold, color: done ? C.green : "#fff" }}>
                {done ? <CheckCircle2 size={16} /> : <Plus size={15} />}
              </button>
            </div>
          );
        })}
        <div className="mt-3" style={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={adherenceData} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="d" tick={{ fontSize: 10, fill: "#8A88B8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#8A88B8" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [`${v}%`, "adherence"]} />
              <ReferenceLine y={80} stroke={C.green} strokeDasharray="4 4" />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} fill={C.indigo} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* PEAK FLOW */}
      <Card className="mb-4">
        <div className="disp font-bold" style={{ color: C.indigo }}>Peak flow</div>
        <p className="text-xs mb-3" style={{ color: "#8A88B8" }}>
          {pb ? `Zones from your personal best (${pb}): green ≥ ${Math.round(pb * 0.8)}, yellow ${Math.round(pb * 0.5)}–${Math.round(pb * 0.8) - 1}, red < ${Math.round(pb * 0.5)} L/min.`
            : "Log at least 5 readings (or set a personal best in your profile) to activate your green/yellow/red zones."}
        </p>
        <div className="flex gap-2 mb-3">
          <input inputMode="numeric" value={pefInput} onChange={(e) => setPefInput(e.target.value)}
            placeholder="e.g., 380" className="flex-1 rounded-xl px-3 py-2.5 text-sm" style={{ border: `1.5px solid ${C.mist}` }} />
          <Btn small onClick={submitPef}><Plus size={15} /> Log</Btn>
          <Btn small kind="dark" onClick={syncDevice} disabled={syncing}>
            <Bluetooth size={15} /> {syncing ? "Syncing…" : "Sync meter"}
          </Btn>
        </div>
        <p className="text-xs mb-3" style={{ color: "#B0AECF" }}>
          "Sync meter" pulls readings from a paired Bluetooth smart peak flow meter (demo data in this preview build).
        </p>
        {recentPef.length > 0 ? (
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recentPef.map((p) => ({ ...p, label: dShort(p.date) }))} margin={{ top: 5, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={C.sky} vertical={false} />
                {pb && <ReferenceArea y1={pb * 0.8} y2={pb * 1.12} fill={C.green} fillOpacity={0.09} />}
                {pb && <ReferenceArea y1={pb * 0.5} y2={pb * 0.8} fill={C.amber} fillOpacity={0.1} />}
                {pb && <ReferenceArea y1={0} y2={pb * 0.5} fill={C.red} fillOpacity={0.08} />}
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8A88B8" }} axisLine={false} tickLine={false} />
                <YAxis domain={[pb ? Math.round(pb * 0.4) : "auto", pb ? Math.round(pb * 1.12) : "auto"]} tick={{ fontSize: 10, fill: "#8A88B8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n, p) => [`${v} L/min (${p.payload.source})`, p.payload.time]} />
                <Line type="monotone" dataKey="value" stroke={C.indigo} strokeWidth={2.5}
                  dot={(props) => {
                    const z = zone(props.payload.value);
                    return <circle key={props.index} cx={props.cx} cy={props.cy} r={4.5} fill={z ? zoneColor[z] : C.indigo} stroke="#fff" strokeWidth={1.5} />;
                  }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center text-sm py-6 rounded-xl" style={{ background: C.sky, color: "#8A88B8" }}>
            No readings yet. Log your first blow above, or sync your meter.
          </div>
        )}
        {latest && latestZone && (
          <div className="mt-2 text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: zoneColor[latestZone] }} />
            Latest: <strong>{latest.value} L/min</strong> · {Math.round((latest.value / pb) * 100)}% of personal best · {latestZone.toUpperCase()} zone
          </div>
        )}
      </Card>

      {/* CLUB LIFE */}
      <Card>
        <div className="disp font-bold mb-2" style={{ color: C.indigo }}>
          {condition === "copd" ? "This month at COPD Club" : "This month at Asthma Academy"}
        </div>
        <ul className="text-sm space-y-2" style={{ color: "#4A4880" }}>
          <li className="flex gap-2"><Users size={16} className="shrink-0 mt-0.5" style={{ color: C.marigold }} />
            Monthly tea-and-talk session: {condition === "copd" ? "breathing techniques + pulmonary rehab taster. Bring a family member — they're part of the treatment." : "inhaler technique clinic + trigger-proofing your home. Spacer demos for everyone."}</li>
          <li className="flex gap-2"><Stethoscope size={16} className="shrink-0 mt-0.5" style={{ color: C.marigold }} />
            {condition === "copd" ? "Severe COPD? Ask about valve-based lung volume reduction (BLVR) — advanced options beyond inhalers, without surgery." : "Still symptomatic on regular inhalers? Ask about the Severe Asthma & Biologics Centre — some members haven't needed oral steroids in a year."}</li>
          <li className="flex gap-2"><Wind size={16} className="shrink-0 mt-0.5" style={{ color: C.marigold }} />
            Flu & pneumonia vaccination status check at every visit — protecting vulnerable lungs is half the battle.</li>
        </ul>
        <div className="mt-3">
          <Btn small kind="dark" href={waLink(`Hi, I'm a ${label} member. Please register me for this month's session.`)}><Users size={14} /> Reserve my seat</Btn>
        </div>
      </Card>
      <p className="text-xs mt-3" style={{ color: "#8A88B8" }}>
        This diary supports — never replaces — your written action plan. In severe breathlessness, blue lips, or drowsiness: go to emergency immediately.
      </p>
    </div>
  );
}

function ClubSetup({ condition, label, teLabel, onBack, onDone }) {
  const [name, setName] = useState("");
  const [pb, setPb] = useState("");
  const [picked, setPicked] = useState([]);
  const [custom, setCustom] = useState("");
  const presets = MED_PRESETS[condition];

  const togglePreset = (i) => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]);

  const finish = () => {
    const meds = picked.map((i, idx) => ({ id: `m${idx}`, ...presets[i] }));
    if (custom.trim()) meds.push({ id: `m${meds.length}`, name: custom.trim(), type: "controller", perDay: 2 });
    onDone({
      name: name.trim() || "Friend",
      personalBest: pb ? Math.round(parseFloat(pb)) : null,
      meds,
    });
  };

  return (
    <div>
      <BackBar title={label} telugu={teLabel} onBack={onBack} />
      <Card>
        <div className="disp font-bold text-lg mb-1" style={{ color: C.indigo }}>Welcome — let's set up your diary</div>
        <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
          Takes one minute. Everything stays in your personal diary and powers your early-warning alerts.
        </p>
        <label className="text-sm font-semibold block mb-3">Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Lakshmi"
            className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
        </label>
        <label className="text-sm font-semibold block mb-4">Personal best peak flow (L/min) — if you know it
          <input inputMode="numeric" value={pb} onChange={(e) => setPb(e.target.value)} placeholder="e.g., 420 (leave blank if unsure)"
            className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
          <span className="block text-xs font-normal mt-1" style={{ color: "#8A88B8" }}>Don't know it? No problem — we'll learn it from your best reading over your first week.</span>
        </label>
        <div className="text-sm font-semibold mb-2">Your inhalers & medicines (tap all that apply)</div>
        <div className="flex flex-col gap-2 mb-3">
          {presets.map((m, i) => (
            <button key={i} onClick={() => togglePreset(i)}
              className="text-left px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-between"
              style={picked.includes(i)
                ? { background: C.indigoSoft, border: `1.5px solid ${C.indigo}`, color: C.indigo }
                : { background: "#fff", border: `1.5px solid ${C.mist}` }}>
              <span>{m.name}</span>
              {picked.includes(i) && <CheckCircle2 size={16} style={{ color: C.indigo }} />}
            </button>
          ))}
        </div>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Another medicine? Type it here (logged 2×/day)"
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-4" style={{ border: `1.5px solid ${C.mist}` }} />
        <Btn onClick={finish} full disabled={picked.length === 0 && !custom.trim()}>
          Start my diary <ChevronRight size={18} />
        </Btn>
        <p className="text-xs mt-3" style={{ color: "#8A88B8" }}>
          Brand names shown are common examples for recognition only — always follow your own prescription. Your doctor can adjust this list at your next OPD visit.
        </p>
      </Card>
    </div>
  );
}

/* ================= 8. RENDO ŪPIRI ================= */
function RendoUpiri({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qd, setQd] = useState(todayStr());
  const [cigs, setCigs] = useState("10");
  const [price, setPrice] = useState("18");

  useEffect(() => {
    let live = true;
    loadKey("rendo-upiri", null).then((d) => { if (live) { setData(d); setLoading(false); } });
    return () => { live = false; };
  }, []);

  const start = async () => {
    const d = { quitDate: qd, cigsPerDay: parseFloat(cigs) || 10, pricePerCig: parseFloat(price) || 18 };
    setData(d); await saveKey("rendo-upiri", d);
  };
  const reset = async () => { setData(null); await saveKey("rendo-upiri", null); };

  const MILESTONES = [
    [1, "24 hours: carbon monoxide has left your blood. Oxygen delivery is already better."],
    [3, "72 hours: bronchial tubes relax — breathing feels physically easier."],
    [14, "2 weeks: circulation and lung function begin measurably improving."],
    [30, "1 month: coughing and breathlessness reducing; cilia regrowing and sweeping your lungs clean."],
    [90, "90 days: challenge complete! Lung function up significantly. Claim your certificate + free anniversary Ūpiri check."],
    [365, "1 year: your risk of coronary heart disease is about half a smoker's."],
  ];

  if (loading) return <div><BackBar title="Rendo Ūpiri" telugu="రెండో ఊపిరి" onBack={onBack} /><Card><div className="text-center py-8 text-sm" style={{ color: "#8A88B8" }}>Loading…</div></Card></div>;

  if (!data) return (
    <div>
      <BackBar title="Rendo Ūpiri — Second Breath" telugu="రెండో ఊపిరి — 90 రోజుల ఛాలెంజ్" onBack={onBack} />
      <Card>
        <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
          Screened lungs deserve a second chance. Rendo Ūpiri combines physician-prescribed medicines (which roughly double quit rates versus willpower alone), a CO breath test you can watch fall, WhatsApp check-ins, and a family "quit partner". Start your counter here.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm font-semibold">Quit date
            <input type="date" value={qd} onChange={(e) => setQd(e.target.value)}
              className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
          </label>
          <label className="text-sm font-semibold">Cigarettes/beedis per day
            <input inputMode="numeric" value={cigs} onChange={(e) => setCigs(e.target.value)}
              className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
          </label>
          <label className="text-sm font-semibold">Price each (₹)
            <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn onClick={start}><Flame size={16} /> Start my second breath</Btn>
          <Btn kind="dark" href={waLink("Hi, I want to enrol in Rendo Ūpiri, the quit-smoking program (medicines + counselling + CO testing).")}><Phone size={16} /> Enrol with the clinic</Btn>
        </div>
      </Card>
    </div>
  );

  const days = Math.max(0, Math.floor((new Date(todayStr()) - new Date(data.quitDate)) / 86400000));
  const saved = Math.round(days * data.cigsPerDay * data.pricePerCig);
  const notSmoked = days * data.cigsPerDay;
  const pct = Math.min(100, Math.round((days / 90) * 100));

  return (
    <div>
      <BackBar title="Rendo Ūpiri — Second Breath" telugu="రెండో ఊపిరి" onBack={onBack} />
      <Card className="text-center mb-4" style={{ background: C.indigo, border: "none" }}>
        <div className="text-xs uppercase tracking-widest" style={{ color: "#AEB8D2" }}>Smoke-free for</div>
        <div className="disp text-6xl font-extrabold" style={{ color: C.marigold }}>{days}</div>
        <div className="text-sm" style={{ color: "#C9D2E6" }}>day{days === 1 ? "" : "s"} · since {dShort(data.quitDate)}</div>
        <div className="mt-4 h-2.5 rounded-full mx-auto max-w-sm" style={{ background: "#3E3C85" }}>
          <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: C.marigold }} />
        </div>
        <div className="text-xs mt-1.5" style={{ color: "#AEB8D2" }}>{pct}% of the 90-Day Second Breath Challenge</div>
        <div className="grid grid-cols-2 gap-3 mt-4 max-w-sm mx-auto">
          <div className="rounded-xl p-3" style={{ background: "#3E3C85" }}>
            <div className="disp text-xl font-bold text-white">₹{saved.toLocaleString("en-IN")}</div>
            <div className="text-xs" style={{ color: "#AEB8D2" }}>saved</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#3E3C85" }}>
            <div className="disp text-xl font-bold text-white">{notSmoked.toLocaleString("en-IN")}</div>
            <div className="text-xs" style={{ color: "#AEB8D2" }}>not smoked</div>
          </div>
        </div>
      </Card>
      <Card>
        <div className="disp font-bold mb-3" style={{ color: C.indigo }}>Your lungs, recovering</div>
        {MILESTONES.map(([d, t]) => (
          <div key={d} className="flex gap-3 py-2" style={{ borderTop: `1px solid ${C.sky}` }}>
            <div className="mt-0.5">{days >= d
              ? <CheckCircle2 size={18} style={{ color: C.green }} />
              : <div className="w-[18px] h-[18px] rounded-full" style={{ border: `2px solid ${C.mist}` }} />}</div>
            <div className={`text-sm ${days >= d ? "" : "opacity-60"}`} style={{ color: "#3A3870" }}>{t}</div>
          </div>
        ))}
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn small href={waLink(`I'm ${days} days smoke-free on Rendo Ūpiri! Booking my ${days >= 90 ? "free anniversary Ūpiri check + certificate" : "CO breath test & counselling check-in"}.`)}>
            <Phone size={14} /> {days >= 90 ? "Claim certificate + free check" : "Book CO test check-in"}
          </Btn>
          <Btn small kind="ghost" onClick={reset}>Reset counter</Btn>
        </div>
        <p className="text-xs mt-3" style={{ color: "#8A88B8" }}>
          Cravings peak and pass in ~3 minutes. If you slip, it's a data point, not a defeat — call the line, we restart together. Recovery timelines are population averages.
        </p>
      </Card>
    </div>
  );
}

/* ================= 9. ŪPIRI@WORK ================= */
function Corporate({ onBack }) {
  const TIERS = [
    { n: "Breath Score Basic", who: "HR wellness budgets · 500+ employee campuses", inc: ["On-site chest X-ray (mobile / partner lab)", "qXR AI second read on every film", "Spirometry + Lung Age", "One-page bilingual Breath Score™ report per employee"] },
    { n: "Breath Score Plus", who: "IT-corridor mid-size firms", inc: ["Everything in Basic", "Pulmonologist tele-review of every abnormal", "Rendo Ūpiri smoking-cessation enrolment offer", "Aggregate workforce lung-health dashboard for HR"] },
    { n: "Executive Lung Assessment", who: "CXO programs · insurers' premium plans", inc: ["X-ray + AI + full PFT + CPET-lite", "Pulmonologist consult", "Annual surveillance plan", "Trek-Fit / VO₂max add-ons available"] },
  ];
  return (
    <div>
      <BackBar title="ŪPIRI@Work" telugu="మీ టీమ్ ఊపిరికి భరోసా" onBack={onBack} />
      <Card className="mb-4" style={{ background: C.indigo, border: "none" }}>
        <div className="disp text-xl font-extrabold text-white">Your annual health check looks at everything — except the organ Hyderabad's air attacks daily.</div>
        <p className="text-sm mt-2" style={{ color: "#C9D2E6" }}>
          4 minutes per employee, on-site. ₹500–800 per head versus ₹2,500+ for CT-based screening. Reports on WhatsApp. Pollution season (Oct–Feb) slots fill first — book early.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn href={waLink("Hi, I'm from HR/admin. Please share the ŪPIRI@Work corporate proposal and a pilot date.")}><Building2 size={16} /> Request a proposal</Btn>
        </div>
      </Card>
      <div className="grid sm:grid-cols-3 gap-4">
        {TIERS.map((t, i) => (
          <Card key={t.n} className="flex flex-col">
            <div className="disp font-bold" style={{ color: C.indigo }}>{t.n}</div>
            <div className="text-xs mb-3" style={{ color: "#8A88B8" }}>{t.who}</div>
            <ul className="text-sm space-y-1.5 flex-1" style={{ color: "#4A4880" }}>
              {t.inc.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: C.green }} />{x}</li>)}
            </ul>
            {i === 1 && <div className="mt-3"><Chip tone="orange">Most popular</Chip></div>}
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <div className="disp font-bold" style={{ color: C.indigo }}>Protect Your Parents</div>
        <p className="text-sm mt-1" style={{ color: "#4A4880" }}>
          Add-on rider: your employees book Ūpiri checks for their parents at corporate rates. In every pilot conversation, this is the line HR teams remember.
        </p>
      </Card>
    </div>
  );
}

/* ================= APP SHELL ================= */
export default function UpiriApp() {
  const [route, setRoute] = useState("home");
  const go = (r) => { setRoute(r); window.scrollTo({ top: 0 }); };
  const back = () => go("home");

  const page = {
    home: <Home go={go} />,
    risk: <RiskCheck onBack={back} />,
    breath: <LungAge onBack={back} />,
    journey: <NoduleJourney onBack={back} />,
    allergy: <AllergyCalendar onBack={back} />,
    case: <CaseOfMonth onBack={back} />,
    copd: <Club condition="copd" onBack={back} />,
    asthma: <Club condition="asthma" onBack={back} />,
    rendo: <RendoUpiri onBack={back} />,
    work: <Corporate onBack={back} />,
  }[route];

  return (
    <div className="up-root min-h-screen" style={{ background: C.sky }}>
      <GlobalStyle />
      {/* HEADER */}
      <header className="sticky top-0 z-20" style={{ background: C.indigo, boxShadow: "0 2px 10px rgba(29,27,75,0.25)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => go("home")} className="flex items-center gap-2.5" aria-label="ŪPIRI home">
            <PetalMark />
            <div className="text-left">
              <div className="disp font-extrabold text-white leading-none" style={{ fontSize: "1.35rem" }}>
                ŪPIRI <span className="telugu text-sm font-semibold" style={{ color: C.marigold }}>ఊపిరి</span>
              </div>
              <div className="text-[10px] tracking-wide" style={{ color: "#AEB8D2" }}>
                Precision Pulmonary Care · Powered by {HOSPITAL}
              </div>
            </div>
          </button>
          <div className="ml-auto hidden sm:block">
            <Btn small href={waLink("Hi, I'd like to book an ŪPIRI Lung Check.")}><Phone size={14} /> Book</Btn>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{page}</main>

      {/* FOOTER */}
      <footer className="mt-8" style={{ background: C.indigo }}>
        <div className="max-w-5xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-6 text-sm" style={{ color: "#C9D2E6" }}>
          <div>
            <div className="flex items-center gap-2 mb-2"><PetalMark size={26} />
              <span className="disp font-extrabold text-white">ŪPIRI Lung Check</span></div>
            <p className="telugu" style={{ color: C.marigold }}>ఒక ఎక్స్-రే. రెండు నిమిషాలు. మీ ఊపిరికి భరోసా.</p>
            <p className="mt-1 text-xs">Two minutes. One X-ray. A lifetime of breath.</p>
          </div>
          <div>
            <div className="font-bold text-white mb-2">AI Lung Nodule Clinic</div>
            <p className="text-xs leading-relaxed">
              AI detection (Qure.ai qXR) → risk assessment → EBUS · radial EBUS · Archimedes BTPNA · cone-beam CT biopsy · cryobiopsy → MDT treatment planning → surveillance. From shadow to answer — in days, not months.
            </p>
          </div>
          <div>
            <div className="font-bold text-white mb-2">Important</div>
            <p className="text-xs leading-relaxed">
              The tools here are awareness and self-management aids, not medical diagnosis; they are pending final clinical validation and medico-legal sign-off by the {HOSPITAL} pulmonology department. In an emergency (severe breathlessness, chest pain, blue lips), go to the nearest emergency department immediately. AI reads assist — a qualified radiologist and pulmonologist make every clinical decision.
            </p>
          </div>
        </div>
        <div className="text-center text-xs py-3" style={{ background: "#232159", color: "#8A94B8" }}>
          © 2026 {HOSPITAL} · Precision Pulmonary Care · Hyderabad ki Ūpiri 🧡
        </div>
      </footer>
    </div>
  );
}
