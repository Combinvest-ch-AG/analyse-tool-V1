import test from "node:test";
import assert from "node:assert/strict";
import {
  ageGroupFromBirthYear,
  compareFranchises,
  costSharing,
} from "./franchise-engine.mjs";

test("adult cost sharing applies deductible and 10 percent retention", () => {
  assert.deepEqual(costSharing(1200, 300, "ERW"), {
    deductible: 300,
    retention: 90,
    total: 390,
    maximum: 1000,
  });
});

test("retention is capped at CHF 700 for adults and CHF 350 for children", () => {
  assert.equal(costSharing(50_000, 2500, "ERW").total, 3200);
  assert.equal(costSharing(50_000, 600, "KIN").total, 950);
});

test("comparison uses the exact premium for every offered franchise", () => {
  const result = compareFranchises([[300, 420], [2500, 300]], 0, "ERW");
  assert.equal(result[0].franchise, 2500);
  assert.equal(result[0].annualTotal, 3600);
  assert.equal(result[1].difference, 1440);
});

test("birth year maps to the official premium age groups", () => {
  assert.equal(ageGroupFromBirthYear(2008, 2026), "KIN");
  assert.equal(ageGroupFromBirthYear(2001, 2026), "JUG");
  assert.equal(ageGroupFromBirthYear(2000, 2026), "ERW");
  assert.equal(ageGroupFromBirthYear(0, 2026), null);
});
