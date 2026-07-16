import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformRiskineRecord } from './riskine-transform.mjs';

const mapping = JSON.parse(await readFile(new URL('./riskine-v1.mapping.json', import.meta.url), 'utf8'));

test('transforms a synthetic Riskine record into the versioned analysis model', () => {
  const row = {
    ID: 'r1', 'Client ID': 'c1', 'External ID': 'e1', 'Public ID': 'p1', Title: 'Pilot',
    'Status ID': 'done', 'Created At': '2026-02-01T10:00:00Z', 'Updated At': '2026-02-02T10:00:00Z',
    Data: JSON.stringify({ input: {
      'party-id': 'party1', 'person.name.first': 'Ada', 'person.name.last': 'Test',
      'person.work.income.gross.yearly': 96000,
      advice: { id: 'a1', goals: [], needs: [], answers: [], offers: [], 'investment-profiles': [], 'investment-strategies': [] },
      person: { advisor: { 'first-name': 'Advisor', 'last-name': 'Test', email: 'advisor@example.test', 'finma-registry-number': 'F01' } }
    } }),
  };
  const result = transformRiskineRecord(row, mapping);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.externalIds.catalystClientId, 'c1');
  assert.equal(result.customer.firstName, 'Ada');
  assert.equal(result.income.grossYearly, 96000);
  assert.equal(result.legacyAdvice.goals.length, 0);
});
