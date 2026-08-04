"use client"

import { useMemo, useState } from "react"
import { RotateCcw, ArrowRight } from "lucide-react"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"

type Dimension = "risk" | "horizon" | "knowledge"

type Answer = { label: string; scores: Partial<Record<Dimension, number>> }
type Question = { id: string; dimension: Dimension; question: string; answers: Answer[] }

const QUESTIONS: Question[] = [
  {
    id: "q1",
    dimension: "risk",
    question: "Wie würden Sie auf einen Wertverlust von 20 % in Ihrem Portfolio reagieren?",
    answers: [
      { label: "Ich verkaufe sofort, um weitere Verluste zu vermeiden", scores: { risk: 0 } },
      { label: "Ich werde nervös und schichte teilweise um", scores: { risk: 1 } },
      { label: "Ich bleibe investiert und warte ab", scores: { risk: 2 } },
      { label: "Ich kaufe nach, weil die Preise günstiger sind", scores: { risk: 3 } },
    ],
  },
  {
    id: "q2",
    dimension: "risk",
    question: "Welche Aussage beschreibt Ihre Erwartung an eine Anlage am besten?",
    answers: [
      { label: "Kapitalerhalt steht über allem", scores: { risk: 0 } },
      { label: "Etwas Rendite bei geringem Risiko", scores: { risk: 1 } },
      { label: "Solide Rendite, moderate Schwankungen sind ok", scores: { risk: 2 } },
      { label: "Maximale Rendite, hohe Schwankungen akzeptiere ich", scores: { risk: 3 } },
    ],
  },
  {
    id: "q3",
    dimension: "horizon",
    question: "Wie lange können Sie das investierte Geld voraussichtlich anlegen?",
    answers: [
      { label: "Weniger als 3 Jahre", scores: { horizon: 0 } },
      { label: "3 bis 6 Jahre", scores: { horizon: 1 } },
      { label: "7 bis 12 Jahre", scores: { horizon: 2 } },
      { label: "Mehr als 12 Jahre", scores: { horizon: 3 } },
    ],
  },
  {
    id: "q4",
    dimension: "horizon",
    question: "Wie wahrscheinlich benötigen Sie das Geld kurzfristig unerwartet?",
    answers: [
      { label: "Sehr wahrscheinlich", scores: { horizon: 0 } },
      { label: "Eher wahrscheinlich", scores: { horizon: 1 } },
      { label: "Eher unwahrscheinlich", scores: { horizon: 2 } },
      { label: "Ich habe einen separaten Notgroschen", scores: { horizon: 3 } },
    ],
  },
  {
    id: "q5",
    dimension: "knowledge",
    question: "Wie schätzen Sie Ihre Erfahrung mit Anlagen ein?",
    answers: [
      { label: "Keine Erfahrung", scores: { knowledge: 0 } },
      { label: "Grundkenntnisse (Sparkonto, Fonds)", scores: { knowledge: 1 } },
      { label: "Erfahren (Aktien, ETF, Vorsorge 3a)", scores: { knowledge: 2 } },
      { label: "Sehr erfahren (aktives Trading, Derivate)", scores: { knowledge: 3 } },
    ],
  },
  {
    id: "q6",
    dimension: "knowledge",
    question: "Wie gut kennen Sie den Zusammenhang von Risiko und Rendite?",
    answers: [
      { label: "Gar nicht", scores: { knowledge: 0 } },
      { label: "Ungefähr", scores: { knowledge: 1 } },
      { label: "Gut", scores: { knowledge: 2 } },
      { label: "Sehr gut, ich beobachte Märkte regelmässig", scores: { knowledge: 3 } },
    ],
  },
  {
    id: "q7",
    dimension: "risk",
    question: "Welcher Anteil Ihres Vermögens soll in schwankende Anlagen fliessen?",
    answers: [
      { label: "0 – 10 %", scores: { risk: 0 } },
      { label: "10 – 30 %", scores: { risk: 1 } },
      { label: "30 – 60 %", scores: { risk: 2 } },
      { label: "Mehr als 60 %", scores: { risk: 3 } },
    ],
  },
  {
    id: "q8",
    dimension: "horizon",
    question: "Was ist Ihr wichtigstes Anlageziel?",
    answers: [
      { label: "Sicherheit und jederzeitige Verfügbarkeit", scores: { horizon: 0, risk: 0 } },
      { label: "Werterhalt mit Inflationsschutz", scores: { horizon: 1, risk: 1 } },
      { label: "Vermögensaufbau über die Zeit", scores: { horizon: 2, risk: 2 } },
      { label: "Langfristiges Wachstum für Vorsorge/Erbe", scores: { horizon: 3, risk: 2 } },
    ],
  },
]

