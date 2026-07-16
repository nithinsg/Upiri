import { useEffect, useRef } from "react";
import { X, ChevronRight, Phone } from "lucide-react";
import { C, BRAND_TAGLINE_TE, EMERGENCY_NUMBER, telLink } from "../config.js";
import { PetalMark } from "./ui.jsx";

/* Slide-in profile drawer: People · Doctors · Corporates · Schools.
   Keyboard-accessible: Escape closes, overlay click closes, focus enters the panel. */
export default function Drawer({ open, onClose, profiles, active, onSelect }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      <nav ref={panelRef} tabIndex={-1} className="drawer-panel up-root p-5 flex flex-col"
        aria-label="Choose your ŪPIRI space">
        <div className="flex items-center gap-2.5 mb-1">
          <PetalMark size={30} />
          <div className="flex-1">
            <div className="disp font-extrabold leading-none" style={{ color: C.indigo, fontSize: "1.2rem" }}>
              ŪPIRI <span className="telugu text-sm font-semibold" style={{ color: C.marigold }}>ఊపిరి</span>
            </div>
            <div className="telugu text-xs mt-0.5" style={{ color: "#6C6A9E" }}>{BRAND_TAGLINE_TE}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close menu"
            className="p-2 rounded-full" style={{ background: C.indigoSoft, color: C.indigo }}>
            <X size={16} />
          </button>
        </div>

        <div className="text-xs font-bold uppercase tracking-wider mt-5 mb-2" style={{ color: "#8A88B8" }}>
          I'm here as…
        </div>
        <div className="flex flex-col gap-2">
          {profiles.map((p) => {
            const isActive = p.id === active;
            return (
              <button key={p.id} type="button" onClick={() => onSelect(p.id)}
                aria-current={isActive ? "page" : undefined}
                className="text-left rounded-2xl p-3.5 flex items-center gap-3"
                style={isActive
                  ? { background: C.indigo, color: "#fff" }
                  : { background: "#fff", border: `1.5px solid ${C.mist}`, color: C.indigo }}>
                <div className="p-2 rounded-xl shrink-0"
                  style={{ background: isActive ? "rgba(255,255,255,0.15)" : C.indigoSoft, color: isActive ? C.marigold : C.indigo }}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">
                    {p.label} <span className="telugu text-xs font-semibold" style={{ color: isActive ? C.marigold : "#8A88B8" }}>{p.te}</span>
                  </div>
                  <div className="text-xs" style={{ color: isActive ? "#C9D2E6" : "#8A88B8" }}>{p.desc}</div>
                </div>
                <ChevronRight size={16} style={{ color: isActive ? C.marigold : "#B9C3D6" }} />
              </button>
            );
          })}
        </div>

        <div className="mt-auto pt-6">
          <a href={telLink()} className="flex items-center gap-3 rounded-2xl p-3.5"
            style={{ background: C.redSoft, border: `1.5px solid ${C.red}` }}>
            <Phone size={18} style={{ color: C.red }} />
            <div>
              <div className="text-xs font-semibold" style={{ color: C.red }}>Emergency · {`Yashoda Hospitals`}</div>
              <div className="disp font-extrabold" style={{ color: C.red }}>{EMERGENCY_NUMBER}</div>
            </div>
          </a>
          <p className="text-[11px] mt-3" style={{ color: "#8A88B8" }}>
            In severe breathlessness, chest pain or blue lips — call, or go to the nearest emergency department.
          </p>
        </div>
      </nav>
    </>
  );
}
