import { Activity, ChevronRight, HeartPulse, Waves } from "lucide-react";
import { C } from "../../config.js";
import { Card, Chip, BackBar } from "../../components/ui.jsx";
import { CLUB_LIST } from "./clubConfig.js";

const CLUB_ICONS = { asthma: HeartPulse, copd: Activity, ild: Waves };

export default function ClubsHub({ go, onBack }) {
  return (
    <div>
      <BackBar title="Breath Clubs" telugu="ఊపిరి క్లబ్‌లు" onBack={onBack} />
      <p className="text-sm mb-4" style={{ color: "#4A4880" }}>
        Living with a lung condition is easier in company. Each club gives you a smart diary with early-warning alerts,
        an academy of consultant videos, and champions who've walked your road. Yashoda patients and guests get full access alike.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CLUB_LIST.map((club) => {
          const Icon = CLUB_ICONS[club.id];
          return (
            <button key={club.id} type="button" onClick={() => go(`club:${club.id}`)}
              className="tile text-left rounded-2xl p-5 flex flex-col gap-2"
              style={{ background: C.card, border: `1px solid ${C.mist}` }}>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl" style={{ background: C.indigoSoft, color: C.indigo }}>
                  <Icon size={22} />
                </div>
                <Chip tone="orange">Diary · Academy · Champions</Chip>
              </div>
              <div>
                <div className="disp font-bold" style={{ color: C.indigo }}>{club.label}</div>
                <div className="telugu text-xs" style={{ color: "#8A88B8" }}>{club.te}</div>
              </div>
              <p className="text-sm" style={{ color: "#4A4880" }}>{club.desc}</p>
              <div className="mt-auto flex items-center gap-1 text-sm font-semibold" style={{ color: C.marigold }}>
                Enter club <ChevronRight size={16} />
              </div>
            </button>
          );
        })}
      </div>
      <Card className="mt-4">
        <div className="text-sm" style={{ color: "#4A4880" }}>
          <strong style={{ color: C.indigo }}>Not a Yashoda Hospitals patient?</strong> You're still welcome — every club
          has a full-access guest mode. Bring your diary to any doctor; the data is yours.
        </div>
      </Card>
    </div>
  );
}
