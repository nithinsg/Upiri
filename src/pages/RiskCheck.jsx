import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Leaf, Phone } from "lucide-react";
import { C, waLink } from "../config.js";
import { Btn, Card, Chip, BackBar, Banner } from "../components/ui.jsx";

const REDFLAGS = [
  "Coughed up blood, even once",
  "Cough lasting more than 3 weeks",
  "Unexplained weight loss",
  "Chest pain that doesn't settle",
  "Hoarse voice for over 3 weeks",
];

export default function RiskCheck({ onBack }) {
  const [step, setStep] = useState(0);
  const [flags, setFlags] = useState([]);
  const [age, setAge] = useState(null);
  const [smoke, setSmoke] = useState(null);
  const [years, setYears] = useState(null);
  const [quitLong, setQuitLong] = useState(null);
  const [exp, setExp] = useState([]);
  const [hist, setHist] = useState([]);
  // Neutral lifestyle items — zero score weight; they balance the questionnaire
  // (not only "sick" questions) and power friendly advice on the result page.
  const [activity, setActivity] = useState(null);
  const [sleep, setSleep] = useState(null);
  const [diet, setDiet] = useState(null);
  const [vent, setVent] = useState(null);
  const [cityYears, setCityYears] = useState(null);

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

  const CheckRow = ({ options, values, onToggle }) => (
    <div className="flex flex-col gap-2 mt-2">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onToggle(o.v)}
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

  const Sub = ({ children }) => <p className="text-sm mt-4 font-semibold">{children}</p>;

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
      t: "Your everyday rhythm",
      te: "మీ దినచర్య",
      note: "These don't change your risk score — they help us give you better advice at the end.",
      body: (
        <>
          <Sub>Physical activity (walk, sport, gym)</Sub>
          <OptRow options={["3+ days a week", "1–2 days a week", "Rarely"]} value={activity} onPick={setActivity} />
          <Sub>Sleep quality, most nights</Sub>
          <OptRow options={["Good", "Okay", "Poor"]} value={sleep} onPick={setSleep} />
          <Sub>Meals, most days</Sub>
          <OptRow options={["Mostly home-cooked", "Mixed", "Mostly outside food"]} value={diet} onPick={setDiet} />
        </>
      ),
      ready: !!activity && !!sleep && !!diet,
    },
    {
      t: "Smoking (cigarettes or beedis)",
      te: "పొగ అలవాటు",
      body: (
        <>
          <OptRow options={["never", "former", "current"]} value={smoke} onPick={setSmoke} />
          {smoke && smoke !== "never" && (
            <>
              <Sub>For how many years, in total?</Sub>
              <OptRow options={["<10", "10–20", "21–30", "30+"]} value={years} onPick={setYears} />
            </>
          )}
          {smoke === "former" && (
            <>
              <Sub>Quit more than 15 years ago?</Sub>
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
        <>
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
          <Sub>How is your home, most of the day?</Sub>
          <OptRow options={["Airy / well ventilated", "AC most of the day", "Mostly closed up"]} value={vent} onPick={setVent} />
          <Sub>Years living in this city</Sub>
          <OptRow options={["<5", "5–15", "15+"]} value={cityYears} onPick={setCityYears} />
        </>
      ),
      ready: !!vent && !!cityYears,
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

  const restart = () => {
    setStep(0); setFlags([]); setAge(null); setSmoke(null); setYears(null); setQuitLong(null);
    setExp([]); setHist([]); setActivity(null); setSleep(null); setDiet(null); setVent(null); setCityYears(null);
  };

  if (step === steps.length) {
    const config = {
      flag: {
        tone: "red", title: "See a pulmonologist this week",
        body: "You reported a symptom that needs a doctor's eyes regardless of any score. This is usually something simple — but a 3-week cough, blood in sputum or weight loss should never wait. We'll fast-track you.",
        next: "Your next step: a priority pulmonology consult this week — we fast-track symptom cases.",
        cta: "PRIORITY consult — a symptom needs review this week",
      },
      high: {
        tone: "amber", title: "Higher risk — priority chest X-ray + consult",
        body: "Your answers put you in the group that benefits most from an AI-read chest X-ray with a pulmonologist review. Two minutes for the X-ray; your report on WhatsApp.",
        next: "Your next step: book a priority ŪPIRI AI-read chest X-ray and a pulmonologist consult this week.",
        cta: "priority Ūpiri AI X-ray check + pulmonologist consult (higher-risk result)",
      },
      mod: {
        tone: "indigo", title: "Moderate risk — opt for an AI-read chest X-ray",
        body: "Nothing alarming, but enough factors that an AI-read chest X-ray screening is a smart move — it costs about as much as a movie ticket (₹300–600) and takes 2 minutes. Then repeat it yearly.",
        next: "Your next step: book an ŪPIRI AI-read chest X-ray screening, and make it a yearly habit.",
        cta: "an Ūpiri AI X-ray screening (moderate-risk result)",
      },
      low: {
        tone: "green", title: "Low risk — keep breathing easy",
        body: "Your risk factors are low today. Routine wellness is all you need: stay active, mind the AQI, and recheck once a year.",
        next: "Your next step: routine wellness — recheck in a year, and come back sooner if a cough ever crosses 3 weeks.",
        cta: "a routine ŪPIRI Lung Check",
      },
    }[tier];

    // Gentle, zero-pressure nudges from the neutral lifestyle answers.
    const tips = [
      activity === "Rarely" && "A brisk 30-minute walk on cleaner-air days is the best free medicine your lungs can get.",
      sleep === "Poor" && "Poor sleep stokes airway inflammation. Loud snoring plus daytime sleepiness deserves a mention at your next check.",
      vent === "Mostly closed up" && "Air the house out 10 minutes a day — indoor air can quietly get dirtier than outdoor air.",
      diet === "Mostly outside food" && "More home-cooked, colourful plates help — antioxidant-rich food is a small, real win for lungs.",
    ].filter(Boolean);

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
            <div className="mt-2 font-semibold">{config.next}</div>
          </Banner>
          {hasFlags && (
            <div className="text-sm rounded-xl p-3" style={{ background: C.sky }}>
              You selected: {flags.join("; ")}.
            </div>
          )}
          {tips.length > 0 && (
            <div className="mt-4 rounded-xl p-3" style={{ background: C.greenSoft }}>
              <div className="flex items-center gap-2 text-sm font-bold mb-1" style={{ color: C.green }}>
                <Leaf size={16} /> Small wins for your lungs
              </div>
              <ul className="text-sm space-y-1" style={{ color: "#2E5A44" }}>
                {tips.map((t) => <li key={t}>• {t}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs mt-4" style={{ color: "#8A88B8" }}>
            This is an awareness and triage tool built on established risk factors (PLCO / Liverpool Lung Project models). It is not a diagnosis and does not replace a doctor.
          </p>
          <div className="mt-4"><Btn kind="ghost" small onClick={restart}>Start over</Btn></div>
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
        {s.note && <p className="text-sm" style={{ color: "#4A4880" }}>{s.note}</p>}
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
