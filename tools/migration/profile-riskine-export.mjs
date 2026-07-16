#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function parseArgs(argv) {
  const args = { year: new Date().getFullYear(), output: null, source: null };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--year') args.year = Number(argv[++i]);
    else if (value === '--output') args.output = argv[++i];
    else if (!args.source) args.source = value;
    else throw new Error(`Unbekanntes Argument: ${value}`);
  }
  if (!args.source) {
    throw new Error('Aufruf: node tools/migration/profile-riskine-export.mjs <export.json> [--year 2026] [--output report.json]');
  }
  if (!Number.isInteger(args.year) || args.year < 2000 || args.year > 2100) {
    throw new Error('--year muss eine vierstellige Jahreszahl sein.');
  }
  return args;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function countValues(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = row[key];
    if (value === null || value === undefined || value === '') continue;
    const normalized = String(value).trim();
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return {
    filled: [...counts.values()].reduce((sum, count) => sum + count, 0),
    unique: counts.size,
    duplicateValues: [...counts.values()].filter((count) => count > 1).length,
    maximumOccurrences: Math.max(0, ...counts.values()),
  };
}

function findKey(sample, suffix) {
  return Object.keys(sample).find((key) => key.endsWith(suffix)) ?? null;
}

function yearCounts(rows, key) {
  const counts = {};
  let invalid = 0;
  for (const row of rows) {
    const date = parseDate(row[key]);
    if (!date) {
      invalid += 1;
      continue;
    }
    const year = String(date.getUTCFullYear());
    counts[year] = (counts[year] ?? 0) + 1;
  }
  return { counts, invalid };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = resolve(args.source);
  const sourceBuffer = await readFile(sourcePath);
  const rows = JSON.parse(sourceBuffer.toString('utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Der Export muss ein JSON-Array aus Objekten sein.');
  }

  const sample = rows[0] ?? {};
  const keys = {
    recordId: 'ID',
    clientId: 'Client ID',
    externalId: 'External ID',
    publicId: 'Public ID',
    partyId: findKey(sample, 'Party ID'),
    adviceId: findKey(sample, 'Advice → ID'),
  };
  const created = yearCounts(rows, 'Created At');
  const updated = yearCounts(rows, 'Updated At');
  const selectedRows = rows.filter((row) => parseDate(row['Created At'])?.getUTCFullYear() === args.year);

  let validPayloads = 0;
  let invalidPayloads = 0;
  for (const row of selectedRows) {
    try {
      const payload = typeof row.Data === 'string' ? JSON.parse(row.Data) : row.Data;
      if (!payload || typeof payload !== 'object') throw new Error('Kein Objekt');
      validPayloads += 1;
    } catch {
      invalidPayloads += 1;
    }
  }

  const identifierStats = Object.fromEntries(
    Object.entries(keys)
      .filter(([, key]) => key)
      .map(([name, key]) => [name, countValues(selectedRows, key)]),
  );

  const report = {
    reportVersion: 1,
    generatedAt: new Date().toISOString(),
    source: {
      filename: sourcePath.split(/[\\/]/).at(-1),
      bytes: sourceBuffer.byteLength,
      sha256: createHash('sha256').update(sourceBuffer).digest('hex'),
    },
    selection: { field: 'Created At', year: args.year },
    totals: {
      allRows: rows.length,
      selectedRows: selectedRows.length,
      validPayloads,
      invalidPayloads,
    },
    years: { createdAt: created, updatedAt: updated },
    identifiers: identifierStats,
    readiness: {
      canImportSelectedYear: selectedRows.length > 0 && invalidPayloads === 0,
      reason: selectedRows.length === 0
        ? `Keine Datensätze mit Created At im Jahr ${args.year} gefunden.`
        : invalidPayloads > 0
          ? `${invalidPayloads} Data-Payloads sind ungültig.`
          : 'Ausgewählter Jahrgang ist technisch für die Mapping-Prüfung bereit.',
    },
  };

  const outputPath = resolve(args.output ?? `reports/migration/riskine-${args.year}-profile.json`);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Profil erstellt: ${outputPath}`);
  console.log(`${args.year}: ${selectedRows.length} von ${rows.length} Datensätzen`);
  console.log(report.readiness.reason);
}

main().catch((error) => {
  console.error(`Migration-Profiler fehlgeschlagen: ${error.message}`);
  process.exitCode = 1;
});
