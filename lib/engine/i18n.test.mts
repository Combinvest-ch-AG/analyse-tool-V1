import test from "node:test"
import assert from "node:assert/strict"
import { translateUiText } from "../i18n/index.ts"

test("known advisory terminology is translated consistently", () => {
  assert.equal(translateUiText("Vorsorgelücke", "en"), "Pension gap")
  assert.equal(translateUiText("Vertragscheck", "en"), "Contract review")
  assert.equal(translateUiText("Zur Risikoanalyse", "en"), "Back to risk analysis")
})

test("dynamic report labels retain their values", () => {
  assert.equal(translateUiText("Berechnet am 05.08.2026", "en"), "Calculated on 05.08.2026")
  assert.equal(translateUiText("3 von 7 Berechnungen", "en"), "3 of 7 calculations")
  assert.equal(translateUiText("CHF 2’500 pro Monat", "en"), "CHF 2’500 per month")
})

test("customer-entered content is never changed", () => {
  assert.equal(translateUiText("Beratung bei Familie Muster in Bern", "en"), "Beratung bei Familie Muster in Bern")
  assert.equal(translateUiText("Eigene Notiz des Kunden", "en"), "Eigene Notiz des Kunden")
  assert.equal(translateUiText("Vorsorgelücke", "de"), "Vorsorgelücke")
})
