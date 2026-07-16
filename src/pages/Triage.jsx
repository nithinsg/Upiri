import { useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight, Droplet, HeartPulse,
  Mic, Phone, Scale, Thermometer, Volume2, Wind,
} from "lucide-react";
import { C, EMERGENCY_NUMBER, telLink, waLink } from "../config.js";
import { Btn, Card, Chip, BackBar, Banner } from "../components/ui.jsx";

/* Symptom-based triage. The tiering follows recognised red-flag frameworks:
   severe breathlessness at rest → emergency; hemoptysis / chest pain /
   fever-with-breathlessness / flare of known airway disease → within 24 h;
   >3-week cough / unexplained weight loss / prolonged hoarseness → within a week;
   everything else → routine self-care with explicit safety-netting.
   Deliberately bias-free: low-risk results reassure and do NOT push bookings. */

const SYMPTOMS = [
  { id: "cough", l: "Cough", te: "దగ్గు", icon: Volume2, followUp: { key: "coughDur", q: "For how long?", opts: ["Less than 3 weeks", "3 weeks or more"] } },
  { id: "breath", l: "Breathlessness", te: "ఆయాసం", icon: Activity, followUp: { key: "breathWhen", q: "When does it come?", opts: ["Only on exertion", "Even at rest"] } },
  { id: "tight", l: "Chest tightness / pain", te: "ఛాతీ బిగుతు / నొప్పి", icon: HeartPulse },
  { id: "wheeze", l: "Wheeze / whistling chest", te: "పిల్లికూతలు", icon: Wind },
  { id: "blood", l: "Blood in sputum", te: "కఫంలో రక్తం", icon: Droplet },
  { id: "fever", l: "Fever", te: "జ్వరం", icon: Thermometer },
  { id: "weight", l: "Weight loss (unexplained)", te: "బరువు తగ్గడం", icon: Scale },
  { id: "hoarse", l: "Hoarse voice > 3 weeks", te: "గొంతు బొంగురు", icon: Mic },
];

const LEVELS = [
  {
    id: 0, risk: "High", tone: "red", when: "Immediately",
    headline: "Seek medical care immediately",
    te: "వెంటనే వైద్య సహాయం తీసుకోండి",
    advice: "What you've described needs same-hour attention. Go to the nearest emergency department now, or call the emergency line. Don't drive yourself if you're struggling to breathe — ask someone to take you.",
  },
  {
    id: 1, risk: "High", tone: "red", when: "Within 24 hours",
    headline: "See a doctor within 24 hours",
    te: "24 గంటల్లో వైద్యుడిని కలవండి",
    advice: "This isn't a wait-and-watch situation. Book a doctor's visit today or tomorrow morning at the latest. If things worsen tonight — breathlessness at rest, more blood, severe pain — go to emergency straight away.",
  },
  {
    id: 2, risk: "Moderate", tone: "amber", when: "Within a week",
    headline: "See a doctor within a week",
    te: "వారంలోపు వైద్యుడిని కలవండి",
    advice: "Nothing here suggests an emergency — but these symptoms deserve a proper look rather than another month of waiting. Book an OPD visit in the next few days.",
  },
  {
    id: 3, risk: "Low", tone: "green", when: "Routine / self-care",
    headline: "This looks manageable at home",
    te: "ఇంట్లో జాగ్రత్తలు సరిపోతాయి",
    advice: "Genuinely reassuring: what you've described most often settles on its own. Rest, warm fluids, steam inhalation if it soothes, and paracetamol for fever as per the label. Avoid smoke and dusty air while you recover.",
  },
];

function runTriage({ sel, followups, known }) {
  const has = (id) => sel.includes(id);
  // Tier 0 — emergency, now
  if (has("breath") && followups.breathWhen === "Even at rest")
    return { level: 0, reasons: ["breathlessness even at rest"] };
  // Tier 1 — within 24 hours
  const r24 = [];
  if (has("blood")) r24.push("blood in the sputum");
  if (has("tight")) r24.push("chest tightness or pain");
  if (has("fever") && has("breath")) r24.push("fever together with breathlessness");
  if (known !== "None" && (has("breath") || has("wheeze")))
    r24.push(`worsening breathing with known ${known}`);
  if (r24.length) return { level: 1, reasons: r24 };
  // Tier 2 — within a week
  const rw = [];
  if (has("cough") && followups.coughDur === "3 weeks or more") rw.push("a cough lasting 3 weeks or more");
  if (has("weight")) rw.push("unexplained weight loss");
  if (has("hoarse")) rw.push("a hoarse voice beyond 3 weeks");
  if (rw.length) return { level: 2, reasons: rw };
  // Tier 3 — routine / self-care
  return { level: 3, reasons: [] };
}

