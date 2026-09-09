"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, Cloud, CloudOff, Gift, Loader2, RefreshCw } from "lucide-react"
import {
  QUESTIONS,
  PROFILING_SCHEMA_VERSION,
  countAnswered,
  isAnswered,
  isQuestionVisible,
  needScore,
  progressPercent,
  visibleQuestionCount,
  type AreaKey,
  type Contracts,
  type ThemeStatus,
  type WizardAnswers,
} from "@/lib/wizard/schema"
import { WizardField } from "@/components/portal/wizard/wizard-field"
import { AreaTachos } from "@/components/portal/wizard/area-tachos"
import { ContractCheck } from "@/components/portal/wizard/contract-check"
import { RiskCockpit } from "@/components/portal/wizard/risk-cockpit"
import { saveAnalysisSnapshot, getAnalysisLockVersion } from "@/app/actions/portal"

type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error"

const STEPS = [
  { id: "profiling", title: "Profiling" },
  { id: "vertragscheck", title: "Vertragscheck" },
  { id: "auswertung", title: "Auswertung" },
]

function profilingSection(index: number): string {
  if (index <= 3) return "Person & Gesundheit"
  if (index <= 9) return "Familie & Haushalt"
  if (index <= 12) return "Wohnen & Hintergrund"
  if (index <= 14) return "Arbeit & Einkommen"
  return "Absicherung & Ziele"
}

function adjacentVisibleQuestion(from: number, direction: 1 | -1, answers: WizardAnswers): number | null {
  for (let index = from + direction; index >= 0 && index < QUESTIONS.length; index += direction) {
    if (isQuestionVisible(QUESTIONS[index], answers)) return index
  }
  return null
}

function initialVisibleQuestion(index: number, answers: WizardAnswers): number {
  const safe = Math.min(Math.max(index, 0), QUESTIONS.length - 1)
  if (isQuestionVisible(QUESTIONS[safe], answers)) return safe
  return adjacentVisibleQuestion(safe, 1, answers) ?? adjacentVisibleQuestion(safe, -1, answers) ?? 0
}

