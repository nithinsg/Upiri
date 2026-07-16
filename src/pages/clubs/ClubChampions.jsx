import { Quote } from "lucide-react";
import { C } from "../../config.js";
import { Card, Chip } from "../../components/ui.jsx";

/* Member champions — outcome-framed testimonials.
   Placeholder stories until real members consent to share theirs. */
export default function ClubChampions({ cfg }) {
  return (
    <div>
      <Card className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="disp text-lg font-bold" style={{ color: C.indigo }}>{cfg.championsTitle}</div>
          <Chip tone="indigo">Member stories</Chip>
        </div>
        <p className="text-sm mt-2" style={{ color: "#4A4880" }}>
          Members who went from uncontrolled to controlled — in their own words. Their path is the club's promise.
        </p>
      </Card>

      <div className="snap-x-carousel flex gap-4 overflow-x-auto pb-3 -mx-1 px-1"
        aria-label={`${cfg.championsTitle} stories`}>
        {cfg.champions.map((ch) => (
          <Card key={ch.initials} className="flex-none flex flex-col" style={{ width: 272 }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                style={{ background: C.indigo }} aria-hidden="true">{ch.initials}</div>
              <div>
                <div className="font-bold text-sm" style={{ color: C.indigo }}>{ch.name}, {ch.age}</div>
                <Chip tone="green">{ch.outcome}</Chip>
              </div>
            </div>
            <Quote size={18} style={{ color: C.marigold }} aria-hidden="true" />
            <p className="text-sm italic mt-1 flex-1" style={{ color: "#3A3870" }}>"{ch.quote}"</p>
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.sky}` }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#B9C3D6" }}>
                Illustrative placeholder — real member story pending consent
              </span>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: "#8A88B8" }}>
        Want to become a champion story? Tell us at your next club session — sharing is always voluntary and anonymised
        to your comfort.
      </p>
    </div>
  );
}
