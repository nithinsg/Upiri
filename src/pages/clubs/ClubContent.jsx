import { Play } from "lucide-react";
import { C } from "../../config.js";
import { Card, Chip } from "../../components/ui.jsx";

const THUMB_GRADIENTS = [
  `linear-gradient(135deg, ${C.indigo}, #4A47A3)`,
  `linear-gradient(135deg, #B35A08, ${C.marigold})`,
  `linear-gradient(135deg, #1F5C3D, ${C.green})`,
];

/* Academy video library — consultant-published education.
   Placeholder cards until the real videos are recorded and hosted. */
export default function ClubContent({ cfg }) {
  return (
    <div>
      <Card className="mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="disp text-lg font-bold" style={{ color: C.indigo }}>{cfg.academy}</div>
            <div className="telugu text-sm" style={{ color: "#8A88B8" }}>{cfg.academyTe}</div>
          </div>
          <Chip tone="orange">Consultant-published videos</Chip>
        </div>
        <p className="text-sm mt-2" style={{ color: "#4A4880" }}>
          Short, practical videos from the {cfg.label} consultants — technique, triggers, treatments and daily living.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cfg.videos.map((v, i) => (
          <button key={v.t} type="button" aria-label={`Play video: ${v.t}`}
            className="tile text-left rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "#fff", border: `1px solid ${C.mist}` }}>
            <div className="relative h-28 flex items-center justify-center" style={{ background: THUMB_GRADIENTS[i % 3] }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.92)" }}>
                <Play size={20} style={{ color: C.indigo, marginLeft: 2 }} />
              </div>
              <span className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>{v.dur}</span>
            </div>
            <div className="p-4">
              <div className="font-bold text-sm leading-snug" style={{ color: C.indigo }}>{v.t}</div>
              <div className="text-xs mt-1" style={{ color: "#8A88B8" }}>{v.by} · {`Yashoda Hospitals`}</div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs mt-4" style={{ color: "#8A88B8" }}>
        Placeholder library — topics confirmed, recordings with the consultants in progress. Videos educate; they never
        replace your own doctor's advice.
      </p>
    </div>
  );
}
