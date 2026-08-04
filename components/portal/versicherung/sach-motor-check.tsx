"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalcActionBar, type CalcContext, type SavedCalculatorPayload } from "@/components/portal/rechner/calc-action-bar"
import { InfoDialog, CoverageRow, SectionToggle, type CoverageInfo } from "@/components/portal/versicherung/coverage-ui"

type GroupKey = "household" | "liability" | "motor"

const GROUPS: Record<GroupKey, { label: string; copy: string; items: CoverageInfo[] }> = {
  household: {
    label: "Hausrat",
    copy: "Schutz für bewegliche Sachen im Haushalt.",
    items: [
      { id: "fire", label: "Feuer & Elementar", d: "Deckt Schäden am Hausrat durch Feuer und versicherte Naturereignisse.", a: "Zum Beispiel Brand, Blitzschlag, Sturm, Hagel oder Überschwemmung im vereinbarten Umfang.", w: "Versicherungssumme, Selbstbehalt und die genaue Definition von Elementarereignissen prüfen." },
      { id: "water", label: "Wasser", d: "Deckt bestimmte Wasserschäden an Ihrem Hausrat.", a: "Zum Beispiel Schäden durch Leitungswasser oder auslaufende Anlagen, je nach Vertrag.", w: "Grundwasser, Rückstau und Schäden am Gebäude sind nicht automatisch gleich gedeckt." },
      { id: "theft", label: "Einbruch & Beraubung", d: "Schützt bei versichertem Einbruchdiebstahl und Beraubung.", a: "Ersatz für gestohlene oder beschädigte Haushaltsgegenstände bis zu den vereinbarten Limiten.", w: "Wertsachenlimiten und Nachweispflichten besonders beachten." },
      { id: "awayTheft", label: "Einfacher Diebstahl auswärts", d: "Ergänzt den Schutz für Diebstahl ausserhalb des Zuhauses.", a: "Zum Beispiel bei Diebstahl von Gepäck oder persönlichen Gegenständen unterwegs.", w: "Verlust und unbeaufsichtigt zurückgelassene Sachen sind häufig eingeschränkt." },
      { id: "glass", label: "Glasbruch", d: "Deckt ausgewählte Bruchschäden an Mobiliar- oder Gebäudeglas.", a: "Je nach Variante etwa Tischplatten, Lavabos, Fenster oder Kochfelder.", w: "Mobiliar- und Gebäudeglas sind getrennte Bausteine; bei Miete Zuständigkeit prüfen." },
      { id: "valuables", label: "Wertsachen", d: "Erweitert den Schutz für besonders wertvolle Gegenstände.", a: "Zum Beispiel Schmuck, Uhren, Kunst oder Musikinstrumente mit vereinbarter Summe.", w: "Einzelwerte, Verzeichnisse, Belege und Aufbewahrungsvorschriften dokumentieren." },
      { id: "cyber", label: "Cyber", d: "Bietet je nach Produkt Hilfe bei bestimmten privaten Cyberereignissen.", a: "Mögliche Leistungen sind Datenrettung, Unterstützung bei Onlinebetrug oder Identitätsmissbrauch.", w: "Deckungstatbestände und Limiten unterscheiden sich stark je Produkt." },
    ],
  },
  liability: {
    label: "Privathaftpflicht",
    copy: "Schutz bei Schäden, die Sie anderen Personen oder Sachen zufügen.",
    items: [
      { id: "tenant", label: "Mieterschäden", d: "Deckt versicherte Schäden an gemieteten Räumen.", a: "Zum Beispiel unbeabsichtigte Schäden an Wohnungsteilen, für die Sie haftbar sind.", w: "Abnutzung, allmähliche Schäden und Selbstbehalte prüfen." },
      { id: "borrowed", label: "Geliehene Sachen", d: "Ergänzt die Haftpflicht für bestimmte geliehene Gegenstände.", a: "Schäden an vorübergehend übernommenen Sachen können je nach Vertrag gedeckt sein.", w: "Fahrzeuge, beruflich genutzte Sachen und Obhutsschäden sind oft eingeschränkt." },
      { id: "grossNegligence", label: "Grobfahrlässigkeit", d: "Kann den Schutz vor Leistungskürzungen bei grobfahrlässig verursachten Schäden erweitern.", a: "Der Versicherer verzichtet im vereinbarten Umfang auf eine Kürzung oder einen Rückgriff.", w: "Absicht und bestimmte schwere Pflichtverletzungen bleiben ausgeschlossen." },
      { id: "animals", label: "Tierhalter", d: "Erfasst Haftpflichtrisiken durch gehaltene Tiere.", a: "Schäden an Dritten durch Haustiere können im vereinbarten Rahmen gedeckt sein.", w: "Tierart, kantonale Vorgaben und ausgeschlossene Tiere prüfen." },
    ],
  },
  motor: {
    label: "Motorfahrzeug",
    copy: "Gewünschter Schutz für das Fahrzeug und Schäden gegenüber Dritten.",
    items: [
      { id: "liability", label: "Motorfahrzeug-Haftpflicht", fixed: true, d: "Gesetzlich erforderliche Grunddeckung für zugelassene Motorfahrzeuge.", a: "Deckt berechtigte Schadenersatzansprüche Dritter aus dem Betrieb des Fahrzeugs.", w: "Eigene Fahrzeugschäden sind damit nicht gedeckt." },
      { id: "partial", label: "Teilkasko", d: "Schützt das eigene Fahrzeug bei ausgewählten Ereignissen ohne Kollision.", a: "Typisch sind Diebstahl, Feuer, Elementar, Glas, Tierkollision oder Marder – je nach Produkt.", w: "Leistungsumfang, Zeitwertregel und Selbstbehalte vergleichen." },
      { id: "collision", label: "Kollisionskasko / Vollkasko", d: "Ergänzt die Teilkasko um selbst verursachte Kollisionsschäden am eigenen Fahrzeug.", a: "Reparatur oder Entschädigung des eigenen Fahrzeugs nach versicherter Kollision.", w: "Zeitwertzusatz, Selbstbehalt, Bonusfolgen und Leasingvorgaben prüfen." },
      { id: "parking", label: "Parkschaden", d: "Deckt bestimmte Schäden am parkierten Fahrzeug durch unbekannte Dritte.", a: "Zum Beispiel Dellen oder Kratzer, sofern Ereignis und Umfang versichert sind.", w: "Anzahl Fälle, Schadenhöhe und Fahrzeugwertlimiten beachten." },
      { id: "grossNegligence", label: "Grobfahrlässigkeitsschutz", d: "Kann Rückgriffe oder Kürzungen nach grobfahrlässigem Verhalten reduzieren.", a: "Der Versicherer verzichtet im vereinbarten Rahmen auf Rückgriff oder Leistungskürzung.", w: "Alkohol, Drogen, Raserdelikte und weitere schwere Verstösse bleiben regelmässig ausgeschlossen." },
      { id: "assistance", label: "Pannenhilfe & Assistance", d: "Organisiert Hilfe bei Panne oder Unfall.", a: "Je nach Vertrag Abschleppen, Weiterreise, Ersatzfahrzeug oder Rücktransport.", w: "Geltungsgebiet und bereits vorhandene Deckung über Hersteller, Club oder Kreditkarte prüfen." },
      { id: "occupants", label: "Insassenunfall", d: "Ergänzt Leistungen für Fahrer und Mitfahrende nach einem Unfall.", a: "Kapital-, Heilungs- oder Taggeldleistungen gemäss Vertrag.", w: "Mögliche Doppelversicherung mit UVG und Krankenversicherung prüfen." },
    ],
  },
}