const WEIGHTS: Record<Dimension, number> = { risk: 0.5, horizon: 0.3, knowledge: 0.2 }

type Profile = { name: string; range: [number, number]; equity: string; description: string }

const PROFILES: Profile[] = [
  { name: "Sicherheit", range: [0, 14], equity: "0 – 10 % Aktien", description: "Kapitalerhalt hat oberste Priorität. Der Fokus liegt auf sicheren, jederzeit verfügbaren Anlagen." },
  { name: "Einkommen", range: [15, 28], equity: "10 – 25 % Aktien", description: "Stetige Erträge mit geringen Schwankungen. Anleihen und Sparlösungen bilden den Kern." },
  { name: "Ausgewogen defensiv", range: [29, 43], equity: "25 – 40 % Aktien", description: "Ein solides Fundament mit vorsichtiger Beimischung von Wachstumsanlagen." },
  { name: "Ausgewogen", range: [44, 57], equity: "40 – 55 % Aktien", description: "Balance aus Sicherheit und Wachstum. Mittlere Schwankungen werden akzeptiert." },
  { name: "Wachstum", range: [58, 71], equity: "55 – 70 % Aktien", description: "Der Vermögensaufbau steht im Vordergrund. Kursschwankungen werden bewusst getragen." },
  { name: "Dynamisch", range: [72, 85], equity: "70 – 85 % Aktien", description: "Hoher Aktienanteil für langfristiges Wachstum. Grössere Schwankungen sind eingeplant." },
  { name: "Chance", range: [86, 100], equity: "85 – 100 % Aktien", description: "Maximales Renditepotenzial über einen langen Horizont. Volle Aktienquote und hohe Volatilität." },
]

function profileFor(score: number): Profile {
  return PROFILES.find((p) => score >= p.range[0] && score <= p.range[1]) ?? PROFILES[PROFILES.length - 1]
}

