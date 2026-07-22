"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { sankey, sankeyLinkHorizontal } from "d3-sankey"
import { formatCHF } from "@/lib/format"

type Item = { name: string; amount: number }
type Category = { name: string; color: string; subs: Item[] }

const COL_INCOME = "#188A57"
const COL_BUDGET = "#3A57F5"

const clamp = (v: number) => (!isFinite(v) || v < 0 ? 0 : Math.min(v, 1e8))
const catTotal = (c: Category) => c.subs.reduce((t, s) => t + clamp(s.amount), 0)

type NodeDatum = { key: string; label: string; color: string; col: number }
type LinkDatum = {
  source: number
  target: number
  value: number
  scol: string
  tcol: string
  kind: "inc" | "cat" | "sub"
  ci?: number
}

type Tooltip = { x: number; y: number; html: string } | null

/**
 * Real 4-column money-flow Sankey (income → budget → categories → line items),
 * matching the original Combinvest budget calculator: gradient links, hover
 * highlighting and percentage tooltips. Fully client-side and responsive.
 */
export function BudgetSankey({ income, cats }: { income: Item[]; cats: Category[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(680)
  const [tip, setTip] = useState<Tooltip>(null)
  const [hoverLink, setHoverLink] = useState<number | null>(null)
  const [hoverNode, setHoverNode] = useState<number | null>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) setWidth(Math.max(280, w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const totals = useMemo(() => {
    const inc = income.reduce((t, x) => t + clamp(x.amount), 0)
    const exp = cats.reduce((t, c) => t + catTotal(c), 0)
    return { inc, exp }
  }, [income, cats])

  const graph = useMemo(() => {
    const nodes: NodeDatum[] = []
    const links: LinkDatum[] = []
    const map: Record<string, number> = {}
    const nid = (key: string, label: string, color: string, col: number) => {
      if (!(key in map)) {
        map[key] = nodes.length
        nodes.push({ key, label, color, col })
      }
      return map[key]
    }
    const bi = nid("budget", "Budget", COL_BUDGET, 1)
    income.forEach((x, i) => {
      const a = clamp(x.amount)
      if (a <= 0) return
      const n = nid("inc" + i, x.name || "Einnahme", COL_INCOME, 0)
      links.push({ source: n, target: bi, value: a, scol: COL_INCOME, tcol: COL_BUDGET, kind: "inc" })
    })
    cats.forEach((c, ci) => {
      const ct = catTotal(c)
      if (ct <= 0) return
      const cn = nid("cat" + ci, c.name || "Kategorie", c.color, 2)
      links.push({ source: bi, target: cn, value: ct, scol: COL_BUDGET, tcol: c.color, kind: "cat", ci })
      c.subs.forEach((sx, si) => {
        const a = clamp(sx.amount)
        if (a <= 0) return
        const sn = nid("sub" + ci + "_" + si, sx.name || "Posten", c.color, 3)
        links.push({ source: cn, target: sn, value: a, scol: c.color, tcol: c.color, kind: "sub", ci })
      })
    })
    return { nodes, links }
  }, [income, cats])

  const height = useMemo(() => {
    const colCount: Record<number, number> = {}
    let maxNodes = 1
    graph.nodes.forEach((n) => {
      colCount[n.col] = (colCount[n.col] || 0) + 1
      if (colCount[n.col] > maxNodes) maxNodes = colCount[n.col]
    })
    return Math.max(300, Math.min(maxNodes * 64 + 30, 640))
  }, [graph])

  const layout = useMemo(() => {
    if (!graph.links.length) return null
    try {
      const generator = sankey<NodeDatum, LinkDatum>()
        .nodeWidth(13)
        .nodePadding(16)
        .extent([
          [6, 12],
          [width - 6, height - 12],
        ])
      // sankey mutates its input, so pass fresh clones
      return generator({
        nodes: graph.nodes.map((d) => ({ ...d })),
        links: graph.links.map((d) => ({ ...d })),
      })
    } catch {
      return null
    }
  }, [graph, width, height])

  type FlowInfo = Pick<LinkDatum, "kind" | "value" | "ci">
  function pctOf(d: FlowInfo) {
    if (d.kind === "inc") return totals.inc > 0 ? Math.round((d.value / totals.inc) * 100) : 0
    if (d.kind === "cat") return totals.exp > 0 ? Math.round((d.value / totals.exp) * 100) : 0
    if (d.kind === "sub" && d.ci != null) {
      const ct = catTotal(cats[d.ci])
      return ct > 0 ? Math.round((d.value / ct) * 100) : 0
    }
    return 0
  }
  function ctxLabel(d: FlowInfo) {
    if (d.kind === "inc") return "vom Einkommen"
    if (d.kind === "cat") return "der Ausgaben"
    if (d.kind === "sub" && d.ci != null) return "von " + (cats[d.ci]?.name || "Kategorie")
    return ""
  }

  if (!graph.links.length || !layout) {
    return (
      <div className="flex min-h-[300px] items-center justify-center px-3 py-12 text-center text-sm text-muted-foreground">
        Geben Sie Einnahmen und Ausgaben ein, um den Geldfluss zu sehen.
      </div>
    )
  }

  type LaidOutNode = NodeDatum & { x0: number; x1: number; y0: number; y1: number; value: number }
  type LaidOutLink = Omit<LinkDatum, "source" | "target"> & {
    width: number
    source: LaidOutNode
    target: LaidOutNode
  }
  const linkPath = sankeyLinkHorizontal()
  const nodes = layout.nodes as unknown as LaidOutNode[]
  const links = layout.links as unknown as LaidOutLink[]

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block overflow-visible"
        onMouseLeave={() => {
          setTip(null)
          setHoverLink(null)
          setHoverNode(null)
        }}
      >
        <defs>
          {links.map((l, i) => (
            <linearGradient
              key={i}
              id={`bdgg${i}`}
              gradientUnits="userSpaceOnUse"
              x1={l.source.x1}
              x2={l.target.x0}
            >
              <stop offset="0%" stopColor={l.scol} />
              <stop offset="100%" stopColor={l.tcol} />
            </linearGradient>
          ))}
        </defs>

        {/* links */}
        <g fill="none">
          {links.map((l, i) => {
            const active =
              hoverLink === i ||
              (hoverNode != null && (l.source === nodes[hoverNode] || l.target === nodes[hoverNode]))
            const dimmed = (hoverLink != null && hoverLink !== i) || (hoverNode != null && !active)
            return (
              <path
                key={i}
                d={linkPath(l as never) || undefined}
                stroke={`url(#bdgg${i})`}
                strokeWidth={Math.max(1, l.width)}
                strokeOpacity={active ? 0.78 : dimmed ? 0.1 : 0.42}
                className="cursor-pointer transition-[stroke-opacity] duration-150"
                onMouseEnter={(e) => {
                  setHoverLink(i)
                  const rect = wrapRef.current?.getBoundingClientRect()
                  setTip({
                    x: e.clientX - (rect?.left ?? 0) + 14,
                    y: e.clientY - (rect?.top ?? 0) + 14,
                    html: `<b>${l.source.label} → ${l.target.label}</b><br>${formatCHF(l.value)} · ${pctOf(l)}% ${ctxLabel(l)}`,
                  })
                }}
                onMouseMove={(e) => {
                  const rect = wrapRef.current?.getBoundingClientRect()
                  setTip((t) =>
                    t ? { ...t, x: e.clientX - (rect?.left ?? 0) + 14, y: e.clientY - (rect?.top ?? 0) + 14 } : t,
                  )
                }}
              />
            )
          })}
        </g>

        {/* nodes */}
        <g>
          {nodes.map((n, i) => (
            <rect
              key={i}
              x={n.x0}
              y={n.y0}
              width={Math.max(1, n.x1 - n.x0)}
              height={Math.max(1, n.y1 - n.y0)}
              fill={n.color}
              rx={2}
              className="cursor-pointer"
              onMouseEnter={(e) => {
                setHoverNode(i)
                let io = 0
                let oo = 0
                links.forEach((l) => {
                  if (l.target === n) io += l.value
                  if (l.source === n) oo += l.value
                })
                const rect = wrapRef.current?.getBoundingClientRect()
                setTip({
                  x: e.clientX - (rect?.left ?? 0) + 14,
                  y: e.clientY - (rect?.top ?? 0) + 14,
                  html: `<b>${n.label}</b><br>${formatCHF(Math.max(io, oo))}`,
                })
              }}
            />
          ))}
        </g>

        {/* labels */}
        <g style={{ font: '600 12px var(--font-sans, system-ui)' }}>
          {nodes.map((n, i) => {
            const left = n.x0 < width / 2
            return (
              <text
                key={i}
                x={left ? n.x1 + 7 : n.x0 - 7}
                y={(n.y0 + n.y1) / 2}
                dy="0.32em"
                textAnchor={left ? "start" : "end"}
                fill="var(--foreground)"
              >
                <tspan style={{ fontWeight: 700 }}>{n.label}</tspan>
                <tspan dx={6} fill="var(--muted-foreground)">
                  {formatCHF(n.value || 0)}
                </tspan>
              </text>
            )
          })}
        </g>
      </svg>

      {tip ? (
        <div
          className="pointer-events-none absolute z-50 max-w-[250px] rounded-lg bg-foreground px-2.5 py-1.5 text-xs leading-relaxed text-background shadow-lg"
          style={{ left: tip.x, top: tip.y }}
          dangerouslySetInnerHTML={{ __html: tip.html }}
        />
      ) : null}
    </div>
  )
}
