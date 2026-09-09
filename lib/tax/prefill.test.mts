import assert from "node:assert/strict"
import test from "node:test"
import { buildTaxPrefill } from "./prefill.ts"

test("tax prefill reuses exact customer, profiling and contract data", () => {
  const result = buildTaxPrefill({
    id: "customer",
    first_name: "Ada",
    last_name: "Muster",
    birthdate: "1990-04-10",
    gender: "weiblich",
    email: null,
    phone: null,
    postcode: "4622",
    city: "Egerkingen",
    monthly_income: null,
    preferred_language: "de-CH",
    status: "active",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  }, {
    id: "analysis",
    customer_id: "customer",
    title: null,
    status: "in_progress",
    current_step: 1,
    current_question: 1,
    progress_percent: 50,
    latest_snapshot: {
      answers: {
        zivilstand: "verheiratet",
        konfession: "reformiert",
        kinder: "ja",
        kinder_anzahl: 2,
        kinder_alter: [4, 7],
        erwerb: "angestellt",
        brutto: 120_000,
      },
      contracts: {
        a: { product: "VorsorgeBank 3a", premium: 600, interval: "monthly" },
        b: { product: "Vorsorgeversicherung", premium: 300, interval: "monthly" },
      },
    },
    lock_version: 1,
    started_at: null,
    completed_at: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  })

  assert.equal(result.locationQuery?.value, "4622 Egerkingen")
  assert.equal(result.relationship?.value, 2)
  assert.equal(result.confession1?.value, 1)
  assert.deepEqual(result.children?.value, [4, 7])
  assert.equal(result.gender?.value, 2)
  assert.equal(result.grossIncome1?.value, 120_000)
  assert.equal(result.pillar3aContribution?.value, 7_200)
})