export function AnlegerprofilCalc({ ctx, saved }: { ctx?: CalcContext; saved?: SavedCalculatorPayload }) {
  const storedAnswers = saved?.answers && typeof saved.answers === "object" && !Array.isArray(saved.answers)
    ? saved.answers as Record<string, number>
    : {}
  const [answers, setAnswers] = useState<Record<string, number>>(storedAnswers)

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === QUESTIONS.length

  const result = useMemo(() => {
    const raw: Record<Dimension, number> = { risk: 0, horizon: 0, knowledge: 0 }
    const max: Record<Dimension, number> = { risk: 0, horizon: 0, knowledge: 0 }
    for (const q of QUESTIONS) {
      const dims = new Set<Dimension>([q.dimension])
      const picked = answers[q.id]
      // sum the max per dimension appearing in this question's answers
      const perDim: Record<string, number> = {}
      for (const a of q.answers) {
        for (const [d, v] of Object.entries(a.scores)) {
          perDim[d] = Math.max(perDim[d] ?? 0, v as number)
          dims.add(d as Dimension)
        }
      }
      for (const d of dims) max[d] += perDim[d] ?? 3
      if (picked != null) {
        const a = q.answers[picked]
        for (const [d, v] of Object.entries(a.scores)) raw[d as Dimension] += v as number
      }
    }
    const pct: Record<Dimension, number> = {
      risk: max.risk ? (raw.risk / max.risk) * 100 : 0,
      horizon: max.horizon ? (raw.horizon / max.horizon) * 100 : 0,
      knowledge: max.knowledge ? (raw.knowledge / max.knowledge) * 100 : 0,
    }
    const total = Math.round(pct.risk * WEIGHTS.risk + pct.horizon * WEIGHTS.horizon + pct.knowledge * WEIGHTS.knowledge)
    return { pct, total, profile: profileFor(total) }
  }, [answers])

  return (
    <>
      <CalcActionBar
        ctx={ctx ?? {}}
        calcKey="anlegerprofil"
        buildPayload={() => ({
          answers,
          score: result.total,
          profile: result.profile.name,
          equity: result.profile.equity,
          dimensions: result.pct,
        })}
        onReset={() => setAnswers({})}
      />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Questionnaire */}
      <div className="space-y-4">
        {QUESTIONS.map((q, i) => (
          <fieldset key={q.id} className="rounded-2xl border border-border bg-card p-5">
            <legend className="sr-only">{q.question}</legend>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <p className="text-sm font-semibold text-foreground">{q.question}</p>
            </div>
            <div className="mt-3 grid gap-2 pl-9">
              {q.answers.map((a, ai) => {
                const active = answers[q.id] === ai
                return (
                  <button
                    key={ai}
                    type="button"
                    onClick={() => setAnswers((s) => ({ ...s, [q.id]: ai }))}
                    aria-pressed={active}
                    className={`rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/5 font-semibold text-primary ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {a.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Result */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ihr Anlegerprofil</p>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={() => setAnswers({})}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen
              </button>
            )}
          </div>

          {allAnswered ? (
            <>
              <p className="mt-3 text-3xl font-bold text-foreground">{result.profile.name}</p>
              <p className="mt-1 text-sm font-semibold text-primary">{result.profile.equity}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.profile.description}</p>

              <div className="mt-5 rounded-2xl border border-border bg-background p-5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profil-Spektrum</span>
                    <p className="mt-1 text-xs text-muted-foreground">Von sicherheitsorientiert bis chancenorientiert</p>
                  </div>
                  <span className="text-2xl font-black tabular-nums text-foreground">{result.total}<small className="text-xs font-semibold text-muted-foreground">/100</small></span>
                </div>
                <div className="relative mt-5">
                  <div className="flex h-4 overflow-hidden rounded-full">
                    {PROFILES.map((profile, index) => (
                      <span
                        key={profile.name}
                        className="h-full border-r border-white/50 last:border-0"
                        style={{
                          width: `${profile.range[1] - profile.range[0] + (index === 0 ? 1 : 0)}%`,
                          background: ["#6B83A6", "#5B8FB9", "#4D9EB6", "#419E91", "#53A66B", "#D3A84D", "#E47A55"][index],
                        }}
                        title={`${profile.name}: ${profile.range[0]}–${profile.range[1]} Punkte`}
                      />
                    ))}
                  </div>
                  <span
                    className="absolute -top-2 h-8 w-1 -translate-x-1/2 rounded-full bg-foreground shadow-[0_0_0_3px_var(--card)] transition-[left] duration-500"
                    style={{ left: `${result.total}%` }}
                    aria-label={`Ihr Profilwert: ${result.total} von 100`}
                  />
                  <div className="mt-2 flex justify-between text-[10px] font-semibold text-muted-foreground">
                    <span>Sicherheit</span>
                    <span>Ausgewogen</span>
                    <span>Chance</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {([
                  ["Risikobereitschaft", result.pct.risk],
                  ["Anlagehorizont", result.pct.horizon],
                  ["Wissen & Erfahrung", result.pct.knowledge],
                ] as const).map(([label, val]) => (
                  <div key={label} className="rounded-xl border border-border bg-background px-3.5 py-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{label}</span>
                      <span className="font-extrabold tabular-nums text-primary">{Math.round(val)}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Beantworten Sie alle Fragen</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {answeredCount} von {QUESTIONS.length} beantwortet
              </p>
            </div>
          )}
        </div>

        <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
          Richtwert nach FIDLEG-Logik (Risiko 50 %, Horizont 30 %, Wissen 20 %). Ersetzt keine persönliche Anlageberatung.
        </p>
      </div>
      </div>
    </>
  )
}