export default function Triage({ onBack }) {
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState([]);
  const [followups, setFollowups] = useState({});
  const [age, setAge] = useState(null);
  const [smoke, setSmoke] = useState(null);
  const [known, setKnown] = useState(null);

  const toggleSym = (id) => {
    setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  };

  const OptRow = ({ options, value, onPick }) => (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onPick(o)}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={value === o
            ? { background: C.indigo, color: "#fff" }
            : { background: "#fff", color: C.indigo, border: `1.5px solid ${C.mist}` }}>
          {o}
        </button>
      ))}
    </div>
  );

  const pendingFollowUps = SYMPTOMS.filter((s) => sel.includes(s.id) && s.followUp && !followups[s.followUp.key]);
  const step0Ready = sel.length > 0 && pendingFollowUps.length === 0;
  const step1Ready = !!age && !!smoke && !!known;

  const restart = () => { setStep(0); setSel([]); setFollowups({}); setAge(null); setSmoke(null); setKnown(null); };

  /* ---------- RESULT ---------- */
  if (step === 2) {
    const { level, reasons } = runTriage({ sel, followups, known });
    const L = LEVELS.find((x) => x.id === level);
    const symptomLabels = sel.map((id) => SYMPTOMS.find((s) => s.id === id)?.l).filter(Boolean);

    return (
      <div>
        <BackBar title="Symptom Checker" telugu="మీ ఫలితం" onBack={onBack} />
        <Card>
          <div className="text-center py-2">
            <Chip tone={L.tone}>{L.risk} risk</Chip>
            <div className="disp text-2xl font-extrabold mt-2" style={{ color: C.indigo }}>{L.headline}</div>
            <div className="telugu text-sm" style={{ color: "#6C6A9E" }}>{L.te}</div>
            <div className="mt-2 inline-block rounded-full px-4 py-1.5 text-sm font-bold"
              style={{ background: { red: C.redSoft, amber: C.amberSoft, green: C.greenSoft }[L.tone], color: { red: C.red, amber: C.amber, green: C.green }[L.tone] }}>
              When to see a doctor: {L.when}
            </div>
          </div>

          <Banner tone={L.tone} icon={level === 3 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />} title={L.when}>
            {L.advice}
            {reasons.length > 0 && (
              <div className="mt-2 text-sm">Because you reported: <strong>{reasons.join("; ")}</strong>.</div>
            )}
          </Banner>

          {level === 0 && (
            <a href={telLink()} className="block rounded-2xl p-4 text-center mb-4"
              style={{ background: C.red, color: "#fff" }}>
              <div className="text-xs uppercase tracking-widest opacity-80">Yashoda Emergency — tap to call</div>
              <div className="disp text-3xl font-extrabold">{EMERGENCY_NUMBER}</div>
            </a>
          )}

          {level === 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Btn href={waLink(`Hi, the ŪPIRI Symptom Checker advised a doctor visit within 24 hours (I reported: ${reasons.join(", ")}). Please book me a priority pulmonology consult.`)}>
                <Phone size={16} /> Book a priority consult
              </Btn>
              <Btn kind="ghost" href={telLink()}>Emergency line: {EMERGENCY_NUMBER}</Btn>
            </div>
          )}

          {level === 2 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Btn href={waLink(`Hi, the ŪPIRI Symptom Checker suggested a doctor review within a week (I reported: ${reasons.join(", ")}). Please book me an OPD appointment.`)}>
                <Phone size={16} /> Book an OPD visit
              </Btn>
            </div>
          )}

          {level === 3 && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: C.sky }}>
              <div className="font-bold text-sm mb-2" style={{ color: C.indigo }}>Simple self-care that actually helps</div>
              <ul className="text-sm space-y-1.5" style={{ color: "#4A4880" }}>
                <li>• Warm fluids and rest — most short coughs and colds are viral and pass in 1–2 weeks.</li>
                <li>• Steam inhalation if it soothes; honey (adults & children over 1 year) genuinely calms night cough.</li>
                <li>• Paracetamol for fever or aches, as per the label.</li>
                <li>• Skip smoke, incense-heavy rooms and dusty commutes while you recover.</li>
              </ul>
            </div>
          )}

          {/* Safety-netting — every tier gets an explicit "come back if" list */}
          <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1.5px solid ${C.mist}` }}>
            <div className="font-bold text-sm mb-2" style={{ color: C.indigo }}>
              {level === 3 ? "Come back — or see a doctor — if any of these happen:" : "Go to emergency straight away if any of these happen:"}
            </div>
            <ul className="text-sm space-y-1" style={{ color: "#4A4880" }}>
              <li>• Breathlessness at rest, blue lips, or drowsiness</li>
              <li>• Any blood in the sputum</li>
              <li>• A cough that crosses 3 weeks</li>
              <li>• Fever beyond 3 days, or fever that returns after settling</li>
              <li>• Unintended weight loss</li>
            </ul>
          </div>

          <div className="mt-3 text-xs rounded-xl p-3" style={{ background: C.sky, color: "#6C6A9E" }}>
            You told us: {symptomLabels.join(", ") || "—"}
            {followups.coughDur ? ` · cough: ${followups.coughDur.toLowerCase()}` : ""}
            {followups.breathWhen ? ` · breathlessness: ${followups.breathWhen.toLowerCase()}` : ""}
            {` · age ${age} · smoking: ${smoke} · known condition: ${known}`}
          </div>

          <p className="text-xs mt-4" style={{ color: "#8A88B8" }}>
            This is guidance on <em>how soon</em> to seek care, built on recognised red-flag frameworks. It is not a diagnosis
            and does not replace a doctor. In an emergency (severe breathlessness, chest pain, blue lips) call {EMERGENCY_NUMBER} or go to the nearest emergency department.
          </p>
          <div className="mt-4"><Btn kind="ghost" small onClick={restart}>Check again</Btn></div>
        </Card>
      </div>
    );
  }

  /* ---------- STEPS ---------- */
  return (
    <div>
      <BackBar title="Symptom Checker" telugu="లక్షణాలు చెప్పండి — ఎప్పుడు వైద్యుడి వద్దకు వెళ్లాలో తెలుసుకోండి" onBack={onBack} />
      <div className="flex gap-1.5 mb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? C.marigold : C.mist }} />
        ))}
      </div>

      {step === 0 && (
        <Card>
          <div className="disp font-bold text-lg" style={{ color: C.indigo }}>What are you feeling?</div>
          <p className="text-sm mb-3" style={{ color: "#4A4880" }}>Tap everything that applies — in your own words, no medical terms needed.</p>
          <div className="grid grid-cols-2 gap-2.5">
            {SYMPTOMS.map((s) => {
              const Icon = s.icon;
              const active = sel.includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggleSym(s.id)} aria-pressed={active}
                  className="rounded-2xl p-3.5 text-left flex flex-col gap-1.5"
                  style={active
                    ? { background: C.indigoSoft, border: `1.5px solid ${C.indigo}` }
                    : { background: "#fff", border: `1.5px solid ${C.mist}` }}>
                  <div className="flex items-center justify-between">
                    <Icon size={20} style={{ color: active ? C.indigo : "#8A88B8" }} />
                    {active && <CheckCircle2 size={16} style={{ color: C.indigo }} />}
                  </div>
                  <div className="text-sm font-semibold leading-tight" style={{ color: C.indigo }}>{s.l}</div>
                  <div className="telugu text-xs" style={{ color: "#8A88B8" }}>{s.te}</div>
                </button>
              );
            })}
          </div>

          {SYMPTOMS.filter((s) => sel.includes(s.id) && s.followUp).map((s) => (
            <div key={s.id} className="mt-4 rounded-xl p-3" style={{ background: C.sky }}>
              <div className="text-sm font-semibold">{s.l} — {s.followUp.q}</div>
              <OptRow options={s.followUp.opts} value={followups[s.followUp.key]}
                onPick={(v) => setFollowups({ ...followups, [s.followUp.key]: v })} />
            </div>
          ))}

          <div className="mt-5">
            <Btn onClick={() => setStep(1)} disabled={!step0Ready} full>
              Continue <ChevronRight size={18} />
            </Btn>
            {sel.length === 0 && <p className="text-xs text-center mt-2" style={{ color: "#8A88B8" }}>Select at least one symptom to continue.</p>}
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <div className="disp font-bold text-lg" style={{ color: C.indigo }}>A little about you</div>
          <p className="text-sm" style={{ color: "#4A4880" }}>Three quick taps — these change the advice meaningfully.</p>
          <p className="text-sm mt-4 font-semibold">Age group</p>
          <OptRow options={["<18", "18–44", "45–59", "60+"]} value={age} onPick={setAge} />
          <p className="text-sm mt-4 font-semibold">Smoking (cigarettes or beedis)</p>
          <OptRow options={["Never", "Former", "Current"]} value={smoke} onPick={setSmoke} />
          <p className="text-sm mt-4 font-semibold">Known lung condition?</p>
          <OptRow options={["None", "Asthma", "COPD", "ILD / other"]} value={known} onPick={setKnown} />
          <div className="flex gap-3 mt-6">
            <Btn kind="ghost" onClick={() => setStep(0)}>Back</Btn>
            <Btn onClick={() => setStep(2)} disabled={!step1Ready} full>
              See my guidance <ChevronRight size={18} />
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