const ORDER: GroupKey[] = ["household", "liability", "motor"]
const INPUT =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"

export function SachMotorCheck({ ctx, saved }: { ctx: CalcContext; saved?: SavedCalculatorPayload }) {
  const storedGroups = Object.fromEntries(ORDER.map((g) => [g, saved?.[g] && typeof saved[g] === "object" ? saved[g] as Record<string, unknown> : {}])) as Record<GroupKey, Record<string, unknown>>
  const restoredWanted: Record<string, boolean> = { "motor:liability": true }
  const restoredExisting: Record<string, boolean> = {}
  for (const group of ORDER) {
    for (const item of Array.isArray(storedGroups[group].covers) ? storedGroups[group].covers as { id?: string }[] : []) {
      if (item.id) restoredWanted[`${group}:${item.id}`] = true
    }
    for (const item of Array.isArray(storedGroups[group].existingCovers) ? storedGroups[group].existingCovers as { id?: string }[] : []) {
      if (item.id) restoredExisting[`${group}:${item.id}`] = true
    }
  }
  const [enabled, setEnabled] = useState<Record<GroupKey, boolean>>(Object.fromEntries(ORDER.map((g) => [g, Boolean(storedGroups[g].enabled)])) as Record<GroupKey, boolean>)
  const [groupExisting, setGroupExisting] = useState<Record<GroupKey, boolean>>(Object.fromEntries(ORDER.map((g) => [g, Boolean(storedGroups[g].existing)])) as Record<GroupKey, boolean>)
  const [wanted, setWanted] = useState<Record<string, boolean>>(restoredWanted)
  const [existing, setExisting] = useState<Record<string, boolean>>(restoredExisting)
  const [residence, setResidence] = useState(typeof storedGroups.household.residence === "string" ? storedGroups.household.residence : "tenant")
  const [householdSize, setHouseholdSize] = useState(String(storedGroups.household.householdSize ?? "1"))
  const [householdValue, setHouseholdValue] = useState(storedGroups.household.householdValue ? String(storedGroups.household.householdValue) : "")
  const [vehicleYear, setVehicleYear] = useState(storedGroups.motor.vehicleYear ? String(storedGroups.motor.vehicleYear) : "")
  const [vehicleValue, setVehicleValue] = useState(storedGroups.motor.vehicleValue ? String(storedGroups.motor.vehicleValue) : "")
  const [leasing, setLeasing] = useState(Boolean(storedGroups.motor.leasing))
  const [notes, setNotes] = useState(typeof saved?.notes === "string" ? saved.notes : "")
  const [info, setInfo] = useState<{ item: CoverageInfo; category: string } | null>(null)

  const key = (g: GroupKey, id: string) => `${g}:${id}`

  const selectedByGroup = useMemo(() => {
    return ORDER.map((g) => ({
      key: g,
      label: GROUPS[g].label,
      items: enabled[g] ? GROUPS[g].items.filter((c) => wanted[key(g, c.id)]) : [],
    })).filter((x) => x.items.length)
  }, [enabled, wanted])

  const wantedLabels = useMemo(() => selectedByGroup.flatMap((g) => g.items.map((i) => i.label)), [selectedByGroup])

  const gaps = useMemo(() => {
    const exist = new Set<string>()
    for (const g of ORDER) {
      if (!groupExisting[g]) continue
      for (const c of GROUPS[g].items) if (existing[key(g, c.id)]) exist.add(c.label)
    }
    return wantedLabels.filter((l) => !exist.has(l))
  }, [wantedLabels, existing, groupExisting])

  const motorHint = useMemo(() => {
    if (!enabled.motor) return null
    const year = Number(vehicleYear)
    const collision = !!wanted[key("motor", "collision")]
    const newish = leasing || (year && new Date().getFullYear() - year <= 5)
    return newish && !collision
      ? "Bei einem geleasten oder neueren Fahrzeug sollte eine Kollisionskasko geprüft werden."
      : "Deckungsumfang und Selbstbehalte mit der bestehenden Police vergleichen."
  }, [enabled.motor, vehicleYear, leasing, wanted])

  const covers = (g: GroupKey) => GROUPS[g].items.filter((c) => wanted[key(g, c.id)]).map((c) => ({ id: c.id, label: c.label }))
  const existingCovers = (g: GroupKey) => GROUPS[g].items.filter((c) => existing[key(g, c.id)]).map((c) => ({ id: c.id, label: c.label }))

  return (
    <>
      <CalcActionBar
        ctx={ctx}
        calcKey="insuranceNeeds"
        buildPayload={() => ({
          household: { enabled: enabled.household, existing: groupExisting.household, residence, householdSize: Number(householdSize) || 1, householdValue: Number(householdValue) || 0, covers: covers("household"), existingCovers: existingCovers("household") },
          liability: { enabled: enabled.liability, existing: groupExisting.liability, covers: covers("liability"), existingCovers: existingCovers("liability") },
          motor: { enabled: enabled.motor, existing: groupExisting.motor, vehicleYear: Number(vehicleYear) || null, vehicleValue: Number(vehicleValue) || 0, leasing, covers: covers("motor"), existingCovers: existingCovers("motor") },
          notes,
          selected: wantedLabels,
        })}
        onReset={() => {
          setEnabled({ household: false, liability: false, motor: false })
          setGroupExisting({ household: false, liability: false, motor: false })
          setWanted({ "motor:liability": true })
          setExisting({})
          setResidence("tenant")
          setHouseholdSize("1")
          setHouseholdValue("")
          setVehicleYear("")
          setVehicleValue("")
          setLeasing(false)
          setNotes("")
        }}
      />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {ORDER.map((g, gi) => (
            <section key={g} className="rounded-2xl border border-border bg-card p-5">
              <SectionToggle
                index={gi + 1}
                title={GROUPS[g].label}
                copy={GROUPS[g].copy}
                enabled={enabled[g]}
                existing={groupExisting[g]}
                onEnabled={(v) => setEnabled((s) => ({ ...s, [g]: v }))}
                onExisting={(v) => setGroupExisting((s) => ({ ...s, [g]: v }))}
                onInfo={() => setInfo({ item: { ...GROUPS[g].items[0], id: g, label: GROUPS[g].label, d: GROUPS[g].copy }, category: GROUPS[g].label })}
              />

              {(enabled[g] || groupExisting[g]) && (
                <div className="mt-4 pl-9">
                  {g === "household" && (
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                      <label className="block text-sm">
                        <span className="font-semibold text-foreground">Wohnsituation</span>
                        <select className={`mt-1 ${INPUT}`} value={residence} onChange={(e) => setResidence(e.target.value)}>
                          <option value="tenant">Miete</option>
                          <option value="owner">Wohneigentum</option>
                          <option value="other">Andere</option>
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="font-semibold text-foreground">Personen im Haushalt</span>
                        <input type="number" min={1} max={20} className={`mt-1 ${INPUT} tabular-nums`} value={householdSize} onChange={(e) => setHouseholdSize(e.target.value)} />
                      </label>
                      <label className="block text-sm">
                        <span className="font-semibold text-foreground">Versicherungssumme (CHF)</span>
                        <input type="number" min={0} step={1000} placeholder="Optional" className={`mt-1 ${INPUT} tabular-nums`} value={householdValue} onChange={(e) => setHouseholdValue(e.target.value)} />
                      </label>
                    </div>
                  )}
                  {g === "motor" && (
                    <div className="mb-4 grid gap-3 sm:grid-cols-3">
                      <label className="block text-sm">
                        <span className="font-semibold text-foreground">1. Inverkehrsetzung</span>
                        <input type="number" min={1950} max={2030} placeholder="Jahr" className={`mt-1 ${INPUT} tabular-nums`} value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} />
                      </label>
                      <label className="block text-sm">
                        <span className="font-semibold text-foreground">Kaufpreis / Wert (CHF)</span>
                        <input type="number" min={0} step={1000} placeholder="Optional" className={`mt-1 ${INPUT} tabular-nums`} value={vehicleValue} onChange={(e) => setVehicleValue(e.target.value)} />
                      </label>
                      <label className="flex items-center gap-2 self-end pb-2 text-sm">
                        <input type="checkbox" checked={leasing} onChange={(e) => setLeasing(e.target.checked)} className="h-4 w-4 accent-primary" />
                        <span className="font-semibold text-foreground">Leasingfahrzeug</span>
                      </label>
                    </div>
                  )}
                  <div className="grid gap-2">
                    {GROUPS[g].items.map((c) => (
                      <CoverageRow
                        key={c.id}
                        label={c.label}
                        fixed={c.fixed}
                        wanted={c.fixed ? true : !!wanted[key(g, c.id)]}
                        existing={!!existing[key(g, c.id)]}
                        onWanted={(v) => setWanted((s) => ({ ...s, [key(g, c.id)]: v }))}
                        onExisting={(v) => setExisting((s) => ({ ...s, [key(g, c.id)]: v }))}
                        onInfo={() => setInfo({ item: c, category: GROUPS[g].label })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}

          <section className="rounded-2xl border border-border bg-card p-5">
            <label className="block text-sm font-semibold text-foreground" htmlFor="insuranceNotes">
              Bestehende Policen oder besondere Wünsche
            </label>
            <textarea
              id="insuranceNotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z. B. bestehender Versicherer, wertvolle Gegenstände oder mehrere Fahrzeuge"
              className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </section>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ihre Auswahl</p>
            <div className="mt-3 flex items-baseline gap-2">
              <strong className="text-3xl font-bold tabular-nums text-foreground">{wantedLabels.length}</strong>
              <span className="text-sm text-muted-foreground">gewünschte Deckungen</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
              <span className="text-sm text-muted-foreground">Noch zu prüfen</span>
              <b className="text-sm font-bold tabular-nums text-foreground">{gaps.length}</b>
            </div>

            {selectedByGroup.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Noch keine Deckung ausgewählt.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {selectedByGroup.map((g) => (
                  <div key={g.key}>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{g.label}</h3>
                    <ul className="mt-1 space-y-1">
                      {g.items.map((i) => (
                        <li key={i.id} className="flex items-center gap-2 text-sm text-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {i.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {motorHint && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Prüfhinweis</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{motorHint}</p>
              </div>
            )}

            <Link
              href={ctx.analysisId ? `/versicherung/uebersicht?aid=${ctx.analysisId}&cid=${ctx.customerId ?? ""}` : "/versicherung/uebersicht"}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-muted"
            >
              Zur Versicherungsübersicht
            </Link>
          </div>
        </div>
      </div>

      <InfoDialog info={info?.item ?? null} category={info?.category ?? ""} onClose={() => setInfo(null)} />
    </>
  )
}
