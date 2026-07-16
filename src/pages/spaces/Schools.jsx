import { GraduationCap, HeartPulse, Phone, ShieldCheck, Users, Wind } from "lucide-react";
import { C, waLink } from "../../config.js";
import { Btn, Card, Chip } from "../../components/ui.jsx";

const PROGRAMS = [
  {
    icon: <Wind size={22} />, tag: "Students",
    t: "Asthma awareness assemblies",
    d: "Age-appropriate sessions that make inhalers normal, not embarrassing — so no child hides their breathing. Includes a fun 'how lungs work' demo and AQI-day playground guidance.",
  },
  {
    icon: <ShieldCheck size={22} />, tag: "Teachers",
    t: "Anaphylaxis & inhaler-emergency training",
    d: "Hands-on training for teachers and sports staff: recognising a severe allergic reaction, using an adrenaline device, helping a child with a spacer, and when to call for help. Certificate provided.",
  },
  {
    icon: <Users size={22} />, tag: "Parents",
    t: "Parent education evenings",
    d: "Straight answers about childhood asthma and allergy: what controller inhalers do and don't do, trigger-proofing bedrooms, and the Hyderabad allergy calendar for families.",
  },
  {
    icon: <HeartPulse size={22} />, tag: "Campus",
    t: "School air & sports-day guidance",
    d: "Practical advisories for the Oct–Feb smog season: indoor-sports thresholds, mask guidance, and a simple AQI protocol your PE department can run without us.",
  },
];

export default function Schools() {
  return (
    <div>
      {/* HERO */}
      <div className="rounded-3xl overflow-hidden mb-6" style={{ background: C.indigo }}>
        <div className="p-6 sm:p-10">
          <Chip tone="orange">For schools</Chip>
          <h1 className="disp font-extrabold text-white leading-tight mt-3" style={{ fontSize: "clamp(1.6rem, 4.5vw, 2.4rem)" }}>
            Every classroom has a child who's quietly short of breath.
          </h1>
          <p className="telugu mt-2" style={{ color: C.marigold }}>పాఠశాలల కోసం — పిల్లల ఊపిరికి భరోసా.</p>
          <p className="mt-3 text-sm max-w-2xl" style={{ color: "#C9D2E6" }}>
            ŪPIRI brings pulmonology and allergy expertise to your campus: awareness sessions for students, emergency
            training for teachers, and honest education for parents — built for Hyderabad's air.
          </p>
          <div className="mt-5">
            <Btn href={waLink("Hi, I'm from a school. Please share ŪPIRI school program details (awareness sessions / teacher training / parent education).")}>
              <GraduationCap size={16} /> Enquire for your school
            </Btn>
          </div>
        </div>
      </div>

      {/* PROGRAM CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PROGRAMS.map((p) => (
          <Card key={p.t} className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2.5 rounded-xl" style={{ background: C.indigoSoft, color: C.indigo }}>{p.icon}</div>
              <Chip tone="orange">{p.tag}</Chip>
            </div>
            <div className="disp font-bold" style={{ color: C.indigo }}>{p.t}</div>
            <p className="text-sm mt-1 flex-1" style={{ color: "#4A4880" }}>{p.d}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <div className="disp font-bold" style={{ color: C.indigo }}>How it works</div>
        <p className="text-sm mt-1" style={{ color: "#4A4880" }}>
          One WhatsApp message starts the conversation. We'll match a program to your calendar — a single assembly, a
          teacher-training afternoon, or a full campus lung-health week. Sessions are bilingual (English + Telugu) and
          free of product promotion in student-facing content.
        </p>
        <div className="mt-3">
          <Btn small kind="dark" href={waLink("Hi, I'm from a school. Please call us back about ŪPIRI school programs.")}>
            <Phone size={14} /> Request a callback
          </Btn>
        </div>
      </Card>
    </div>
  );
}
