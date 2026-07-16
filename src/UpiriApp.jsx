import { useState } from "react";
import { Building2, GraduationCap, Menu, Phone, Stethoscope, Users } from "lucide-react";
import { C, HOSPITAL, BRAND_TAGLINE_TE, EMERGENCY_NUMBER, waLink, telLink } from "./config.js";
import { GlobalStyle, PetalMark, Btn } from "./components/ui.jsx";
import Drawer from "./components/Drawer.jsx";
import { loadKeySync, saveKeySync } from "./lib/storage.js";

import Home from "./pages/Home.jsx";
import RiskCheck from "./pages/RiskCheck.jsx";
import LungAge from "./pages/LungAge.jsx";
import NoduleJourney from "./pages/NoduleJourney.jsx";
import AllergyCalendar from "./pages/AllergyCalendar.jsx";
import CaseOfMonth from "./pages/CaseOfMonth.jsx";
import RendoUpiri from "./pages/RendoUpiri.jsx";
import Shikhar from "./pages/Shikhar.jsx";
import Triage from "./pages/Triage.jsx";
import ClubsHub from "./pages/clubs/ClubsHub.jsx";
import Club from "./pages/clubs/Club.jsx";
import Doctors from "./pages/spaces/Doctors.jsx";
import Corporates from "./pages/spaces/Corporates.jsx";
import Schools from "./pages/spaces/Schools.jsx";

const PROFILES = [
  { id: "people", label: "People", te: "ప్రజలు", icon: <Users size={20} />, desc: "Checks, clubs & self-care" },
  { id: "doctors", label: "Doctors", te: "వైద్యులు", icon: <Stethoscope size={20} />, desc: "Referrals, Nodule Board & cases" },
  { id: "corporates", label: "Corporates", te: "కార్పొరేట్", icon: <Building2 size={20} />, desc: "ŪPIRI@Work programs" },
  { id: "schools", label: "Schools", te: "పాఠశాలలు", icon: <GraduationCap size={20} />, desc: "Awareness & teacher training" },
];
const PROFILE_IDS = PROFILES.map((p) => p.id);

/* ================= APP SHELL ================= */
export default function UpiriApp() {
  const [profile, setProfile] = useState(() => {
    const saved = loadKeySync("profile", "people");
    return PROFILE_IDS.includes(saved) ? saved : "people";
  });
  const [route, setRoute] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const go = (r) => { setRoute(r); window.scrollTo({ top: 0 }); };
  const back = () => go("home");
  const pickProfile = (p) => {
    setProfile(p);
    setRoute("home");
    setDrawerOpen(false);
    saveKeySync("profile", p);
    window.scrollTo({ top: 0 });
  };

  let page;
  if (profile === "people") {
    if (route.startsWith("club:")) {
      page = <Club condition={route.slice(5)} onBack={() => go("clubs")} />;
    } else {
      page = {
        home: <Home go={go} />,
        risk: <RiskCheck onBack={back} />,
        triage: <Triage onBack={back} />,
        breath: <LungAge onBack={back} />,
        journey: <NoduleJourney onBack={back} />,
        clubs: <ClubsHub go={go} onBack={back} />,
        allergy: <AllergyCalendar onBack={back} />,
        case: <CaseOfMonth onBack={back} />,
        rendo: <RendoUpiri onBack={back} />,
        shikhar: <Shikhar onBack={back} />,
      }[route] ?? <Home go={go} />;
    }
  } else if (profile === "doctors") {
    page = route === "case" ? <CaseOfMonth onBack={back} /> : <Doctors go={go} />;
  } else if (profile === "corporates") {
    page = <Corporates />;
  } else {
    page = <Schools />;
  }

  const activeProfile = PROFILES.find((p) => p.id === profile);

  return (
    <div className="up-root min-h-screen" style={{ background: C.sky }}>
      <GlobalStyle />

      {/* HEADER */}
      <header className="sticky top-0 z-20" style={{ background: C.indigo, boxShadow: "0 2px 10px rgba(29,27,75,0.25)" }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button type="button" onClick={() => setDrawerOpen(true)}
            aria-label="Open menu" aria-expanded={drawerOpen} aria-haspopup="dialog"
            className="p-2 rounded-xl shrink-0" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>
            <Menu size={20} />
          </button>
          <button type="button" onClick={() => go("home")} className="flex items-center gap-2.5 min-w-0" aria-label="ŪPIRI home">
            <PetalMark />
            <div className="text-left min-w-0">
              <div className="disp font-extrabold text-white leading-none" style={{ fontSize: "1.3rem" }}>
                ŪPIRI <span className="telugu text-sm font-semibold" style={{ color: C.marigold }}>ఊపిరి</span>
              </div>
              <div className="telugu text-[11px] leading-tight mt-0.5" style={{ color: C.marigold }}>
                {BRAND_TAGLINE_TE}
              </div>
              <div className="text-[10px] tracking-wide truncate" style={{ color: "#AEB8D2" }}>
                Precision Pulmonary Care · Powered by {HOSPITAL}
                {profile !== "people" && <> · <span style={{ color: C.marigold }}>{activeProfile.label} space</span></>}
              </div>
            </div>
          </button>
          <div className="ml-auto hidden sm:block shrink-0">
            <Btn small href={waLink("Hi, I'd like to book an ŪPIRI Lung Check.")}><Phone size={14} /> Book</Btn>
          </div>
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        profiles={PROFILES} active={profile} onSelect={pickProfile} />

      <main className="max-w-5xl mx-auto px-4 py-6">{page}</main>

      {/* FOOTER */}
      <footer className="mt-8" style={{ background: C.indigo }}>
        <div className="max-w-5xl mx-auto px-4 py-8 grid sm:grid-cols-3 gap-6 text-sm" style={{ color: "#C9D2E6" }}>
          <div>
            <div className="flex items-center gap-2 mb-2"><PetalMark size={26} />
              <span className="disp font-extrabold text-white">ŪPIRI Lung Check</span></div>
            <p className="telugu" style={{ color: C.marigold }}>{BRAND_TAGLINE_TE}</p>
            <p className="mt-1 text-xs">Two minutes. One X-ray. A lifetime of breath.</p>
            <p className="mt-2 text-xs">
              Emergency: <a href={telLink()} className="font-bold underline" style={{ color: "#fff" }}>{EMERGENCY_NUMBER}</a>
            </p>
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
              The tools here are awareness and self-management aids, not medical diagnosis; they are pending final clinical validation and medico-legal sign-off by the {HOSPITAL} pulmonology department. In an emergency (severe breathlessness, chest pain, blue lips), call {EMERGENCY_NUMBER} or go to the nearest emergency department immediately. AI reads assist — a qualified radiologist and pulmonologist make every clinical decision.
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
