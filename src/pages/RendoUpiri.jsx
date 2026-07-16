import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Flame, Phone, Printer, Trophy } from "lucide-react";
import { C, HOSPITAL, waLink } from "../config.js";
import { Btn, Card, Chip, BackBar, Banner, Modal, ModalClose, Confetti, PetalMark } from "../components/ui.jsx";
import LungFigure from "../components/LungFigure.jsx";
import { loadKey, saveKey } from "../lib/storage.js";
import { todayStr, dShort } from "../lib/dates.js";

const MILESTONES = [
  [1, "24 hours", "Carbon monoxide has left your blood. Oxygen delivery is already better."],
  [3, "72 hours", "Bronchial tubes relax — breathing feels physically easier."],
  [14, "2 weeks", "Circulation and lung function begin measurably improving."],
  [30, "1 month", "Coughing and breathlessness reducing; cilia regrowing and sweeping your lungs clean."],
  [90, "90 days", "Challenge complete! Lung function up significantly. Claim your certificate + free anniversary Ūpiri check."],
  [365, "1 year", "Your risk of coronary heart disease is about half a smoker's."],
];

/* Dev/demo: append ?demo to the URL to unlock a day-count simulator so the
   90-day champion flow can be demonstrated to management without waiting 90 days. */
const DEMO_DAYS = [0, 1, 3, 14, 30, 89, 90, 365];

