import assert from "node:assert/strict"
import test from "node:test"
import { calculateZurichPropertyTax, propertyGainBasis } from "./property-gains.ts"

const location = {
  TaxLocationID: 261000000,
  ZipCode: "8001",
  BfsID: 261,
  CantonID: 1,
  BfsName: "Zürich",
  City: "Zürich",
  Canton: "ZH",
}

test("Zürich tariff applies official progressive brackets and holding discount", () => {
  const result = calculateZurichPropertyTax({
    taxYear: 2026,
    location,
    confession: 4,
    salePrice: 600_000,
    purchasePrice: 500_000,
    investments: 0,
    transactionCosts: 0,
    deferredPriorGain: 0,
    holdingYears: 12,
    replacementPurchase: false,
    replacementPrice: 0,
  })

  assert.equal(result.grossGain, 100_000)
  assert.equal(result.holdingReductionRate, 26)
  assert.equal(result.totalTax, 21_756)
})

test("replacement acquisition defers only the reinvested gain", () => {
  const result = propertyGainBasis({
    taxYear: 2026,
    location,
    confession: 4,
    salePrice: 1_200_000,
    purchasePrice: 700_000,
    investments: 100_000,
    transactionCosts: 20_000,
    deferredPriorGain: 0,
    holdingYears: 10,
    replacementPurchase: true,
    replacementPrice: 1_050_000,
  })

  assert.equal(result.grossGain, 380_000)
  assert.equal(result.gainAfterDeferral, 150_000)
  assert.equal(result.deferredGain, 230_000)
})
