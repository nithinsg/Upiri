import { useEffect, useState } from "react";
import { Phone, Share2, Sparkles, Wind, CheckCircle2 } from "lucide-react";
import { C, waLink } from "../config.js";
import { Btn, Card, Chip, BackBar } from "../components/ui.jsx";
import LungFigure from "../components/LungFigure.jsx";
import { useCountUp } from "../hooks.js";

/* Gamified result centerpiece: anatomical lungs animate from healthy pink toward
   the color matching the result, while the number counts up. */
function LungResultViz({ number, numberSuffix, caption, subCaption, health, badge, badgeTone, shareText }) {
  const shown = useCountUp(number);
  const [h, setH] = useState(1);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setH(health), 400);
    return () => clearTimeout(id);
  }, [health]);

  const doShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="fadeSlide mt-5 text-center rounded-2xl p-6" style={{ background: C.indigo }}>
      <LungFigure health={h} size={160} style={{ margin: "0 auto" }} />
      <div className="text-xs uppercase tracking-widest mt-2" style={{ color: "#AEB8D2" }}>{caption}</div>
      <div className="disp text-6xl font-extrabold" style={{ color: C.marigold }}>
        {shown}{numberSuffix && <span className="text-2xl" style={{ color: "#8F9BC0" }}>{numberSuffix}</span>}
      </div>
      <div className="mt-2"><Chip tone={badgeTone}>{badge}</Chip></div>
      {subCaption && <div className="text-sm mt-2 max-w-md mx-auto" style={{ color: "#C9D2E6" }}>{subCaption}</div>}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <Btn small kind="ghost" onClick={doShare}>
          <span style={{ color: "#fff" }} className="flex items-center gap-2">
            <Share2 size={14} /> {copied ? "Copied!" : "Share my result"}
          </span>
        </Btn>
      </div>
    </div>
  );
}

export default function LungAge({ onBack }) {
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

  // Map results to the lung illustration's health (1 = pink, 0 = grey).
  const quizHealth = quizResult != null ? Math.max(0.08, quizResult / 100) : 1;
  const spiroHealth = lungAge ? Math.max(0.08, Math.min(1, 0.75 - lungAge.delta * 0.028)) : 1;

  return (
    <div>
      <BackBar title="Breath Score™ / Lung Age" telugu="మీ ఊపిరి వయసు ఎంత?" onBack={onBack} />
      <p className="disp font-bold text-lg -mt-2 mb-4" style={{ color: C.marigold }}>
        Find your lung age — under 30 seconds.
      </p>
      <div className="flex gap-2 mb-4">
        {[["quiz", "Quick Breath Score quiz"], ["spiro", "I have spirometry values"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setMode(v)}
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
            <>
              <LungResultViz
                number={lungAge.la}
                caption="Your lungs perform like age"
                health={spiroHealth}
                badge={lungAge.delta > 2 ? `${lungAge.delta} years older than you` : lungAge.delta < -2 ? `${Math.abs(lungAge.delta)} years younger than you` : "About your real age"}
                badgeTone={lungAge.delta > 10 ? "red" : lungAge.delta > 2 ? "amber" : "green"}
                subCaption={lungAge.delta > 2
                  ? "The good news: lungs respond fast — especially if you quit smoking."
                  : lungAge.delta < -2 ? "Keep it that way." : "Right on track."}
                shareText={`My ŪPIRI Lung Age is ${lungAge.la}. Find yours in under 30 seconds at the ŪPIRI Lung Check.`}
              />
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Btn small href={waLink(`Hi, my Lung Age result is ${lungAge.la}. I'd like to book a full Ūpiri check.`)}><Phone size={14} /> Book a full check</Btn>
                {lungAge.delta > 2 && <Btn small kind="dark" href={waLink("I'd like to join Rendo Ūpiri, the quit-smoking program.")}>Rendo Ūpiri — make them younger</Btn>}
              </div>
            </>
          )}
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
                      <button key={l} type="button" onClick={() => setQ({ ...q, [item.k]: v })}
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
            <div className="text-center py-2">
              <LungResultViz
                number={quizResult}
                numberSuffix=" /100"
                caption="Your Breath Score"
                health={quizHealth}
                badge={scoreTier(quizResult).t}
                badgeTone={scoreTier(quizResult).tone}
                subCaption={scoreTier(quizResult).msg}
                shareText={`My ŪPIRI Breath Score is ${quizResult}/100 (${scoreTier(quizResult).t}). Find yours in under 30 seconds at the ŪPIRI Lung Check.`}
              />
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                <Btn href={waLink(`Hi, my Breath Score is ${quizResult}/100. I'd like to book an Ūpiri check.`)}><Phone size={16} /> Book my Ūpiri check</Btn>
                <Btn kind="ghost" onClick={() => { setQ({}); setQuizResult(null); }}>Retake</Btn>
              </div>
              <p className="text-xs mt-4" style={{ color: "#8A88B8" }}>
                The full Breath Score™ report (AI X-ray read + spirometry Lung Age + risk tier) comes with your ŪPIRI Lung Check.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Scientific attribution — always visible under the results */}
      <Card className="mt-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: C.green }} />
          <div className="text-xs leading-relaxed" style={{ color: "#6C6A9E" }}>
            <strong style={{ color: C.indigo }}>Scientific basis.</strong> Spirometry mode uses the lung-age equations of
            Morris JF & Temple W, <em>"Spirometric 'lung age' estimation for motivating smoking cessation"</em>,
            Preventive Medicine 1985;14(5):655–662. Reference populations differ from Indian norms, so treat the result
            as an indicative motivator, not a diagnosis. The quick quiz is a lifestyle-awareness score informed by
            established risk-factor models (PLCO, Liverpool Lung Project); it does not measure lung function.
            Lab spirometry at the Advanced Lung Function Laboratory gives exact values.
          </div>
        </div>
      </Card>
    </div>
  );
}
