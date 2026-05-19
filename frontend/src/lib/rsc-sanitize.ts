/**
 * Ensure data passed to React Server Components is serializable.
 * Next.js can throw runtime errors (e.g. "returnNaN is not defined") when
 * values like NaN/Infinity/BigInt/undefined appear in props.
 */

const jsonSafeReplacer = (_key: string, v: unknown) => {
  if (typeof v === 'number' && !Number.isFinite(v)) return null;
  if (typeof v === 'bigint') return String(v);
  if (v === undefined) return undefined;
  if (typeof v === 'symbol') return null;
  return v;
};

const MAX_SANITIZE_DEPTH = 50;

function sanitizeForRSCInner(value: unknown, depth: number): unknown {
  if (depth > MAX_SANITIZE_DEPTH) return null;
  if (value === null || value === undefined) return null;
  const t = typeof value;
  if (t === 'string' || t === 'boolean') return value;
  if (t === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (t === 'bigint') return String(value);
  if (t === 'symbol') return null;

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Buffer) return null;
  if (Array.isArray(value)) return value.map((v) => sanitizeForRSCInner(v, depth + 1));

  if (value instanceof Map) {
    return Array.from(value.entries()).map(
      ([k, v]) => [sanitizeForRSCInner(k, depth + 1), sanitizeForRSCInner(v, depth + 1)],
    );
  }
  if (value instanceof Set) {
    return Array.from(value.values()).map((v) => sanitizeForRSCInner(v, depth + 1));
  }

  if (t === 'object') {
    const proto = Object.getPrototypeOf(value);
    const plain = proto === null || proto === Object.prototype;
    if (!plain) {
      try {
        return JSON.parse(JSON.stringify(value, jsonSafeReplacer));
      } catch {
        return null;
      }
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = sanitizeForRSCInner(v, depth + 1);
    }
    return out;
  }

  return null;
}

export function sanitizeForRSC<T>(value: T): T {
  return sanitizeForRSCInner(value, 0) as T;
}

