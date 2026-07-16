import { Activity, AlertTriangle, Brain, CheckCircle2, HeartPulse, Mountain, MountainSnow, Phone, Stethoscope, Wind } from "lucide-react";
import { C, waLink } from "../config.js";
import { Btn, Card, Chip, BackBar } from "../components/ui.jsx";

/* Brand-name shortlist (brainstorm):
   - "ŪPIRI Shikhar" (శిఖరం — summit): bilingual, ownable, extends the master brand,
     works for pilgrims AND athletes — CHOSEN.
   - "Trek-Fit by ŪPIRI": descriptive but generic; weak in Telugu.
   - "Chardham Ready": campaign-strength for Yatra season, but too narrow for Ladakh/EBC/marathoners.
   - "AltiCheck": clinical and clean, but loses the ŪPIRI voice entirely.
   - "ŪPIRI Summit Check": clear, but long and English-only.
   Verdict: ŪPIRI Shikhar as the product name; "Chardham Ready" survives as a seasonal
   campaign line inside the page copy. */

const RISKS = [
  {
    icon: <Wind size={20} />, code: "AMS", name: "Acute Mountain Sickness", te: "ఎత్తు అనారోగ్యం",
    what: "The most common altitude illness — the body protesting a fast ascent above ~2,500 m.",
    signs: ["Headache", "Nausea, poor appetite", "Poor sleep, fatigue", "Dizziness"],
    risk: "Fast ascent, no rest days, previous AMS.",
    note: "Usually settles with rest and no further ascent. It's a signal to pause — not panic.",
  },
  {
    icon: <HeartPulse size={20} />, code: "HAPE", name: "High-Altitude Pulmonary Edema", te: "ఊపిరితిత్తుల్లో నీరు",
    what: "Fluid collecting in the lungs at altitude — uncommon, but the most dangerous lung emergency up there.",
    signs: ["Breathless even at rest", "Cough (sometimes frothy/pink)", "Chest tightness", "Exhaustion out of proportion"],
    risk: "Rapid ascent, existing lung conditions, previous HAPE, heavy exertion on arrival day.",
    note: "A medical emergency: descend and seek help immediately. Recognising it early saves lives.",
  },
  {
    icon: <Brain size={20} />, code: "HACE", name: "High-Altitude Cerebral Edema", te: "మెదడు వాపు",
    what: "Brain swelling at altitude — rare, but serious. Usually follows untreated AMS.",
    signs: ["Confusion, unusual behaviour", "Stumbling, clumsy walk", "Severe headache", "Drowsiness"],
    risk: "Ignoring AMS symptoms and continuing to ascend.",
    note: "A medical emergency: immediate descent. Travel companions should know these signs too.",
  },
];

