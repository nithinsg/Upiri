import {
  Wind, CalendarDays, Stethoscope, Users, ChevronRight, FileText, Flame,
  ScanLine, Phone, ClipboardList, Mountain,
} from "lucide-react";
import { C, waLink } from "../config.js";
import { Btn, Card, Chip, BreathRing } from "../components/ui.jsx";

const MODULES = [
  { id: "risk", icon: <ScanLine size={22} />, title: "Ūpiri Risk Check", te: "మీ రిస్క్ తెలుసుకోండి", desc: "2-minute lung cancer risk check. Know if you need an AI X-ray read.", tag: "2 min" },
  { id: "triage", icon: <ClipboardList size={22} />, title: "Symptom Checker", te: "లక్షణాలు చెప్పండి", desc: "Tell us what you feel — we'll tell you how soon to see a doctor.", tag: "Guidance" },
  { id: "breath", icon: <Wind size={22} />, title: "Breath Score™ / Lung Age", te: "మీ ఊపిరి స్కోరు", desc: "Find your lung age — under 30 seconds. Quiz or spirometry values.", tag: "New" },
  { id: "journey", icon: <Stethoscope size={22} />, title: "Nodule found? The journey", te: "నాడ్యూల్ కనబడిందా?", desc: "From shadow to answer — in days, not months. Every step explained.", tag: "48–72h fast-track" },
  { id: "clubs", icon: <Users size={22} />, title: "Breath Clubs", te: "ఊపిరి క్లబ్‌లు", desc: "Asthma · COPD · ILD — diaries, academies and member champions.", tag: "Member portal" },
  { id: "allergy", icon: <CalendarDays size={22} />, title: "Hyderabad Allergy Calendar", te: "అలర్జీ క్యాలెండర్", desc: "What's in the city's air this month — and how to stay ahead of it.", tag: "Monthly" },
  { id: "case", icon: <FileText size={22} />, title: "Case of the Month", te: "ఈ నెల కేసు", desc: "From the Nodule Board: real pathways, anonymised, explained.", tag: "Physicians & patients" },
  { id: "rendo", icon: <Flame size={22} />, title: "Rendo Ūpiri — quit smoking", te: "రెండో ఊపిరి", desc: "Your second breath. Track your quit, watch your lungs recover.", tag: "90-day challenge" },
  { id: "shikhar", icon: <Mountain size={22} />, title: "ŪPIRI Shikhar — altitude ready", te: "శిఖరం — ఎత్తులకు సిద్ధం", desc: "Chardham, Ladakh, EBC or a marathon — get your lungs summit-ready.", tag: "New" },
];

export default function Home({ go }) {
  return (
    <div>
      {/* HERO */}
      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: C.indigo }}>
        <div className="p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-3 flex-wrap">
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
          <button key={m.id} type="button" onClick={() => go(m.id)}
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
