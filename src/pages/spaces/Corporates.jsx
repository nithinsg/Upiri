import { Building2, CheckCircle2, Phone } from "lucide-react";
import { C, waLink } from "../../config.js";
import { Btn, Card, Chip } from "../../components/ui.jsx";

const TIERS = [
  { n: "Breath Score Basic", who: "HR wellness budgets · 500+ employee campuses", inc: ["On-site chest X-ray (mobile / partner lab)", "qXR AI second read on every film", "Spirometry + Lung Age", "One-page bilingual Breath Score™ report per employee"] },
  { n: "Breath Score Plus", who: "IT-corridor mid-size firms", inc: ["Everything in Basic", "Pulmonologist tele-review of every abnormal", "Rendo Ūpiri smoking-cessation enrolment offer", "Aggregate workforce lung-health dashboard for HR"] },
  { n: "Executive Lung Assessment", who: "CXO programs · insurers' premium plans", inc: ["X-ray + AI + full PFT + CPET-lite", "Pulmonologist consult", "Annual surveillance plan", "Trek-Fit / VO₂max add-ons available"] },
];

export default function Corporates() {
  return (
    <div>
      <div className="mb-5">
        <Chip tone="orange">ŪPIRI@Work</Chip>
        <h1 className="disp text-2xl font-extrabold mt-2" style={{ color: C.indigo }}>
          Breath Score for your whole team — on-site, 4 minutes each.
        </h1>
        <p className="telugu text-sm mt-1" style={{ color: "#6C6A9E" }}>మీ టీమ్ ఊపిరికి భరోసా</p>
      </div>

      <Card className="mb-4" style={{ background: C.indigo, border: "none" }}>
        <div className="disp text-xl font-extrabold text-white">Your annual health check looks at everything — except the organ Hyderabad's air attacks daily.</div>
        <p className="text-sm mt-2" style={{ color: "#C9D2E6" }}>
          4 minutes per employee, on-site. ₹500–800 per head versus ₹2,500+ for CT-based screening. Reports on WhatsApp. Pollution season (Oct–Feb) slots fill first — book early.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn href={waLink("Hi, I'm from HR/admin. Please share the ŪPIRI@Work corporate proposal and a pilot date.")}><Building2 size={16} /> Request a proposal</Btn>
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        {TIERS.map((t, i) => (
          <Card key={t.n} className="flex flex-col">
            <div className="disp font-bold" style={{ color: C.indigo }}>{t.n}</div>
            <div className="text-xs mb-3" style={{ color: "#8A88B8" }}>{t.who}</div>
            <ul className="text-sm space-y-1.5 flex-1" style={{ color: "#4A4880" }}>
              {t.inc.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: C.green }} />{x}</li>)}
            </ul>
            {i === 1 && <div className="mt-3"><Chip tone="orange">Most popular</Chip></div>}
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <div className="disp font-bold" style={{ color: C.indigo }}>Protect Your Parents</div>
        <p className="text-sm mt-1" style={{ color: "#4A4880" }}>
          Add-on rider: your employees book Ūpiri checks for their parents at corporate rates. In every pilot conversation, this is the line HR teams remember.
        </p>
        <div className="mt-3">
          <Btn small kind="dark" href={waLink("Hi, I'd like details of the Protect Your Parents corporate add-on for ŪPIRI@Work.")}>
            <Phone size={14} /> Ask about this add-on
          </Btn>
        </div>
      </Card>
    </div>
  );
}
