/* Anatomical lung illustration.
   - `health` 0..1 drives the color: 1 = bright healthy pink, 0 = dull smoker's grey.
   - `tar` 0..1 shows accumulated smoke/carbon particles inside the lobes;
     while any tar remains, dark particles visibly leak/drain out below the lungs.
   - Subtle breathing animation (disabled under prefers-reduced-motion via CSS). */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}

const HEALTHY = { base: "#F2989F", deep: "#DE6E7A", light: "#FBC7CC" };
const SICK = { base: "#787D89", deep: "#565B66", light: "#9CA3AF" };

/* Fixed pseudo-random tar positions inside the two lobes (viewBox 200×200). */
const TAR = [
  [62, 105], [70, 128], [58, 140], [78, 150], [66, 160], [85, 118], [74, 96], [88, 138], [60, 122], [80, 166],
  [138, 105], [130, 128], [142, 140], [122, 150], [134, 160], [115, 118], [126, 96], [112, 138], [140, 122], [120, 166],
];

export default function LungFigure({ health = 1, tar = 0, size = 190, breathing = true, style }) {
  const t = 1 - Math.max(0, Math.min(1, health));
  const base = lerpColor(HEALTHY.base, SICK.base, t);
  const deep = lerpColor(HEALTHY.deep, SICK.deep, t);
  const light = lerpColor(HEALTHY.light, SICK.light, t);
  const tarClamped = Math.max(0, Math.min(1, tar));
  const tarCount = Math.round(tarClamped * TAR.length);
  const colStyle = { transition: "fill 1.1s ease, stroke 1.1s ease" };

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true" style={style}>
      <g className={breathing ? "lung-breathe" : undefined}>
        {/* trachea + main bronchi */}
        <rect x="93" y="16" width="14" height="42" rx="7" fill="#C4CBDD" />
        <path d="M100 54 L100 64 M100 60 C100 70 88 72 82 82 M100 60 C100 70 112 72 118 82"
          stroke="#C4CBDD" strokeWidth="9" strokeLinecap="round" fill="none" />
        {/* left lobe (viewer left) */}
        <path d="M90 74 C62 78 45 110 46 143 C47 169 63 184 78 177 C91 171 93 150 93 122 L93 86 C93 77 92 73 90 74 Z"
          fill={base} stroke={deep} strokeWidth="2.5" style={colStyle} />
        {/* right lobe */}
        <path d="M110 74 C138 78 155 110 154 143 C153 169 137 184 122 177 C109 171 107 150 107 122 L107 86 C107 77 108 73 110 74 Z"
          fill={base} stroke={deep} strokeWidth="2.5" style={colStyle} />
        {/* soft highlights */}
        <ellipse cx="66" cy="104" rx="10" ry="18" fill={light} opacity="0.55" style={colStyle} />
        <ellipse cx="134" cy="104" rx="10" ry="18" fill={light} opacity="0.55" style={colStyle} />
        {/* inner airways */}
        <path d="M84 88 C76 100 70 118 70 140 M116 88 C124 100 130 118 130 140"
          stroke="#fff" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* accumulated smoke / carbon particles */}
        {TAR.slice(0, tarCount).map(([x, y], i) => (
          <circle key={i} className="tar-dot" cx={x} cy={y} r={i % 3 === 0 ? 4 : 2.8}
            fill="#2E2A26" opacity="0.75" style={{ animationDelay: `${(i % 5) * 0.7}s` }} />
        ))}
      </g>
      {/* tar visibly draining out while any remains */}
      {tarCount > 0 && [78, 100, 124].map((x, i) => (
        <circle key={x} className="tar-fall" cx={x} cy="182" r="3" fill="#2E2A26" opacity="0.7"
          style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
    </svg>
  );
}
