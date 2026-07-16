#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function get(object, path) {
  if (!object || !path) return object;
  if (Object.hasOwn(object, path)) return object[path];
  const separator = path.indexOf('.');
  if (separator === -1) return object[path];
  const head = path.slice(0, separator);
  const tail = path.slice(separator + 1);
  return get(object[head], tail);
}

function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

async function main() {
  const [sourceArg, yearArg = String(new Date().getFullYear())] = process.argv.slice(2);
  if (!sourceArg) throw new Error('Aufruf: node tools/migration/check-riskine-mapping.mjs <export.json> [year]');
  const year = Number(yearArg);
  const mappingPath = new URL('./riskine-v1.mapping.json', import.meta.url);
  const [sourceRaw, mappingRaw] = await Promise.all([
    readFile(resolve(sourceArg), 'utf8'),
    readFile(mappingPath, 'utf8'),
  ]);
  const rows = JSON.parse(sourceRaw.replace(/^\uFEFF/, ''));
  const mapping = JSON.parse(mappingRaw);
  const selected = rows.filter((row) => parseDate(row['Created At'])?.getUTCFullYear() === year);
  const prepared = selected.map((row) => ({ row, data: typeof row.Data === 'string' ? JSON.parse(row.Data) : row.Data }));

  const fields = mapping.fields.map((field) => {
    const [root, ...rest] = field.source.split('.');
    const path = rest.join('.');
    const filled = prepared.filter((record) => {
      const value = get(record[root], path);
      return value !== null && value !== undefined && value !== '';
    }).length;
    return {
      target: field.target,
      source: field.source,
      required: field.required,
      classification: field.classification,
      filled,
      missing: prepared.length - filled,
      coveragePercent: prepared.length ? Number((filled / prepared.length * 100).toFixed(1)) : 0,
    };
  });
  const missingRequired = fields.filter((field) => field.required && field.missing > 0);
  const summary = {
    mappingVersion: mapping.mappingVersion,
    year,
    records: prepared.length,
    mappedFields: fields.length,
    missingRequiredFields: missingRequired.length,
    readyForTransformPrototype: prepared.length > 0 && missingRequired.length === 0,
    fields,
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`Mapping-Prüfung fehlgeschlagen: ${error.message}`);
  process.exitCode = 1;
});