export default function Shikhar({ onBack }) {
  return (
    <div>
      <BackBar title="ŪPIRI Shikhar — Altitude Readiness" telugu="శిఖరం — ఎత్తులకు మీ ఊపిరి సిద్ధమా?" onBack={onBack} />

      {/* HERO */}
      <div className="rounded-3xl overflow-hidden mb-5" style={{ background: C.indigo }}>
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Chip tone="orange">Chardham · Kailash · Ladakh · EBC</Chip>
            <Chip tone="green">Marathoners & cyclists</Chip>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h2 className="disp font-extrabold text-white leading-tight" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
                Ready for thin air — before you climb.
              </h2>
              <p className="text-sm mt-2" style={{ color: "#C9D2E6" }}>
                At 3,500 m, every breath carries roughly a third less oxygen than at sea level. Healthy lungs adapt.
                Hidden heart or lung limitations — the kind you never notice in the city — tend to surface above ~2,500 m,
                on the trail, far from help. A physician-signed fitness assessment protects the trip you've been planning for years.
              </p>
            </div>
            <MountainSnow size={64} style={{ color: C.marigold }} className="shrink-0 hidden sm:block" aria-hidden="true" />
          </div>
          <div className="mt-4">
            <Btn href={waLink("Hi, I'd like to book an ŪPIRI Shikhar altitude-readiness assessment (trek / pilgrimage / athlete).")}>
              <Phone size={16} /> Book my Shikhar assessment
            </Btn>
          </div>
        </div>
      </div>

      {/* RISK EDUCATION */}
      <h3 className="disp text-lg font-bold mb-1" style={{ color: C.indigo }}>Know the three altitude illnesses</h3>
      <p className="text-sm mb-3" style={{ color: "#4A4880" }}>
        All three are preventable and treatable when recognised early. The goal of learning them is confidence, not fear.
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        {RISKS.map((r) => (
          <Card key={r.code} className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl" style={{ background: C.indigoSoft, color: C.indigo }}>{r.icon}</div>
              <Chip tone="orange">{r.code}</Chip>
            </div>
            <div className="disp font-bold" style={{ color: C.indigo }}>{r.name}</div>
            <div className="telugu text-xs mb-2" style={{ color: "#8A88B8" }}>{r.te}</div>
            <p className="text-sm" style={{ color: "#4A4880" }}>{r.what}</p>
            <div className="text-xs font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: "#8A88B8" }}>Warning signs</div>
            <ul className="text-sm space-y-1" style={{ color: "#4A4880" }}>
              {r.signs.map((s) => <li key={s} className="flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: C.amber }} />{s}</li>)}
            </ul>
            <div className="text-xs mt-3" style={{ color: "#8A88B8" }}><strong>Higher risk:</strong> {r.risk}</div>
            <div className="mt-2 rounded-xl p-2.5 text-xs" style={{ background: C.sky, color: "#3A3870" }}>{r.note}</div>
          </Card>
        ))}
      </div>

      {/* WHAT'S INCLUDED */}
      <Card className="mb-5">
        <div className="disp font-bold mb-1" style={{ color: C.indigo }}>What the Shikhar assessment includes</div>
        <div className="telugu text-xs mb-3" style={{ color: "#8A88B8" }}>అసెస్‌మెంట్‌లో ఏమేమి ఉంటాయి</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: <Wind size={18} />, t: "Spirometry", d: "Full lung-function testing — how much air your lungs move, and how fast." },
            { icon: <Activity size={18} />, t: "CPET / CPET-lite", d: "Cardio-pulmonary exercise testing: how your heart and lungs perform under load — with VO₂max for athletes." },
            { icon: <Stethoscope size={18} />, t: "Physician consult", d: "A pulmonologist reviews your results, your itinerary and your history — with tailored ascent advice." },
            { icon: <Mountain size={18} />, t: "Altitude-fitness certificate", d: "A physician-signed assessment from the Advanced Lung Function & Exercise Physiology Lab." },
          ].map((x) => (
            <div key={x.t} className="flex gap-3 rounded-xl p-3" style={{ background: C.sky }}>
              <div className="p-2 rounded-lg h-fit" style={{ background: "#fff", color: C.indigo }}>{x.icon}</div>
              <div>
                <div className="font-bold text-sm" style={{ color: C.indigo }}>{x.t}</div>
                <div className="text-sm" style={{ color: "#4A4880" }}>{x.d}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* WHO SHOULD BOOK */}
      <Card className="mb-5">
        <div className="disp font-bold mb-2" style={{ color: C.indigo }}>Who should get assessed?</div>
        <ul className="text-sm space-y-2" style={{ color: "#4A4880" }}>
          {[
            "Pilgrims 45+ heading to Chardham, Amarnath or Kailash — especially first-timers",
            "Anyone with asthma, COPD, heart disease, high BP or diabetes planning altitude travel",
            "First-time high-altitude trekkers (Ladakh, Spiti, Everest Base Camp)",
            "Marathoners, cyclists and endurance athletes who want VO₂max and performance data",
          ].map((x) => (
            <li key={x} className="flex gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: C.green }} />{x}</li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn href={waLink("Hi, I'd like to book an ŪPIRI Shikhar altitude-readiness assessment (trek / pilgrimage / athlete).")}>
            <Phone size={16} /> Book on WhatsApp
          </Btn>
          <Btn kind="ghost" href={waLink("Hi, we're a trekking group / yatra organiser. Please share ŪPIRI Shikhar group assessment details.")}>
            Group & yatra organisers
          </Btn>
        </div>
      </Card>

      <p className="text-xs" style={{ color: "#8A88B8" }}>
        An assessment reduces surprises; it doesn't replace safe ascent practice. Acclimatise gradually, hydrate,
        and never ignore symptoms on the mountain. This page is education, not a diagnosis.
      </p>
    </div>
  );
}
