import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('recognizes Riskine fields that use dotted keys inside input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'riskine-mapping-'));
  const source = join(directory, 'export.json');
  const data = {
    input: {
      'party-id': 'party-secret',
      'person.name.first': 'Ada',
      'person.name.last': 'Test',
      advice: { id: 'advice-secret', goals: [], needs: [], answers: [], offers: [], 'investment-profiles': [], 'investment-strategies': [] },
    },
  };
  await writeFile(source, JSON.stringify([{
    ID: 'record-secret', 'Client ID': 'client-secret', 'External ID': 'external-secret', 'Public ID': 'public-secret',
    Title: 'Test', 'Status ID': 'status', 'Created At': '2026-01-02T12:00:00Z', 'Updated At': '2026-01-02T12:00:00Z', Data: JSON.stringify(data),
  }]));
  const result = spawnSync(process.execPath, ['tools/migration/check-riskine-mapping.mjs', source, '2026'], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.fields.find((field) => field.target === 'customer.firstName').filled, 1);
  assert.equal(result.stdout.includes('Ada'), false);
  assert.equal(result.stdout.includes('client-secret'), false);
});
