import assert from "node:assert/strict"
import test from "node:test"
import {
  QUESTIONS,
  contractMonthlyAmount,
  isQuestionVisible,
  scores,
  visibleQuestionCount,
} from "../lib/wizard/schema.ts"

test("Kinder-Folgefrage erscheint als Frage 7 und beeinflusst das Live-Profil", () => {
  const answers = {
    kinder: "ja",
    kinder_bedarf: ["sparen", "invaliditaet"],
  }
  const visible = QUESTIONS.filter((question) => isQuestionVisible(question, answers))

  assert.equal(visible[6].id, "kinder_bedarf")
  assert.equal(visibleQuestionCount(answers), QUESTIONS.length)
  assert.ok(scores(answers).children >= 4)
  assert.ok(scores(answers).investment >= scores({ kinder: "ja", kinder_bedarf: [] }).investment)
  assert.ok(scores(answers)["values-protection"] >= 2)
})

test("Kinder-Folgefrage wird ohne Kinder sauber übersprungen", () => {
  const answers = { kinder: "nein" }
  const visible = QUESTIONS.filter((question) => isQuestionVisible(question, answers))

  assert.equal(visible.some((question) => question.id === "kinder_bedarf"), false)
  assert.equal(visibleQuestionCount(answers), QUESTIONS.length - 1)
})

test("Vertragsprämien werden unabhängig vom Intervall auf Monatswerte normalisiert", () => {
  assert.equal(contractMonthlyAmount({ premium: 120, interval: "monthly" }), 120)
  assert.equal(contractMonthlyAmount({ premium: 300, interval: "quarterly" }), 100)
  assert.equal(contractMonthlyAmount({ premium: 600, interval: "semiannual" }), 100)
  assert.equal(contractMonthlyAmount({ premium: 1200, interval: "annual" }), 100)
})
