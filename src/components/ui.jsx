import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";
import { C } from "../config.js";

/* ================= GLOBAL STYLE ================= */
export function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=Noto+Sans+Telugu:wght@400;600&display=swap');
      .up-root { font-family:'Inter', system-ui, -apple-system, sans-serif; color:${C.ink}; }
      .disp { font-family:'Bricolage Grotesque','Inter',system-ui,sans-serif; letter-spacing:-0.02em; }
      .telugu { font-family:'Noto Sans Telugu','Inter',system-ui,sans-serif; }
      @keyframes breathe { 0%,100%{ transform:scale(1); opacity:.85;} 50%{ transform:scale(1.12); opacity:1;} }
      @keyframes breatheSlow { 0%,100%{ transform:scale(1); opacity:.35;} 50%{ transform:scale(1.22); opacity:.6;} }
      .breath-ring { animation: breathe 4.5s ease-in-out infinite; }
      .breath-ring-outer { animation: breatheSlow 4.5s ease-in-out infinite; }
      .up-root button:focus-visible, .up-root a:focus-visible, .up-root input:focus-visible, .up-root select:focus-visible {
        outline: 3px solid ${C.marigold}; outline-offset: 2px; border-radius: 6px;
      }
      .tile:hover { transform: translateY(-2px); }
      .tile { transition: transform .15s ease, box-shadow .15s ease; }

      /* ---- v2: overlays ---- */
      @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      @keyframes slideInLeft { from{ transform:translateX(-102%);} to{ transform:none;} }
      @keyframes popIn { from{ opacity:0; transform:translateY(14px) scale(.97);} to{ opacity:1; transform:none;} }
      @keyframes fadeSlideIn { from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:none;} }
      .drawer-overlay { position:fixed; inset:0; background:rgba(29,27,75,.5); z-index:60; animation:fadeIn .2s ease; }
      .drawer-panel { position:fixed; top:0; left:0; bottom:0; width:302px; max-width:86vw; background:#fff; z-index:61;
        box-shadow:8px 0 30px rgba(29,27,75,.25); animation:slideInLeft .25s ease; overflow-y:auto; }
      .modal-overlay { position:fixed; inset:0; background:rgba(29,27,75,.55); z-index:70; display:flex;
        align-items:center; justify-content:center; padding:16px; animation:fadeIn .2s ease; }
      .modal-panel { animation:popIn .28s cubic-bezier(.16,1,.3,1); max-height:92vh; overflow-y:auto; }
      .tab-panel { animation:fadeSlideIn .3s ease; }
      .fadeSlide { animation:fadeSlideIn .45s ease; }

      /* ---- v2: nodule journey timeline ---- */
      .journey { display:flex; flex-direction:column; }
      .tl-step { display:grid; grid-template-columns:46px 1fr; column-gap:14px; }
      .tl-rail { display:flex; flex-direction:column; align-items:center; }
      .tl-line { width:3px; flex:1; min-height:36px; border-radius:2px; background:${C.marigold}; opacity:.7;
        transform:scaleY(0); transform-origin:top; transition:transform .7s ease .1s; }
      .tl-line.in { transform:scaleY(1); }
      .tl-card { opacity:0; transform:translateY(16px); transition:opacity .5s ease, transform .5s ease; padding-bottom:20px; }
      .tl-card.in { opacity:1; transform:none; }
      @media (min-width:900px){
        .journey { flex-direction:row; overflow-x:auto; padding-bottom:12px; }
        .tl-step { grid-template-columns:1fr; grid-template-rows:46px auto; row-gap:12px; flex:0 0 280px; }
        .tl-rail { flex-direction:row; width:100%; }
        .tl-line { width:auto; height:3px; flex:1; min-height:0; margin:0 8px; align-self:center;
          transform:scaleX(0); transform-origin:left; }
        .tl-line.in { transform:scaleX(1); }
        .tl-card { padding-bottom:4px; padding-right:16px; }
      }

      /* ---- v2: club diary ---- */
      .dose-dot { width:34px; height:34px; border-radius:9999px; display:inline-flex; align-items:center;
        justify-content:center; transition:transform .12s ease, background .2s ease, border-color .2s ease; }
      .dose-dot:active { transform:scale(.85); }

      /* ---- v2: lung figure ---- */
      .lung-breathe { animation:lungBreathe 4.5s ease-in-out infinite; transform-origin:100px 110px; }
      @keyframes lungBreathe { 0%,100%{ transform:scale(1);} 50%{ transform:scale(1.045);} }
      .tar-dot { animation:tarDrift 5.5s ease-in-out infinite alternate; }
      @keyframes tarDrift { from{ transform:translate(0,0);} to{ transform:translate(2px,4px);} }
      .tar-fall { animation:tarFall 2.6s ease-in infinite; }
      @keyframes tarFall { 0%{ transform:translateY(0); opacity:.8;} 100%{ transform:translateY(20px); opacity:0;} }

      /* ---- v2: confetti ---- */
      .confetti-piece { position:absolute; top:-18px; width:9px; height:14px; border-radius:2px;
        animation-name:confettiFall; animation-timing-function:ease-in; animation-iteration-count:1; animation-fill-mode:forwards; }
      @keyframes confettiFall { 0%{ transform:translateY(0) rotate(0deg); opacity:1;} 100%{ transform:translateY(92vh) rotate(660deg); opacity:0;} }

      /* ---- v2: carousels ---- */
      .snap-x-carousel { scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; }
      .snap-x-carousel > * { scroll-snap-align:start; }

      @media (prefers-reduced-motion: reduce){
        .breath-ring, .breath-ring-outer, .lung-breathe, .tar-dot, .tar-fall, .confetti-piece { animation:none !important; }
        .drawer-panel, .drawer-overlay, .modal-overlay, .modal-panel, .tab-panel, .fadeSlide { animation:none !important; }
        .tl-card, .tl-line { transition:none !important; opacity:1 !important; transform:none !important; }
        .tile { transition:none; }
      }

      /* Print only the certificate when saving/printing from the champion modal */
      @media print {
        body.print-cert * { visibility:hidden; }
        body.print-cert .certificate, body.print-cert .certificate * { visibility:visible; }
        body.print-cert .certificate { position:fixed; left:0; top:0; right:0; margin:24px; }
      }
    `}</style>
  );
}

/* ================= LOGO ================= */
export function PetalMark({ size = 34 }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {petals.map((a) => (
        <ellipse key={a} cx="50" cy="26" rx="11" ry="24" fill={C.marigold}
          transform={`rotate(${a} 50 50)`} opacity="0.95" />
      ))}
      <circle cx="50" cy="50" r="9" fill="#fff" />
    </svg>
  );
}

export function BreathRing({ size = 190, label = "శ్వాస", sub = "breathe" }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="breath-ring-outer absolute rounded-full"
        style={{ width: size, height: size, border: `2px solid ${C.marigold}` }} />
      <div className="breath-ring absolute rounded-full"
        style={{ width: size * 0.74, height: size * 0.74, border: `3px solid ${C.marigold}`, background: "rgba(245,130,31,0.08)" }} />
      <div className="text-center relative">
        <div className="telugu font-semibold" style={{ fontSize: size * 0.16, color: C.marigold }}>{label}</div>
        <div className="text-xs tracking-widest uppercase" style={{ color: "#B9C3D6" }}>{sub}</div>
      </div>
    </div>
  );
}

/* ================= UI ATOMS ================= */
export function Btn({ children, onClick, href, kind = "primary", full, small, disabled }) {
  const styles = {
    primary: { background: C.marigold, color: "#fff" },
    dark: { background: C.indigo, color: "#fff" },
    ghost: { background: "transparent", color: C.indigo, border: `1.5px solid ${C.mist}` },
    danger: { background: C.red, color: "#fff" },
  }[kind];
  const cls = `inline-flex items-center justify-center gap-2 font-semibold rounded-xl ${small ? "px-3 py-2 text-sm" : "px-5 py-3"} ${full ? "w-full" : ""} ${disabled ? "opacity-50 pointer-events-none" : ""}`;
  if (href)
    return <a className={cls} style={styles} href={href} target={href.startsWith("tel:") ? undefined : "_blank"} rel="noreferrer">{children}</a>;
  return <button type="button" className={cls} style={styles} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Card({ children, className = "", style = {} }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: C.card, border: `1px solid ${C.mist}`, boxShadow: "0 1px 3px rgba(29,27,75,0.06)", ...style }}>
      {children}
    </div>
  );
}

export function Chip({ children, tone = "indigo" }) {
  const map = {
    indigo: { bg: C.indigoSoft, fg: C.indigo },
    orange: { bg: C.marigoldSoft, fg: "#B35A08" },
    green: { bg: C.greenSoft, fg: C.green },
    amber: { bg: C.amberSoft, fg: C.amber },
    red: { bg: C.redSoft, fg: C.red },
  }[tone];
  return (
    <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ background: map.bg, color: map.fg }}>{children}</span>
  );
}

export function BackBar({ title, telugu, onBack }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button type="button" onClick={onBack} aria-label="Back"
        className="p-2 rounded-full" style={{ background: C.indigoSoft, color: C.indigo }}>
        <ArrowLeft size={18} />
      </button>
      <div>
        <h1 className="disp text-xl font-bold leading-tight" style={{ color: C.indigo }}>{title}</h1>
        {telugu && <div className="telugu text-sm" style={{ color: "#6C6A9E" }}>{telugu}</div>}
      </div>
    </div>
  );
}

export function Banner({ tone, icon, title, children, cta }) {
  const map = {
    green: { bg: C.greenSoft, bd: C.green, fg: C.green },
    amber: { bg: C.amberSoft, bd: C.amber, fg: C.amber },
    red: { bg: C.redSoft, bd: C.red, fg: C.red },
    indigo: { bg: C.indigoSoft, bd: C.indigo, fg: C.indigo },
  }[tone];
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: map.bg, border: `1.5px solid ${map.bd}` }}>
      <div className="flex items-start gap-3">
        <div style={{ color: map.fg }} className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <div className="font-bold" style={{ color: map.fg }}>{title}</div>
          <div className="text-sm mt-1" style={{ color: C.ink }}>{children}</div>
          {cta && <div className="mt-3">{cta}</div>}
        </div>
      </div>
    </div>
  );
}

/* ================= MODAL (accessible) =================
   Escape closes, overlay-click closes, focus moves into the panel and returns on close. */
export function Modal({ open, onClose, label, children, maxWidth = 480 }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
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
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label}
        className="modal-panel rounded-3xl w-full up-root" style={{ background: "#fff", maxWidth }}>
        {children}
      </div>
    </div>
  );
}

export function ModalClose({ onClose }) {
  return (
    <button type="button" onClick={onClose} aria-label="Close"
      className="p-2 rounded-full" style={{ background: C.indigoSoft, color: C.indigo }}>
      <X size={16} />
    </button>
  );
}

/* ================= CONFETTI (CSS-only celebration) ================= */
export function Confetti({ count = 70 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        dur: 2.4 + Math.random() * 1.8,
        color: [C.marigold, C.indigo, C.green, "#E4737E", C.amber][i % 5],
        rot: Math.random() * 360,
      })),
    [count]
  );
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} aria-hidden="true">
      {pieces.map((p, i) => (
        <div key={i} className="confetti-piece"
          style={{
            left: `${p.left}%`, background: p.color,
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }} />
      ))}
    </div>
  );
}
