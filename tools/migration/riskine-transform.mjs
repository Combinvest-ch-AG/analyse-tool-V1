function get(object, path) {
  if (!object || !path) return object;
  if (Object.hasOwn(object, path)) return object[path];
  const separator = path.indexOf('.');
  if (separator === -1) return object[path];
  return get(object[path.slice(0, separator)], path.slice(separator + 1));
}

function set(object, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((current, key) => (current[key] ??= {}), object);
  target[last] = value;
}

function transformValue(value, transform) {
  if (value === null || value === undefined || value === '') return null;
  if (transform === 'string') return String(value);
  if (transform === 'integer') return Number.parseInt(value, 10);
  if (transform === 'money') return Number(value);
  if (transform === 'date') {
    const date = new Date(value);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  }
  // Numeric legacy enums remain unconverted until their business meaning is confirmed.
  if (transform === 'legacy-enum' || transform === 'legacy-boolean') return { legacyValue: value };
  return value;
}

export function transformRiskineRecord(row, mapping) {
  const data = typeof row.Data === 'string' ? JSON.parse(row.Data) : row.Data;
  const roots = { row, data };
  const result = {
    schemaVersion: 1,
    source: { system: 'riskine', mappingVersion: mapping.mappingVersion },
  };
  for (const field of mapping.fields) {
    const [root, ...rest] = field.source.split('.');
    const value = get(roots[root], rest.join('.'));
    if (value === null || value === undefined || value === '') continue;
    set(result, field.target, transformValue(value, field.transform));
  }
  return result;
}
