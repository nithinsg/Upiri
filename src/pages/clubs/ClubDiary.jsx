import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bluetooth, CheckCircle2, Flame, MessageCircle, Minus, Phone,
  PhoneCall, Plus, Stethoscope, Users, Wind,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceArea, BarChart, Bar, CartesianGrid, ReferenceLine,
} from "recharts";
import { C, EMERGENCY_NUMBER, telLink, waLink } from "../../config.js";
import { Btn, Card, Chip, Banner, Modal, ModalClose } from "../../components/ui.jsx";
import ZoneGauge from "../../components/ZoneGauge.jsx";
import WhatsAppMock from "../../components/WhatsAppMock.jsx";
import { loadKey, saveKey } from "../../lib/storage.js";
import { todayStr, dShort, lastNDates, nDaysAgoIso } from "../../lib/dates.js";

const LIFE_ICONS = [Users, Stethoscope, Wind];

export default function ClubDiary({ cfg, condition, data, persist }) {
  const [syncing, setSyncing] = useState(false);
  const [pefInput, setPefInput] = useState("");
  const [spo2Input, setSpo2Input] = useState("");
  const [saveErr, setSaveErr] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [waMockOpen, setWaMockOpen] = useState(false);

  const save = async (next) => {
    const ok = await persist(next);
    setSaveErr(!ok);
  };

  /* ---------- derived ---------- */
  const today = todayStr();
  const meds = data.profile.meds || [];
  const controllers = meds.filter((m) => m.type === "controller");
  const relievers = meds.filter((m) => m.type === "reliever");
  const isPef = cfg.metric === "pef";

  const dosesOn = (date, medId) =>
    data.inhalerLogs.filter((l) => l.date === date && l.medId === medId).reduce((a, l) => a + l.count, 0);
  const takenToday = (medId) => dosesOn(today, medId);

  const logDose = (medId, delta) => {
    const cur = takenToday(medId);
    if (cur + delta < 0) return;
    const others = data.inhalerLogs.filter((l) => !(l.date === today && l.medId === medId));
    save({ ...data, inhalerLogs: [...others, { date: today, medId, count: cur + delta }] });
  };

  // adherence last 7 days (controllers only)
  const days7 = lastNDates(7);
  const adherenceData = days7.map((d) => {
    let expected = 0, taken = 0;
    controllers.forEach((m) => {
      expected += m.perDay;
      taken += Math.min(dosesOn(d, m.id), m.perDay);
    });
    return { d: dShort(d), pct: expected ? Math.round((taken / expected) * 100) : 0 };
  });
  const adherencePct = Math.round(adherenceData.reduce((a, x) => a + x.pct, 0) / 7);

  // streak: consecutive fully-adhered days (today counts once complete)
  const dayComplete = (d) => controllers.length > 0 && controllers.every((m) => dosesOn(d, m.id) >= m.perDay);
  const streak = useMemo(() => {
    let n = 0;
    let i = dayComplete(today) ? 0 : 1;
    for (; i < 365; i++) {
      if (dayComplete(nDaysAgoIso(i))) n++;
      else break;
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.inhalerLogs]);
  const allDoneToday = dayComplete(today);

  // reliever use last 7 days
  const relieverUse = data.inhalerLogs.filter((l) => days7.includes(l.date) && relievers.some((r) => r.id === l.medId));
  const relieverPuffs = relieverUse.reduce((a, l) => a + l.count, 0);
  const relieverDays = new Set(relieverUse.filter((l) => l.count > 0).map((l) => l.date)).size;

  /* ---------- metric: peak flow OR SpO₂ ---------- */
  const pb = data.profile.personalBest || (data.pefLogs.length >= 5 ? Math.max(...data.pefLogs.map((p) => p.value)) : null);
  const metricLogs = isPef ? data.pefLogs : data.spo2Logs;
  const sorted = [...metricLogs].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const recent = sorted.slice(-14);
  const latest = sorted[sorted.length - 1];

  const zone = isPef
    ? (v) => (!pb ? null : v >= 0.8 * pb ? "green" : v >= 0.5 * pb ? "amber" : "red")
    : (v) => (v >= 95 ? "green" : v >= 90 ? "amber" : "red");
  const latestZone = latest ? zone(latest.value) : null;
  const last7 = sorted.filter((p) => days7.includes(p.date));
  const yellowCount7 = last7.filter((p) => zone(p.value) === "amber").length;
  const last3 = sorted.slice(-3);
  const declining = isPef
    ? pb && last3.length === 3 && last3[0].value > last3[1].value && last3[1].value > last3[2].value && (last3[0].value - last3[2].value) >= 0.15 * pb
    : last3.length === 3 && last3[0].value > last3[1].value && last3[1].value > last3[2].value && (last3[0].value - last3[2].value) >= 3;

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
    save({ ...data, symptoms: [...others, { date: today, status }] });
  };

  const makeEntry = (value, source = "manual", dateIso = today, time) => ({
    date: dateIso,
    time: time || new Date().toTimeString().slice(0, 5),
    value: Math.round(value),
    source,
  });

  const submitPef = () => {
    const v = parseFloat(pefInput);
    if (!v || v < 50 || v > 900) return;
    save({ ...data, pefLogs: [...data.pefLogs, makeEntry(v)] });
    setPefInput("");
  };

  const submitSpo2 = () => {
    const v = parseFloat(spo2Input);
    if (!v || v < 50 || v > 100) return;
    save({ ...data, spo2Logs: [...data.spo2Logs, makeEntry(v)] });
    setSpo2Input("");
  };

  const syncDevice = () => {
    setSyncing(true);
    setTimeout(() => {
      const base = pb || 400;
      const newLogs = [];
      lastNDates(5).forEach((d, i) => {
        if (!data.pefLogs.some((p) => p.date === d && p.source === "device")) {
          const wobble = 0.78 + Math.random() * 0.17 - i * 0.005;
          newLogs.push(makeEntry(base * wobble, "device", d, "07:3" + Math.floor(Math.random() * 9)));
        }
      });
      save({ ...data, pefLogs: [...data.pefLogs, ...newLogs] });
      setSyncing(false);
    }, 1400);
  };

  /* ---------- missed-days adherence workflow (WhatsApp reminder) ----------
     Rule: no controller doses logged for 3 consecutive days → automatic
     WhatsApp reminder. PRODUCTION: this check runs server-side against synced
     diary data and sends a pre-approved template via the WhatsApp Business API
     (webhook plugs in here); the mock below shows management exactly what the
     patient receives. */
  const last3Dates = lastNDates(3);
  const missed3 = controllers.length > 0
    && data.inhalerLogs.length > 0
    && last3Dates.every((d) => controllers.every((m) => dosesOn(d, m.id) === 0));

  const simulateMissedDays = () => {
    // Seed a believable history (full adherence 6–4 days ago), wipe the last 3 days.
    const seeded = [];
    for (let i = 6; i >= 4; i--) {
      const d = nDaysAgoIso(i);
      controllers.forEach((m) => {
        if (!data.inhalerLogs.some((l) => l.date === d && l.medId === m.id)) {
          seeded.push({ date: d, medId: m.id, count: m.perDay });
        }
      });
    }
    const kept = data.inhalerLogs.filter(
      (l) => !(last3Dates.includes(l.date) && controllers.some((m) => m.id === l.medId))
    );
    save({ ...data, inhalerLogs: [...kept, ...seeded] });
    setWaMockOpen(true);
  };

  /* ---------- risk engine ---------- */
  let risk = null;
  if (latestZone === "red") {
    risk = {
      tone: "red", urgent: true,
      title: isPef ? "RED ZONE — act now" : "Low oxygen — act now",
      body: isPef
        ? `Your latest peak flow (${latest.value} L/min) is below 50% of your personal best. Use your reliever as per your action plan and seek urgent care immediately. Do not wait for an appointment.`
        : `Your latest SpO₂ (${latest.value}%) is below 90%. Sit upright, use any prescribed oxygen/reliever, and seek urgent care immediately. Do not wait for an appointment.`,
      detail: isPef ? `Peak flow ${latest.value} vs personal best ${pb}` : `SpO₂ ${latest.value}%`,
    };
  } else if (declining || yellowCount7 >= 3 || worseStreak >= 2) {
    const reasons = [
      declining && (isPef ? "a falling peak-flow trend across your last three readings" : "a falling SpO₂ trend across your last three readings"),
      yellowCount7 >= 3 && `${yellowCount7} yellow-zone readings this week`,
      worseStreak >= 2 && `${worseStreak} days of "worse than usual" breathing`,
    ].filter(Boolean).join(", ");
    risk = {
      tone: "amber", urgent: true,
      title: "Early-warning pattern — book an OPD review within 48 hours",
      body: `We're seeing ${reasons}. Flare-ups whisper before they shout — a review now usually means a small medication adjustment instead of an emergency later.`,
      detail: reasons,
    };
  } else if (cfg.relieverRule && (relieverPuffs > 6 || relieverDays >= 3)) {
    risk = {
      tone: "amber", urgent: true,
      title: "Reliever overuse — your control needs a review",
      body: `You've needed your reliever ${relieverPuffs} times across ${relieverDays} day(s) this week. Needing rescue more than twice a week means the underlying inflammation isn't controlled — a controller adjustment usually fixes this.`,
      detail: `reliever overuse (${relieverPuffs} puffs this week)`,
    };
  } else if (adherencePct < 70 && controllers.length > 0) {
    risk = {
      tone: "indigo", urgent: false,
      title: `Adherence at ${adherencePct}% this week`,
      body: "Controller medicines only work when they're boringly regular — they treat tomorrow's inflammation, not today's symptoms. Tie doses to brushing your teeth; it's the oldest trick and it works.",
    };
  } else {
    risk = {
      tone: "green", urgent: false,
      title: "All steady this week",
      body: `Adherence ${adherencePct}%${latestZone === "green" ? (isPef ? ", peak flow in your green zone" : ", SpO₂ in your green zone") : ""}. Keep the streak — and see you at this month's ${cfg.label} session.`,
    };
  }

  /* Exacerbation-prediction pop-up: fires once per day per club when urgent. */
  const riskSig = risk?.urgent ? risk.tone : "none";
  useEffect(() => {
    if (riskSig !== "red" && riskSig !== "amber") return;
    let live = true;
    loadKey(`alert-seen-${condition}`, "").then((seen) => {
      if (!live) return;
      const sig = `${today}:${riskSig}`;
      if (seen === sig) return;
      setAlertOpen(true);
      saveKey(`alert-seen-${condition}`, sig);
    });
    return () => { live = false; };
  }, [riskSig, condition, today]);

  const zoneColor = { green: C.green, amber: C.amber, red: C.red };
  const name = data.profile.name;
  const gaugeZones = isPef
    ? (pb ? [
        { from: Math.round(pb * 0.4), to: Math.round(pb * 0.5), color: C.red },
        { from: Math.round(pb * 0.5), to: Math.round(pb * 0.8), color: C.amber },
        { from: Math.round(pb * 0.8), to: Math.round(pb * 1.12), color: C.green },
      ] : null)
    : [
        { from: 80, to: 90, color: C.red },
        { from: 90, to: 95, color: C.amber },
        { from: 95, to: 100, color: C.green },
      ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-sm" style={{ color: "#4A4880" }}>
          Namaste, <strong style={{ color: C.indigo }}>{name}</strong>
          {isPef && pb && <> · personal best <strong>{pb} L/min</strong></>}
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="indigo">{data.identity?.guest ? "Guest member" : `YH ${data.identity?.yhNumber}`}</Chip>
          <button type="button" onClick={() => persist({ ...data, profile: null })}
            className="text-xs font-semibold underline" style={{ color: "#8A88B8" }}>Edit profile</button>
        </div>
      </div>

      {saveErr && <Banner tone="amber" icon={<AlertTriangle size={18} />} title="Couldn't save just now">Your entry is on screen but didn't reach storage. Check your connection and tap the entry again.</Banner>}

      <Banner tone={risk.tone}
        icon={risk.tone === "green" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
        title={risk.title}
        cta={risk.urgent ? <Btn small kind={risk.tone === "red" ? "danger" : "primary"} onClick={() => setAlertOpen(true)}><Phone size={14} /> See my options</Btn> : null}>
        {risk.body}
      </Banner>

      {missed3 && (
        <Banner tone="amber" icon={<MessageCircle size={18} />} title="Automated WhatsApp reminder triggered"
          cta={<Btn small kind="ghost" onClick={() => setWaMockOpen(true)}>View the message</Btn>}>
          No controller doses logged for 3 days — the adherence workflow has sent a WhatsApp nudge (demo preview).
        </Banner>
      )}

      {/* SYMPTOM QUICK LOG */}
      <Card className="mb-4">
        <div className="disp font-bold mb-2" style={{ color: C.indigo }}>{cfg.symptomQ}</div>
        <div className="flex gap-2">
          {[["good", "Better than usual", "green"], ["usual", "My usual", "indigo"], ["worse", "Worse than usual", "amber"]].map(([v, l, tone]) => (
            <button key={v} type="button" onClick={() => logSymptom(v)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={symToday === v
                ? { background: tone === "green" ? C.green : tone === "amber" ? C.amber : C.indigo, color: "#fff" }
                : { background: "#fff", color: C.indigo, border: `1.5px solid ${C.mist}` }}>
              {l}
            </button>
          ))}
        </div>
      </Card>

      {/* INHALER / MEDICINE LOG — visual dose dots */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="disp font-bold" style={{ color: C.indigo }}>Today's medicines</div>
          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "#B35A08" }}>
                <Flame size={14} style={{ color: C.marigold }} /> {streak}-day streak
              </span>
            )}
            <Chip tone={adherencePct >= 80 ? "green" : adherencePct >= 60 ? "amber" : "red"}>{adherencePct}% this week</Chip>
          </div>
        </div>
        <p className="text-xs mb-3" style={{ color: "#8A88B8" }}>Tap the circles as you take each dose. Relievers count too — that's how we spot flare-ups early.</p>

        {allDoneToday && (
          <div className="rounded-xl p-3 mb-3 flex items-center gap-2 text-sm font-semibold"
            style={{ background: C.greenSoft, color: C.green }}>
            <CheckCircle2 size={18} /> All controller doses done for today — breathe easy. 🎉
          </div>
        )}

        {meds.map((m) => {
          const t = takenToday(m.id);
          const isCtl = m.type === "controller";
          const done = isCtl && t >= m.perDay;
          return (
            <div key={m.id} className="flex items-center gap-3 py-3 flex-wrap" style={{ borderTop: `1px solid ${C.sky}` }}>
              <div className="flex-1 min-w-[140px]">
                <div className="text-sm font-semibold" style={{ color: C.indigo }}>{m.name}</div>
                <div className="text-xs" style={{ color: "#8A88B8" }}>
                  {isCtl ? `Controller — ${m.perDay}×/day` : "Reliever — as needed"}
                </div>
              </div>
              {isCtl ? (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: m.perDay }).map((_, i) => {
                    const filled = i < t;
                    return (
                      <button key={i} type="button"
                        onClick={() => logDose(m.id, filled && i === t - 1 ? -1 : filled ? 0 : 1)}
                        aria-label={`${m.name} dose ${i + 1} of ${m.perDay}${filled ? " — taken, tap to undo" : " — tap when taken"}`}
                        className="dose-dot"
                        style={{
                          background: filled ? C.green : "#fff",
                          border: `2px solid ${filled ? C.green : C.mist}`,
                        }}>
                        {filled && <CheckCircle2 size={15} color="#fff" />}
                      </button>
                    );
                  })}
                  {done && <CheckCircle2 size={18} style={{ color: C.green, marginLeft: 4 }} aria-hidden="true" />}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => logDose(m.id, -1)} aria-label="remove puff"
                    className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.sky, color: C.indigo }}><Minus size={15} /></button>
                  <div className="flex items-center gap-1 min-w-[44px] justify-center">
                    {t === 0 ? <span className="text-sm font-bold" style={{ color: "#B9C3D6" }}>0</span>
                      : Array.from({ length: Math.min(t, 6) }).map((_, i) => (
                        <span key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: C.amber }} />
                      ))}
                    {t > 6 && <span className="text-xs font-bold" style={{ color: C.amber }}>+{t - 6}</span>}
                  </div>
                  <button type="button" onClick={() => logDose(m.id, 1)} aria-label="add puff"
                    className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: C.marigold, color: "#fff" }}><Plus size={15} /></button>
                </div>
              )}
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

      {/* METRIC TRACKER — peak flow (asthma/COPD) or SpO₂ (ILD) */}
      <Card className="mb-4">
        <div className="disp font-bold" style={{ color: C.indigo }}>{isPef ? "Peak flow" : "SpO₂ (pulse oximeter)"}</div>
        <p className="text-xs mb-3" style={{ color: "#8A88B8" }}>
          {isPef
            ? (pb ? `Zones from your personal best (${pb}): green ≥ ${Math.round(pb * 0.8)}, yellow ${Math.round(pb * 0.5)}–${Math.round(pb * 0.8) - 1}, red < ${Math.round(pb * 0.5)} L/min.`
              : "Log at least 5 readings (or set a personal best in your profile) to activate your green/yellow/red zones.")
            : "If you have a pulse oximeter at home, log your resting SpO₂ daily. Zones: green ≥ 95%, yellow 90–94%, red < 90%. Your doctor may set different personal targets."}
        </p>

        {/* Today's gauge vs zones */}
        {gaugeZones && latest && (
          <div className="mb-3">
            <ZoneGauge
              min={isPef ? Math.round(pb * 0.4) : 80}
              max={isPef ? Math.round(pb * 1.12) : 100}
              zones={gaugeZones}
              value={latest.value}
              unit={isPef ? "L/min" : "% SpO₂"}
              ariaLabel={`Latest ${isPef ? "peak flow" : "SpO₂"}: ${latest.value}${isPef ? " litres per minute" : " percent"}`}
            />
          </div>
        )}

        <div className="flex gap-2 mb-3">
          {isPef ? (
            <>
              <input inputMode="numeric" value={pefInput} onChange={(e) => setPefInput(e.target.value)}
                placeholder="e.g., 380" className="flex-1 rounded-xl px-3 py-2.5 text-sm min-w-0" style={{ border: `1.5px solid ${C.mist}` }} />
              <Btn small onClick={submitPef}><Plus size={15} /> Log</Btn>
              <Btn small kind="dark" onClick={syncDevice} disabled={syncing}>
                <Bluetooth size={15} /> {syncing ? "Syncing…" : "Sync meter"}
              </Btn>
            </>
          ) : (
            <>
              <input inputMode="numeric" value={spo2Input} onChange={(e) => setSpo2Input(e.target.value)}
                placeholder="e.g., 96" className="flex-1 rounded-xl px-3 py-2.5 text-sm min-w-0" style={{ border: `1.5px solid ${C.mist}` }} />
              <Btn small onClick={submitSpo2}><Plus size={15} /> Log SpO₂</Btn>
            </>
          )}
        </div>
        {isPef && (
          <p className="text-xs mb-3" style={{ color: "#B0AECF" }}>
            "Sync meter" pulls readings from a paired Bluetooth smart peak flow meter (demo data in this preview build).
          </p>
        )}

        {recent.length > 0 ? (
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recent.map((p) => ({ ...p, label: dShort(p.date) }))} margin={{ top: 5, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={C.sky} vertical={false} />
                {isPef && pb && <ReferenceArea y1={pb * 0.8} y2={pb * 1.12} fill={C.green} fillOpacity={0.09} />}
                {isPef && pb && <ReferenceArea y1={pb * 0.5} y2={pb * 0.8} fill={C.amber} fillOpacity={0.1} />}
                {isPef && pb && <ReferenceArea y1={0} y2={pb * 0.5} fill={C.red} fillOpacity={0.08} />}
                {!isPef && <ReferenceArea y1={95} y2={100} fill={C.green} fillOpacity={0.09} />}
                {!isPef && <ReferenceArea y1={90} y2={95} fill={C.amber} fillOpacity={0.1} />}
                {!isPef && <ReferenceArea y1={80} y2={90} fill={C.red} fillOpacity={0.08} />}
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8A88B8" }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={isPef
                    ? [pb ? Math.round(pb * 0.4) : "auto", pb ? Math.round(pb * 1.12) : "auto"]
                    : [80, 100]}
                  tick={{ fontSize: 10, fill: "#8A88B8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, n, p) => [`${v} ${isPef ? "L/min" : "%"} (${p.payload.source})`, p.payload.time]} />
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
            {isPef ? "No readings yet. Log your first blow above, or sync your meter." : "No readings yet. Log your first SpO₂ above."}
          </div>
        )}
        {latest && latestZone && (
          <div className="mt-2 text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: zoneColor[latestZone] }} />
            Latest: <strong>{latest.value} {isPef ? "L/min" : "%"}</strong>
            {isPef && pb && <> · {Math.round((latest.value / pb) * 100)}% of personal best</>}
            {" "}· {latestZone.toUpperCase()} zone
          </div>
        )}
      </Card>

      {/* CLUB LIFE */}
      <Card className="mb-4">
        <div className="disp font-bold mb-2" style={{ color: C.indigo }}>This month at {cfg.label}</div>
        <ul className="text-sm space-y-2" style={{ color: "#4A4880" }}>
          {cfg.clubLife.map((text, i) => {
            const Icon = LIFE_ICONS[i % LIFE_ICONS.length];
            return (
              <li key={i} className="flex gap-2">
                <Icon size={16} className="shrink-0 mt-0.5" style={{ color: C.marigold }} />
                {text}
              </li>
            );
          })}
        </ul>
        <div className="mt-3">
          <Btn small kind="dark" href={waLink(`Hi, I'm a ${cfg.label} member. Please register me for this month's session.`)}><Users size={14} /> Reserve my seat</Btn>
        </div>
      </Card>

      {/* DEMO CONTROLS — management preview of the automated adherence nudge */}
      <Card className="mb-4" style={{ border: `1.5px dashed ${C.mist}`, background: "#FAFBFE" }}>
        <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "#8A88B8" }}>
          Demo controls · management preview
        </div>
        <p className="text-xs mb-3" style={{ color: "#8A88B8" }}>
          Fast-forward 3 missed medication days to see the automated WhatsApp adherence reminder a patient would receive.
        </p>
        <Btn small kind="ghost" onClick={simulateMissedDays}>
          <MessageCircle size={14} /> Simulate 3 missed days → WhatsApp nudge
        </Btn>
      </Card>

      <p className="text-xs" style={{ color: "#8A88B8" }}>
        This diary supports — never replaces — your written action plan. In severe breathlessness, blue lips, or drowsiness: call {EMERGENCY_NUMBER} or go to emergency immediately.
      </p>

      {/* ===== EXACERBATION-PREDICTION POP-UP ===== */}
      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} label="Breathing alert" maxWidth={470}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-2">
            <Chip tone={risk.tone === "red" ? "red" : "amber"}>
              {risk.tone === "red" ? "Red zone — urgent" : "Early warning"}
            </Chip>
            <ModalClose onClose={() => setAlertOpen(false)} />
          </div>
          <h2 className="disp text-xl font-extrabold" style={{ color: risk.tone === "red" ? C.red : C.indigo }}>
            {risk.tone === "red" ? "Your readings need attention now" : "Let's review this within 48 hours"}
          </h2>
          <p className="text-sm mt-2" style={{ color: "#4A4880" }}>{risk.body}</p>

          {risk.tone === "red" ? (
            <a href={telLink()} className="block rounded-2xl p-4 text-center mt-4" style={{ background: C.red, color: "#fff" }}>
              <div className="text-xs uppercase tracking-widest opacity-80">Yashoda Emergency — tap to call</div>
              <div className="disp text-3xl font-extrabold">{EMERGENCY_NUMBER}</div>
            </a>
          ) : (
            <div className="rounded-xl p-3 mt-4 text-sm text-center" style={{ background: C.sky, color: "#4A4880" }}>
              Emergency line (if things worsen): <a href={telLink()} className="font-bold underline" style={{ color: C.red }}>{EMERGENCY_NUMBER}</a>
            </div>
          )}

          <div className="mt-4 space-y-2">
            <div className="text-sm font-semibold" style={{ color: C.indigo }}>Should we call you?</div>
            <Btn full kind="dark" href={waLink(`${risk.tone === "red" ? "URGENT " : ""}Callback request: ${cfg.label} member ${name}${data.identity?.yhNumber ? ` (YH ${data.identity.yhNumber})` : ""}. The diary flagged: ${risk.detail || risk.title}. Please call me back.`)}>
              <PhoneCall size={16} /> Yes — request a callback
            </Btn>
            <Btn full href={waLink(`Hi, I'm a ${cfg.label} member (${name}). The diary flagged: ${risk.detail || risk.title}. Please book me ${risk.tone === "red" ? "an urgent consultation today" : "an OPD review within 48 hours"}.`)}>
              <Phone size={16} /> Book a consultation now
            </Btn>
            <button type="button" onClick={() => setAlertOpen(false)}
              className="w-full text-center text-sm font-semibold underline py-1.5" style={{ color: "#8A88B8" }}>
              {risk.tone === "red" ? "I've already acted on this" : "I'm okay — dismiss for today"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== WHATSAPP ADHERENCE MOCK (demo) ===== */}
      <Modal open={waMockOpen} onClose={() => setWaMockOpen(false)} label="WhatsApp reminder preview" maxWidth={430}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="disp font-bold" style={{ color: C.indigo }}>Automated adherence nudge</div>
              <div className="text-xs" style={{ color: "#8A88B8" }}>Demo mock-up — sent via WhatsApp Business API in production</div>
            </div>
            <ModalClose onClose={() => setWaMockOpen(false)} />
          </div>
          <WhatsAppMock
            time={new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            message={`Namaste ${name} 🙏 You've missed your ${cfg.label} controller medicines for 3 days — please take them on time. Missed doses let inflammation build quietly, even on days you feel fine. Need help or a refill? Reply CALL and our care team will phone you. — ŪPIRI Care, Yashoda Hospitals`}
          />
          <p className="text-xs mt-3" style={{ color: "#8A88B8" }}>
            Trigger rule: 3 consecutive days with no controller doses logged. The diary above now shows the simulated
            missed days — log a dose to clear the state.
          </p>
        </div>
      </Modal>
    </div>
  );
}