export function AnalysisWizard({
  analysisId,
  customerId,
  customerName,
  initialAnswers,
  initialContracts,
  initialThemeStatus,
  initialStep,
  initialQuestion,
  initialLockVersion,
  isCompleted,
}: {
  analysisId: string
  customerId: string
  customerName: string
  initialAnswers: WizardAnswers
  initialContracts: Contracts
  initialThemeStatus: Record<string, ThemeStatus>
  initialStep: number
  initialQuestion: number
  initialLockVersion: number
  isCompleted: boolean
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<WizardAnswers>(initialAnswers)
  const [contracts, setContracts] = useState<Contracts>(initialContracts)
  const [themeStatus, setThemeStatus] = useState<Record<string, ThemeStatus>>(initialThemeStatus)
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), 3))
  const [qi, setQi] = useState(() => initialVisibleQuestion(initialQuestion, initialAnswers))
  const [status, setStatus] = useState<SaveStatus>(isCompleted ? "saved" : "idle")
  const [completing, setCompleting] = useState(false)

  const lockVersion = useRef(initialLockVersion)
  const answersRef = useRef(answers)
  const contractsRef = useRef(contracts)
  const themeRef = useRef(themeStatus)
  const stepRef = useRef(step)
  const qiRef = useRef(qi)
  answersRef.current = answers
  contractsRef.current = contracts
  themeRef.current = themeStatus
  stepRef.current = step
  qiRef.current = qi
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Serialize writes so a manual save never races the debounced autosave and
  // self-conflicts on the optimistic lock version.
  const saveChain = useRef<Promise<boolean>>(Promise.resolve(true))
  // Circuit breaker: if saves keep failing (e.g. the row was deleted, the
  // session is stale, or a persistent conflict), STOP autosaving instead of
  // retrying forever. A runaway retry loop was the source of ~2k aborted
  // transactions/sec hammering the database.
  const failureCount = useRef(0)
  const MAX_CONSECUTIVE_FAILURES = 3
  const [autosaveHalted, setAutosaveHalted] = useState(false)
  const haltedRef = useRef(false)
  haltedRef.current = autosaveHalted

  const buildSnapshot = () => ({
    answers: answersRef.current,
    contracts: contractsRef.current,
    themeStatus: themeRef.current,
    need_score: needScore(answersRef.current),
    profiling_schema_version: PROFILING_SCHEMA_VERSION,
  })

  const persistOnce = useCallback(
    async (complete: boolean, writeRevision: boolean): Promise<boolean> => {
      // Circuit breaker tripped: refuse to keep calling the API.
      if (haltedRef.current) return false

      setStatus("saving")
      const payload = {
        analysisId,
        expectedLockVersion: lockVersion.current,
        step: stepRef.current,
        question: qiRef.current,
        progress: progressPercent(answersRef.current),
        snapshot: buildSnapshot(),
        complete,
        // Milestones (completion, step transitions) keep an immutable revision;
        // frequent autosaves do not, to avoid revision/index write churn.
        writeRevision: writeRevision || complete,
      }
      const result = await saveAnalysisSnapshot(payload)
      if (result.ok) {
        lockVersion.current = result.lockVersion
        failureCount.current = 0
        setStatus("saved")
        return true
      }

      // A conflict gets exactly ONE reconciliation attempt with a fresh lock
      // version — never an unbounded retry.
      if (result.conflict) {
        const fresh = await getAnalysisLockVersion(analysisId)
        if (fresh != null && fresh !== lockVersion.current) {
          lockVersion.current = fresh
          const retry = await saveAnalysisSnapshot({ ...payload, expectedLockVersion: lockVersion.current })
          if (retry.ok) {
            lockVersion.current = retry.lockVersion
            failureCount.current = 0
            setStatus("saved")
            return true
          }
        }
      }

      // Any unresolved failure (conflict or error) counts toward the breaker.
      failureCount.current += 1
      if (failureCount.current >= MAX_CONSECUTIVE_FAILURES) {
        setAutosaveHalted(true)
      }
      setStatus(result.conflict ? "conflict" : "error")
      return false
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysisId],
  )

  const persist = useCallback(
    (complete = false, writeRevision = false): Promise<boolean> => {
      const next = saveChain.current.catch(() => false).then(() => persistOnce(complete, writeRevision))
      saveChain.current = next
      return next
    },
    [persistOnce],
  )

  // Debounced autosave whenever answers / contracts / statuses change. A longer
  // debounce collapses rapid edits into a single write, cutting DB load.
  useEffect(() => {
    if (isCompleted || autosaveHalted) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      // Never autosave from a backgrounded tab — a stale/hidden tab looping
      // saves was exactly the pathological pattern we are guarding against.
      if (typeof document !== "undefined" && document.hidden) return
      void persist(false, false)
    }, 2500)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, contracts, themeStatus, autosaveHalted])

  function setQuestionAnswer(key: string, value: WizardAnswers[string]) {
    const question = QUESTIONS.find((item) => item.id === key)
    setAnswers((prev) => {
      const next = { ...prev, [key]: value }
      if (!question?.details) return next
      const selected = Array.isArray(value) ? value : value == null ? [] : [String(value)]
      for (const detail of question.details) {
        if (!detail.showWhen.some((item) => selected.includes(item))) delete next[detail.id]
      }
      for (const dependent of QUESTIONS) {
        if (dependent.visibleWhen?.id !== key) continue
        if (!dependent.visibleWhen.values.some((item) => selected.includes(item))) delete next[dependent.id]
      }
      return next
    })
  }

  function setDetailAnswer(key: string, value: WizardAnswers[string]) {
    setAnswers((prev) => {
      const next = { ...prev, [key]: value }
      if (key === "kinder_anzahl") {
        const count = Math.max(0, Number(value) || 0)
        const ages = Array.isArray(prev.kinder_alter) ? prev.kinder_alter : []
        next.kinder_alter = ages.slice(0, count)
      }
      return next
    })
  }

  function goToStep(next: number) {
    if (next < 1 || next > 3) return
    if (timer.current) clearTimeout(timer.current)
    stepRef.current = next
    setStep(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
    // A step transition is a milestone → keep a revision snapshot.
    if (!isCompleted) void persist(false, true)
  }

  const q = QUESTIONS[qi]
  const currentAnswered = isAnswered(q, answers)

  function nextQuestion() {
    if (!currentAnswered) return
    const next = adjacentVisibleQuestion(qi, 1, answers)
    if (next != null) {
      qiRef.current = next
      setQi(next)
      if (!isCompleted) void persist(false)
    } else {
      goToStep(2)
    }
  }
  function prevQuestion() {
    const previous = adjacentVisibleQuestion(qi, -1, answers)
    if (previous != null) {
      qiRef.current = previous
      setQi(previous)
      if (!isCompleted) void persist(false)
    }
  }

  async function complete() {
    setCompleting(true)
    if (timer.current) clearTimeout(timer.current)
    const ok = await persist(true)
    setCompleting(false)
    if (ok) router.push(`/kunde/${customerId}`)
  }

  const gauge = needScore(answers)
  const progress = progressPercent(answers)
  const answered = countAnswered(answers)
  const visibleQuestions = visibleQuestionCount(answers)
  const visibleQuestionIndices = QUESTIONS.reduce<number[]>((indices, question, index) => {
    if (isQuestionVisible(question, answers)) indices.push(index)
    return indices
  }, [])
  const visibleQuestionNumber = Math.max(1, visibleQuestionIndices.indexOf(qi) + 1)
  const hasNextQuestion = adjacentVisibleQuestion(qi, 1, answers) != null

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1
          const active = n === step
          const done = n < step
          return (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => goToStep(n)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : n}
              </button>
              <span
                className={`hidden text-sm font-semibold sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s.title}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Question card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-2 flex justify-between text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">
              <span>Profiling · {profilingSection(qi)}</span>
              <span>
                {visibleQuestionNumber}/{visibleQuestions}
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(visibleQuestionNumber / Math.max(1, visibleQuestions)) * 100}%` }}
              />
            </div>

            <h2 className="mt-5 text-xl font-extrabold tracking-tight text-foreground">
              {visibleQuestionNumber}. {q.t}
            </h2>
            {q.sub && <p className="mt-1 text-[13px] text-muted-foreground">{q.sub}</p>}

            <div className="mt-5">
              <WizardField
                question={q}
                value={answers[q.id] ?? null}
                answers={answers}
                onChange={(v) => setQuestionAnswer(q.id, v)}
                onDetailChange={setDetailAnswer}
              />
              {!currentAnswered && answers[q.id] != null ? (
                <p className="mt-3 text-xs font-semibold text-destructive">
                  Bitte die markierten Detailfelder ergänzen.
                </p>
              ) : null}
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={prevQuestion}
                disabled={qi === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Zurück
              </button>
              <button
                type="button"
                onClick={nextQuestion}
                disabled={!currentAnswered}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-deep disabled:opacity-50"
              >
                {hasNextQuestion ? "Weiter" : "Zum Vertragscheck"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Live tachos */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Live-Relevanzprofil
              </span>
            </div>
            <AreaTachos answers={answers} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Vertragscheck</p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-foreground">Bestehende Verträge</h2>
          <p className="mt-1 max-w-prose text-[15px] text-muted-foreground">
            Tippen Sie die bestehenden Produkte des Kunden an und erfassen Sie Gesellschaft, Prämie und Ablauf.
          </p>
          <div className="mt-6">
            <ContractCheck contracts={contracts} onChange={setContracts} />
          </div>
          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Profiling
            </button>
            <button
              type="button"
              onClick={() => goToStep(3)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-deep"
            >
              Zur Auswertung
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Auswertung</p>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-foreground">Risiko-Cockpit</h2>
          <p className="mt-1 max-w-prose text-[15px] text-muted-foreground">
            Die Lebensbereiche sind nach Relevanz sortiert — abgeleitet aus dem Profiling. Halten Sie den
            Bearbeitungsstatus je Bereich fest.
          </p>
          <div className="mt-6">
            <RiskCockpit
              answers={answers}
              contracts={contracts}
              themeStatus={themeStatus}
              onStatusChange={(key: AreaKey, s) => setThemeStatus((prev) => ({ ...prev, [key]: s }))}
              analysisId={analysisId}
              customerId={customerId}
            />
          </div>
          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToStep(2)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zum Vertragscheck
            </button>
            <div className="flex items-center gap-3">
              <Link
                href={`/analyse/${analysisId}/empfehlung`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <Gift className="h-4 w-4" />
                Weiterempfehlen
              </Link>
              <Link
                href={`/analyse/${analysisId}/abschluss`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-deep"
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {isCompleted ? "Abgeschlossen" : "Zum Beratungsabschluss"}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer status bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kunde</p>
            <p className="truncate text-sm font-semibold text-foreground">{customerName}</p>
          </div>
          <div className="min-w-[120px]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Handlungsbedarf</span>
              <span>{gauge}%</span>
            </div>
            <div className="mt-1.5 h-2 w-32 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${gauge}%` }} />
            </div>
          </div>
          <div className="min-w-[110px]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Fortschritt</span>
              <span>
                {answered}/{visibleQuestions}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-28 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <SaveIndicator
            status={status}
            onRetry={() => {
              // Full reload guarantees a fresh lock version AND resets the
              // autosave circuit breaker, rather than leaving stale client state.
              if (typeof window !== "undefined") window.location.reload()
            }}
          />
          <Link
            href={`/kunde/${customerId}`}
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Zum Kundenprofil
          </Link>
        </div>
      </div>
    </div>
  )
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Speichert …
      </span>
    )
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#08784a]">
        <Cloud className="h-3.5 w-3.5" /> Automatisch gespeichert
      </span>
    )
  if (status === "conflict")
    return (
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive">
        <RefreshCw className="h-3.5 w-3.5" /> Konflikt – neu laden
      </button>
    )
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
        <CloudOff className="h-3.5 w-3.5" /> Speichern fehlgeschlagen
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <Cloud className="h-3.5 w-3.5" /> Änderungen werden automatisch gespeichert
    </span>
  )
}
