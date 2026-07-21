"use client"

import { useEffect, useRef } from "react"
import { AREAS, RELEVANCE_COLORS, RELEVANCE_LABELS, scores, type WizardAnswers } from "@/lib/wizard/schema"

export function AreaTachos({ answers }: { answers: WizardAnswers }) {
  const s = scores(answers)
  const prev = useRef<Record<string, number>>({})
  const ringRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Trigger the "bump" pop whenever an individual score changes.
  useEffect(() => {
    for (const a of AREAS) {
      const v = s[a.key]
      const el = ringRefs.current[a.key]
      if (el && prev.current[a.key] !== undefined && prev.current[a.key] !== v) {
        el.classList.remove("cv-bump")
        void el.offsetWidth // reflow so the animation restarts
        el.classList.add("cv-bump")
      }
      prev.current[a.key] = v
    }
  })

  return (
    <div>
      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border sm:grid-cols-4">
        {AREAS.map((a) => {
          const v = s[a.key]
          return (
            <div
              key={a.key}
              className="flex flex-col items-center gap-2 border-b border-r border-border bg-card px-1.5 py-4 text-center last:border-r-0"
            >
              <div className="flex min-h-[28px] items-center text-[10.5px] font-extrabold uppercase leading-tight tracking-wide text-foreground">
                {a.name}
              </div>
              <div
                ref={(el) => {
                  ringRefs.current[a.key] = el
                }}
                className="cv-ring"
                style={
                  {
                    "--cv-c": RELEVANCE_COLORS[v],
                    "--cv-p": (v / 5).toFixed(3),
                  } as React.CSSProperties
                }
              >
                <span>{RELEVANCE_LABELS[v]}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] leading-tight text-muted-foreground">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: RELEVANCE_COLORS[5] }} />
        Die Ringe zeigen live den Handlungsbedarf je Lebensbereich — abgeleitet aus den Antworten.
      </div>
    </div>
  )
}
