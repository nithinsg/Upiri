import { Phone } from "lucide-react";
import { C, waLink } from "../config.js";
import { Btn, Card, Chip, BackBar } from "../components/ui.jsx";

export default function CaseOfMonth({ onBack }) {
  return (
    <div>
      <BackBar title="Case of the Month" telugu="ఈ నెల కేసు — నాడ్యూల్ బోర్డ్ నుంచి" onBack={onBack} />
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Chip tone="orange">July 2026</Chip>
          <Chip tone="indigo">From the Nodule Board</Chip>
        </div>
        <h2 className="disp text-2xl font-extrabold" style={{ color: C.indigo }}>The pea-sized shadow</h2>
        <p className="text-sm mt-1 mb-4" style={{ color: "#8A88B8" }}>
          Illustrative composite case; details anonymised and altered to protect identity. Presented with consent principles at the ŪPIRI Nodule Board.
        </p>
        <div className="space-y-4 text-sm" style={{ color: "#3A3870" }}>
          <p><strong style={{ color: C.indigo }}>The patient.</strong> A 48-year-old software architect. Never smoked. No symptoms. A routine pre-employment chest X-ray — the kind most people never think about again.</p>
          <p><strong style={{ color: C.indigo }}>Day 0.</strong> The radiologist's read: normal. The AI second read (qXR) flagged a subtle 9 mm opacity in the right upper zone, partially hidden behind the second rib — exactly where human eyes tire. The radiologist re-reviewed and agreed: worth a closer look.</p>
          <p><strong style={{ color: C.indigo }}>Day 1.</strong> Fast-track Nodule Clinic consult. Low-dose CT confirmed a 9 mm part-solid nodule with mild spiculation. Malignancy probability estimated with the Brock model: not low enough to watch.</p>
          <p><strong style={{ color: C.indigo }}>Day 2.</strong> Nodule Board (pulmonology + radiology + oncology + thoracic surgery). Decision: tissue diagnosis via Archimedes BTPNA navigational bronchoscopy — the nodule sat beyond the reach of conventional bronchoscopy.</p>
          <p><strong style={{ color: C.indigo }}>Day 4.</strong> Navigation biopsy under cone-beam CT confirmation. On-site cytology: adenocarcinoma. Staging PET the same week: Stage IA. No nodes, no spread.</p>
          <p><strong style={{ color: C.indigo }}>The outcome.</strong> Minimally invasive lobectomy three weeks later. No chemotherapy required. He was back at his desk in a month, now on a simple surveillance calendar. Five-year outlook at this stage is excellent — the entire reason early detection exists.</p>
        </div>
        <div className="mt-5 rounded-2xl p-4" style={{ background: C.indigo }}>
          <div className="disp font-bold text-white mb-2">Teaching pearls</div>
          <ul className="text-sm space-y-1.5" style={{ color: "#C9D2E6" }}>
            <li>• You don't have to smoke to get lung cancer — a large share of Indian lung cancer occurs in never-smokers.</li>
            <li>• Rib overlap zones are where small nodules hide; a structured second read (AI or human) catches them.</li>
            <li>• Time-to-diagnosis here: <strong style={{ color: C.marigold }}>4 days</strong>. The national norm for incidental nodules is often months — or never.</li>
            <li>• For referring physicians: any nodule, any report, any lab → 48–72h fast-track, outcome summary back to you.</li>
          </ul>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn small href={waLink("I read the Case of the Month. I have an X-ray/CT report with a finding I'd like reviewed.")}><Phone size={14} /> Get my report reviewed</Btn>
          <Btn small kind="ghost" href={waLink("I'm a physician. Please add me to the quarterly Nodule Board invite list.")}>Physicians: join the Nodule Board</Btn>
        </div>
      </Card>
    </div>
  );
}
