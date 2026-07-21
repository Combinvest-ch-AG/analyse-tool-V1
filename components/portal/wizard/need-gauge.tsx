"use client"

// Semicircular "Tacho" gauge for the live Handlungsbedarf (0–100).

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

// Arc from 180° (left) to 360°/0° (right), i.e. the top semicircle.
function arcPath(cx: number, cy: number, r: number, fraction: number) {
  const start = 180
  const end = 180 + 180 * Math.min(Math.max(fraction, 0), 1)
  const s = polar(cx, cy, r, start)
  const e = polar(cx, cy, r, end)
  const largeArc = end - start > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

export function NeedGauge({ value }: { value: number }) {
  const cx = 110
  const cy = 110
  const r = 90
  const fraction = value / 100

  const label =
    value >= 70 ? "Hoch" : value >= 40 ? "Erhöht" : value > 0 ? "Moderat" : "Noch offen"
  const color = value >= 70 ? "#c94b55" : value >= 40 ? "#e99a16" : "#3978f6"

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 220 130" className="w-full max-w-[240px]" role="img" aria-label={`Handlungsbedarf ${value} Prozent`}>
        {/* track */}
        <path d={arcPath(cx, cy, r, 1)} fill="none" stroke="#e3e9f1" strokeWidth={16} strokeLinecap="round" />
        {/* value */}
        <path
          d={arcPath(cx, cy, r, fraction)}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeLinecap="round"
          style={{ transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)" }}
        />
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-foreground" style={{ fontSize: 34, fontWeight: 800 }}>
          {value}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 12, fontWeight: 600 }}>
          von 100
        </text>
      </svg>
      <span
        className="mt-1 rounded-full px-3 py-1 text-xs font-bold"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        Handlungsbedarf: {label}
      </span>
    </div>
  )
}
