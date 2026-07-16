import { Clock, Microscope, Phone, ScanLine, ShieldCheck, Sparkles, Stethoscope, Users } from "lucide-react";
import { C, waLink } from "../config.js";
import { Btn, Card, Chip, BackBar, Banner } from "../components/ui.jsx";
import { useReveal } from "../hooks.js";

const JOURNEY = [
  { day: "Day 0", icon: ScanLine, t: "The X-ray", d: "A routine 2-minute chest X-ray — walk-in, at the hospital, a camp, or a partner lab. Your radiologist reads it, and Qure.ai's qXR reads it again. Two readings on every film." },
  { day: "Day 0", icon: Sparkles, t: "The AI flag", d: "If the AI or radiologist spots a shadow, it isn't a diagnosis — it's a question. Most nodules are NOT cancer. You get a call the same day and a fast-track slot within 48–72 hours." },
  { day: "Day 1–2", icon: Stethoscope, t: "The consult & scan", d: "A pulmonologist reviews everything with you. If needed, a low-dose CT sizes and characterises the nodule precisely. Many patients need nothing more than a follow-up scan on a schedule." },
  { day: "Day 2–3", icon: Users, t: "The Nodule Board", d: "Pulmonology, radiology, oncology and thoracic surgery review your case together in one multidisciplinary sitting — so you get one plan, not four opinions." },
  { day: "Day 3–5", icon: Microscope, t: "The answer (if tissue is needed)", d: "The region's widest biopsy arsenal, chosen to fit your nodule: EBUS · radial EBUS · Archimedes BTPNA navigational bronchoscopy · cone-beam CT-guided biopsy · cryobiopsy. Most are day procedures." },
  { day: "Beyond", icon: ShieldCheck, t: "Treatment or watchfulness", d: "Benign? A clear surveillance calendar with WhatsApp reminders. If treatment is needed, surgery/oncology begins under the same roof — with the earliest possible stage on your side." },
];

/* One illustrated timeline step: node + day badge + card, revealed on scroll;
   the connecting path segment "grows" toward the next step. */
function JourneyStep({ step, index, isLast }) {
  const [ref, inView] = useReveal(0.25);
  const Icon = step.icon;
  return (
    <div className="tl-step" ref={ref}>
      <div className="tl-rail">
        <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0"
          style={{
            background: inView ? C.marigold : C.indigoSoft,
            color: inView ? "#fff" : C.indigo,
            transition: "background .5s ease, color .5s ease",
            boxShadow: inView ? "0 4px 14px rgba(245,130,31,0.4)" : "none",
          }}
          aria-hidden="true">
          <Icon size={20} />
        </div>
        {!isLast && <div className={`tl-line ${inView ? "in" : ""}`} />}
      </div>
      <div className={`tl-card ${inView ? "in" : ""}`}>
        <div className="rounded-2xl p-4 h-full" style={{ background: "#fff", border: `1px solid ${inView ? C.marigold : C.mist}` }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Chip tone="orange">{step.day}</Chip>
            <span className="text-xs font-bold" style={{ color: "#B9C3D6" }}>Step {index + 1} of {JOURNEY.length}</span>
          </div>
          <div className="disp font-bold" style={{ color: C.indigo }}>{step.t}</div>
          <p className="text-sm mt-1.5" style={{ color: "#4A4880" }}>{step.d}</p>
        </div>
      </div>
    </div>
  );
}

export default function NoduleJourney({ onBack }) {
  return (
    <div>
      <BackBar title="A nodule was found. Now what?" telugu="నాడ్యూల్ కనబడింది — తర్వాత ఏంటి?" onBack={onBack} />
      <Banner tone="indigo" icon={<Clock size={20} />} title="From shadow to answer — in days, not months"
        cta={<Btn small href={waLink("A nodule was found on my X-ray/CT report. I'd like a 48–72h fast-track appointment at the AI Lung Nodule Clinic.")}><Phone size={14} /> Fast-track my report</Btn>}>
        Any nodule found anywhere — our hospital, another hospital, any lab — gets a guaranteed Nodule Clinic appointment within 48–72 hours. Bring the report; we handle the rest.
      </Banner>

      <div className="mb-5 rounded-2xl p-4" style={{ background: C.greenSoft, border: `1px solid ${C.green}` }}>
        <div className="font-bold text-sm" style={{ color: C.green }}>First, breathe:</div>
        <div className="text-sm mt-1">The large majority of lung nodules turn out to be benign — old infections, TB scars, tiny lymph nodes. The point of moving fast is not fear. It's certainty.</div>
      </div>

      {/* Visual journey: vertical timeline on mobile, horizontal on desktop */}
      <div className="journey" aria-label="The nodule journey, step by step">
        {JOURNEY.map((s, i) => (
          <JourneyStep key={s.t} step={s} index={i} isLast={i === JOURNEY.length - 1} />
        ))}
      </div>

      {/* WHY CHOOSE YASHODA — capability proof */}
      <div className="rounded-3xl overflow-hidden mt-6" style={{ background: C.indigo }}>
        <div className="p-6 sm:p-8">
          <div className="disp text-xl sm:text-2xl font-extrabold text-white">Why choose Yashoda for this journey</div>
          <p className="telugu text-sm mt-1" style={{ color: C.marigold }}>ఈ ప్రయాణానికి యశోద ఎందుకు?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { n: "48–72h", l: "guaranteed nodule fast-track" },
              { n: "1 roof", l: "detection → biopsy → treatment → surveillance" },
              { n: "MDT", l: "Nodule Board — one plan, not four opinions" },
              { n: "Phase III", l: "clinical trial access" },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl p-3 text-center" style={{ background: "#3E3C85" }}>
                <div className="disp text-xl font-extrabold" style={{ color: C.marigold }}>{s.n}</div>
                <div className="text-xs mt-1" style={{ color: "#C9D2E6" }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#8F9BC0" }}>The biopsy arsenal</div>
            <div className="flex flex-wrap gap-2">
              {["EBUS", "Radial EBUS", "Archimedes BTPNA", "Cone-beam CT biopsy", "Cryobiopsy", "MDT Nodule Board"].map((x) => (
                <Chip key={x} tone="orange">{x}</Chip>
              ))}
            </div>
          </div>
          <p className="text-sm mt-4" style={{ color: "#C9D2E6" }}>
            No other centre in the region owns the complete journey. Referring physicians and labs: your patient returns to you with an outcome summary within 72 hours of diagnosis.
          </p>
          <div className="mt-4">
            <Btn href={waLink("A nodule was found on my report. I'd like the 48–72h fast-track at the AI Lung Nodule Clinic.")}>
              <Phone size={16} /> Start my fast-track
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