function Certificate({ name, quitDate }) {
  return (
    <div className="certificate rounded-2xl p-6 text-center"
      style={{ border: `6px double ${C.marigold}`, background: "#FFFDF8" }}>
      <div className="flex justify-center mb-2"><PetalMark size={44} /></div>
      <div className="disp text-[10px] tracking-[0.35em] uppercase" style={{ color: "#8A88B8" }}>Certificate of Achievement</div>
      <div className="disp text-3xl font-extrabold mt-2" style={{ color: C.indigo }}>{name || "Friend of ŪPIRI"}</div>
      <div className="disp text-lg font-bold mt-1" style={{ color: C.marigold }}>Rendo Ūpiri Champion</div>
      <div className="telugu text-sm" style={{ color: "#6C6A9E" }}>రెండో ఊపిరి ఛాంపియన్</div>
      <div className="text-sm font-semibold mt-2" style={{ color: C.ink }}>90 Days Smoke-Free</div>
      <div className="text-xs mt-3" style={{ color: "#8A88B8" }}>
        Quit date: {dShort(quitDate)} · Awarded {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
      </div>
      <div className="text-[11px] mt-3 pt-3" style={{ color: "#8A88B8", borderTop: `1px solid ${C.mist}` }}>
        ŪPIRI Precision Pulmonary Care · Powered by {HOSPITAL}
      </div>
    </div>
  );
}

export default function RendoUpiri({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qd, setQd] = useState(todayStr());
  const [name, setName] = useState("");
  const [cigs, setCigs] = useState("10");
  const [price, setPrice] = useState("18");
  const [demoDays, setDemoDays] = useState(null);
  const [champOpen, setChampOpen] = useState(false);
  const [champSeen, setChampSeen] = useState(false);

  const demo = useMemo(() => new URLSearchParams(window.location.search).has("demo"), []);

  useEffect(() => {
    let live = true;
    loadKey("rendo-upiri", null).then((d) => { if (live) { setData(d); setLoading(false); } });
    return () => { live = false; };
  }, []);

  const start = async () => {
    const d = { quitDate: qd, name: name.trim(), cigsPerDay: parseFloat(cigs) || 10, pricePerCig: parseFloat(price) || 18 };
    setData(d); await saveKey("rendo-upiri", d);
  };
  const reset = async () => { setData(null); setDemoDays(null); setChampSeen(false); await saveKey("rendo-upiri", null); };

  const realDays = data ? Math.max(0, Math.floor((new Date(todayStr()) - new Date(data.quitDate)) / 86400000)) : 0;
  const days = demoDays ?? realDays;

  useEffect(() => {
    if (data && days >= 90 && !champSeen) {
      setChampOpen(true);
      setChampSeen(true);
    }
  }, [days, data, champSeen]);

  const printCert = () => {
    document.body.classList.add("print-cert");
    const done = () => { document.body.classList.remove("print-cert"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  };

  if (loading) return <div><BackBar title="Rendo Ūpiri" telugu="రెండో ఊపిరి" onBack={onBack} /><Card><div className="text-center py-8 text-sm" style={{ color: "#8A88B8" }}>Loading…</div></Card></div>;

  if (!data) return (
    <div>
      <BackBar title="Rendo Ūpiri — Second Breath" telugu="రెండో ఊపిరి — 90 రోజుల ఛాలెంజ్" onBack={onBack} />
      <Card>
        <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
          Screened lungs deserve a second chance. Rendo Ūpiri combines physician-prescribed medicines (which roughly double quit rates versus willpower alone), a CO breath test you can watch fall, WhatsApp check-ins, and a family "quit partner". Start your counter here.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm font-semibold">Your name (for your certificate)
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Ravi"
              className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
          </label>
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

  const saved = Math.round(days * data.cigsPerDay * data.pricePerCig);
  const notSmoked = days * data.cigsPerDay;
  const pct = Math.min(100, Math.round((days / 90) * 100));
  // Visual recovery: tar drains and lungs pink up across the 90-day challenge.
  const progress = Math.min(1, days / 90);
  const tar = 1 - progress;
  const health = 0.3 + 0.7 * progress;

  return (
    <div>
      <BackBar title="Rendo Ūpiri — Second Breath" telugu="రెండో ఊపిరి" onBack={onBack} />

      {demo && (
        <Card className="mb-4" style={{ border: `1.5px dashed ${C.marigold}`, background: C.marigoldSoft }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#B35A08" }}>
            Demo mode — simulate smoke-free days
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_DAYS.map((d) => (
              <button key={d} type="button" onClick={() => { setDemoDays(d); setChampSeen(d >= 90 ? false : champSeen); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold"
                style={demoDays === d ? { background: C.indigo, color: "#fff" } : { background: "#fff", color: C.indigo, border: `1px solid ${C.mist}` }}>
                Day {d}
              </button>
            ))}
            <button type="button" onClick={() => setDemoDays(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold underline" style={{ color: "#B35A08" }}>
              Reset to real days
            </button>
          </div>
        </Card>
      )}

      <Card className="text-center mb-4" style={{ background: C.indigo, border: "none" }}>
        <div className="text-xs uppercase tracking-widest" style={{ color: "#AEB8D2" }}>Smoke-free for</div>
        <div className="disp text-6xl font-extrabold" style={{ color: C.marigold }}>{days}</div>
        <div className="text-sm" style={{ color: "#C9D2E6" }}>day{days === 1 ? "" : "s"} · since {dShort(data.quitDate)}</div>

        {/* Lungs recovering: smoke/carbon visibly drains out as the days add up */}
        <div className="mt-3 flex flex-col items-center">
          <LungFigure health={health} tar={tar} size={170} />
          <div className="text-xs mt-1" style={{ color: "#AEB8D2" }}>
            {days >= 90 ? "Clear skies in there. Champion lungs. 🏆"
              : days > 0 ? "Your lungs today — the smoke residue is draining out, breath by breath."
                : "Day zero. From your very first smoke-free hour, recovery begins."}
          </div>
        </div>

        <div className="mt-4 h-2.5 rounded-full mx-auto max-w-sm" style={{ background: "#3E3C85" }}>
          <div className="h-2.5 rounded-full" style={{ width: `${pct}%`, background: C.marigold, transition: "width .8s ease" }} />
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
        {days >= 90 && (
          <div className="mt-4">
            <Btn small onClick={() => setChampOpen(true)}><Trophy size={14} /> View my Champion certificate</Btn>
          </div>
        )}
      </Card>

      <Card>
        <div className="disp font-bold mb-3" style={{ color: C.indigo }}>Your lungs, recovering</div>
        {MILESTONES.map(([d, label, t]) => (
          <div key={d} className="flex gap-3 py-2.5" style={{ borderTop: `1px solid ${C.sky}` }}>
            <div className="mt-0.5">{days >= d
              ? <CheckCircle2 size={18} style={{ color: C.green }} />
              : <div className="w-[18px] h-[18px] rounded-full" style={{ border: `2px solid ${C.mist}` }} />}</div>
            <div className={days >= d ? "" : "opacity-60"}>
              <Chip tone={days >= d ? "green" : "indigo"}>{label}</Chip>
              <div className="text-sm mt-1" style={{ color: "#3A3870" }}>{t}</div>
            </div>
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

      {/* ===== 90-day CHAMPION celebration ===== */}
      <Modal open={champOpen} onClose={() => setChampOpen(false)} label="Rendo Ūpiri Champion" maxWidth={540}>
        <div className="relative p-6 overflow-hidden">
          <Confetti />
          <div className="flex items-start justify-between relative">
            <Chip tone="orange">90-Day Challenge complete</Chip>
            <ModalClose onClose={() => setChampOpen(false)} />
          </div>
          <div className="text-center mt-3 relative">
            <Trophy size={40} style={{ color: C.marigold, margin: "0 auto" }} />
            <h2 className="disp text-2xl font-extrabold mt-2" style={{ color: C.indigo }}>You did it. Champion.</h2>
            <p className="telugu text-sm" style={{ color: "#6C6A9E" }}>90 రోజులు పొగ లేకుండా — రెండో ఊపిరి గెలిచింది!</p>
          </div>
          <div className="mt-4 relative">
            <Certificate name={data.name} quitDate={data.quitDate} />
          </div>
          <Banner tone="green" icon={<Trophy size={18} />} title="Champion reward unlocked">
            A discounted comprehensive health screening package at {HOSPITAL} — our thank-you to your lungs. Claim it below.
          </Banner>
          <div className="flex flex-wrap gap-2 justify-center relative">
            <Btn href={waLink(`I'm a Rendo Ūpiri Champion — 90 days smoke-free! I'd like to claim my discounted health screening package and free anniversary Ūpiri check. Name: ${data.name || "(on file)"}`)}>
              <Phone size={16} /> Claim my reward
            </Btn>
            <Btn kind="dark" onClick={printCert}><Printer size={16} /> Download / print certificate</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
