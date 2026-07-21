"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react"
import {
  WIZARD_STEPS,
  progressPercent,
  needScore,
  countAnswered,
  TOTAL_QUESTIONS,
  type WizardAnswers,
} from "@/lib/wizard/schema"
import { WizardField } from "@/components/portal/wizard/wizard-field"
import { NeedGauge } from "@/components/portal/wizard/need-gauge"
import { saveAnalysisSnapshot, getAnalysisLockVersion } from "@/app/actions/portal"

type SaveStatus = "idle" | "saving" | "saved" | "conflict" | "error"

export function AnalysisWizard({
  analysisId,
  customerId,
  customerName,
  initialAnswers,
  initialStep,
  initialLockVersion,
  isCompleted,
}: {
  analysisId: string
  customerId: string
  customerName: string
  initialAnswers: WizardAnswers
  initialStep: number
  initialLockVersion: number
  isCompleted: boolean
}) {
  const router = useRouter()
  const [answers, setAnswers] = useState<WizardAnswers>(initialAnswers)
  const [stepIndex, setStepIndex] = useState(Math.min(Math.max(initialStep - 1, 0), WIZARD_STEPS.length - 1))
  const [status, setStatus] = useState<SaveStatus>("idle")
  const [completing, setCompleting] = useState(false)

  const lockVersion = useRef(initialLockVersion)
  const answersRef = useRef(answers)
  const stepRef = useRef(stepIndex)
  answersRef.current = answers
  stepRef.current = stepIndex
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Serialize all writes so a manual save can never race the debounced
  // autosave and self-conflict on the optimistic lock version.
  const saveChain = useRef<Promise<boolean>>(Promise.resolve(true))

  const step = WIZARD_STEPS[stepIndex]
  const gauge = needScore(answers)
  const progress = progressPercent(answers)
  const answered = countAnswered(answers)

  // One save attempt. Never throws; always resolves to a boolean.
  const persistOnce = useCallback(
    async (complete: boolean): Promise<boolean> => {
      const currentAnswers = answersRef.current
      setStatus("saving")
      const result = await saveAnalysisSnapshot({
        analysisId,
        expectedLockVersion: lockVersion.current,
        step: stepRef.current + 1,
        question: countAnswered(currentAnswers),
        progress: progressPercent(currentAnswers),
        snapshot: { answers: currentAnswers, need_score: needScore(currentAnswers) },
        complete,
      })
      if (result.ok) {
        lockVersion.current = result.lockVersion
        setStatus("saved")
        return true
      }
      if (result.conflict) {
        // Another writer advanced the row. Reconcile the lock version from the
        // server and retry once so the advisor never hits a dead end.
        const fresh = await getAnalysisLockVersion(analysisId)
        if (fresh != null && fresh !== lockVersion.current) {
          lockVersion.current = fresh
          const retry = await saveAnalysisSnapshot({
            analysisId,
            expectedLockVersion: lockVersion.current,
            step: stepRef.current + 1,
            question: countAnswered(currentAnswers),
            progress: progressPercent(currentAnswers),
            snapshot: { answers: currentAnswers, need_score: needScore(currentAnswers) },
            complete,
          })
          if (retry.ok) {
            lockVersion.current = retry.lockVersion
            setStatus("saved")
            return true
          }
        }
        setStatus("conflict")
        return false
      }
      setStatus("error")
      return false
    },
    [analysisId],
  )

  // Enqueue a save onto the serialized chain.
  const persist = useCallback(
    (complete = false): Promise<boolean> => {
      const next = saveChain.current.catch(() => false).then(() => persistOnce(complete))
      saveChain.current = next
      return next
    },
    [persistOnce],
  )

  // Debounced autosave whenever answers change.
  useEffect(() => {
    if (isCompleted) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void persist(false)
    }, 800)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers])

  function setAnswer(key: string, value: WizardAnswers[string]) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  // Navigation is optimistic: advance immediately, persist in the background.
  function goToStep(next: number) {
    if (timer.current) clearTimeout(timer.current)
    setStepIndex(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
    if (!isCompleted) void persist(false)
  }

  async function complete() {
    setCompleting(true)
    if (timer.current) clearTimeout(timer.current)
    const ok = await persist(true)
    setCompleting(false)
    if (ok) router.push(`/kunde/${customerId}`)
  }

  const isLast = stepIndex === WIZARD_STEPS.length - 1

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main column */}
      <div>
        {/* Stepper */}
        <div className="mb-6 flex items-center gap-2">
          {WIZARD_STEPS.map((s, i) => {
            const done = i < stepIndex
            const active = i === stepIndex
            return (
              <div key={s.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(i)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </button>
                <span className={`hidden text-sm font-semibold sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.title}
                </span>
                {i < WIZARD_STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
              </div>
            )
          })}
        </div>

        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{step.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{step.subtitle}</p>
        </div>

        <div className="flex flex-col gap-4">
          {step.questions.map((q) => (
            <WizardField
              key={q.key}
              question={q}
              value={answers[q.key] ?? null}
              onChange={(v) => setAnswer(q.key, v)}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goToStep(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={complete}
              disabled={completing || isCompleted}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[#245bd2] disabled:opacity-60"
            >
              {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isCompleted ? "Abgeschlossen" : "Analyse abschließen"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(stepIndex + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-[#245bd2]"
            >
              Weiter
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Context panel */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kunde</p>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{customerName}</p>

          <div className="mt-5">
            <NeedGauge value={gauge} />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Fortschritt</span>
              <span>
                {answered}/{TOTAL_QUESTIONS}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4">
            <SaveIndicator status={status} onRetry={() => router.refresh()} />
          </div>

          <Link
            href={`/kunde/${customerId}`}
            className="mt-5 block text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Zum Kundenprofil
          </Link>
        </div>
      </aside>
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
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive"
      >
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
