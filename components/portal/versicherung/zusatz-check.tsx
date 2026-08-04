"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"
import { InfoDialog, CoverageRow, SectionToggle, type CoverageInfo } from "@/components/portal/versicherung/coverage-ui"

const HOSPITAL: CoverageInfo = {
  id: "hospital",
  label: "Spitalzusatzversicherung",
  d: "Ergänzt bei stationären Behandlungen Komfort und Wahlmöglichkeiten über den Standard der allgemeinen Abteilung hinaus.",
  a: "Je nach Stufe freie oder erweiterte Arztwahl, Ein- oder Zweibettzimmer sowie Abdeckung bestimmter Mehrkosten bei der Spitalwahl.",
  w: "Spitalliste, Vertragskliniken, Kostenbeteiligung bei Flex-Modellen, Gesundheitsprüfung und Ausschlüsse prüfen.",
}

const HOSPITAL_LEVELS: { value: string; title: string; sub: string }[] = [
  { value: "flex", title: "Flex", sub: "Abteilung erst beim Eintritt wählen" },
  { value: "semi", title: "Halbprivat", sub: "Meist Zweibettzimmer und erweiterte Arztwahl" },
  { value: "private", title: "Privat", sub: "Meist Einbettzimmer und erweiterte Arztwahl" },
]

const COVERAGES: CoverageInfo[] = [
  { id: "alternative", label: "Alternativmedizin", d: "Ergänzt ausgewählte komplementärmedizinische Behandlungen ausserhalb oder über die Leistungen der Grundversicherung hinaus.", a: "Je nach Produkt beispielsweise zusätzliche Beiträge an anerkannte Therapeutinnen, Therapeuten oder Methoden.", w: "Anerkennungslisten, Methoden, Jahreslimiten und Kostenanteile unterscheiden sich stark." },
  { id: "dental", label: "Zahnbehandlungen", d: "Ordentliche Zahnbehandlungen sind in der Grundversicherung grundsätzlich nicht enthalten.", a: "Je nach Produkt Beiträge an Kontrollen, Dentalhygiene, Füllungen oder weitere Zahnbehandlungen.", w: "Häufig gelten Gesundheitsprüfung, Karenzfrist, jährliche Limiten und prozentuale Kostenbeteiligung." },
  { id: "abroad", label: "Notfälle im Ausland", d: "Schliesst mögliche Kostenlücken bei medizinischen Notfällen auf Reisen, besonders ausserhalb EU/EFTA/UK.", a: "Je nach Produkt höhere Behandlungslimiten, Transport, Rückführung oder Assistance-Leistungen.", w: "Reisedauer, Länder, maximale Leistung und Ausschlüsse vor Abschluss prüfen." },
  { id: "orthodontics", label: "Zahnstellungskorrektur", d: "Ergänzt Kosten für kieferorthopädische Behandlungen, die von der Grundversicherung meist nicht übernommen werden.", a: "Je nach Produkt Beiträge an Spangen, Kontrollen und kieferorthopädische Behandlung.", w: "Eintrittsalter, Befund bei Abschluss, Wartefrist, Prozentanteil und Gesamtlimit sind entscheidend." },
  { id: "medication", label: "Nichtpflichtmedikamente", d: "Ergänzt Medikamente, die nicht oder nur eingeschränkt über die Grundversicherung vergütet werden.", a: "Je nach Produkt Beiträge an ärztlich verordnete Präparate ausserhalb der Pflichtlisten.", w: "Nur anerkannte Präparate und Indikationen; Selbstbehalt und Limiten beachten." },
  { id: "vision", label: "Brille und Kontaktlinsen", d: "Ergänzt die begrenzten gesetzlichen Leistungen für Sehhilfen.", a: "Periodischer Beitrag an Brillengläser, Fassungen oder Kontaktlinsen.", w: "Leistungsperiode, Maximalbetrag und anerkannte Anbieter vergleichen." },
  { id: "psychotherapy", label: "Psychotherapie", d: "Ergänzt Behandlungen, die nicht unter den Voraussetzungen der Grundversicherung abgerechnet werden können.", a: "Je nach Produkt Beiträge an zusätzliche Sitzungen oder anerkannte therapeutische Angebote.", w: "Ärztliche Anordnung, Anerkennung der Fachperson, Sitzungszahl und Jahreslimit prüfen." },
  { id: "rescue", label: "Suche, Rettung und Transport", d: "Ergänzt die begrenzte Beteiligung der Grundversicherung an medizinisch notwendigen Transport- und Rettungskosten.", a: "Je nach Produkt höhere Beiträge an Ambulanz, Rettung, Suche oder Bergung im In- und Ausland.", w: "Suche und Rettung werden oft unterschiedlich behandelt; Jahres- und Ereignislimiten prüfen." },
  { id: "prevention", label: "Prävention und Check-ups", d: "Ergänzt Vorsorgeuntersuchungen, Impfungen oder Check-ups ausserhalb der gesetzlichen Pflichtleistungen.", a: "Je nach Produkt Beiträge an definierte Vorsorgeprogramme und Untersuchungen.", w: "Leistungskatalog, Altersgrenzen, Intervalle und vorgängige Kostengutsprache beachten." },
  { id: "fitness", label: "Fitness und Gesundheitsförderung", d: "Unterstützt gesundheitsfördernde Aktivitäten, die nicht zur Grundversicherung gehören.", a: "Je nach Produkt Beiträge an anerkannte Fitnesscenter, Kurse oder Gesundheitsprogramme.", w: "Anbieterliste, Mindestabodauer, Nachweis und jährliches Beitragsmaximum prüfen." },
]

