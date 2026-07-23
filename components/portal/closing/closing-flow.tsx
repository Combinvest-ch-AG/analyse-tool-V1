"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Gift,
  Loader2,
  Sparkles,
} from "lucide-react"
import { saveClosing } from "@/app/actions/portal"

export type ClosingArea = {
  key: string
  name: string
  score: number
  status: "open" | "progress" | "done"
  recommendation: string
}

export type ClosingAppointment = {
  date?: string
  time?: string
  place?: string
  purpose?: string
}

const STATUS_META: Record<ClosingArea["status"], { label: string; cls: string }> = {
  open: { label: "Offen", cls: "bg-muted text-muted-foreground" },
  progress: { label: "In Arbeit", cls: "bg-primary/10 text-primary" },
  done: { label: "Erledigt", cls: "bg-success/10 text-success" },
}

const CONFIRMATIONS = [
  "Analyse und offene Empfehlungen wurden mit dem Kunden besprochen.",
  "Benötigte Dokumente und Unterschriften sind erstellt oder als nicht erforderlich bestätigt.",
  "Nächste Schritte und Folgetermin sind festgehalten.",
]

export function ClosingFlow({
  analysisId,
  customerName,
  answeredCount,
  totalQuestions,
  contractCount,
  areas,
  hasReferral,
  hasDocuments,
  initialAppointment,
  initialConfirmations,
  completedAt,
  isCompleted,
}: {
  analysisId: string
  customerName: string
  answeredCount: number
  totalQuestions: number
  contractCount: number
  areas: ClosingArea[]
  hasReferral: boolean
  hasDocuments: boolean
  initialAppointment: ClosingAppointment
  initialConfirmations: boolean[]
  completedAt: string | null
  isCompleted: boolean
}) {
  const router = useRouter()
  const [appt, setAppt] = useState<ClosingAppointment>(initialAppointment)
  const [apptSaved, setApptSaved] = useState(false)
  const [confirms, setConfirms] = useState<boolean[]>(
    CONFIRMATIONS.map((_, i) => initialConfirmations[i] ?? false),
  )
  const [done, setDone] = useState(isCompleted || Boolean(completedAt))
  const [error, setError] = useState<string | null>(null)
  const [savingAppt, startApptSave] = useTransition()
  const [finishing, startFinish] = useTransition()

  const openAreas = areas.filter((a) => a.status !== "done").sort((a, b) => b.score - a.score)
  const doneThemes = areas.filter((a) => a.status === "done")
  const profilingDone = answeredCount >= totalQuestions
  const allConfirmed = confirms.every(Boolean)

  const progressItems = [
    profilingDone,
    contractCount > 0,
    openAreas.length === 0,
    hasDocuments,
    Boolean(appt.date),
  ]
  const progressPct = Math.round((progressItems.filter(Boolean).length / progressItems.length) * 100)

  function saveAppointment() {
    setError(null)
    startApptSave(async () => {
      const res = await saveClosing({ analysisId, closing: { appointment: appt } })
      if (res.ok) {
        setApptSaved(true)
        setTimeout(() => setApptSaved(false), 2500)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  function finish() {
    if (!allConfirmed) return
    setError(null)
    startFinish(async () => {
      const res = await saveClosing({
        analysisId,
        closing: { appointment: appt, confirmations: confirms },
        complete: true,
      })
      if (res.ok) {
        setDone(true)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/analyse/${analysisId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Zur Risikoanalyse
      </Link>

      {/* Header with integrated progress */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Letzter Schritt der Beratung</p>
            <h1 className="mt-1 text-2xl font-extrabold text-foreground">Beratung abschliessen</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Prüfen Sie die Beratung mit {customerName}, klären Sie offene Punkte und erstellen Sie die Unterlagen für
              Kunde und Innendienst.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              done ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
            {done ? "Abgeschlossen" : "Abschluss offen"}
          </span>
        </div>
        <div className="border-t border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center justify-between text-xs">
            <strong className="font-bold text-foreground">Vorbereitung des Abschlusses</strong>
            <span className="font-semibold text-muted-foreground">{progressPct}% bereit</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Main column */}
        <div className="flex flex-col gap-3">
          {/* 1 – Beratung prüfen */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <SectionHead n={1} title="Beratung prüfen" desc="Profiling, Vertragscheck und bearbeitete Themen auf einen Blick." />
            <div className="mt-4 grid gap-2">
              <ReviewRow
                ok={profilingDone}
                title="Profiling"
                detail={`${answeredCount} von ${totalQuestions} Fragen beantwortet`}
              />
              <ReviewRow
                ok={contractCount > 0}
                title="Vertragscheck"
                detail={contractCount > 0 ? `${contractCount} Verträge erfasst` : "Noch keine Verträge erfasst"}
              />
            </div>
            {doneThemes.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Erledigte Themen</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {doneThemes.map((t) => (
                    <span key={t.key} className="inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                      <Check className="h-3 w-3" /> {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/analyse/${analysisId}`} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                Risikoanalyse öffnen
              </Link>
            </div>
          </section>

          {/* 2 – Offene Punkte */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <SectionHead
              n={2}
              title="Offene Punkte klären"
              desc="Diese Themen sollten weiterbearbeitet oder bewusst zurückgestellt werden."
              badge={
                openAreas.length === 0
                  ? { label: "Alles geklärt", cls: "bg-success/10 text-success" }
                  : { label: `${openAreas.length} offen`, cls: "bg-muted text-muted-foreground" }
              }
            />
            {openAreas.length === 0 ? (
              <p className="mt-4 rounded-xl bg-success/5 px-4 py-3 text-sm font-semibold text-success">
                Alle relevanten Themen sind als erledigt markiert.
              </p>
            ) : (
              <div className="mt-4 grid gap-2">
                {openAreas.map((a) => (
                  <div key={a.key} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3.5">
                    <div>
                      <p className="text-sm font-bold text-foreground">{a.name}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{a.recommendation}</p>
                    </div>
                    <span className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_META[a.status].cls}`}>
                      {STATUS_META[a.status].label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 3 – Dokumente */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <SectionHead
              n={3}
              title="Dokumente und Unterschriften"
              desc="Beratungsbericht und erforderliche Dokumente versandbereit erstellen."
              badge={
                hasDocuments
                  ? { label: "Erstellt", cls: "bg-success/10 text-success" }
                  : { label: "Fehlt", cls: "bg-destructive/10 text-destructive" }
              }
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/analyse/${analysisId}/dokumente`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-deep"
              >
                <FileText className="h-3.5 w-3.5" /> Dokumente erstellen
              </Link>
              <a
                href={`/analyse/${analysisId}/report.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <FileText className="h-3.5 w-3.5" /> Beratungsbericht als PDF
              </a>
            </div>
          </section>
        </div>

        {/* Side column */}
        <div className="flex flex-col gap-3">
          {/* 4 – Nächster Termin */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <SectionHead
              n={4}
              title="Nächster Termin"
              desc="Die konkrete Weiterführung der Beratung festhalten."
              badge={
                appt.date
                  ? { label: "Vorgemerkt", cls: "bg-success/10 text-success" }
                  : { label: "Offen", cls: "bg-muted text-muted-foreground" }
              }
            />
            <div className="mt-4 grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Datum">
                  <input type="date" value={appt.date ?? ""} onChange={(e) => setAppt({ ...appt, date: e.target.value })} className={INPUT} />
                </Field>
                <Field label="Uhrzeit">
                  <input type="time" value={appt.time ?? ""} onChange={(e) => setAppt({ ...appt, time: e.target.value })} className={INPUT} />
                </Field>
              </div>
              <Field label="Ort oder Kanal">
                <input value={appt.place ?? ""} onChange={(e) => setAppt({ ...appt, place: e.target.value })} placeholder="Büro, Telefon oder Video" className={INPUT} />
              </Field>
              <Field label="Ziel des Termins">
                <textarea value={appt.purpose ?? ""} onChange={(e) => setAppt({ ...appt, purpose: e.target.value })} placeholder="Was wird beim nächsten Termin entschieden?" className={`${INPUT} min-h-20 resize-y`} />
              </Field>
              <button
                type="button"
                onClick={saveAppointment}
                disabled={savingAppt}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-60"
              >
                {savingAppt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                {apptSaved ? "Vorgemerkt" : "Termin vormerken"}
              </button>
            </div>
          </section>

          {/* Sealth + Empfehlung */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <SectionHead
              n="+"
              title="Sealth und Empfehlung"
              desc="Optionalen Service-Vorteil oder eine Weiterempfehlung erfassen."
              badge={
                hasReferral
                  ? { label: "Erfasst", cls: "bg-success/10 text-success" }
                  : { label: "Optional", cls: "bg-muted text-muted-foreground" }
              }
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/sealth" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                <Sparkles className="h-3.5 w-3.5" /> Sealth prüfen
              </Link>
              <Link href={`/analyse/${analysisId}/empfehlung`} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted">
                <Gift className="h-3.5 w-3.5" /> Empfehlung erfassen
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* 5 – Final */}
      <section className="mt-3 rounded-2xl border border-border bg-card p-6">
        <SectionHead
          n={5}
          title="Beratung verbindlich abschliessen"
          desc="Bestätigen Sie gemeinsam, dass der Beratungsstand vollständig dokumentiert wurde."
        />
        <div className="mt-4 grid gap-2">
          {CONFIRMATIONS.map((label, i) => (
            <label key={i} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3.5">
              <input
                type="checkbox"
                checked={confirms[i]}
                disabled={done}
                onChange={(e) => setConfirms(confirms.map((c, j) => (j === i ? e.target.checked : c)))}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={finish}
            disabled={!allConfirmed || finishing || done}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {done ? "Beratung abgeschlossen" : "Beratung verbindlich abschliessen"}
          </button>
          {!done && (
            <span className="text-xs text-muted-foreground">
              {allConfirmed ? "Bereit zum Abschluss" : "Alle drei Bestätigungen erforderlich"}
            </span>
          )}
        </div>
      </section>
    </div>
  )
}

const INPUT =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function SectionHead({
  n,
  title,
  desc,
  badge,
}: {
  n: number | string
  title: string
  desc: string
  badge?: { label: string; cls: string }
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
          {n}
        </span>
        <div>
          <h2 className="text-base font-bold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
      {badge && <span className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.cls}`}>{badge.label}</span>}
    </div>
  )
}

function ReviewRow({ ok, title, detail }: { ok: boolean; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3.5">
      {ok ? <CheckCircle2 className="h-5 w-5 flex-none text-success" /> : <Circle className="h-5 w-5 flex-none text-muted-foreground" />}
      <div>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}
