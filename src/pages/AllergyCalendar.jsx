import { useState } from "react";
import { Leaf, Phone } from "lucide-react";
import { C, waLink } from "../config.js";
import { Btn, Card, Chip, BackBar } from "../components/ui.jsx";

const ALLERGY = [
  { m: "January", air: "red", allergens: ["Winter smog (peak)", "Dust mites (indoor)", "Mold in damp corners"], tip: "Shift walks to late morning; N95 on AQI > 200 days; wash bedding weekly in hot water." },
  { m: "February", air: "red", allergens: ["Tree pollen begins", "Smog continues"], tip: "Start antihistamines early if February always gets you — pre-emption beats rescue." },
  { m: "March", air: "amber", allergens: ["Tree pollen (peak)", "Road dust"], tip: "Keep car windows up on highways; rinse face and nostrils after outdoor time." },
  { m: "April", air: "amber", allergens: ["Dust storms", "Parthenium (congress grass)"], tip: "Evenings are dustier than mornings in summer — flip your walk schedule." },
  { m: "May", air: "amber", allergens: ["Heat + dust", "AC duct mold"], tip: "Get AC filters cleaned before the season — a moldy filter is an allergy machine." },
  { m: "June", air: "green", allergens: ["Mold spores rise (monsoon onset)", "Dust mites surge with humidity"], tip: "Air out mattresses on sunny breaks; watch for that 'first rain' wheeze." },
  { m: "July", air: "green", allergens: ["Mold (peak)", "Dust mites (peak)", "Viral triggers"], tip: "Monsoon = mold season. Fix seepage now; asthmatics, keep your controller inhaler regular even on good days." },
  { m: "August", air: "green", allergens: ["Parthenium pollen begins", "Mold continues"], tip: "The itchy-eyes-runny-nose of August is usually weed pollen, not a cold." },
  { m: "September", air: "amber", allergens: ["Weed pollen peak (Parthenium, Amaranthus)", "Mold"], tip: "Peak weed month. If September is always bad, ask about allergy testing + immunotherapy." },
  { m: "October", air: "red", allergens: ["Pollution season begins", "Festival smoke", "Weed pollen tail"], tip: "The Oct–Feb pollution season starts now. Check AQI like you check the weather." },
  { m: "November", air: "red", allergens: ["Smog + firecracker aftermath", "Cold-air trigger"], tip: "Lung Health Month at ŪPIRI — free community checks all month. Masks outdoors on red-AQI days." },
  { m: "December", air: "red", allergens: ["Winter inversion smog", "Indoor allergens (closed windows)"], tip: "Morning smog sits low till ~10 am; late-morning sun is your walking window." },
];

export default function AllergyCalendar({ onBack }) {
  const nowM = new Date().getMonth();
  const [sel, setSel] = useState(nowM);
  const airChip = (a) => a === "red" ? <Chip tone="red">Poor air</Chip> : a === "amber" ? <Chip tone="amber">Moderate air</Chip> : <Chip tone="green">Cleaner air</Chip>;
  const cur = ALLERGY[sel];
  return (
    <div>
      <BackBar title="Hyderabad Allergy Calendar" telugu="ఈ నెల గాలిలో ఏముంది?" onBack={onBack} />
      <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
        A monthly advisory from the Allergy & Immunology Clinic — what's in the city's air, and what to do about it.
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
        {ALLERGY.map((a, i) => (
          <button key={a.m} type="button" onClick={() => setSel(i)}
            className="py-2 rounded-xl text-xs font-bold"
            style={sel === i ? { background: C.indigo, color: "#fff" }
              : i === nowM ? { background: C.marigoldSoft, color: "#B35A08", border: `1.5px solid ${C.marigold}` }
                : { background: "#fff", color: C.indigo, border: `1px solid ${C.mist}` }}>
            {a.m.slice(0, 3)}
          </button>
        ))}
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <div className="disp text-xl font-bold" style={{ color: C.indigo }}>
            {cur.m} {sel === nowM && <span className="text-xs font-semibold" style={{ color: C.marigold }}>· this month</span>}
          </div>
          {airChip(cur.air)}
        </div>
        <div className="mt-3">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#8A88B8" }}>In the air</div>
          <div className="flex flex-wrap gap-2">{cur.allergens.map((x) => <Chip key={x} tone="indigo">{x}</Chip>)}</div>
        </div>
        <div className="mt-4 rounded-xl p-3 text-sm flex gap-2" style={{ background: C.sky }}>
          <Leaf size={18} style={{ color: C.green }} className="shrink-0 mt-0.5" />
          <span>{cur.tip}</span>
        </div>
        <div className="mt-4">
          <Btn small kind="dark" href={waLink(`Hi, I get seasonal allergy symptoms (worst around ${cur.m}). I'd like an Allergy & Immunology Clinic appointment.`)}>
            <Phone size={14} /> Book allergy testing
          </Btn>
        </div>
      </Card>
      <p className="text-xs mt-3" style={{ color: "#8A88B8" }}>
        General seasonal guidance for Hyderabad; individual triggers vary. Skin-prick testing identifies yours precisely — and immunotherapy can retrain the response.
      </p>
    </div>
  );
}