const LEVEL_LABEL: Record<string, string> = { flex: "Flex", semi: "Halbprivat", private: "Privat" }

export function ZusatzCheck({ ctx, saved }: { ctx: CalcContext; saved?: SavedCalculatorPayload }) {
  const [hospital, setHospital] = useState(Boolean(saved?.hospital))
  const [hospitalExisting, setHospitalExisting] = useState(Boolean(saved?.existingHospital))
  const [hospitalLevel, setHospitalLevel] = useState<string | null>(typeof saved?.hospitalLevel === "string" ? saved.hospitalLevel : null)
  const [wanted, setWanted] = useState<Record<string, boolean>>(
    saved?.ambulatory && typeof saved.ambulatory === "object" ? saved.ambulatory as Record<string, boolean> : {},
  )
  const [existing, setExisting] = useState<Record<string, boolean>>(
    saved?.existingAmbulatory && typeof saved.existingAmbulatory === "object" ? saved.existingAmbulatory as Record<string, boolean> : {},
  )
  const [notes, setNotes] = useState(typeof saved?.notes === "string" ? saved.notes : "")
  const [info, setInfo] = useState<{ item: CoverageInfo; category: string } | null>(null)

  const selected = useMemo(() => {
    const items: string[] = []
    if (hospital) items.push("Spitalzusatz" + (hospitalLevel ? ` · ${LEVEL_LABEL[hospitalLevel]}` : ""))
    for (const c of COVERAGES) if (wanted[c.id]) items.push(c.label)
    return items
  }, [hospital, hospitalLevel, wanted])

  const gaps = useMemo(() => {
    const existLabels = new Set<string>()
    if (hospitalExisting) existLabels.add("Spitalzusatz")
    for (const c of COVERAGES) if (existing[c.id]) existLabels.add(c.label)
    return selected.filter((s) => !existLabels.has(s.split(" · ")[0]))
  }, [selected, existing, hospitalExisting])

  return (
    <>
      <CalcActionBar
        ctx={ctx}
        calcKey="supplementaryInsurance"
        buildPayload={() => ({
          hospital,
          existingHospital: hospitalExisting,
          hospitalLevel,
          ambulatory: Object.fromEntries(COVERAGES.map((c) => [c.id, !!wanted[c.id]])),
          existingAmbulatory: Object.fromEntries(COVERAGES.map((c) => [c.id, !!existing[c.id]])),
          notes,
          selected,
        })}
        onReset={() => {
          setHospital(false)
          setHospitalExisting(false)
          setHospitalLevel(null)
          setWanted({})
          setExisting({})
          setNotes("")
        }}
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Form */}
        <div className="space-y-5">
          {/* Hospital */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <SectionToggle
              index={1}
              title="Spitalzusatz"
              copy="Zusätzlicher Komfort und Wahlmöglichkeiten bei einem stationären Aufenthalt."
              enabled={hospital}
              existing={hospitalExisting}
              onEnabled={setHospital}
              onExisting={setHospitalExisting}
              onInfo={() => setInfo({ item: HOSPITAL, category: "Stationäre Ergänzung" })}
            />
            {(hospital || hospitalExisting) && (
              <div className="mt-4 grid gap-2 pl-9 sm:grid-cols-3">
                {HOSPITAL_LEVELS.map((lvl) => {
                  const active = hospitalLevel === lvl.value
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => setHospitalLevel(lvl.value)}
                      aria-pressed={active}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <span className="block text-sm font-bold text-foreground">{lvl.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">{lvl.sub}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Ambulatory */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">Ambulante Ergänzungen</h2>
                <p className="mt-1 text-sm text-muted-foreground">Leistungen ausserhalb eines stationären Aufenthalts.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {COVERAGES.map((c) => (
                <CoverageRow
                  key={c.id}
                  label={c.label}
                  wanted={!!wanted[c.id]}
                  existing={!!existing[c.id]}
                  onWanted={(v) => setWanted((s) => ({ ...s, [c.id]: v }))}
                  onExisting={(v) => setExisting((s) => ({ ...s, [c.id]: v }))}
                  onInfo={() => setInfo({ item: c, category: "Ambulante Ergänzung" })}
                />
              ))}
            </div>
          </section>

          {/* Notes */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <label className="block text-sm font-semibold text-foreground" htmlFor="coverageNotes">
              Besondere Wünsche oder bestehende Deckung
            </label>
            <textarea
              id="coverageNotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z. B. bestehende Police, bevorzugte Klinik oder häufige Auslandreisen"
              className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </section>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ihre Auswahl</p>
            <div className="mt-3 flex items-baseline gap-2">
              <strong className="text-3xl font-bold tabular-nums text-foreground">{selected.length}</strong>
              <span className="text-sm text-muted-foreground">gewünschte Ergänzungen</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">Noch zu prüfen</span>
              <b className="text-sm font-bold tabular-nums text-foreground">{gaps.length}</b>
            </div>

            {selected.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Noch keine Zusatzleistung ausgewählt.
              </p>
            ) : (
              <ul className="mt-4 space-y-1.5">
                {selected.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {s}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Wichtig</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Zusatzversicherungen sind freiwillige Verträge nach VVG. Aufnahme, Leistungsumfang, Limiten und Wartefristen
                unterscheiden sich je Versicherer und Produkt.
              </p>
            </div>

            <Link
              href={ctx.analysisId ? `/versicherung/sach-motor?aid=${ctx.analysisId}&cid=${ctx.customerId ?? ""}` : "/versicherung/sach-motor"}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
            >
              Weiter zu Hausrat &amp; Auto
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <InfoDialog info={info?.item ?? null} category={info?.category ?? ""} onClose={() => setInfo(null)} />
    </>
  )
}
