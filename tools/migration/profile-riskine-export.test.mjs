import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('profiles only records created in the selected year without exposing row data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'riskine-profile-'));
  const source = join(directory, 'export.json');
  const output = join(directory, 'report.json');
  await writeFile(source, JSON.stringify([
    { ID: 'secret-1', 'Client ID': 'customer-a', 'External ID': 'external-a', 'Created At': '2026-01-02T12:00:00Z', 'Updated At': '2026-01-02T12:00:00Z', Data: '{"input":{}}' },
    { ID: 'secret-2', 'Client ID': 'customer-a', 'External ID': 'external-b', 'Created At': '2025-01-02T12:00:00Z', 'Updated At': '2025-01-02T12:00:00Z', Data: '{"input":{}}' },
  ]));

  const result = spawnSync(process.execPath, [
    'tools/migration/profile-riskine-export.mjs', source, '--year', '2026', '--output', output,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const rawReport = await readFile(output, 'utf8');
  const report = JSON.parse(rawReport);
  assert.equal(report.totals.selectedRows, 1);
  assert.equal(report.totals.validPayloads, 1);
  assert.equal(report.identifiers.clientId.unique, 1);
  assert.equal(rawReport.includes('secret-1'), false);
  assert.equal(rawReport.includes('customer-a'), false);
});
