import { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { C } from "../../config.js";
import { Btn, Card, Chip, BackBar, Modal } from "../../components/ui.jsx";
import { loadKey, saveKey } from "../../lib/storage.js";
import { CLUBS } from "./clubConfig.js";
import ClubDiary from "./ClubDiary.jsx";
import ClubContent from "./ClubContent.jsx";
import ClubChampions from "./ClubChampions.jsx";

function emptyClub() {
  return { identity: null, profile: null, inhalerLogs: [], pefLogs: [], spo2Logs: [], symptoms: [] };
}

/* Entry gate: YH number (Yashoda registration ID) or guest — guests get full access. */
function Gate({ cfg, onDone, onBack }) {
  const [yh, setYh] = useState("");
  return (
    <div>
      <BackBar title={cfg.label} telugu={cfg.te} onBack={onBack} />
      <Card><div className="text-center py-10 text-sm" style={{ color: "#8A88B8" }}>Opening your club…</div></Card>
      <Modal open onClose={onBack} label={`${cfg.label} sign-in`} maxWidth={440}>
        <div className="p-6">
          <div className="disp font-bold text-lg" style={{ color: C.indigo }}>Welcome to the {cfg.label}</div>
          <div className="telugu text-sm mb-3" style={{ color: "#8A88B8" }}>{cfg.te}కి స్వాగతం</div>
          <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
            If you're a Yashoda Hospitals patient, enter your YH number so your club diary can be linked at OPD visits.
          </p>
          <label className="text-sm font-semibold block">YH number
            <input value={yh} onChange={(e) => setYh(e.target.value)} placeholder="e.g., YH1234567"
              className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
          </label>
          <div className="mt-4">
            <Btn full disabled={!yh.trim()} onClick={() => onDone({ yhNumber: yh.trim().toUpperCase(), guest: false })}>
              Continue as a YH member <ChevronRight size={18} />
            </Btn>
          </div>
          <button type="button"
            onClick={() => onDone({ yhNumber: null, guest: true })}
            className="mt-3 w-full text-center text-sm font-semibold underline py-2" style={{ color: C.marigold }}>
            Not a Yashoda Hospitals patient? Continue as guest — full access
          </button>
          <p className="text-[11px] mt-3" style={{ color: "#8A88B8" }}>
            Your YH number stays on this device with your diary. Guests can add one later from the diary header.
          </p>
        </div>
      </Modal>
    </div>
  );
}

/* One-minute diary setup: name, personal best, medication presets. */
function ClubSetup({ cfg, identity, onBack, onDone }) {
  const [name, setName] = useState("");
  const [pb, setPb] = useState("");
  const [picked, setPicked] = useState([]);
  const [custom, setCustom] = useState("");
  const presets = cfg.presets;
  const isPef = cfg.metric === "pef";

  const togglePreset = (i) => setPicked(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i]);

  const finish = () => {
    const meds = picked.map((i, idx) => ({ id: `m${idx}`, ...presets[i] }));
    if (custom.trim()) meds.push({ id: `m${meds.length}`, name: custom.trim(), type: "controller", perDay: 2 });
    onDone({
      name: name.trim() || "Friend",
      personalBest: isPef && pb ? Math.round(parseFloat(pb)) : null,
      meds,
    });
  };

  return (
    <div>
      <BackBar title={cfg.label} telugu={cfg.te} onBack={onBack} />
      <Card>
        <div className="flex items-center justify-between mb-1">
          <div className="disp font-bold text-lg" style={{ color: C.indigo }}>Welcome — let's set up your diary</div>
          <Chip tone="indigo">{identity?.guest ? "Guest" : `YH ${identity?.yhNumber}`}</Chip>
        </div>
        <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
          Takes one minute. Everything stays in your personal diary and powers your early-warning alerts.
        </p>
        <label className="text-sm font-semibold block mb-3">Your name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Lakshmi"
            className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
        </label>
        {isPef && (
          <label className="text-sm font-semibold block mb-4">Personal best peak flow (L/min) — if you know it
            <input inputMode="numeric" value={pb} onChange={(e) => setPb(e.target.value)} placeholder="e.g., 420 (leave blank if unsure)"
              className="mt-1 w-full rounded-xl px-3 py-2.5" style={{ border: `1.5px solid ${C.mist}` }} />
            <span className="block text-xs font-normal mt-1" style={{ color: "#8A88B8" }}>Don't know it? No problem — we'll learn it from your best reading over your first week.</span>
          </label>
        )}
        <div className="text-sm font-semibold mb-2">Your inhalers & medicines (tap all that apply)</div>
        <div className="flex flex-col gap-2 mb-3">
          {presets.map((m, i) => (
            <button key={i} type="button" onClick={() => togglePreset(i)}
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

const TABS = [
  { id: "diary", l: "Diary", te: "డైరీ" },
  { id: "content", l: "Content", te: "వీడియోలు" },
  { id: "champions", l: "Champions", te: "ఛాంపియన్లు" },
];

export default function Club({ condition, onBack }) {
  const cfg = CLUBS[condition];
  const key = `club-${condition}`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("diary");

  useEffect(() => {
    let live = true;
    loadKey(key, null).then((d) => {
      if (!live) return;
      setData({ ...emptyClub(), ...(d || {}) });
      setLoading(false);
    });
    return () => { live = false; };
  }, [key]);

  const persist = async (next) => {
    setData(next);
    return saveKey(key, next);
  };

  if (!cfg) return null;

  if (loading) return (
    <div>
      <BackBar title={cfg.label} telugu={cfg.te} onBack={onBack} />
      <Card><div className="text-center py-8 text-sm" style={{ color: "#8A88B8" }}>Opening your club diary…</div></Card>
    </div>
  );

  if (!data.identity)
    return <Gate cfg={cfg} onBack={onBack} onDone={(identity) => persist({ ...data, identity })} />;

  if (!data.profile)
    return <ClubSetup cfg={cfg} identity={data.identity} onBack={onBack}
      onDone={(p) => persist({ ...data, profile: p })} />;

  return (
    <div>
      <BackBar title={cfg.label} telugu={cfg.te} onBack={onBack} />

      {/* Tab bar */}
      <div className="flex gap-2 mb-4" role="tablist" aria-label={`${cfg.label} sections`}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={tab === t.id
              ? { background: C.indigo, color: "#fff" }
              : { background: "#fff", color: C.indigo, border: `1.5px solid ${C.mist}` }}>
            {t.l} <span className="telugu text-xs" style={{ color: tab === t.id ? C.marigold : "#8A88B8" }}>{t.te}</span>
          </button>
        ))}
      </div>

      {tab === "diary" && <div className="tab-panel" role="tabpanel"><ClubDiary cfg={cfg} condition={condition} data={data} persist={persist} /></div>}
      {tab === "content" && <div className="tab-panel" role="tabpanel"><ClubContent cfg={cfg} /></div>}
      {tab === "champions" && <div className="tab-panel" role="tabpanel"><ClubChampions cfg={cfg} /></div>}
    </div>
  );
}
