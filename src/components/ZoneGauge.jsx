/* Semi-circular zone gauge (peak flow / SpO₂).
   zones: [{ from, to, color }] in the same units as value; min/max bound the dial. */

function polar(cx, cy, r, deg) {
  const rad = ((deg - 180) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}
function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export default function ZoneGauge({ min, max, zones, value, unit, ariaLabel }) {
  const W = 240, H = 148, cx = 120, cy = 118, R = 92;
  const clamp = (v) => Math.max(min, Math.min(max, v));
  const angle = (v) => ((clamp(v) - min) / (max - min)) * 180;
  const hasValue = value != null && !Number.isNaN(value);
  const [nx, ny] = hasValue ? polar(cx, cy, R - 18, angle(value)) : [cx, cy];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 250, display: "block", margin: "0 auto" }}
      role="img" aria-label={ariaLabel || `Gauge reading ${hasValue ? value : "none"} ${unit || ""}`}>
      {zones.map((z, i) => (
        <path key={i} d={arcPath(cx, cy, R, angle(z.from), angle(z.to))}
          stroke={z.color} strokeWidth="15" fill="none" strokeLinecap="butt" opacity="0.85" />
      ))}
      {hasValue && (
        <>
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#1D1B4B" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill="#1D1B4B" />
        </>
      )}
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="24" fontWeight="800" fill="#1D1B4B"
        fontFamily="'Bricolage Grotesque','Inter',sans-serif">
        {hasValue ? value : "—"}
      </text>
      <text x={cx} y={cy + 38} textAnchor="middle" fontSize="10" fill="#8A88B8">{unit}</text>
      <text x={cx - R} y={cy + 16} textAnchor="middle" fontSize="9" fill="#8A88B8">{min}</text>
      <text x={cx + R} y={cy + 16} textAnchor="middle" fontSize="9" fill="#8A88B8">{max}</text>
    </svg>
  );
}
